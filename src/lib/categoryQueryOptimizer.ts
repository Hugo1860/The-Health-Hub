/**
 * 分类查询优化器
 * 
 * 功能：
 * 1. 高性能分类树查询
 * 2. 智能缓存管理
 * 3. 查询结果优化
 * 4. 批量操作优化
 */

import db from '@/lib/db';
import {
  Category,
  CategoryLevel,
  CategoryTreeNode,
  CategoryChild,
  CategoryStats,
  CategoryQueryParams
} from '@/types/category';

/**
 * 查询性能统计
 */
interface QueryPerformanceStats {
  queryType: string;
  executionTime: number;
  cacheHit: boolean;
  resultCount: number;
  timestamp: number;
}

/**
 * 缓存配置
 */
interface CacheConfig {
  ttl: number; // 缓存时间 (毫秒)
  maxSize: number; // 最大缓存条目数
  enabled: boolean;
}

/**
 * 查询结果缓存
 */
class QueryCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };

  constructor(config: CacheConfig) {
    this.config = config;
  }

  /**
   * 生成缓存键
   */
  private generateKey(queryType: string, params: any): string {
    return `${queryType}:${JSON.stringify(params)}`;
  }

  /**
   * 获取缓存数据
   */
  get<T>(queryType: string, params: any): T | null {
    if (!this.config.enabled) {
      return null;
    }

    const key = this.generateKey(queryType, params);
    const cached = this.cache.get(key);

    if (!cached) {
      this.stats.misses++;
      return null;
    }

    // 检查是否过期
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return cached.data;
  }

  /**
   * 设置缓存数据
   */
  set(queryType: string, params: any, data: any, customTtl?: number): void {
    if (!this.config.enabled) {
      return;
    }

    const key = this.generateKey(queryType, params);
    const ttl = customTtl || this.config.ttl;

    // 检查缓存大小限制
    if (this.cache.size >= this.config.maxSize) {
      // 删除最旧的条目
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.stats.evictions++;
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * 清除缓存
   */
  clear(pattern?: string): void {
    if (pattern) {
      // 清除匹配模式的缓存
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      // 清除所有缓存
      this.cache.clear();
    }
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }
}

/**
 * 分类查询优化器类
 */
export class CategoryQueryOptimizer {
  private cache: QueryCache;
  private performanceStats: QueryPerformanceStats[] = [];
  private readonly MAX_PERFORMANCE_STATS = 1000;

  constructor() {
    this.cache = new QueryCache({
      ttl: 5 * 60 * 1000, // 5分钟
      maxSize: 100,
      enabled: true
    });
  }

  /**
   * 记录查询性能
   */
  private recordPerformance(
    queryType: string,
    executionTime: number,
    cacheHit: boolean,
    resultCount: number
  ): void {
    const stat: QueryPerformanceStats = {
      queryType,
      executionTime,
      cacheHit,
      resultCount,
      timestamp: Date.now()
    };

    this.performanceStats.push(stat);

    // 保持统计数据在合理范围内
    if (this.performanceStats.length > this.MAX_PERFORMANCE_STATS) {
      this.performanceStats.shift();
    }
  }

  /**
   * 执行优化查询
   */
  private async executeOptimizedQuery<T>(
    queryType: string,
    params: any,
    queryFn: () => Promise<T>,
    customTtl?: number
  ): Promise<T> {
    const startTime = Date.now();

    // 尝试从缓存获取
    const cached = this.cache.get<T>(queryType, params);
    if (cached) {
      const executionTime = Date.now() - startTime;
      this.recordPerformance(queryType, executionTime, true, Array.isArray(cached) ? cached.length : 1);
      return cached;
    }

    // 执行查询
    const result = await queryFn();
    const executionTime = Date.now() - startTime;

    // 缓存结果
    this.cache.set(queryType, params, result, customTtl);

    // 记录性能
    this.recordPerformance(
      queryType,
      executionTime,
      false,
      Array.isArray(result) ? result.length : 1
    );

    return result;
  }

  /**
   * 优化的分类树查询
   */
  async getCategoryTreeOptimized(includeCount: boolean = false): Promise<CategoryTreeNode[]> {
    return this.executeOptimizedQuery(
      'categoryTree',
      { includeCount },
      async () => {
        // 使用单个优化查询获取所有数据
        const query = `
          WITH RECURSIVE category_tree AS (
            -- 获取一级分类
            SELECT 
              c.*,
              ${includeCount ? 'COUNT(DISTINCT a.id)' : '0'} as audio_count,
              1 as tree_level,
              ARRAY[c.sort_order] as sort_path
            FROM categories c
            ${includeCount ? 'LEFT JOIN audios a ON (c.id = a.category_id OR c.id = a.subcategory_id)' : ''}
            WHERE c.parent_id IS NULL AND c.is_active = true
            ${includeCount ? 'GROUP BY c.id' : ''}
            
            UNION ALL
            
            -- 获取二级分类
            SELECT 
              c.*,
              ${includeCount ? 'COUNT(DISTINCT a.id)' : '0'} as audio_count,
              ct.tree_level + 1,
              ct.sort_path || c.sort_order
            FROM categories c
            JOIN category_tree ct ON c.parent_id = ct.id
            ${includeCount ? 'LEFT JOIN audios a ON (c.id = a.category_id OR c.id = a.subcategory_id)' : ''}
            WHERE c.is_active = true
            ${includeCount ? 'GROUP BY c.id, ct.tree_level, ct.sort_path' : ''}
          )
          SELECT * FROM category_tree
          ORDER BY tree_level, sort_path
        `;

        const result = await db.query(query);
        
        // 构建树结构
        const categoryMap = new Map<string, CategoryTreeNode>();
        const rootCategories: CategoryTreeNode[] = [];

        // 第一遍：创建所有节点
        for (const row of result.rows) {
          const category: CategoryTreeNode = {
            id: row.id,
            name: row.name,
            description: row.description,
            color: row.color,
            icon: row.icon,
            level: CategoryLevel.PRIMARY,
            sortOrder: row.sort_order,
            isActive: row.is_active,
            audioCount: parseInt(row.audio_count) || 0,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            children: []
          };

          categoryMap.set(row.id, category);

          if (!row.parent_id) {
            rootCategories.push(category);
          }
        }

        // 第二遍：建立父子关系
        for (const row of result.rows) {
          if (row.parent_id) {
            const parent = categoryMap.get(row.parent_id);
            const child = categoryMap.get(row.id);
            
            if (parent && child) {
              const categoryChild: CategoryChild = {
                ...child,
                parentId: row.parent_id,
                level: CategoryLevel.SECONDARY
              };
              parent.children.push(categoryChild);
            }
          }
        }

        // 排序子分类
        rootCategories.forEach(category => {
          category.children.sort((a, b) => a.sortOrder - b.sortOrder);
        });

        return rootCategories.sort((a, b) => a.sortOrder - b.sortOrder);
      },
      10 * 60 * 1000 // 10分钟缓存
    );
  }

  /**
   * 优化的扁平分类查询
   */
  async getCategoriesOptimized(params: CategoryQueryParams = {}): Promise<Category[]> {
    return this.executeOptimizedQuery(
      'categories',
      params,
      async () => {
        const {
          includeInactive = false,
          includeCount = false,
          parentId,
          level
        } = params;

        let query = `
          SELECT 
            c.*,
            ${includeCount ? 'COUNT(DISTINCT a.id)' : '0'} as audio_count
          FROM categories c
          ${includeCount ? 'LEFT JOIN audios a ON (c.id = a.category_id OR c.id = a.subcategory_id)' : ''}
          WHERE 1=1
        `;

        const queryParams: any[] = [];
        let paramIndex = 1;

        // 筛选条件
        if (!includeInactive) {
          query += ` AND c.is_active = $${paramIndex++}`;
          queryParams.push(true);
        }

        if (parentId !== undefined) {
          if (parentId === null) {
            query += ` AND c.parent_id IS NULL`;
          } else {
            query += ` AND c.parent_id = $${paramIndex++}`;
            queryParams.push(parentId);
          }
        }

        if (level !== undefined) {
          query += ` AND c.level = $${paramIndex++}`;
          queryParams.push(level);
        }

        // 分组和排序
        if (includeCount) {
          query += ` GROUP BY c.id`;
        }
        query += ` ORDER BY c.level, c.sort_order, c.name`;

        const result = await db.query(query, queryParams);
        
        return result.rows.map(row => ({
          id: row.id,
          name: row.name,
          description: row.description,
          color: row.color,
          icon: row.icon,
          parentId: row.parent_id,
          level: row.level,
          sortOrder: row.sort_order,
          isActive: row.is_active,
          audioCount: parseInt(row.audio_count) || 0,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }));
      }
    );
  }

  /**
   * 优化的分类统计查询
   */
  async getCategoryStatsOptimized(): Promise<CategoryStats> {
    return this.executeOptimizedQuery(
      'categoryStats',
      {},
      async () => {
        // 使用单个查询获取所有统计信息
        const query = `
          SELECT 
            COUNT(*) as total_categories,
            COUNT(CASE WHEN level = 1 THEN 1 END) as level1_count,
            COUNT(CASE WHEN level = 2 THEN 1 END) as level2_count,
            COUNT(CASE WHEN is_active = true THEN 1 END) as active_count,
            COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_count,
            (
              SELECT COUNT(DISTINCT c.id)
              FROM categories c
              INNER JOIN audios a ON (c.id = a.category_id OR c.id = a.subcategory_id)
            ) as categories_with_audio,
            (
              SELECT COUNT(*)
              FROM categories c
              WHERE NOT EXISTS (
                SELECT 1 FROM audios a 
                WHERE c.id = a.category_id OR c.id = a.subcategory_id
              )
            ) as empty_categories
          FROM categories
        `;

        const result = await db.query(query);
        const stats = result.rows[0];

        return {
          totalCategories: parseInt(stats.total_categories) || 0,
          level1Count: parseInt(stats.level1_count) || 0,
          level2Count: parseInt(stats.level2_count) || 0,
          activeCount: parseInt(stats.active_count) || 0,
          inactiveCount: parseInt(stats.inactive_count) || 0,
          categoriesWithAudio: parseInt(stats.categories_with_audio) || 0,
          emptyCategoriesCount: parseInt(stats.empty_categories) || 0
        };
      },
      15 * 60 * 1000 // 15分钟缓存
    );
  }

  /**
   * 批量获取分类信息
   */
  async getCategoriesByIdsOptimized(categoryIds: string[]): Promise<Category[]> {
    if (categoryIds.length === 0) {
      return [];
    }

    return this.executeOptimizedQuery(
      'categoriesByIds',
      { categoryIds: categoryIds.sort() }, // 排序确保缓存键一致
      async () => {
        const placeholders = categoryIds.map((_, index) => `$${index + 1}`).join(',');
        const query = `
          SELECT 
            c.*,
            COUNT(DISTINCT a.id) as audio_count
          FROM categories c
          LEFT JOIN audios a ON (c.id = a.category_id OR c.id = a.subcategory_id)
          WHERE c.id IN (${placeholders})
          GROUP BY c.id
          ORDER BY c.level, c.sort_order, c.name
        `;

        const result = await db.query(query, categoryIds);
        
        return result.rows.map(row => ({
          id: row.id,
          name: row.name,
          description: row.description,
          color: row.color,
          icon: row.icon,
          parentId: row.parent_id,
          level: row.level,
          sortOrder: row.sort_order,
          isActive: row.is_active,
          audioCount: parseInt(row.audio_count) || 0,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }));
      }
    );
  }

  /**
   * 优化的分类搜索
   */
  async searchCategoriesOptimized(
    searchTerm: string,
    options: {
      includeInactive?: boolean;
      level?: CategoryLevel;
      limit?: number;
    } = {}
  ): Promise<Category[]> {
    const { includeInactive = false, level, limit = 50 } = options;

    return this.executeOptimizedQuery(
      'searchCategories',
      { searchTerm, includeInactive, level, limit },
      async () => {
        let query = `
          SELECT 
            c.*,
            COUNT(DISTINCT a.id) as audio_count,
            ts_rank(
              to_tsvector('simple', c.name || ' ' || COALESCE(c.description, '')), 
              plainto_tsquery('simple', $1)
            ) as rank
          FROM categories c
          LEFT JOIN audios a ON (c.id = a.category_id OR c.id = a.subcategory_id)
          WHERE (
            c.name ILIKE $2 OR 
            c.description ILIKE $2 OR
            to_tsvector('simple', c.name || ' ' || COALESCE(c.description, '')) @@ plainto_tsquery('simple', $1)
          )
        `;

        const queryParams: any[] = [searchTerm, `%${searchTerm}%`];
        let paramIndex = 3;

        if (!includeInactive) {
          query += ` AND c.is_active = $${paramIndex++}`;
          queryParams.push(true);
        }

        if (level !== undefined) {
          query += ` AND c.level = $${paramIndex++}`;
          queryParams.push(level);
        }

        query += ` 
          GROUP BY c.id
          ORDER BY rank DESC, c.level, c.sort_order, c.name
          LIMIT $${paramIndex}
        `;
        queryParams.push(limit);

        const result = await db.query(query, queryParams);
        
        return result.rows.map(row => ({
          id: row.id,
          name: row.name,
          description: row.description,
          color: row.color,
          icon: row.icon,
          parentId: row.parent_id,
          level: row.level,
          sortOrder: row.sort_order,
          isActive: row.is_active,
          audioCount: parseInt(row.audio_count) || 0,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }));
      },
      2 * 60 * 1000 // 2分钟缓存（搜索结果变化较快）
    );
  }

  /**
   * 预热缓存
   */
  async warmupCache(): Promise<void> {
    console.log('开始预热分类查询缓存...');

    try {
      // 预热常用查询
      await Promise.all([
        this.getCategoryTreeOptimized(true),
        this.getCategoryTreeOptimized(false),
        this.getCategoriesOptimized({ includeCount: true }),
        this.getCategoriesOptimized({ level: CategoryLevel.PRIMARY }),
        this.getCategoriesOptimized({ level: CategoryLevel.SECONDARY }),
        this.getCategoryStatsOptimized()
      ]);

      console.log('分类查询缓存预热完成');
    } catch (error) {
      console.error('分类查询缓存预热失败:', error);
    }
  }

  /**
   * 清除缓存
   */
  clearCache(pattern?: string): void {
    this.cache.clear(pattern);
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats(): {
    cache: any;
    queries: QueryPerformanceStats[];
    summary: {
      totalQueries: number;
      averageExecutionTime: number;
      cacheHitRate: number;
      slowQueries: QueryPerformanceStats[];
    };
  } {
    const cacheStats = this.cache.getStats();
    const totalQueries = this.performanceStats.length;
    const averageExecutionTime = totalQueries > 0 
      ? this.performanceStats.reduce((sum, stat) => sum + stat.executionTime, 0) / totalQueries
      : 0;
    
    const cacheHits = this.performanceStats.filter(stat => stat.cacheHit).length;
    const cacheHitRate = totalQueries > 0 ? cacheHits / totalQueries : 0;
    
    const slowQueries = this.performanceStats
      .filter(stat => stat.executionTime > 100) // 超过100ms的查询
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10);

    return {
      cache: cacheStats,
      queries: this.performanceStats.slice(-50), // 最近50个查询
      summary: {
        totalQueries,
        averageExecutionTime,
        cacheHitRate,
        slowQueries
      }
    };
  }

  /**
   * 配置缓存
   */
  configureCaching(config: Partial<CacheConfig>): void {
    Object.assign(this.cache['config'], config);
  }
}

// 导出单例实例
export default new CategoryQueryOptimizer();