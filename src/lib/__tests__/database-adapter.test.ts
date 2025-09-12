import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  DatabaseAdapter, 
  SQLiteAdapter, 
  PostgreSQLAdapter, 
  DatabaseAdapterFactory,
  DatabaseManager,
  DatabaseConfig 
} from '../database-adapter';

// Mock better-sqlite3
jest.mock('better-sqlite3', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      prepare: jest.fn().mockReturnValue({
        all: jest.fn().mockReturnValue([{ test: 1 }]),
        run: jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 })
      }),
      pragma: jest.fn(),
      exec: jest.fn(),
      close: jest.fn(),
      transaction: jest.fn().mockImplementation((fn) => fn),
      open: true
    }))
  };
});

// Mock pg
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [{ test: 1 }], rowCount: 1 }),
      release: jest.fn()
    }),
    query: jest.fn().mockResolvedValue({ rows: [{ test: 1 }], rowCount: 1 }),
    end: jest.fn().mockResolvedValue(undefined),
    totalCount: 5,
    idleCount: 3,
    waitingCount: 0,
    ended: false
  }))
}));

describe('DatabaseAdapterFactory', () => {
  test('应该能够创建SQLite适配器', () => {
    const config: DatabaseConfig = {
      type: 'sqlite',
      connection: {
        database: 'test.db'
      },
      pool: {
        min: 1,
        max: 1,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 300000
      },
      performance: {
        statementTimeout: 30000,
        queryTimeout: 15000,
        maxConnections: 1
      }
    };

    const adapter = DatabaseAdapterFactory.create(config);
    
    expect(adapter).toBeInstanceOf(SQLiteAdapter);
    expect(adapter.type).toBe('sqlite');
    expect(adapter.config).toEqual(config);
  });

  test('应该能够创建PostgreSQL适配器', () => {
    const config: DatabaseConfig = {
      type: 'postgresql',
      connection: {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        username: 'test_user',
        password: 'test_pass'
      },
      pool: {
        min: 2,
        max: 10,
        acquireTimeoutMillis: 60000,
        idleTimeoutMillis: 300000
      },
      performance: {
        statementTimeout: 30000,
        queryTimeout: 15000,
        maxConnections: 100
      }
    };

    const adapter = DatabaseAdapterFactory.create(config);
    
    expect(adapter).toBeInstanceOf(PostgreSQLAdapter);
    expect(adapter.type).toBe('postgresql');
    expect(adapter.config).toEqual(config);
  });

  test('应该拒绝不支持的数据库类型', () => {
    const config = {
      type: 'mysql' as any,
      connection: { database: 'test' }
    };

    expect(() => {
      DatabaseAdapterFactory.create(config);
    }).toThrow('Unsupported database type: mysql');
  });
});

