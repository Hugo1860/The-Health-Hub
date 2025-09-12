import { getPostgreSQLManager } from './postgresql-manager';

// 使用PostgreSQL数据库管理器
console.log('🐘 Using PostgreSQL database');

const db = getPostgreSQLManager();

// 导出数据库实例和相关函数
export default db;

// 导出便捷函数
export const query = db.query.bind(db);
export const prepare = db.prepare.bind(db);
export const healthCheck = db.healthCheck.bind(db);
export const isConnected = db.isConnected.bind(db);
export const getDatabaseStatus = db.getDatabaseStatus.bind(db);
export const reconnect = db.reconnect.bind(db);
export const close = db.close.bind(db);
export const getPoolStats = db.getPoolStats.bind(db);

// 直接使用PostgreSQL查询
export const queryPostgreSQL = db.query.bind(db);