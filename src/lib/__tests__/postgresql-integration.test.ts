// PostgreSQL集成测试

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { getDatabase, getDatabaseStatus, isConnected, healthCheck } from '../database';
import { PostgreSQLManager } from '../postgresql-manager';
// query-adapter已移除，直接使用PostgreSQL语法
import { PostgreSQLErrorHandler, handlePostgreSQLError } from '../postgresql-error-handler';

describe('PostgreSQL Integration Tests', () => {
  let db: any;

  beforeAll(async () => {
    // 确保测试环境使用PostgreSQL
    process.env.DB_TYPE = 'postgresql';
    db = getDatabase();
  });

  afterAll(async () => {
    // 清理测试环境
    if (db && typeof db.close === 'function') {
      await db.close();
    }
  });

  describe('Database Connection', () => {
    test('should connect to PostgreSQL database', async () => {
      const connected = isConnected();
      expect(connected).toBe(true);
    });

    test('should pass health check', async () => {
      const healthy = await healthCheck();
      expect(healthy).toBe(true);
    });

    test('should get database status', async () => {
      const status = await getDatabaseStatus();
      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('healthy');
      expect(status).toHaveProperty('config');
      expect(status.connected).toBe(true);
    });
  });

  describe('Query Execution', () => {
    test('should execute simple SELECT query', async () => {
      const result = await db.query('SELECT 1 as test_value');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].test_value).toBe(1);
    });

    test('should execute parameterized query', async () => {
      const result = await db.query('SELECT $1 as param_value', ['test']);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].param_value).toBe('test');
    });

    test('should handle query errors gracefully', async () => {
      await expect(db.query('SELECT * FROM non_existent_table')).rejects.toThrow();
    });

    test('should execute SQLite compatible queries', async () => {
      const stmt = db.prepare('SELECT ? as sqlite_param');
      const result = await stmt.get('test_value');
      expect(result.sqlite_param).toBe('test_value');
    });
  });

  describe('PostgreSQL Native Queries', () => {
    test('should use PostgreSQL parameter placeholders', async () => {
      const stmt = db.prepare('SELECT $1 as test_param, $2 as test_param2');
      const result = await stmt.get(1, 'test');
      expect(result.test_param).toBe(1);
      expect(result.test_param2).toBe('test');
    });

    test('should use PostgreSQL functions', async () => {
      const stmt = db.prepare('SELECT CURRENT_TIMESTAMP as current_time');
      const result = await stmt.get();
      expect(result.current_time).toBeDefined();
    });

    test('should use information_schema for table queries', async () => {
      const stmt = db.prepare(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      `);
      const result = await stmt.get();
      // 测试查询语法正确性，不依赖实际表存在
      expect(stmt).toBeDefined();
    });

    test('should execute valid PostgreSQL queries', async () => {
      const stmt = db.prepare('SELECT $1 as test_value');
      const result = await stmt.get('test');
      expect(result.test_value).toBe('test');
    });

    test('should handle PostgreSQL-specific syntax', async () => {
      // 测试PostgreSQL特有的语法
      const stmt = db.prepare('SELECT CURRENT_TIMESTAMP as now');
      const result = await stmt.get();
      expect(result.now).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should parse PostgreSQL errors correctly', () => {
      const mockError = {
        code: '42P01',
        message: 'relation "non_existent_table" does not exist',
        severity: 'ERROR'
      };

      const pgError = PostgreSQLErrorHandler.parseError(mockError, 'SELECT * FROM non_existent_table');
      expect(pgError.type).toBe('QUERY');
      expect(pgError.code).toBe('42P01');
      expect(pgError.message).toContain('does not exist');
    });

    test('should generate user-friendly error messages', () => {
      const pgError = {
        type: 'QUERY' as any,
        code: '42P01',
        message: 'relation "test_table" does not exist',
        table: 'test_table',
        timestamp: new Date().toISOString()
      };

      const userMessage = PostgreSQLErrorHandler.getUserFriendlyMessage(pgError);
      expect(userMessage).toContain('表');
      expect(userMessage).toContain('不存在');
    });

    test('should identify retryable errors', () => {
      const connectionError = {
        type: 'CONNECTION' as any,
        code: '08000',
        message: 'connection exception',
        timestamp: new Date().toISOString()
      };

      const isRetryable = PostgreSQLErrorHandler.isRetryable(connectionError);
      expect(isRetryable).toBe(true);
    });

    test('should create proper API error responses', () => {
      const mockError = {
        code: '23505',
        message: 'duplicate key value violates unique constraint'
      };

      const apiError = handlePostgreSQLError(mockError);
      expect(apiError.success).toBe(false);
      expect(apiError.error).toHaveProperty('type');
      expect(apiError.error).toHaveProperty('code');
      expect(apiError.error).toHaveProperty('message');
    });
  });

  describe('Connection Pool', () => {
    test('should get pool statistics', () => {
      const stats = db.getPoolStats();
      expect(stats).toHaveProperty('totalCount');
      expect(stats).toHaveProperty('idleCount');
      expect(stats).toHaveProperty('waitingCount');
      expect(stats).toHaveProperty('ended');
    });

    test('should handle concurrent queries', async () => {
      const queries = Array.from({ length: 10 }, (_, i) => 
        db.query('SELECT $1 as query_id', [i])
      );

      const results = await Promise.all(queries);
      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result.rows[0].query_id).toBe(index);
      });
    });
  });

  describe('Database Operations', () => {
    test('should get table list', async () => {
      const tables = await db.getTables();
      expect(Array.isArray(tables)).toBe(true);
      // 应该至少包含一些基本表
      expect(tables.length).toBeGreaterThan(0);
    });

    test('should get table count', async () => {
      const count = await db.getTableCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should execute batch queries', async () => {
      const queries = [
        { sql: 'SELECT 1 as first' },
        { sql: 'SELECT 2 as second' },
        { sql: 'SELECT $1 as third', params: [3] }
      ];

      const results = await db.batchQuery(queries);
      expect(results).toHaveLength(3);
      expect(results[0].rows[0].first).toBe(1);
      expect(results[1].rows[0].second).toBe(2);
      expect(results[2].rows[0].third).toBe(3);
    });
  });

  describe('Performance Tests', () => {
    test('should handle large result sets efficiently', async () => {
      const startTime = Date.now();
      
      // 生成一个较大的结果集
      const result = await db.query(`
        SELECT generate_series(1, 1000) as id, 
               'test_data_' || generate_series(1, 1000) as data
      `);
      
      const duration = Date.now() - startTime;
      
      expect(result.rows).toHaveLength(1000);
      expect(duration).toBeLessThan(5000); // 应该在5秒内完成
    });

    test('should handle multiple concurrent connections', async () => {
      const startTime = Date.now();
      
      // 创建多个并发查询
      const concurrentQueries = Array.from({ length: 20 }, (_, i) =>
        db.query('SELECT pg_sleep(0.1), $1 as query_id', [i])
      );

      const results = await Promise.all(concurrentQueries);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(20);
      // 由于并发执行，总时间应该远少于串行执行时间
      expect(duration).toBeLessThan(3000);
    });
  });

  describe('Transaction Support', () => {
    test('should execute operations in transaction', async () => {
      const result = await db.transaction(async (txDb) => {
        // 在事务中执行多个操作
        await txDb.query('SELECT 1');
        await txDb.query('SELECT 2');
        return 'transaction_completed';
      });

      expect(result).toBe('transaction_completed');
    });
  });

  describe('Retry Logic', () => {
    test('should retry failed operations', async () => {
      let attemptCount = 0;
      
      const result = await db.executeWithRetry(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Simulated failure');
        }
        return 'success_after_retry';
      }, 5, 'test_retry_operation');

      expect(result).toBe('success_after_retry');
      expect(attemptCount).toBe(3);
    });
  });
});

// 性能基准测试
describe('PostgreSQL Performance Benchmarks', () => {
  let db: any;

  beforeAll(async () => {
    db = getDatabase();
  });

  test('should benchmark simple queries', async () => {
    const iterations = 100;
    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      await db.query('SELECT 1');
    }

    const duration = Date.now() - startTime;
    const avgTime = duration / iterations;

    console.log(`Average query time: ${avgTime.toFixed(2)}ms`);
    expect(avgTime).toBeLessThan(50); // 平均查询时间应该少于50ms
  });

  test('should benchmark parameterized queries', async () => {
    const iterations = 100;
    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      await db.query('SELECT $1 as param', [i]);
    }

    const duration = Date.now() - startTime;
    const avgTime = duration / iterations;

    console.log(`Average parameterized query time: ${avgTime.toFixed(2)}ms`);
    expect(avgTime).toBeLessThan(100);
  });
});