describe('SQLiteAdapter', () => {
  let adapter: SQLiteAdapter;
  let config: DatabaseConfig;

  beforeEach(() => {
    config = {
      type: 'sqlite',
      connection: {
        database: 'test.db'
      },
      pool: {
        min: 1,
        max: 1,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 300000
      },
      performance: {
        statementTimeout: 30000,
        queryTimeout: 15000,
        maxConnections: 1
      }
    };
    
    adapter = new SQLiteAdapter(config);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (adapter.isConnected()) {
      await adapter.disconnect();
    }
  });

  test('应该能够连接到SQLite数据库', async () => {
    expect(adapter.isConnected()).toBe(false);
    
    await adapter.connect();
    
    expect(adapter.isConnected()).toBe(true);
  });

  test('应该能够执行查询', async () => {
    await adapter.connect();
    
    const result = await adapter.query('SELECT 1 as test');
    
    expect(result.rows).toEqual([{ test: 1 }]);
    expect(result.rowCount).toBe(1);
    expect(result.duration).toBeGreaterThan(0);
  });

  test('应该能够执行事务', async () => {
    await adapter.connect();
    
    const result = await adapter.transaction(async (tx) => {
      const rows = await tx.query('SELECT 1 as test');
      return rows[0];
    });
    
    expect(result).toEqual({ test: 1 });
  });

  test('应该能够执行健康检查', async () => {
    await adapter.connect();
    
    const health = await adapter.healthCheck();
    
    expect(health.connected).toBe(true);
    expect(health.healthy).toBe(true);
    expect(health.responseTime).toBeGreaterThan(0);
  });

  test('应该能够获取数据库信息', async () => {
    await adapter.connect();
    
    // Mock SQLite查询结果
    const mockDb = require('better-sqlite3').default();
    mockDb.prepare.mockReturnValueOnce({
      all: jest.fn().mockReturnValue([{ version: '3.40.0' }])
    });
    mockDb.prepare.mockReturnValueOnce({
      all: jest.fn().mockReturnValue([{ page_count: 100 }])
    });
    mockDb.prepare.mockReturnValueOnce({
      all: jest.fn().mockReturnValue([{ page_size: 4096 }])
    });
    mockDb.prepare.mockReturnValueOnce({
      all: jest.fn().mockReturnValue([{ name: 'users' }, { name: 'audios' }])
    });
    mockDb.prepare.mockReturnValueOnce({
      all: jest.fn().mockReturnValue([{ name: 'idx_users_email' }])
    });
    
    const info = await adapter.getDatabaseInfo();
    
    expect(info).toHaveProperty('version');
    expect(info).toHaveProperty('size');
    expect(info).toHaveProperty('tables');
    expect(info).toHaveProperty('indexes');
  });

  test('应该能够断开连接', async () => {
    await adapter.connect();
    expect(adapter.isConnected()).toBe(true);
    
    await adapter.disconnect();
    expect(adapter.isConnected()).toBe(false);
  });
});

describe('PostgreSQLAdapter', () => {
  let adapter: PostgreSQLAdapter;
  let config: DatabaseConfig;

  beforeEach(() => {
    config = {
      type: 'postgresql',
      connection: {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        username: 'test_user',
        password: 'test_pass'
      },
      pool: {
        min: 2,
        max: 10,
        acquireTimeoutMillis: 60000,
        idleTimeoutMillis: 300000
      },
      performance: {
        statementTimeout: 30000,
        queryTimeout: 15000,
        maxConnections: 100
      }
    };
    
    adapter = new PostgreSQLAdapter(config);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (adapter.isConnected()) {
      await adapter.disconnect();
    }
  });

  test('应该能够连接到PostgreSQL数据库', async () => {
    expect(adapter.isConnected()).toBe(false);
    
    await adapter.connect();
    
    expect(adapter.isConnected()).toBe(true);
  });

  test('应该能够执行查询', async () => {
    await adapter.connect();
    
    const result = await adapter.query('SELECT 1 as test');
    
    expect(result.rows).toEqual([{ test: 1 }]);
    expect(result.rowCount).toBe(1);
    expect(result.duration).toBeGreaterThan(0);
  });

  test('应该能够执行事务', async () => {
    await adapter.connect();
    
    const result = await adapter.transaction(async (tx) => {
      const rows = await tx.query('SELECT 1 as test');
      return rows[0];
    });
    
    expect(result).toEqual({ test: 1 });
  });

  test('应该能够获取连接池状态', async () => {
    await adapter.connect();
    
    const poolStatus = adapter.getPoolStatus();
    
    expect(poolStatus).toHaveProperty('active');
    expect(poolStatus).toHaveProperty('idle');
    expect(poolStatus).toHaveProperty('waiting');
    expect(poolStatus).toHaveProperty('total');
    expect(poolStatus.total).toBe(5);
    expect(poolStatus.idle).toBe(3);
  });

  test('应该能够执行健康检查', async () => {
    await adapter.connect();
    
    const health = await adapter.healthCheck();
    
    expect(health.connected).toBe(true);
    expect(health.healthy).toBe(true);
    expect(health.responseTime).toBeGreaterThan(0);
    expect(health.activeConnections).toBe(2); // 5 total - 3 idle
  });
});

