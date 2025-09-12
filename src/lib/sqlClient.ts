// PostgreSQL 兼容的 SQL 客户端
import { getDatabase } from './database';

export interface SqlClient {
  dialect: 'postgres';
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  close(): Promise<void>;
}

export function createSqlClient(): SqlClient {
  return {
    dialect: 'postgres',
    async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
      try {
        const db = getDatabase();
        const result = await db.query(sql, params);
        return result.rows as T[];
      } catch (error) {
        console.error('SQL Query Error:', error);
        throw error;
      }
    },
    async close(): Promise<void> {
      // PostgreSQL 连接池会自动管理连接
      return Promise.resolve();
    }
  };
}

export const sqlClient: SqlClient = createSqlClient();
export const isPostgres: boolean = true;