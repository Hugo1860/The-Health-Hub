import { NextRequest, NextResponse } from 'next/server';
import { optimizedDb } from './OptimizedDatabase';
import { queryCache } from './QueryCache';

export interface QueryOptimizationOptions {
  enableCache?: boolean;
  cacheTTL?: number;
  enablePagination?: boolean;
  defaultLimit?: number;
  maxLimit?: number;
  enableQueryAnalysis?: boolean;
  logSlowQueries?: boolean;
  slowQueryThreshold?: number;
}

export interface OptimizedQueryResult<T> {
  data: T;
  meta: {
    executionTime: number;
    cached: boolean;
    queryAnalysis?: any;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    timestamp: string;
  };
}

export class QueryOptimizationMiddleware {
  private options: QueryOptimizationOptions;

  constructor(options: QueryOptimizationOptions = {}) {
    this.options = {
      enableCache: true,
      cacheTTL: 300000, // 5分钟
      enablePagination: true,
      defaultLimit: 20,
      maxLimit: 100,
      enableQueryAnalysis: process.env.NODE_ENV === 'development',
      logSlowQueries: true,
      slowQueryThreshold: 100, // 100ms
      ...options
    };
  }

  /**
   * 优化查询中间件
   */
  async optimizeQuery<T>(
    queryFn: () => Promise<T>,
    cacheKey?: string,
    customOptions?: Partial<QueryOptimizationOptions>
  ): Promise<OptimizedQueryResult<T>> {
    const startTime = performance.now();
    const opts = { ...this.options, ...customOptions };
    
    let data: T;
    let cached = false;
    let queryAnalysis: any = null;

    try {
      // 尝试从缓存获取
      if (opts.enableCache && cacheKey) {
        const cachedResult = queryCache.get<T>(cacheKey);
        if (cachedResult !== null) {
          cached = true;
          data = cachedResult;
        }
      }

      // 如果缓存未命中，执行查询
      if (!cached) {
        data = await queryFn();
        
        // 缓存结果
        if (opts.enableCache && cacheKey && data) {
          queryCache.set(cacheKey, data, opts.cacheTTL);
        }
      }

      const endTime = performance.now();
      const executionTime = Math.round(endTime - startTime);

      // 记录慢查询
      if (opts.logSlowQueries && executionTime > opts.slowQueryThreshold!) {
        console.warn(`Slow query detected: ${executionTime}ms`, {
          cacheKey,
          cached,
          timestamp: new Date().toISOString()
        });
      }

      return {
        data,
        meta: {
          executionTime,
          cached,
          queryAnalysis,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      const endTime = performance.now();
      const executionTime = Math.round(endTime - startTime);

      console.error('Query optimization failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime,
        cacheKey,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  /**
   * 分页查询优化
   */
  async optimizePaginatedQuery<T>(
    baseQuery: string,
    params: any[],
    request: NextRequest,
    customOptions?: Partial<QueryOptimizationOptions>
  ): Promise<OptimizedQueryResult<{
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }>> {
    const opts = { ...this.options, ...customOptions };
    const searchParams = request.nextUrl.searchParams;
    
    // 解析分页参数
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(
      opts.maxLimit!,
      Math.max(1, parseInt(searchParams.get('limit') || opts.defaultLimit!.toString()))
    );
    const orderBy = searchParams.get('orderBy') || 'id';
    const orderDirection = (searchParams.get('orderDirection') || 'DESC').toUpperCase();

    // 生成缓存键
    const cacheKey = opts.enableCache 
      ? `paginated_${queryCache.generateKey(baseQuery, [...params, page, limit, orderBy, orderDirection])}`
      : undefined;

    return this.optimizeQuery(async () => {
      const result = await optimizedDb.paginate<T>(baseQuery, params, {
        page,
        limit,
        orderBy,
        orderDirection: orderDirection as 'ASC' | 'DESC',
        useCache: opts.enableCache,
        cacheTTL: opts.cacheTTL
      });

      return {
        data: result.data,
        pagination: {
          page: result.pagination.page,
          limit: result.pagination.limit,
          total: result.pagination.total,
          totalPages: result.pagination.totalPages,
          hasNext: result.pagination.hasNext,
          hasPrev: result.pagination.hasPrev
        }
      };
    }, cacheKey, customOptions);
  }

  /**
   * 搜索查询优化
   */
  async optimizeSearchQuery<T>(
    table: string,
    request: NextRequest,
    customOptions?: Partial<QueryOptimizationOptions>
  ): Promise<OptimizedQueryResult<{
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }>> {
    const opts = { ...this.options, ...customOptions };
    const searchParams = request.nextUrl.searchParams;
    
    // 解析搜索参数
    const query = searchParams.get('q') || searchParams.get('search') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(
      opts.maxLimit!,
      Math.max(1, parseInt(searchParams.get('limit') || opts.defaultLimit!.toString()))
    );
    const orderBy = searchParams.get('orderBy') || 'id';
    const orderDirection = (searchParams.get('orderDirection') || 'DESC').toUpperCase();

    if (!query.trim()) {
      throw new Error('Search query is required');
    }

    // 生成缓存键
    const cacheKey = opts.enableCache 
      ? `search_${table}_${queryCache.generateKey(query, [page, limit, orderBy, orderDirection])}`
      : undefined;

    return this.optimizeQuery(async () => {
      const result = await optimizedDb.search<T>(table, {
        query,
        page,
        limit,
        orderBy,
        orderDirection: orderDirection as 'ASC' | 'DESC',
        useCache: opts.enableCache,
        cacheTTL: opts.cacheTTL
      });

      return {
        data: result.data,
        pagination: {
          page: result.pagination.page,
          limit: result.pagination.limit,
          total: result.pagination.total,
          totalPages: result.pagination.totalPages,
          hasNext: result.pagination.hasNext,
          hasPrev: result.pagination.hasPrev
        }
      };
    }, cacheKey, customOptions);
  }

  /**
   * API响应包装器
   */
  wrapApiResponse<T>(result: OptimizedQueryResult<T>, success: boolean = true): NextResponse {
    if (success) {
      return NextResponse.json({
        success: true,
        ...result
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Query failed',
        meta: result.meta
      }, { status: 500 });
    }
  }

  /**
   * 错误处理包装器
   */
  handleError(error: unknown, startTime: number): NextResponse {
    const endTime = performance.now();
    const executionTime = Math.round(endTime - startTime);

    console.error('API query failed:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      meta: {
        executionTime,
        cached: false,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

// 创建全局中间件实例
export const queryOptimizer = new QueryOptimizationMiddleware({
  enableCache: true,
  cacheTTL: 300000, // 5分钟
  enablePagination: true,
  defaultLimit: 20,
  maxLimit: 100,
  enableQueryAnalysis: process.env.NODE_ENV === 'development',
  logSlowQueries: true,
  slowQueryThreshold: 100
});

// 音频查询专用优化器
export const audioQueryOptimizer = new QueryOptimizationMiddleware({
  enableCache: true,
  cacheTTL: 600000, // 10分钟，音频数据变化较少
  enablePagination: true,
  defaultLimit: 12, // 音频列表通常显示更少项目
  maxLimit: 50,
  enableQueryAnalysis: process.env.NODE_ENV === 'development',
  logSlowQueries: true,
  slowQueryThreshold: 200 // 音频查询可能更复杂
});

// 用户查询专用优化器
export const userQueryOptimizer = new QueryOptimizationMiddleware({
  enableCache: true,
  cacheTTL: 180000, // 3分钟，用户数据变化较频繁
  enablePagination: true,
  defaultLimit: 25, // 管理界面通常显示更多用户
  maxLimit: 100,
  enableQueryAnalysis: process.env.NODE_ENV === 'development',
  logSlowQueries: true,
  slowQueryThreshold: 50 // 用户查询应该很快
});