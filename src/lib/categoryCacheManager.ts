/**
 * 分类缓存管理器
 * 提供高效的分类数据缓存和更新机制
 */

import { LRUCache } from 'lru-cache';
import {
  Category,
  CategoryTreeNode,
  CategoryStats,
  CategoryQueryParams
} from '@/types/category';

import {
  getAllCategories,
  getCategoryTree,
  getCategoryStatistics
} from '@/lib/categoryQueries';

// 缓存配置
const CACHE_CONFIG = {
  // 分类列表缓存
  CATEGORIES_TTL: 5 * 60 * 1000, // 5分钟
  CATEGORIES_MAX_SIZE: 100,
  
  // 分类树缓存
  TREE_TTL: 5 * 60 * 1000, // 5分钟
  TREE_MAX_SIZE: 10,
  
  // 统计数据缓存
  STATS_TTL: 10 * 60 * 1000, // 10分钟
  STATS_MAX_SIZE: 5,
  
  // 单个分类缓存
  SINGLE_CATEGORY_TTL: 10 * 60 * 1000, // 10分钟
  SINGLE_CATEGORY_MAX_SIZE: 500
};

// 缓存实例
const categoriesCache = new LRUCache<string, Category[]>({
  max: CACHE_CONFIG.CATEGORIES_MAX_SIZE,
  ttl: CACHE_CONFIG.CATEGORIES_TTL
});

const categoryTreeCache = new LRUCache<string, CategoryTreeNode[]>({
  max: CACHE_CONFIG.TREE_MAX_SIZE,
  ttl: CACHE_CONFIG.TREE_TTL
});

const categoryStatsCache = new LRUCache<string, CategoryStats>({
  max: CACHE_CONFIG.STATS_MAX_SIZE,
  ttl: CACHE_CONFIG.STATS_TTL
});

const singleCategoryCache = new LRUCache<string, Category>({
  max: CACHE_CONFIG.SINGLE_CATEGORY_MAX_SIZE,
  ttl: CACHE_CONFIG.SINGLE_CATEGORY_TTL
});

/**
 * 生成缓存键
 */
function generateCacheKey(prefix: string, params: any = {}): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  
  return sortedParams ? `${prefix}:${sortedParams}` : prefix;
}

/**
 * 分类缓存管理器类
 */
export class CategoryCacheManager {
  /**
   * 获取分类列表（带缓存）
   */
  static async getCategoriesWithCache(params: CategoryQueryParams = {}): Promise<Category[]> {
    const cacheKey = generateCacheKey('categories', params);
    
    // 尝试从缓存获取
    let categories = categoriesCache.get(cacheKey);
    
    if (!categories) {
      // 缓存未命中，从数据库获取
      categories = await getAllCategories(params);
      
      // 存入缓存
      categoriesCache.set(cacheKey, categories);
      
      // 同时缓存单个分类
      for (const category of categories) {
        singleCategoryCache.set(category.id, category);
      }
    }
    
    return categories;
  }

  /**
   * 获取分类树（带缓存）
   */
  static async getCategoryTreeWithCache(includeCount: boolean = false): Promise<CategoryTreeNode[]> {
    const cacheKey = generateCacheKey('tree', { includeCount });
    
    // 尝试从缓存获取
    let tree = categoryTreeCache.get(cacheKey);
    
    if (!tree) {
      // 缓存未命中，从数据库获取
      tree = await getCategoryTree(includeCount);
      
      // 存入缓存
      categoryTreeCache.set(cacheKey, tree);
    }
    
    return tree;
  }

  /**
   * 获取分类统计（带缓存）
   */
  static async getCategoryStatsWithCache(): Promise<CategoryStats> {
    const cacheKey = 'stats';
    
    // 尝试从缓存获取
    let stats = categoryStatsCache.get(cacheKey);
    
    if (!stats) {
      // 缓存未命中，从数据库获取
      stats = await getCategoryStatistics();
      
      // 存入缓存
      categoryStatsCache.set(cacheKey, stats);
    }
    
    return stats;
  }

  /**
   * 获取单个分类（带缓存）
   */
  static getCategoryFromCache(categoryId: string): Category | undefined {
    return singleCategoryCache.get(categoryId);
  }

  /**
   * 设置单个分类缓存
   */
  static setCategoryCache(category: Category): void {
    singleCategoryCache.set(category.id, category);
  }

  /**
   * 删除单个分类缓存
   */
  static deleteCategoryCache(categoryId: string): void {
    singleCategoryCache.delete(categoryId);
  }

  /**
   * 清除所有分类相关缓存
   */
  static clearAllCache(): void {
    categoriesCache.clear();
    categoryTreeCache.clear();
    categoryStatsCache.clear();
    singleCategoryCache.clear();
  }

