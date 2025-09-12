// 统一的数据库操作接口
// 这个文件提供了一个统一的API来访问PostgreSQL数据库

import { 
  getPostgreSQLManager, 
  type PostgreSQLManager,
  type DatabaseStatus,
  type QueryAdapter
} from './postgresql-manager';
// 直接使用PostgreSQL
import { QueryResult } from 'pg';

// 数据库操作类
export class Database {
  private manager: PostgreSQLManager;

  constructor() {
    this.manager = getPostgreSQLManager();
  }

  // 执行原生PostgreSQL查询
  async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    return this.manager.query<T>(sql, params);
  }

  // 执行PostgreSQL查询
  async queryPostgreSQL<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    return this.manager.queryPostgreSQL<T>(sql, params);
  }

  // PostgreSQL prepare方法
  prepare(sql: string): QueryAdapter {
    return this.manager.prepare(sql);
  }

  // 健康检查
  async healthCheck(): Promise<boolean> {
    return this.manager.healthCheck();
  }

  // 检查连接状态
  isConnected(): boolean {
    return this.manager.isConnected();
  }

  // 获取数据库状态
  async getStatus(): Promise<DatabaseStatus> {
    return this.manager.getDatabaseStatus();
  }

  // 重连数据库
  async reconnect(): Promise<void> {
    return this.manager.reconnect();
  }

  // 关闭数据库连接
  async close(): Promise<void> {
    return this.manager.close();
  }

  // 获取连接池统计
  getPoolStats() {
    return this.manager.getPoolStats();
  }

  // 带重试的操作执行
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries?: number,
    operationName?: string
  ): Promise<T> {
    return this.manager.executeWithRetry(operation, maxRetries, operationName);
  }

  // 事务支持
  async transaction<T>(callback: (db: Database) => Promise<T>): Promise<T> {
    // 简化的事务实现，实际项目中可能需要更复杂的事务管理
    return this.executeWithRetry(async () => {
      return callback(this);
    }, undefined, 'transaction');
  }

  // 常用查询方法
  async getTables(): Promise<string[]> {
    const query = CommonQueries.getTables();
    const result = await this.query<{ name: string }>(query.sql, query.params);
    return result.rows.map(row => row.name);
  }

  async getTableCount(): Promise<number> {
    const query = CommonQueries.getTableCount();
    const result = await this.query<{ count: string }>(query.sql, query.params);
    return parseInt(result.rows[0]?.count || '0');
  }

  async getRowCount(tableName: string): Promise<number> {
    const query = CommonQueries.getRowCount(tableName);
    const result = await this.query<{ count: string }>(query.sql, query.params);
    return parseInt(result.rows[0]?.count || '0');
  }

  async getTableSchema(tableName: string): Promise<any[]> {
    const query = CommonQueries.getTableSchema(tableName);
    const result = await this.query(query.sql, query.params);
    return result.rows;
  }

  // 批量操作
  async batchQuery<T = any>(queries: Array<{ sql: string; params?: any[] }>): Promise<QueryResult<T>[]> {
    const results: QueryResult<T>[] = [];
    
    for (const query of queries) {
      const result = await this.query<T>(query.sql, query.params);
      results.push(result);
    }
    
    return results;
  }

  // 流式查询（对于大数据集）
  async streamQuery<T = any>(
    sql: string, 
    params: any[] = [],
    batchSize: number = 1000
  ): Promise<AsyncGenerator<T[], void, unknown>> {
    const self = this;
    
    return (async function* () {
      let offset = 0;
      let hasMore = true;
      
      while (hasMore) {
        const paginatedSql = `${sql} LIMIT ${batchSize} OFFSET ${offset}`;
        const result = await self.query<T>(paginatedSql, params);
        
        if (result.rows.length === 0) {
          hasMore = false;
        } else {
          yield result.rows;
          offset += batchSize;
          hasMore = result.rows.length === batchSize;
        }
      }
    })();
  }
}

// 全局数据库实例
let globalDatabase: Database | null = null;

// 获取全局数据库实例
export function getDatabase(): Database {
  if (!globalDatabase) {
    globalDatabase = new Database();
  }
  return globalDatabase;
}

// 便捷函数导出
export async function query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
  return getDatabase().query<T>(sql, params);
}

export async function queryPostgreSQL<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
  return getDatabase().queryPostgreSQL<T>(sql, params);
}

export function prepare(sql: string): QueryAdapter {
  return getDatabase().prepare(sql);
}

export async function healthCheck(): Promise<boolean> {
  return getDatabase().healthCheck();
}

export function isConnected(): boolean {
  return getDatabase().isConnected();
}

export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  return getDatabase().getStatus();
}

export async function reconnectDatabase(): Promise<void> {
  return getDatabase().reconnect();
}

export async function closeDatabase(): Promise<void> {
  if (globalDatabase) {
    await globalDatabase.close();
    globalDatabase = null;
  }
}

export function getPoolStats() {
  return getDatabase().getPoolStats();
}

// 导出默认数据库实例
export default getDatabase();