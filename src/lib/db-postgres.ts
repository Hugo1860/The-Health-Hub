import { Pool, PoolClient } from 'pg';

// PostgreSQL连接配置
const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_DATABASE || 'health_hub',
  user: process.env.DB_USERNAME || process.env.USER,
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true',
  max: 20, // 最大连接数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

// 创建连接池
const pool = new Pool(poolConfig);

// 连接池事件监听
pool.on('connect', (client) => {
  console.log('PostgreSQL client connected');
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

// 数据库查询接口
interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

// 数据库操作类
class PostgreSQLDatabase {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // 执行查询
  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      console.log('Executed query', { 
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration,
        rows: result.rowCount 
      });
      
      return {
        rows: result.rows,
        rowCount: result.rowCount || 0
      };
    } catch (error) {
      const duration = Date.now() - start;
      console.error('Query error', { text, duration, error });
      throw error;
    }
  }

  // 获取单个客户端连接（用于事务）
  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  // 执行事务
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // PostgreSQL的prepare方法
  prepare(sql: string) {
    // 转换?占位符为PostgreSQL的$1, $2格式
    let pgSql = sql;
    let paramIndex = 1;
    pgSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);
    
    return {
      get: async (...params: any[]) => {
        const result = await this.query(pgSql, params);
        return result.rows[0] || null;
      },
      all: async (...params: any[]) => {
        const result = await this.query(pgSql, params);
        return result.rows;
      },
      run: async (...params: any[]) => {
        const result = await this.query(pgSql, params);
        return {
          changes: result.rowCount || 0,
          lastInsertRowid: null // PostgreSQL不使用rowid
        };
      }
    };
  }

  // 关闭连接池
  async close(): Promise<void> {
    await this.pool.end();
    console.log('PostgreSQL connection pool closed');
  }

  // 健康检查
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1 as health');
      return result.rows.length > 0;
    } catch (error) {
      console.error('PostgreSQL health check failed:', error);
      return false;
    }
  }

  // 获取连接池状态
  getPoolStatus() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }
}

// 创建数据库实例
const db = new PostgreSQLDatabase(pool);

// 测试连接
db.healthCheck().then(healthy => {
  if (healthy) {
    console.log('✅ PostgreSQL database connected successfully');
  } else {
    console.error('❌ PostgreSQL database connection failed');
  }
}).catch(error => {
  console.error('❌ PostgreSQL database connection error:', error);
});

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing PostgreSQL connection...');
  await db.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing PostgreSQL connection...');
  await db.close();
  process.exit(0);
});

export default db;

// 同时提供CommonJS导出
module.exports = db;
module.exports.default = db;