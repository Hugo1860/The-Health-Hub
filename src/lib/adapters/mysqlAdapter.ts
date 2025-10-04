import { createPool, Pool, PoolConnection } from 'mysql2/promise';
import type { SqlClient } from '../sqlClient';

function getDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL || process.env.MYSQL_URL;
  console.log('📊 getDatabaseUrl():', url ? '已配置' : '未配置');
  return url;
}

// 单例连接池，避免重复创建
let poolInstance: Pool | null = null;

function getOrCreatePool(): Pool {
  if (poolInstance) {
    return poolInstance;
  }

  try {
    const databaseUrl = getDatabaseUrl();

    // 连接池配置
    const poolConfig = {
      connectionLimit: 50, // 增加连接池大小
      waitForConnections: true, // 等待可用连接
      queueLimit: 0, // 无限队列
      enableKeepAlive: true, // 保持连接活跃
      keepAliveInitialDelay: 0,
      maxIdle: 10, // 最大空闲连接
      idleTimeout: 60000, // 空闲超时 60 秒
      multipleStatements: false,
      connectTimeout: 10000, // 连接超时 10 秒
    };

    // 总是使用独立参数创建连接池，因为mysql2的uri参数支持不稳定
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = parseInt(process.env.DB_PORT || '3306', 10);
    const dbUser = process.env.DB_USERNAME || 'root';
    const dbPassword = process.env.DB_PASSWORD || '';
    const dbDatabase = process.env.DB_DATABASE || 'health_hub';

    console.log('📊 创建MySQL连接池:', {
      host: dbHost,
      port: dbPort,
      user: dbUser,
      database: dbDatabase,
      passwordSet: !!dbPassword
    });

    poolInstance = createPool({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: dbDatabase,
      ...poolConfig
    });

    // 监听连接池事件（仅在开发环境显示详细日志）
    if (process.env.NODE_ENV === 'development') {
      poolInstance.on('connection', () => {
        console.log('📗 MySQL 连接池：新连接建立');
      });

      poolInstance.on('release', () => {
        console.log('📘 MySQL 连接池：连接释放');
      });
    }

    // 优雅关闭处理
    const gracefulShutdown = async () => {
      console.log('🔴 正在关闭 MySQL 连接池...');
      if (poolInstance) {
        try {
          await poolInstance.end();
          poolInstance = null;
          console.log('✅ MySQL 连接池已关闭');
        } catch (err) {
          console.error('❌ 关闭连接池时出错:', err);
        }
      }
    };

    // 注册进程退出处理
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
    process.on('beforeExit', gracefulShutdown);

    console.log('✅ MySQL 连接池已初始化');

    return poolInstance;
  } catch (error) {
    console.error('❌ 初始化 MySQL 连接池失败:', error);
    
    // 即使失败也要返回一个可用的连接池对象，避免应用崩溃
    // 使用最基本的配置重试
    poolInstance = createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'health_hub',
      connectionLimit: 50,
      waitForConnections: true,
      queueLimit: 0,
    });
    
    console.log('⚠️  使用默认配置创建连接池');
    return poolInstance;
  }
}

export function createMysqlAdapter(): SqlClient {
  const pool = getOrCreatePool();

  const client: SqlClient = {
    dialect: 'mysql',
    async query(sql, params = []) {
      try {
        const [rows] = await pool.query(sql, params as any[]);
        return rows as any[];
      } catch (error: any) {
        console.error('❌ MySQL Query Error:', {
          sql: sql.substring(0, 200),
          error: error.message,
          code: error.code,
          errno: error.errno
        });
        throw error;
      }
    },
    async queryOne(sql, params = []) {
      try {
        const [rows] = await pool.query(sql, params as any[]);
        const list = rows as any[];
        return (list[0] ?? null) as any;
      } catch (error: any) {
        console.error('❌ MySQL QueryOne Error:', {
          sql: sql.substring(0, 200),
          error: error.message,
          code: error.code
        });
        throw error;
      }
    },
    async execute(sql, params = []) {
      try {
        const [result] = await pool.execute(sql, params as any[]);
        const res: any = result;
        return { rowCount: (res?.affectedRows as number) ?? 0 };
      } catch (error: any) {
        console.error('❌ MySQL Execute Error:', {
          sql: sql.substring(0, 200),
          error: error.message,
          code: error.code
        });
        throw error;
      }
    },
    async transaction(fn) {
      const conn: PoolConnection = await pool.getConnection();
      try {
        await conn.beginTransaction();
        // 注意：当前接口未将连接透传给 fn，保持与现有 PG 适配器一致
        const result = await fn();
        await conn.commit();
        return result;
      } catch (e) {
        try { await conn.rollback(); } catch {}
        throw e;
      } finally {
        conn.release();
      }
    },
    async close() {
      await pool.end();
    }
  };

  return client;
}

// 获取连接池统计信息
export function getPoolStats() {
  if (!poolInstance) {
    return {
      connectionLimit: 0,
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      queuedRequests: 0,
    };
  }

  const pool = poolInstance as any;
  
  // 安全获取配置，处理 URI 和直接配置两种方式
  const connectionLimit = pool.config?.connectionLimit || 
                          pool.pool?.config?.connectionLimit || 
                          50;
  
  return {
    connectionLimit,
    totalConnections: pool._allConnections?.length || 0,
    activeConnections: (pool._allConnections?.length || 0) - (pool._freeConnections?.length || 0),
    idleConnections: pool._freeConnections?.length || 0,
    queuedRequests: pool._connectionQueue?.length || 0,
  };
}

// 打印连接池状态（用于调试）
export function logPoolStats() {
  const stats = getPoolStats();
  console.log('🔵 MySQL 连接池状态:', {
    配置上限: stats.connectionLimit,
    总连接数: stats.totalConnections,
    活跃连接: stats.activeConnections,
    空闲连接: stats.idleConnections,
    排队请求: stats.queuedRequests,
    使用率: `${Math.round((stats.activeConnections / stats.connectionLimit) * 100)}%`
  });
}