  /**
   * 清除分类列表缓存
   */
  static clearCategoriesCache(): void {
    categoriesCache.clear();
  }

  /**
   * 清除分类树缓存
   */
  static clearTreeCache(): void {
    categoryTreeCache.clear();
  }

  /**
   * 清除统计缓存
   */
  static clearStatsCache(): void {
    categoryStatsCache.clear();
  }

  /**
   * 智能缓存失效
   * 根据操作类型智能清除相关缓存
   */
  static invalidateCache(operation: 'create' | 'update' | 'delete' | 'reorder', categoryId?: string): void {
    switch (operation) {
      case 'create':
        // 创建分类时，清除列表和树缓存，保留统计缓存短时间
        this.clearCategoriesCache();
        this.clearTreeCache();
        setTimeout(() => this.clearStatsCache(), 1000);
        break;

      case 'update':
        // 更新分类时，清除相关缓存
        this.clearCategoriesCache();
        this.clearTreeCache();
        if (categoryId) {
          this.deleteCategoryCache(categoryId);
        }
        break;

      case 'delete':
        // 删除分类时，清除所有缓存
        this.clearAllCache();
        break;

      case 'reorder':
        // 重新排序时，只清除列表和树缓存
        this.clearCategoriesCache();
        this.clearTreeCache();
        break;

      default:
        // 默认清除所有缓存
        this.clearAllCache();
        break;
    }
  }

  /**
   * 预热缓存
   * 预先加载常用的分类数据
   */
  static async warmupCache(): Promise<void> {
    try {
      // 预加载基础分类列表
      await this.getCategoriesWithCache({ includeCount: true });
      
      // 预加载分类树
      await this.getCategoryTreeWithCache(true);
      
      // 预加载统计数据
      await this.getCategoryStatsWithCache();
      
      console.log('分类缓存预热完成');
    } catch (error) {
      console.error('分类缓存预热失败:', error);
    }
  }

  /**
   * 获取缓存统计信息
   */
  static getCacheStats(): {
    categories: { size: number; maxSize: number };
    tree: { size: number; maxSize: number };
    stats: { size: number; maxSize: number };
    singleCategory: { size: number; maxSize: number };
  } {
    return {
      categories: {
        size: categoriesCache.size,
        maxSize: categoriesCache.max
      },
      tree: {
        size: categoryTreeCache.size,
        maxSize: categoryTreeCache.max
      },
      stats: {
        size: categoryStatsCache.size,
        maxSize: categoryStatsCache.max
      },
      singleCategory: {
        size: singleCategoryCache.size,
        maxSize: singleCategoryCache.max
      }
    };
  }

  /**
   * 批量预加载分类
   */
  static async preloadCategories(categoryIds: string[]): Promise<void> {
    // 获取所有分类数据
    const allCategories = await this.getCategoriesWithCache();
    
    // 缓存指定的分类
    for (const categoryId of categoryIds) {
      const category = allCategories.find(cat => cat.id === categoryId);
      if (category) {
        this.setCategoryCache(category);
      }
    }
  }

  /**
   * 检查缓存健康状态
   */
  static checkCacheHealth(): {
    isHealthy: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    const stats = this.getCacheStats();
    
    // 检查缓存使用率
    if (stats.categories.size / stats.categories.maxSize > 0.9) {
      issues.push('分类列表缓存使用率过高');
      recommendations.push('考虑增加分类列表缓存大小');
    }
    
    if (stats.singleCategory.size / stats.singleCategory.maxSize > 0.9) {
      issues.push('单个分类缓存使用率过高');
      recommendations.push('考虑增加单个分类缓存大小');
    }
    
    // 检查缓存命中率（这里简化处理，实际应该统计命中率）
    if (stats.categories.size === 0 && stats.tree.size === 0) {
      issues.push('缓存为空，可能需要预热');
      recommendations.push('执行缓存预热操作');
    }
    
    return {
      isHealthy: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * 定期清理过期缓存
   */
  static scheduleCleanup(): void {
    // 每30分钟清理一次过期缓存
    setInterval(() => {
      try {
        // LRU缓存会自动清理过期项，这里主要是触发清理
        categoriesCache.purgeStale();
        categoryTreeCache.purgeStale();
        categoryStatsCache.purgeStale();
        singleCategoryCache.purgeStale();
        
        console.log('分类缓存定期清理完成');
      } catch (error) {
        console.error('分类缓存清理失败:', error);
      }
    }, 30 * 60 * 1000);
  }
}

// 导出缓存管理器实例
export default CategoryCacheManager;

// 在模块加载时启动定期清理
if (typeof window === 'undefined') {
  // 只在服务端启动定期清理
  CategoryCacheManager.scheduleCleanup();
}