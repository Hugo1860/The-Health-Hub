import { DatabaseConnectionPool, ConnectionPoolConfig } from '../db-connection-pool';
import { join } from 'path';
import { existsSync } from 'fs';

// Mock better-sqlite3
jest.mock('better-sqlite3', () => {
  return jest.fn().mockImplementation(() => ({
    open: true,
    prepare: jest.fn().mockReturnValue({
      get: jest.fn().mockReturnValue({ result: 1 }),
      all: jest.fn().mockReturnValue([])
    }),
    pragma: jest.fn(),
    close: jest.fn()
  }));
});

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true)
}));

describe('DatabaseConnectionPool', () => {
  let pool: DatabaseConnectionPool;
  const testDbPath = join(process.cwd(), 'test.db');
  
  const testConfig: Partial<ConnectionPoolConfig> = {
    maxConnections: 3,
    connectionTimeout: 1000,
    idleTimeout: 5000,
    retryAttempts: 2,
    healthCheckInterval: 1000,
    acquireTimeout: 2000
  };

  beforeEach(() => {
    jest.clearAllMocks();
    pool = new DatabaseConnectionPool(testDbPath, testConfig);
  });

  afterEach(async () => {
    await pool.close();
  });

  describe('Connection Management', () => {
    test('should create and acquire a connection', async () => {
      const connection = await pool.acquire();
      
      expect(connection).toBeDefined();
      expect(connection.id).toBeDefined();
      expect(connection.database).toBeDefined();
      expect(connection.inUse).toBe(true);
      expect(connection.isHealthy).toBe(true);
    });

    test('should release a connection', async () => {
      const connection = await pool.acquire();
      expect(connection.inUse).toBe(true);
      
      pool.release(connection);
      expect(connection.inUse).toBe(false);
    });

    test('should reuse idle connections', async () => {
      const connection1 = await pool.acquire();
      const connectionId1 = connection1.id;
      pool.release(connection1);
      
      const connection2 = await pool.acquire();
      expect(connection2.id).toBe(connectionId1);
    });

    test('should create multiple connections up to max limit', async () => {
      const connections = [];
      
      for (let i = 0; i < testConfig.maxConnections!; i++) {
        const conn = await pool.acquire();
        connections.push(conn);
      }
      
      const stats = pool.getStats();
      expect(stats.totalConnections).toBe(testConfig.maxConnections);
      expect(stats.activeConnections).toBe(testConfig.maxConnections);
      
      // Clean up
      connections.forEach(conn => pool.release(conn));
    });

    test('should wait for connection when pool is full', async () => {
      const connections = [];
      
      // Fill the pool
      for (let i = 0; i < testConfig.maxConnections!; i++) {
        const conn = await pool.acquire();
        connections.push(conn);
      }
      
      // This should wait
      const waitPromise = pool.acquire();
      
      // Release one connection
      setTimeout(() => {
        pool.release(connections[0]);
      }, 100);
      
      const waitedConnection = await waitPromise;
      expect(waitedConnection).toBeDefined();
      
      // Clean up
      connections.slice(1).forEach(conn => pool.release(conn));
      pool.release(waitedConnection);
    });

    test('should timeout when waiting too long for connection', async () => {
      const connections = [];
      
      // Fill the pool
      for (let i = 0; i < testConfig.maxConnections!; i++) {
        const conn = await pool.acquire();
        connections.push(conn);
      }
      
      // This should timeout
      await expect(pool.acquire()).rejects.toThrow('Connection acquire timeout');
      
      // Clean up
      connections.forEach(conn => pool.release(conn));
    });
  });

  describe('Execute Operations', () => {
    test('should execute operation with connection', async () => {
      const mockOperation = jest.fn().mockReturnValue('test result');
      
      const result = await pool.execute(mockOperation, 'test operation');
      
      expect(result).toBe('test result');
      expect(mockOperation).toHaveBeenCalledWith(expect.any(Object));
    });

    test('should execute async operation with connection', async () => {
      const mockOperation = jest.fn().mockResolvedValue('async result');
      
      const result = await pool.execute(mockOperation, 'async test operation');
      
      expect(result).toBe('async result');
      expect(mockOperation).toHaveBeenCalledWith(expect.any(Object));
    });

    test('should handle operation errors', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Operation failed'));
      
      await expect(pool.execute(mockOperation, 'failing operation'))
        .rejects.toThrow('Operation failed');
    });
  });

  describe('Statistics and Status', () => {
    test('should provide accurate statistics', async () => {
      const connection = await pool.acquire();
      
      const stats = pool.getStats();
      expect(stats.totalConnections).toBe(1);
      expect(stats.activeConnections).toBe(1);
      expect(stats.idleConnections).toBe(0);
      expect(stats.totalAcquired).toBe(1);
      expect(stats.totalCreated).toBe(1);
      
      pool.release(connection);
      
      const statsAfterRelease = pool.getStats();
      expect(statsAfterRelease.activeConnections).toBe(0);
      expect(statsAfterRelease.idleConnections).toBe(1);
      expect(statsAfterRelease.totalReleased).toBe(1);
    });

    test('should provide pool status', async () => {
      const connection = await pool.acquire();
      
      const status = pool.getStatus();
      expect(status.isHealthy).toBe(true);
      expect(status.connections).toHaveLength(1);
      expect(status.connections[0].inUse).toBe(true);
      expect(status.connections[0].isHealthy).toBe(true);
      expect(status.config).toEqual(expect.objectContaining(testConfig));
      
      pool.release(connection);
    });
  });

  describe('Pool Lifecycle', () => {
    test('should close pool gracefully', async () => {
      const connection = await pool.acquire();
      pool.release(connection);
      
      await pool.close();
      
      // Should reject new acquire requests
      await expect(pool.acquire()).rejects.toThrow('Connection pool is shutting down');
    });

    test('should handle database file not found', async () => {
      (existsSync as jest.Mock).mockReturnValue(false);
      
      const poolWithMissingDb = new DatabaseConnectionPool('/nonexistent/path.db', testConfig);
      
      await expect(poolWithMissingDb.acquire()).rejects.toThrow('Database file not found');
      
      await poolWithMissingDb.close();
    });
  });

  describe('Error Handling', () => {
    test('should handle connection errors gracefully', async () => {
      // Mock a database that throws on prepare
      const Database = require('better-sqlite3');
      Database.mockImplementation(() => {
        throw new Error('Database connection failed');
      });
      
      await expect(pool.acquire()).rejects.toThrow('Database connection failed');
      
      const stats = pool.getStats();
      expect(stats.errors.connectionErrors).toBeGreaterThan(0);
    });

    test('should mark unhealthy connections during operations', async () => {
      const connection = await pool.acquire();
      
      // Mock operation that throws database error
      const mockOperation = jest.fn().mockRejectedValue(new Error('CONNECTION_LOST: connection terminated'));
      
      await expect(pool.execute(mockOperation)).rejects.toThrow('CONNECTION_LOST');
      
      const stats = pool.getStats();
      expect(stats.errors.validationErrors).toBeGreaterThan(0);
    });
  });
});