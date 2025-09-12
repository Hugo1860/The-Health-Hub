import { Pool, PoolClient, QueryResult } from 'pg';
import { PostgreSQLErrorHandler, handlePostgreSQLError } from './postgresql-error-handler';

// PostgreSQL连接配置接口
export interface PostgreSQLConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  acquireTimeoutMillis: number;
  retryAttempts: number;
  healthCheckInterval: number;
}

// 健康状态枚举
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy'
}

// 数据库状态接口
export interface DatabaseStatus {
  connected: boolean;
  healthy: boolean;
  connectionAttempts: number;
  lastHealthCheck: number;
  tablesCount?: number;
  tableInfo?: Record<string, any>;
  error?: string;
  config: PostgreSQLConfig;
  performance?: {
    responseTime: number;
    memoryUsage: NodeJS.MemoryUsage;
  };
}

// 查询结果适配器接口
export interface QueryAdapter {
  get<T = any>(...params: any[]): Promise<T | null>;
  all<T = any>(...params: any[]): Promise<T[]>;
  run(...params: any[]): Promise<{ changes: number; lastInsertRowid?: any }>;
}

// PostgreSQL连接管理器类
export class PostgreSQLManager {
  private pool: Pool;
  private config: PostgreSQLConfig;
  private connectionAttempts = 0;
  private lastHealthCheck = 0;
  private isReconnecting = false;

  constructor(config?: Partial<PostgreSQLConfig>) {
    // 根据环境优化连接池配置
    const isProduction = process.env.NODE_ENV === 'production';
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_DATABASE || 'health_hub',
      user: process.env.DB_USERNAME || process.env.USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.DB_SSL === 'true',
      // 生产环境使用更大的连接池
      max: isProduction ? 30 : (isDevelopment ? 10 : 20),
      // 生产环境使用更长的空闲超时
      idleTimeoutMillis: isProduction ? 60000 : 30000,
      // 生产环境使用更长的连接超时
      connectionTimeoutMillis: isProduction ? 15000 : 10000,
      // 获取连接的超时时间
      acquireTimeoutMillis: isProduction ? 10000 : 5000,
      // 重试次数
      retryAttempts: isProduction ? 5 : 3,
      // 健康检查间隔
      healthCheckInterval: isProduction ? 60000 : 30000,
      ...config
    };

    this.pool = new Pool({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      ssl: this.config.ssl,
      max: this.config.max,
      min: Math.max(1, Math.floor(this.config.max / 4)), // 最小连接数为最大连接数的1/4
      idleTimeoutMillis: this.config.idleTimeoutMillis,
      connectionTimeoutMillis: this.config.connectionTimeoutMillis,
      acquireTimeoutMillis: this.config.acquireTimeoutMillis,
      // 启用连接验证
      allowExitOnIdle: true,
      // 连接验证查询
      // 注意：pg库会自动处理连接验证，这里不需要手动设置
    });

