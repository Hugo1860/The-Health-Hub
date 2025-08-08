import Database from 'better-sqlite3';
import { DatabaseOptimizer, databaseOptimizer } from './DatabaseOptimizer';
import { DatabaseConnectionPool, connectionPool } from './DatabaseConnectionPool';
import { QueryCache, queryCache, audioQueryCache, userQueryCache } from './QueryCache';

export interface QueryOptions {
  useCache?: boolean;
  cacheTTL?: number;
  cacheKey?: string;
  timeout?: number;
  retries?: number;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface SearchOptions extends PaginationOptions {
  query: string;
  fields?: string[];
  fuzzy?: boolean;
}

export class OptimizedDatabase {
  private optimizer: DatabaseOptimizer;
  private connectionPool: DatabaseConnectionPool;
  private queryCache: QueryCache;
  private audioCache: QueryCache;
  private userCache: QueryCache;

  constructor() {
    this.optimizer = databaseOptimizer;
    this.connectionPool = connectionPool;
    this.queryCache = queryCache;
    this.audioCache = audioQueryCache;
    this.userCache = userQueryCache;
    
    // 初始化优化索引
    this.initializeOptimizations();
  }

  /**
   * 初始化数据库优化
   */
  private async initializeOptimizations(): Promise<void> {
    try {
      console.log('Initializing database optimizations...');
      await this.optimizer.createRecommendedIndexes();
      console.log('Database optimizations initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database optimizations:', error);
    }
  }

  /**
   * 执行优化查询
   */
  async query<T>(
    sql: string,
    params: any[] = [],
    options: QueryOptions = {}
  ): Promise<T[]> {
    const {
      useCache = true,
      cacheTTL = 300000,
      cacheKey,
      timeout = 30000,
      retries = 3
    } = options;

    // 生成缓存键
    const finalCacheKey = cacheKey || this.queryCache.generateKey(sql, params);

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.queryCache.get<T[]>(finalCacheKey);
      if (cached) {
        return cached;
      }
    }

    // 执行查询优化分析
    const optimizedQuery = this.optimizer.optimizeQuery(sql, params);
    
