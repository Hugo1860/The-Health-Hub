import Database from 'better-sqlite3';
import { join } from 'path';

export interface ConnectionPoolConfig {
  maxConnections: number;
  minConnections: number;
  acquireTimeoutMs: number;
  idleTimeoutMs: number;
  maxLifetimeMs: number;
}

export interface PoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  totalAcquired: number;
  totalReleased: number;
}

interface PooledConnection {
  connection: Database.Database;
  id: string;
  createdAt: number;
  lastUsed: number;
  inUse: boolean;
}

export class DatabaseConnectionPool {
  private connections: Map<string, PooledConnection> = new Map();
  private waitingQueue: Array<{
    resolve: (connection: Database.Database) => void;
    reject: (error: Error) => void;
    timestamp: number;
  }> = [];
  
  private config: ConnectionPoolConfig;
  private stats: PoolStats = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    waitingRequests: 0,
    totalAcquired: 0,
    totalReleased: 0
  };

  private cleanupInterval: NodeJS.Timeout;
  private dbPath: string;

  constructor(config: Partial<ConnectionPoolConfig> = {}) {
    this.config = {
      maxConnections: 10,
      minConnections: 2,
      acquireTimeoutMs: 30000,
      idleTimeoutMs: 300000, // 5 minutes
      maxLifetimeMs: 3600000, // 1 hour
      ...config
    };

    this.dbPath = join(process.cwd(), 'data', 'local.db');
    
    // 初始化最小连接数
    this.initializeMinConnections();
    
    // 启动清理定时器
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleConnections();
    }, 60000); // 每分钟清理一次

    // 优雅关闭处理
    process.on('SIGINT', () => this.close());
    process.on('SIGTERM', () => this.close());
  }

  /**
   * 初始化最小连接数
   */
  private async initializeMinConnections(): Promise<void> {
    for (let i = 0; i < this.config.minConnections; i++) {
      try {
        const connection = await this.createConnection();
        this.addConnectionToPool(connection);
      } catch (error) {
        console.error('Failed to initialize minimum connections:', error);
      }
    }
  }

  /**
   * 创建新的数据库连接
   */
  private async createConnection(): Promise<Database.Database> {
    try {
      const connection = new Database(this.dbPath, {
        readonly: false,
        fileMustExist: true,
        timeout: 5000
      });

      // 设置连接优化参数
      connection.exec(`
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA cache_size = 1000;
        PRAGMA temp_store = MEMORY;
        PRAGMA mmap_size = 268435456;
      `);

      return connection;
    } catch (error) {
      console.error('Failed to create database connection:', error);
      throw error;
    }
  }

  /**
   * 将连接添加到连接池
   */
  private addConnectionToPool(connection: Database.Database): void {
    const id = this.generateConnectionId();
    const pooledConnection: PooledConnection = {
      connection,
      id,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      inUse: false
    };

    this.connections.set(id, pooledConnection);
    this.updateStats();
  }

  /**
   * 生成连接ID
   */
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * 获取连接
   */
  async acquire(): Promise<Database.Database> {
    return new Promise((resolve, reject) => {
      // 检查是否有可用的空闲连接
      const idleConnection = this.findIdleConnection();
      if (idleConnection) {
        idleConnection.inUse = true;
        idleConnection.lastUsed = Date.now();
        this.stats.totalAcquired++;
        this.updateStats();
        resolve(idleConnection.connection);
        return;
      }

      // 如果没有空闲连接且未达到最大连接数，创建新连接
      if (this.connections.size < this.config.maxConnections) {
        this.createConnection()
          .then(connection => {
            this.addConnectionToPool(connection);
            const pooledConnection = Array.from(this.connections.values())
              .find(conn => conn.connection === connection);
            
            if (pooledConnection) {
              pooledConnection.inUse = true;
              this.stats.totalAcquired++;
              this.updateStats();
              resolve(connection);
            } else {
              reject(new Error('Failed to add connection to pool'));
            }
          })
          .catch(reject);
        return;
      }

      // 如果达到最大连接数，加入等待队列
      const timeoutId = setTimeout(() => {
        const index = this.waitingQueue.findIndex(item => item.resolve === resolve);
        if (index !== -1) {
          this.waitingQueue.splice(index, 1);
          this.stats.waitingRequests--;
          reject(new Error('Connection acquire timeout'));
        }
      }, this.config.acquireTimeoutMs);

      this.waitingQueue.push({
        resolve: (connection: Database.Database) => {
          clearTimeout(timeoutId);
          resolve(connection);
        },
        reject: (error: Error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
        timestamp: Date.now()
      });

      this.stats.waitingRequests++;
    });
  }

  /**
   * 释放连接
   */
  release(connection: Database.Database): void {
    const pooledConnection = Array.from(this.connections.values())
      .find(conn => conn.connection === connection);

    if (!pooledConnection) {
      console.warn('Attempting to release connection not in pool');
      return;
    }

    pooledConnection.inUse = false;
    pooledConnection.lastUsed = Date.now();
    this.stats.totalReleased++;

    // 处理等待队列
    if (this.waitingQueue.length > 0) {
      const waiting = this.waitingQueue.shift();
      if (waiting) {
        pooledConnection.inUse = true;
        this.stats.totalAcquired++;
        this.stats.waitingRequests--;
        waiting.resolve(connection);
      }
    }

    this.updateStats();
  }

  /**
   * 查找空闲连接
   */
  private findIdleConnection(): PooledConnection | null {
    for (const connection of this.connections.values()) {
      if (!connection.inUse) {
        return connection;
      }
    }
    return null;
  }

  /**
   * 清理空闲连接
   */
  private cleanupIdleConnections(): void {
    const now = Date.now();
    const connectionsToRemove: string[] = [];

    for (const [id, connection] of this.connections.entries()) {
      // 跳过正在使用的连接
      if (connection.inUse) continue;

      // 检查空闲超时
      const idleTime = now - connection.lastUsed;
      const lifetime = now - connection.createdAt;

      const shouldRemove = 
        (idleTime > this.config.idleTimeoutMs) ||
        (lifetime > this.config.maxLifetimeMs) ||
        (this.connections.size > this.config.minConnections && idleTime > 60000);

      if (shouldRemove) {
        connectionsToRemove.push(id);
      }
    }

    // 移除标记的连接
    for (const id of connectionsToRemove) {
      const connection = this.connections.get(id);
      if (connection) {
        try {
          connection.connection.close();
        } catch (error) {
          console.error('Error closing connection:', error);
        }
        this.connections.delete(id);
      }
    }

    if (connectionsToRemove.length > 0) {
      console.log(`Cleaned up ${connectionsToRemove.length} idle connections`);
      this.updateStats();
    }
  }

  /**
   * 更新统计信息
   */
  private updateStats(): void {
    this.stats.totalConnections = this.connections.size;
    this.stats.activeConnections = Array.from(this.connections.values())
      .filter(conn => conn.inUse).length;
    this.stats.idleConnections = this.stats.totalConnections - this.stats.activeConnections;
  }

  /**
   * 获取连接池统计信息
   */
  getStats(): PoolStats {
    return { ...this.stats };
  }

  /**
   * 获取连接池健康状态
   */
  getHealthStatus(): {
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // 检查等待队列
    if (this.stats.waitingRequests > 5) {
      issues.push(`High number of waiting requests: ${this.stats.waitingRequests}`);
      recommendations.push('Consider increasing maxConnections');
    }

    // 检查连接利用率
    const utilizationRate = this.stats.activeConnections / this.stats.totalConnections;
    if (utilizationRate > 0.8) {
      issues.push(`High connection utilization: ${(utilizationRate * 100).toFixed(1)}%`);
      recommendations.push('Consider increasing connection pool size');
    }

    // 检查连接泄漏
    const avgConnectionAge = Array.from(this.connections.values())
      .reduce((sum, conn) => sum + (Date.now() - conn.createdAt), 0) / this.connections.size;
    
    if (avgConnectionAge > this.config.maxLifetimeMs * 0.8) {
      issues.push('Connections are aging, possible connection leak');
      recommendations.push('Check for unreleased connections');
    }

    return {
      healthy: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * 执行带连接管理的查询
   */
  async execute<T>(
    queryFn: (db: Database.Database) => T
  ): Promise<T> {
    const connection = await this.acquire();
    try {
      return queryFn(connection);
    } finally {
      this.release(connection);
    }
  }

  /**
   * 执行事务
   */
  async transaction<T>(
    transactionFn: (db: Database.Database) => T
  ): Promise<T> {
    const connection = await this.acquire();
    try {
      const transaction = connection.transaction(transactionFn);
      return transaction();
    } finally {
      this.release(connection);
    }
  }

  /**
   * 关闭连接池
   */
  close(): void {
    // 清理定时器
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // 拒绝所有等待的请求
    for (const waiting of this.waitingQueue) {
      waiting.reject(new Error('Connection pool is closing'));
    }
    this.waitingQueue.length = 0;

    // 关闭所有连接
    for (const [id, connection] of this.connections.entries()) {
      try {
        connection.connection.close();
      } catch (error) {
        console.error(`Error closing connection ${id}:`, error);
      }
    }

    this.connections.clear();
    this.updateStats();
    console.log('Database connection pool closed');
  }
}

// 创建全局连接池实例
export const connectionPool = new DatabaseConnectionPool({
  maxConnections: 10,
  minConnections: 2,
  acquireTimeoutMs: 30000,
  idleTimeoutMs: 300000,
  maxLifetimeMs: 3600000
});