    this.setupEventHandlers();
    this.initializeConnection();
  }

  private setupEventHandlers(): void {
    this.pool.on('connect', (client) => {
      this.logDatabaseInfo('New client connected', 'info');
    });

    this.pool.on('error', (err, client) => {
      this.logDatabaseInfo('Unexpected error on idle client', 'error', { error: err.message });
    });

    this.pool.on('acquire', (client) => {
      this.logDatabaseInfo('Client acquired from pool', 'info');
    });

    this.pool.on('release', (client) => {
      this.logDatabaseInfo('Client released back to pool', 'info');
    });

    // 优雅关闭处理
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
  }

  private async initializeConnection(): Promise<void> {
    try {
      await this.testConnection();
      this.logDatabaseInfo('✅ PostgreSQL database connected successfully', 'info');
    } catch (error) {
      this.logDatabaseInfo('❌ PostgreSQL database connection error', 'error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  private async testConnection(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('SELECT 1 as health');
    } finally {
      client.release();
    }
  }

  private logDatabaseInfo(message: string, level: 'info' | 'warn' | 'error' = 'info', context?: any): void {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✅';
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
    console.log(`[${timestamp}] ${prefix} [PostgreSQL] ${message}${contextStr}`);
  }

  // 更新连接池监控指标
  private updatePoolMetrics(responseTime: number, hasError: boolean): void {
    try {
      // 动态导入以避免循环依赖
      import('../app/api/health/connection-pool/route').then(({ updatePoolMetrics }) => {
        updatePoolMetrics(responseTime, hasError);
      }).catch(() => {
        // 忽略导入错误，监控是可选功能
      });
    } catch (error) {
      // 忽略监控更新错误
    }
  }

  // 执行查询
  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    const client = await this.pool.connect();
    
    try {
      const result = await client.query<T>(text, params);
      const duration = Date.now() - start;
      
      // 更新连接池监控指标
      this.updatePoolMetrics(duration, false);
      
      this.logDatabaseInfo('Query executed', 'info', { 
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration,
        rows: result.rowCount 
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      
      // 更新连接池监控指标（错误）
      this.updatePoolMetrics(duration, true);
      
      // 使用PostgreSQL错误处理器
      const pgError = PostgreSQLErrorHandler.parseError(error, text, params);
      PostgreSQLErrorHandler.logError(pgError, { duration, manager: 'PostgreSQLManager' });
      
      this.logDatabaseInfo('Query error', 'error', { 
        text: text.substring(0, 100),
        duration, 
        errorType: pgError.type,
        errorCode: pgError.code,
        userMessage: PostgreSQLErrorHandler.getUserFriendlyMessage(pgError)
      });
      
      throw error;
    } finally {
      client.release();
    }
  }

  // 执行原生PostgreSQL查询
  async queryPostgreSQL<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    return this.query<T>(sql, params);
  }

  // PostgreSQL原生prepare方法
  prepare(sql: string): QueryAdapter {
    return {
      get: async <T = any>(...params: any[]): Promise<T | null> => {
        const result = await this.query<T>(sql, params);
        return result.rows[0] || null;
      },
      
      all: async <T = any>(...params: any[]): Promise<T[]> => {
        const result = await this.query<T>(sql, params);
        return result.rows;
      },
      
      run: async (...params: any[]): Promise<{ changes: number; lastInsertRowid?: any }> => {
        const result = await this.query(sql, params);
        return {
          changes: result.rowCount || 0,
          lastInsertRowid: null // PostgreSQL使用RETURNING子句获取插入的ID
        };
      }
    };
  }

  // 健康检查
  async healthCheck(): Promise<boolean> {
    try {
      const now = Date.now();
      
      // 如果最近检查过，直接返回true
      if (now - this.lastHealthCheck < this.config.healthCheckInterval) {
        return true;
      }

      await this.query('SELECT 1 as health_check');
      this.lastHealthCheck = now;
      return true;
    } catch (error) {
      this.logDatabaseInfo('Health check failed', 'warn', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  // 检查连接状态
  isConnected(): boolean {
    return !this.pool.ended;
  }

  // 获取数据库状态
  async getDatabaseStatus(): Promise<DatabaseStatus> {
    const startTime = Date.now();
    const connected = this.isConnected();
    const healthy = connected ? await this.healthCheck() : false;
    
    const status: DatabaseStatus = {
      connected,
      healthy,
      connectionAttempts: this.connectionAttempts,
      lastHealthCheck: this.lastHealthCheck,
      config: this.config,
      performance: {
        responseTime: Date.now() - startTime,
        memoryUsage: process.memoryUsage()
      }
    };

    if (connected) {
      try {
        // 获取表数量
        const tablesResult = await this.query(`
          SELECT COUNT(*) as count 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
        `);
        status.tablesCount = tablesResult.rows[0]?.count || 0;

        // 获取表信息
        const tables = await this.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
        `);
        
        status.tableInfo = {};
        for (const table of tables.rows) {
          try {
            const countResult = await this.query(`SELECT COUNT(*) as count FROM ${table.table_name}`);
            status.tableInfo[table.table_name] = countResult.rows[0]?.count || 0;
          } catch (err) {
            status.tableInfo[table.table_name] = `Error: ${err}`;
          }
        }
      } catch (err) {
        status.error = err instanceof Error ? err.message : 'Unknown error';
      }
    }

    return status;
  }

  // 重连数据库
  async reconnect(): Promise<void> {
    if (this.isReconnecting) {
      this.logDatabaseInfo('Reconnection already in progress', 'info');
      return;
    }

    this.isReconnecting = true;
    this.connectionAttempts++;

    try {
      this.logDatabaseInfo('Attempting database reconnection', 'info');
      
      // 关闭现有连接池
      if (!this.pool.ended) {
        await this.pool.end();
      }

      // 创建新的连接池
      this.pool = new Pool({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        ssl: this.config.ssl,
        max: this.config.max,
        idleTimeoutMillis: this.config.idleTimeoutMillis,
        connectionTimeoutMillis: this.config.connectionTimeoutMillis,
        acquireTimeoutMillis: this.config.acquireTimeoutMillis,
      });

      this.setupEventHandlers();
      await this.testConnection();
      
      this.logDatabaseInfo('Database reconnection successful', 'info');
    } catch (error) {
      this.logDatabaseInfo('Database reconnection failed', 'error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    } finally {
      this.isReconnecting = false;
    }
  }

  // 带重试的操作执行
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.retryAttempts,
    operationName: string = 'database operation'
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = Math.min(Math.pow(2, attempt - 1) * 1000, 30000);
          this.logDatabaseInfo(`Waiting ${delay}ms before retry attempt ${attempt + 1}`, 'info');
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        this.logDatabaseInfo(`Attempting ${operationName} (${attempt + 1}/${maxRetries})`, 'info');
        return await operation();
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logDatabaseInfo(`${operationName} failed on attempt ${attempt + 1}`, 'warn', {
          error: lastError.message
        });
        
        if (attempt === maxRetries - 1) {
          this.logDatabaseInfo(`${operationName} failed after ${maxRetries} attempts`, 'error');
          throw lastError;
        }
      }
    }
    
    throw lastError!;
  }

  // 获取连接池统计信息
  getPoolStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      ended: this.pool.ended
    };
  }

  // 优雅关闭
  async close(): Promise<void> {
    this.logDatabaseInfo('Closing PostgreSQL connection pool', 'info');
    
    try {
      await this.pool.end();
      this.logDatabaseInfo('PostgreSQL connection pool closed gracefully', 'info');
    } catch (error) {
      this.logDatabaseInfo('Error closing PostgreSQL connection pool', 'error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  private async gracefulShutdown(signal: string): Promise<void> {
    this.logDatabaseInfo(`Received ${signal}, initiating graceful shutdown`, 'info');
    
    try {
      await this.close();
      this.logDatabaseInfo('Graceful shutdown completed', 'info');
    } catch (error) {
      this.logDatabaseInfo('Error during graceful shutdown', 'error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
    
    process.exit(0);
  }
}

// 全局PostgreSQL管理器实例
let globalPostgreSQLManager: PostgreSQLManager | null = null;

// 获取全局PostgreSQL管理器实例
export function getPostgreSQLManager(): PostgreSQLManager {
  if (!globalPostgreSQLManager) {
    globalPostgreSQLManager = new PostgreSQLManager();
  }
  return globalPostgreSQLManager;
}

// 便捷函数
export async function query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const manager = getPostgreSQLManager();
  return manager.query<T>(text, params);
}

export function prepare(sql: string): QueryAdapter {
  const manager = getPostgreSQLManager();
  return manager.prepare(sql);
}

export async function healthCheck(): Promise<boolean> {
  const manager = getPostgreSQLManager();
  return manager.healthCheck();
}

export function isConnected(): boolean {
  const manager = getPostgreSQLManager();
  return manager.isConnected();
}

export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  const manager = getPostgreSQLManager();
  return manager.getDatabaseStatus();
}

export async function reconnectDatabase(): Promise<void> {
  const manager = getPostgreSQLManager();
  return manager.reconnect();
}

export function getPoolStats() {
  const manager = getPostgreSQLManager();
  return manager.getPoolStats();
}

export async function closeDatabase(): Promise<void> {
  if (globalPostgreSQLManager) {
    await globalPostgreSQLManager.close();
    globalPostgreSQLManager = null;
  }
}

// 导出默认管理器实例
export default getPostgreSQLManager();