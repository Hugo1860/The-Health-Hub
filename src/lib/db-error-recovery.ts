/**
 * Database Error Recovery
 * Specialized error recovery for database operations
 */

import { ErrorRecovery, type ErrorRecoveryOptions } from './error-recovery';
import { DatabaseConnectionPool } from './db-connection-pool';
import { join } from 'path';

interface DatabaseErrorRecoveryOptions extends ErrorRecoveryOptions {
  connectionName?: string;
  queryTimeout?: number;
  healthCheckQuery?: string;
}

class DatabaseErrorRecovery {
  private static readonly DATABASE_RETRYABLE_ERRORS = [
    'CONNECTION_LOST',
    'PROTOCOL_CONNECTION_LOST',
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    // PostgreSQL specific errors
    'ENOTFOUND',
    'ECONNABORTED'
  ];

  private static readonly DEFAULT_OPTIONS: DatabaseErrorRecoveryOptions = {
    retryConfig: {
      maxRetries: 3,
      baseDelay: 500,
      maxDelay: 5000,
      backoffMultiplier: 2,
      retryableErrors: DatabaseErrorRecovery.DATABASE_RETRYABLE_ERRORS
    },
    circuitBreakerConfig: {
      failureThreshold: 5,
      resetTimeout: 30000, // 30 seconds for database operations
      monitoringWindow: 120000 // 2 minutes
    },
    queryTimeout: 10000, // 10 seconds
    healthCheckQuery: 'SELECT 1'
  };

  /**
   * Execute database query with error recovery
   */
  static async executeQuery<T>(
    query: string,
    params: any[] = [],
    options: DatabaseErrorRecoveryOptions = {}
  ): Promise<T[]> {
    const mergedOptions = { ...this.DEFAULT_OPTIONS, ...options };
    const operationName = `db-query-${this.hashQuery(query)}`;

    return ErrorRecovery.withFullRecovery(
      operationName,
      async () => {
        const db = await this.getHealthyConnection(mergedOptions);
        
        // Set query timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Query timeout')), mergedOptions.queryTimeout);
        });

        const queryPromise = db.all(query, params);
        
        return Promise.race([queryPromise, timeoutPromise]) as Promise<T[]>;
      },
      {
        ...mergedOptions,
        onRetry: (attempt, error) => {
          console.warn(`Database query retry attempt ${attempt}:`, {
            query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
            error: error.message,
            params: params?.length || 0
          });
          
          if (mergedOptions.onRetry) {
            mergedOptions.onRetry(attempt, error);
          }
        },
        onFailure: (error, attempts) => {
          console.error(`Database query failed after ${attempts} attempts:`, {
            query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
            error: error.message,
            stack: error.stack,
            params: params?.length || 0
          });
          
          if (mergedOptions.onFailure) {
            mergedOptions.onFailure(error, attempts);
          }
        }
      }
    );
  }

  /**
   * Execute database transaction with error recovery
   */
  static async executeTransaction<T>(
    operations: (db: any) => Promise<T>,
    options: DatabaseErrorRecoveryOptions = {}
  ): Promise<T> {
    const mergedOptions = { ...this.DEFAULT_OPTIONS, ...options };
    const operationName = 'db-transaction';

    return ErrorRecovery.withFullRecovery(
      operationName,
      async () => {
        const db = await this.getHealthyConnection(mergedOptions);
        
        try {
          await db.run('BEGIN TRANSACTION');
          const result = await operations(db);
          await db.run('COMMIT');
          return result;
        } catch (error) {
          try {
            await db.run('ROLLBACK');
          } catch (rollbackError) {
            console.error('Failed to rollback transaction:', rollbackError);
          }
          throw error;
        }
      },
      {
        ...mergedOptions,
        onRetry: (attempt, error) => {
          console.warn(`Database transaction retry attempt ${attempt}:`, error.message);
          
          if (mergedOptions.onRetry) {
            mergedOptions.onRetry(attempt, error);
          }
        },
        onFailure: (error, attempts) => {
          console.error(`Database transaction failed after ${attempts} attempts:`, {
            error: error.message,
            stack: error.stack
          });
          
          if (mergedOptions.onFailure) {
            mergedOptions.onFailure(error, attempts);
          }
        }
      }
    );
  }

  /**
   * Check database health with recovery
   */
  static async checkHealth(options: DatabaseErrorRecoveryOptions = {}): Promise<boolean> {
    const mergedOptions = { ...this.DEFAULT_OPTIONS, ...options };
    
    try {
      await this.executeQuery(
        mergedOptions.healthCheckQuery!,
        [],
        {
          ...mergedOptions,
          retryConfig: {
            ...mergedOptions.retryConfig,
            maxRetries: 1 // Only one retry for health checks
          }
        }
      );
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Get database connection with health verification
   */
  private static async getHealthyConnection(options: DatabaseErrorRecoveryOptions): Promise<any> {
    // Create a connection pool instance if needed
    const dbPath = join(process.cwd(), 'data', 'local.db');
    const pool = new DatabaseConnectionPool(dbPath);
    
    try {
      const connection = await pool.acquire();
      
      // Verify connection is healthy
      try {
        connection.database.prepare(options.healthCheckQuery!).get();
      } catch (error) {
        pool.release(connection);
        throw new Error(`Database connection health check failed: ${error.message}`);
      }

      return {
        ...connection.database,
        _pool: pool,
        _connection: connection,
        // Override close to release back to pool
        close: () => pool.release(connection)
      };
    } catch (error) {
      await pool.close();
      throw error;
    }
  }

  /**
   * Create a simple hash of the query for operation naming
   */
  private static hashQuery(query: string): string {
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Get database error recovery statistics
   */
  static getStats() {
    return {
      circuitBreakers: ErrorRecovery.getCircuitBreakerStats(),
      retryableErrors: this.DATABASE_RETRYABLE_ERRORS,
      defaultOptions: this.DEFAULT_OPTIONS
    };
  }

  /**
   * Reset database error recovery state
   */
  static reset(): void {
    ErrorRecovery.resetAllCircuitBreakers();
  }
}

export { DatabaseErrorRecovery };
export type { DatabaseErrorRecoveryOptions };