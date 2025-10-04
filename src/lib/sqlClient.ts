// 通用 SQL 客户端接口，支持 Postgres / MySQL
export type SqlDialect = 'mysql';

export interface SqlClient {
  dialect: SqlDialect;
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  queryOne?<T = any>(sql: string, params?: any[]): Promise<T | null>;
  execute?(sql: string, params?: any[]): Promise<{ rowCount: number }>;
  transaction?<T>(fn: () => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export function createSqlClient(): SqlClient {
  // 仅支持 MySQL 适配器
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createMysqlAdapter } = require('./adapters/mysqlAdapter');
  return createMysqlAdapter();
}

export const sqlClient: SqlClient = createSqlClient();
export const isPostgres: boolean = false;