    // 执行查询
    let attempt = 0;
    while (attempt < retries) {
      try {
        const result = await this.connectionPool.execute<T[]>((db) => {
          const stmt = db.prepare(optimizedQuery.sql);
          return stmt.all(...optimizedQuery.params) as T[];
        });

        // 缓存结果
        if (useCache && result) {
          this.queryCache.set(finalCacheKey, result, cacheTTL);
        }

        return result;
      } catch (error) {
        attempt++;
        if (attempt >= retries) {
          console.error(`Query failed after ${retries} attempts:`, error);
          throw error;
        }
        
        // 指数退避重试
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw new Error('Query execution failed');
  }

  /**
   * 执行单个查询
   */
  async queryOne<T>(
    sql: string,
    params: any[] = [],
    options: QueryOptions = {}
  ): Promise<T | null> {
    const results = await this.query<T>(sql, params, options);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * 执行写操作
   */
  async execute(
    sql: string,
    params: any[] = [],
    options: Omit<QueryOptions, 'useCache'> = {}
  ): Promise<{ changes: number; lastInsertRowid: number }> {
    const { timeout = 30000, retries = 3 } = options;

    let attempt = 0;
    while (attempt < retries) {
      try {
        const result = await this.connectionPool.execute((db) => {
          const stmt = db.prepare(sql);
          const info = stmt.run(...params);
          return {
            changes: info.changes,
            lastInsertRowid: Number(info.lastInsertRowid)
          };
        });

        // 清理相关缓存
        this.invalidateRelatedCache(sql);

        return result;
      } catch (error) {
        attempt++;
        if (attempt >= retries) {
          console.error(`Execute failed after ${retries} attempts:`, error);
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw new Error('Execute operation failed');
  }

  /**
   * 执行事务
   */
  async transaction<T>(
    transactionFn: (db: Database.Database) => T,
    options: Omit<QueryOptions, 'useCache'> = {}
  ): Promise<T> {
    const { retries = 3 } = options;

    let attempt = 0;
    while (attempt < retries) {
      try {
        const result = await this.connectionPool.transaction(transactionFn);
        
        // 清理所有缓存（事务可能影响多个表）
        this.clearAllCaches();
        
        return result;
      } catch (error) {
        attempt++;
        if (attempt >= retries) {
          console.error(`Transaction failed after ${retries} attempts:`, error);
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw new Error('Transaction failed');
  }

  /**
   * 分页查询
   */
  async paginate<T>(
    baseQuery: string,
    params: any[] = [],
    options: PaginationOptions & QueryOptions = { page: 1, limit: 20 }
  ): Promise<{
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { page, limit, orderBy, orderDirection = 'ASC', ...queryOptions } = options;
    
    // 构建计数查询
    const countQuery = `SELECT COUNT(*) as total FROM (${baseQuery})`;
    const countResult = await this.queryOne<{ total: number }>(
      countQuery,
      params,
      { ...queryOptions, cacheKey: `count_${queryOptions.cacheKey || this.queryCache.generateKey(baseQuery, params)}` }
    );
    
    const total = countResult?.total || 0;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    // 构建分页查询
    let paginatedQuery = baseQuery;
    if (orderBy) {
      paginatedQuery += ` ORDER BY ${orderBy} ${orderDirection}`;
    }
    paginatedQuery += ` LIMIT ${limit} OFFSET ${offset}`;

    const data = await this.query<T>(paginatedQuery, params, queryOptions);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * 搜索功能
   */
  async search<T>(
    table: string,
    options: SearchOptions & QueryOptions
  ): Promise<{
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const {
      query: searchQuery,
      fields = ['title', 'description'],
      fuzzy = true,
      page,
      limit,
      orderBy,
      orderDirection,
      ...queryOptions
    } = options;

    // 构建搜索条件
    const searchConditions = fields.map(field => {
      if (fuzzy) {
        return `${field} LIKE ?`;
      } else {
        return `${field} = ?`;
      }
    }).join(' OR ');

    const searchParams = fields.map(() => 
      fuzzy ? `%${searchQuery}%` : searchQuery
    );

    const baseQuery = `SELECT * FROM ${table} WHERE ${searchConditions}`;

    return this.paginate<T>(baseQuery, searchParams, {
      page,
      limit,
      orderBy,
      orderDirection,
      ...queryOptions
    });
  }

  /**
   * 音频相关查询（使用专用缓存）
   */
  async getAudios(options: PaginationOptions & QueryOptions = { page: 1, limit: 20 }): Promise<{
    data: any[];
    pagination: any;
  }> {
    const { page, limit, orderBy = 'uploadDate', orderDirection = 'DESC', ...queryOptions } = options;
    
    const baseQuery = `
      SELECT 
        a.*,
        AVG(r.rating) as averageRating,
        COUNT(r.id) as ratingCount,
        COUNT(c.id) as commentCount
      FROM audios a
      LEFT JOIN ratings r ON a.id = r.audioId
      LEFT JOIN comments c ON a.id = c.audioId
      GROUP BY a.id
    `;

    return this.paginate(baseQuery, [], {
      page,
      limit,
      orderBy,
      orderDirection,
      useCache: true,
      cacheTTL: 600000, // 10分钟缓存
      cacheKey: `audios_${page}_${limit}_${orderBy}_${orderDirection}`,
      ...queryOptions
    });
  }

  /**
   * 搜索音频
   */
  async searchAudios(searchQuery: string, options: PaginationOptions & QueryOptions = { page: 1, limit: 20 }): Promise<{
    data: any[];
    pagination: any;
  }> {
    const cacheKey = `search_audios_${this.audioCache.generateKey(searchQuery, [options.page, options.limit])}`;
    
    return this.search('audios', {
      query: searchQuery,
      fields: ['title', 'description', 'subject', 'speaker'],
      fuzzy: true,
      ...options,
      cacheKey,
      cacheTTL: 300000 // 5分钟缓存
    });
  }

  /**
   * 获取用户列表
   */
  async getUsers(options: PaginationOptions & QueryOptions = { page: 1, limit: 20 }): Promise<{
    data: any[];
    pagination: any;
  }> {
    const { page, limit, orderBy = 'createdAt', orderDirection = 'DESC', ...queryOptions } = options;
    
    const baseQuery = `
      SELECT 
        id, username, email, role, status, createdAt, lastLogin,
        (SELECT COUNT(*) FROM comments WHERE userId = users.id) as commentCount,
        (SELECT COUNT(*) FROM ratings WHERE userId = users.id) as ratingCount
      FROM users
    `;

    return this.paginate(baseQuery, [], {
      page,
      limit,
      orderBy,
      orderDirection,
      useCache: true,
      cacheTTL: 180000, // 3分钟缓存
      cacheKey: `users_${page}_${limit}_${orderBy}_${orderDirection}`,
      ...queryOptions
    });
  }

  /**
   * 获取音频详情
   */
  async getAudioById(id: string): Promise<any | null> {
    const cacheKey = `audio_detail_${id}`;
    
    const query = `
      SELECT 
        a.*,
        AVG(r.rating) as averageRating,
        COUNT(r.id) as ratingCount,
        COUNT(c.id) as commentCount
      FROM audios a
      LEFT JOIN ratings r ON a.id = r.audioId
      LEFT JOIN comments c ON a.id = c.audioId
      WHERE a.id = ?
      GROUP BY a.id
    `;

    return this.queryOne(query, [id], {
      useCache: true,
      cacheTTL: 600000, // 10分钟缓存
      cacheKey
    });
  }

  /**
   * 获取热门音频
   */
  async getPopularAudios(limit: number = 10): Promise<any[]> {
    const cacheKey = `popular_audios_${limit}`;
    
    const query = `
      SELECT 
        a.*,
        AVG(r.rating) as averageRating,
        COUNT(r.id) as ratingCount,
        COUNT(c.id) as commentCount
      FROM audios a
      LEFT JOIN ratings r ON a.id = r.audioId
      LEFT JOIN comments c ON a.id = c.audioId
      GROUP BY a.id
      ORDER BY 
        (AVG(r.rating) * COUNT(r.id) + COUNT(c.id)) DESC,
        a.uploadDate DESC
      LIMIT ?
    `;

    return this.query(query, [limit], {
      useCache: true,
      cacheTTL: 1800000, // 30分钟缓存
      cacheKey
    });
  }

  /**
   * 清理相关缓存
   */
  private invalidateRelatedCache(sql: string): void {
    const lowerSQL = sql.toLowerCase();
    
    if (lowerSQL.includes('audios')) {
      this.audioCache.invalidatePattern('.*');
      this.queryCache.invalidatePattern('audios.*');
      this.queryCache.invalidatePattern('search_audios.*');
      this.queryCache.invalidatePattern('popular_audios.*');
    }
    
    if (lowerSQL.includes('users')) {
      this.userCache.invalidatePattern('.*');
      this.queryCache.invalidatePattern('users.*');
    }
    
    if (lowerSQL.includes('comments') || lowerSQL.includes('ratings')) {
      this.audioCache.invalidatePattern('.*');
      this.queryCache.invalidatePattern('audio_detail.*');
      this.queryCache.invalidatePattern('popular_audios.*');
    }
  }

  /**
   * 清理所有缓存
   */
  private clearAllCaches(): void {
    this.queryCache.clear();
    this.audioCache.clear();
    this.userCache.clear();
  }

  /**
   * 获取数据库统计信息
   */
  async getStats(): Promise<{
    connectionPool: any;
    queryCache: any;
    audioCache: any;
    userCache: any;
    slowQueries: any[];
    indexUsage: any[];
  }> {
    return {
      connectionPool: this.connectionPool.getStats(),
      queryCache: this.queryCache.getStats(),
      audioCache: this.audioCache.getStats(),
      userCache: this.userCache.getStats(),
      slowQueries: this.optimizer.getSlowQueryReport(),
      indexUsage: this.optimizer.getIndexUsageStats()
    };
  }

  /**
   * 获取健康状态
   */
  getHealthStatus(): {
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const poolHealth = this.connectionPool.getHealthStatus();
    const cacheHealth = this.queryCache.getHealthStatus();
    const audioCacheHealth = this.audioCache.getHealthStatus();
    const userCacheHealth = this.userCache.getHealthStatus();

    const allIssues = [
      ...poolHealth.issues,
      ...cacheHealth.issues,
      ...audioCacheHealth.issues,
      ...userCacheHealth.issues
    ];

    const allRecommendations = [
      ...poolHealth.recommendations,
      ...cacheHealth.recommendations,
      ...audioCacheHealth.recommendations,
      ...userCacheHealth.recommendations
    ];

    return {
      healthy: allIssues.length === 0,
      issues: allIssues,
      recommendations: allRecommendations
    };
  }

  /**
   * 预热缓存
   */
  async warmupCache(): Promise<void> {
    console.log('Warming up database cache...');
    
    try {
      // 预热热门音频
      await this.getPopularAudios(20);
      
      // 预热最新音频
      await this.getAudios({ page: 1, limit: 20 });
      
      // 预热用户列表
      await this.getUsers({ page: 1, limit: 20 });
      
      console.log('Database cache warmed up successfully');
    } catch (error) {
      console.error('Failed to warm up cache:', error);
    }
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    this.connectionPool.close();
    this.queryCache.close();
    this.audioCache.close();
    this.userCache.close();
  }
}

// 创建全局优化数据库实例
export const optimizedDb = new OptimizedDatabase();