describe('DatabaseManager', () => {
  let manager: DatabaseManager;

  beforeEach(() => {
    manager = new DatabaseManager();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await manager.disconnectAll();
  });

  test('应该能够注册数据库适配器', async () => {
    const config: DatabaseConfig = {
      type: 'sqlite',
      connection: {
        database: 'test.db'
      },
      pool: {
        min: 1,
        max: 1,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 300000
      },
      performance: {
        statementTimeout: 30000,
        queryTimeout: 15000,
        maxConnections: 1
      }
    };

    await manager.registerAdapter('test-sqlite', config);
    
    const adapter = manager.getAdapter('test-sqlite');
    expect(adapter.type).toBe('sqlite');
    expect(adapter.isConnected()).toBe(true);
  });

  test('应该能够设置默认适配器', async () => {
    const config1: DatabaseConfig = {
      type: 'sqlite',
      connection: { database: 'test1.db' },
      pool: { min: 1, max: 1, acquireTimeoutMillis: 30000, idleTimeoutMillis: 300000 },
      performance: { statementTimeout: 30000, queryTimeout: 15000, maxConnections: 1 }
    };

    const config2: DatabaseConfig = {
      type: 'sqlite',
      connection: { database: 'test2.db' },
      pool: { min: 1, max: 1, acquireTimeoutMillis: 30000, idleTimeoutMillis: 300000 },
      performance: { statementTimeout: 30000, queryTimeout: 15000, maxConnections: 1 }
    };

    await manager.registerAdapter('adapter1', config1);
    await manager.registerAdapter('adapter2', config2, true); // 设为默认

    const defaultAdapter = manager.getAdapter(); // 不指定名称，获取默认
    expect(defaultAdapter.config.connection.database).toBe('test2.db');
  });

  test('应该能够移除适配器', async () => {
    const config: DatabaseConfig = {
      type: 'sqlite',
      connection: { database: 'removable.db' },
      pool: { min: 1, max: 1, acquireTimeoutMillis: 30000, idleTimeoutMillis: 300000 },
      performance: { statementTimeout: 30000, queryTimeout: 15000, maxConnections: 1 }
    };

    await manager.registerAdapter('removable', config);
    expect(() => manager.getAdapter('removable')).not.toThrow();
    
    await manager.removeAdapter('removable');
    expect(() => manager.getAdapter('removable')).toThrow('Database adapter not found: removable');
  });

  test('应该能够执行所有适配器的健康检查', async () => {
    const config1: DatabaseConfig = {
      type: 'sqlite',
      connection: { database: 'health1.db' },
      pool: { min: 1, max: 1, acquireTimeoutMillis: 30000, idleTimeoutMillis: 300000 },
      performance: { statementTimeout: 30000, queryTimeout: 15000, maxConnections: 1 }
    };

    const config2: DatabaseConfig = {
      type: 'sqlite',
      connection: { database: 'health2.db' },
      pool: { min: 1, max: 1, acquireTimeoutMillis: 30000, idleTimeoutMillis: 300000 },
      performance: { statementTimeout: 30000, queryTimeout: 15000, maxConnections: 1 }
    };

    await manager.registerAdapter('health1', config1);
    await manager.registerAdapter('health2', config2);

    const healthResults = await manager.healthCheckAll();
    
    expect(Object.keys(healthResults)).toHaveLength(2);
    expect(healthResults.health1).toBeDefined();
    expect(healthResults.health2).toBeDefined();
    expect(healthResults.health1.connected).toBe(true);
    expect(healthResults.health2.connected).toBe(true);
  });

  test('应该能够断开所有连接', async () => {
    const config: DatabaseConfig = {
      type: 'sqlite',
      connection: { database: 'disconnect-test.db' },
      pool: { min: 1, max: 1, acquireTimeoutMillis: 30000, idleTimeoutMillis: 300000 },
      performance: { statementTimeout: 30000, queryTimeout: 15000, maxConnections: 1 }
    };

    await manager.registerAdapter('disconnect-test', config);
    expect(manager.getAdapter('disconnect-test').isConnected()).toBe(true);
    
    await manager.disconnectAll();
    
    const adapters = manager.getAllAdapters();
    expect(adapters.size).toBe(0);
  });
});