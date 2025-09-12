// PostgreSQL数据库状态管理
// 这个文件替换了原来的db-robust.ts，专门用于PostgreSQL

import { 
  getPostgreSQLManager, 
  getDatabaseStatus as getPostgreSQLStatus,
  healthCheck as postgreSQLHealthCheck,
  isConnected as postgreSQLIsConnected,
  reconnectDatabase as postgreSQLReconnect,
  closeDatabase as postgreSQLClose,
  getPoolStats as postgreSQLPoolStats,
  type DatabaseStatus,
  type PostgreSQLConfig
} from './postgresql-manager';

// 导出PostgreSQL兼容的接口，保持与原db-robust.ts的API兼容性

// 获取数据库状态信息
export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  return getPostgreSQLStatus();
}

// 检查数据库连接状态
export function isDatabaseConnected(): boolean {
  return postgreSQLIsConnected();
}

// 健康检查
export async function isConnectionHealthy(): Promise<boolean> {
  return postgreSQLHealthCheck();
}

// 强制重新连接数据库
export async function reconnectDatabase(): Promise<any> {
  await postgreSQLReconnect();
  return getPostgreSQLManager();
}

// 优雅关闭数据库连接
export async function closeDatabase(): Promise<void> {
  return postgreSQLClose();
}

// 获取连接池状态
export async function getConnectionPoolStatus() {
  const stats = postgreSQLPoolStats();
  return {
    initialized: true,
    ...stats
  };
}

// 获取连接池统计信息
export async function getConnectionPoolStats() {
  const stats = postgreSQLPoolStats();
  return {
    initialized: true,
    ...stats
  };
}

// 带重试的数据库操作
export async function executeWithRetry<T>(
  operation: (db: any) => T | Promise<T>,
  operationName: string = 'database operation'
): Promise<T> {
  const manager = getPostgreSQLManager();
  return manager.executeWithRetry(async () => {
    return operation(manager);
  }, undefined, operationName);
}

// 使用连接池执行操作
export async function executeWithConnectionPool<T>(
  operation: (db: any) => T | Promise<T>,
  operationName: string = 'database operation'
): Promise<T> {
  return executeWithRetry(operation, operationName);
}

// 获取数据库实例
export async function getDatabase(): Promise<any> {
  return getPostgreSQLManager();
}

// 同步版本的数据库获取
export function getDatabaseSync(): any {
  return getPostgreSQLManager();
}

// 导出默认连接 (保持向后兼容)
export default getPostgreSQLManager();