// Unified database facade now backed by MySQL-compatible adapter in ./db
import db from './db';

export type QueryResult<T = any> = {
  rows: T[];
  rowCount: number;
};

export async function query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
  return db.query<T>(sql, params);
}

// Backward-compatible helpers (no-op or minimal shims)
export function prepare(sql: string) {
  // For MySQL we generally use parameterized queries with '?',
  // here we just return a callable for compatibility
  return {
    run: async (...params: any[]) => db.query(sql, params).then(r => ({ changes: r.rowCount }))
  };
}

export function getDatabase() {
  return {
    query,
    prepare,
    // Compatibility shims
    healthCheck: async () => true,
    isConnected: () => isConnected(),
    getDatabaseStatus,
    reconnect: reconnectDatabase,
    close: async () => undefined,
    getPoolStats
  };
}

// Health and status shims
export async function getDatabaseStatus() {
  // Minimal status object compatible with previous shape
  return {
    connected: true,
    healthy: true,
    config: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      database: process.env.DB_DATABASE || 'health_hub',
      retryAttempts: 0,
      connectionTimeoutMillis: 0,
      healthCheckInterval: 0
    },
    connectionAttempts: 0,
    lastHealthCheck: Date.now(),
    tablesCount: undefined,
    tableInfo: undefined,
    error: undefined,
    performance: { responseTime: undefined, memoryUsage: undefined }
  };
}

export function isConnected(): boolean {
  // Using pooled connections behind the adapter
  return true;
}

export async function reconnectDatabase(): Promise<void> {
  // Stateless in current adapter — no action required
  return;
}

export function getPoolStats() {
  // 从 mysqlAdapter 获取真实的连接池统计
  try {
    const { getPoolStats: getMysqlPoolStats } = require('./adapters/mysqlAdapter');
    const stats = getMysqlPoolStats();
    return {
      totalCount: stats.totalConnections,
      idleCount: stats.idleConnections,
      waitingCount: stats.queuedRequests,
      activeCount: stats.activeConnections,
      connectionLimit: stats.connectionLimit,
      ended: false
    };
  } catch (error) {
    console.error('获取连接池统计失败:', error);
    return { totalCount: 0, idleCount: 0, waitingCount: 0, activeCount: 0, ended: false };
  }
}

export default { query, prepare, getDatabase, getDatabaseStatus, isConnected, reconnectDatabase, getPoolStats };