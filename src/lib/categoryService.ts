/**
 * 分类服务层
 * 提供完整的分类业务逻辑和操作接口
 */

import {
  Category,
  CategoryLevel,
  CategoryTreeNode,
  CategoryStats,
  CategoryQueryParams,
  CategoryReorderRequest,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategoryOperationResult,
  CategoryValidationResult,
  CategorySelection,
  CategoryOption,
  CategoryPath,
  CategoryFilter
} from '@/types/category';

import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  batchDeleteCategories,
  getCategoryTree,
  reorderCategories,
  getCategoryStatistics,
  searchCategories,
  isCategoryNameAvailable,
  getSubcategories,
  moveCategory,
  batchUpdateCategoryStatus
} from '@/lib/categoryQueriesFixed';

import {
  validateCategoryHierarchy,
  validateCreateCategoryRequest,
  validateUpdateCategoryRequest,
  validateCategoryDeletion,
  validateCategorySelection,
  validateBatchOperation
} from '@/lib/categoryValidation';

import {
  buildCategoryTree,
  getCategoryPath,
  generateCategoryOptions,
  getSubcategoryOptions as getSubcategoryOptionsUtil,
  calculateCategoryStats,
  filterCategories,
  searchCategories as searchCategoriesUtil
} from '@/lib/categoryUtils';

import CategoryCacheManager from '@/lib/categoryCacheManager';
import CategoryQueryOptimizer from '@/lib/categoryQueryOptimizer';

/**
 * 分类服务类
 */
export class CategoryService {
  /**
   * 获取所有分类
   */
  static async getCategories(params: CategoryQueryParams = {}): Promise<Category[]> {
    try {
      // 优先使用优化查询器
      return await CategoryQueryOptimizer.getCategoriesOptimized(params);
    } catch (error) {
      console.error('获取分类列表失败:', error);
      // 降级到缓存管理器
      try {
        return await CategoryCacheManager.getCategoriesWithCache(params);
      } catch (fallbackError) {
        console.error('降级查询也失败:', fallbackError);
        throw new Error('获取分类列表失败');
      }
    }
  }

  /**
   * 获取分类树
   */
  static async getCategoryTree(includeCount: boolean = false): Promise<CategoryTreeNode[]> {
    try {
      // 优先使用优化查询器
      return await CategoryQueryOptimizer.getCategoryTreeOptimized(includeCount);
    } catch (error) {
      console.error('获取分类树失败:', error);
      // 降级到缓存管理器
      try {
        return await CategoryCacheManager.getCategoryTreeWithCache(includeCount);
      } catch (fallbackError) {
        console.error('降级查询也失败:', fallbackError);
        throw new Error('获取分类树失败');
      }
    }
  }

  /**
   * 根据ID获取分类
   */
  static async getCategoryById(id: string): Promise<Category | null> {
    try {
      // 先尝试从缓存获取
      let category = CategoryCacheManager.getCategoryFromCache(id);
      
      if (!category) {
        // 缓存未命中，从数据库获取
        category = await getCategoryById(id);
        
        if (category) {
          // 存入缓存
          CategoryCacheManager.setCategoryCache(category);
        }
      }
      
      return category;
    } catch (error) {
      console.error('获取分类详情失败:', error);
      throw new Error('获取分类详情失败');
    }
  }

  /**
   * 创建分类
   */
  static async createCategory(data: CreateCategoryRequest): Promise<CategoryOperationResult> {
    try {
      // 获取现有分类进行验证
      const existingCategories = await this.getCategories({ includeInactive: true });
      
      // 验证请求数据
      const validation = validateCreateCategoryRequest(data, existingCategories);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors[0]
        };
      }

      // 创建分类
      const newCategory = await createCategory(data);
      
      // 清除相关缓存
      CategoryCacheManager.invalidateCache('create');
      CategoryQueryOptimizer.clearCache();
      
      return {
        success: true,
        data: newCategory,
        message: '分类创建成功'
      };
    } catch (error) {
      console.error('创建分类失败:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR' as any,
          message: error instanceof Error ? error.message : '创建分类失败'
        }
      };
    }
  }

  /**
   * 更新分类
   */
  static async updateCategory(id: string, data: UpdateCategoryRequest): Promise<CategoryOperationResult> {
    try {
      // 获取现有分类进行验证
      const existingCategories = await this.getCategories({ includeInactive: true });
      
      // 验证请求数据
      const validation = validateUpdateCategoryRequest(id, data, existingCategories);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors[0]
        };
      }

      // 更新分类
      const updatedCategory = await updateCategory(id, data);
      
      // 清除相关缓存
      CategoryCacheManager.invalidateCache('update', id);
      CategoryQueryOptimizer.clearCache();
      
      return {
        success: true,
        data: updatedCategory,
        message: '分类更新成功'
      };
    } catch (error) {
      console.error('更新分类失败:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR' as any,
          message: error instanceof Error ? error.message : '更新分类失败'
        }
      };
    }
  }

  /**
   * 删除分类
   */
  static async deleteCategory(
    id: string, 
    options: { force?: boolean; cascade?: boolean } = {}
  ): Promise<CategoryOperationResult> {
    try {
      // 使用简化的删除函数
      const { deleteCategory: simpleDelete } = await import('@/lib/categoryDeleteSimple');
      
      // 如果是级联删除，先删除子分类
      if (options.cascade) {
        const existingCategories = await this.getCategories({ includeInactive: true });
        const category = existingCategories.find(cat => cat.id === id);
        if (category && category.level === CategoryLevel.PRIMARY) {
          const childCategories = existingCategories.filter(cat => cat.parentId === id);
          
          // 递归删除子分类
          for (const child of childCategories) {
            await simpleDelete(child.id, { force: true });
          }
        }
      }

      // 删除分类
      await simpleDelete(id, { force: options.force });
      
      // 清除相关缓存
      CategoryCacheManager.invalidateCache('delete', id);
      CategoryQueryOptimizer.clearCache();
      
      return {
        success: true,
        message: '分类删除成功'
      };
    } catch (error) {
      console.error('删除分类失败:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR' as any,
          message: error instanceof Error ? error.message : '删除分类失败'
        }
      };
    }
  }

  /**
   * 重新排序分类
   */
  static async reorderCategories(requests: CategoryReorderRequest[]): Promise<CategoryOperationResult> {
    try {
      if (requests.length === 0) {
        return {
          success: true,
          message: '无需排序'
        };
      }

      // 执行排序
      await reorderCategories(requests);
      
      // 清除相关缓存
      CategoryCacheManager.invalidateCache('reorder');
      
      return {
        success: true,
        message: '分类排序更新成功'
      };
    } catch (error) {
      console.error('重新排序分类失败:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR' as any,
          message: error instanceof Error ? error.message : '重新排序分类失败'
        }
      };
    }
  }

  /**
   * 获取分类统计
   */
  static async getCategoryStats(): Promise<CategoryStats> {
    try {
      // 优先使用优化查询器
      return await CategoryQueryOptimizer.getCategoryStatsOptimized();
    } catch (error) {
      console.error('获取分类统计失败:', error);
      // 降级到缓存管理器
      try {
        return await CategoryCacheManager.getCategoryStatsWithCache();
      } catch (fallbackError) {
        console.error('降级查询也失败:', fallbackError);
        throw new Error('获取分类统计失败');
      }
    }
  }

  /**
   * 搜索分类
   */
  static async searchCategories(
    searchTerm: string,
    options: {
      includeInactive?: boolean;
      level?: CategoryLevel;
      limit?: number;
    } = {}
  ): Promise<Category[]> {
    try {
      if (!searchTerm.trim()) {
        return [];
      }

      // 优先使用优化查询器
      return await CategoryQueryOptimizer.searchCategoriesOptimized(searchTerm, options);
    } catch (error) {
      console.error('搜索分类失败:', error);
      // 降级到原始查询
      try {
        return await searchCategories(searchTerm, options);
      } catch (fallbackError) {
        console.error('降级搜索也失败:', fallbackError);
        throw new Error('搜索分类失败');
      }
    }
  }

  /**
   * 检查分类名称是否可用
   */
  static async isCategoryNameAvailable(
    name: string,
    parentId?: string,
    excludeId?: string
  ): Promise<boolean> {
    try {
      return await isCategoryNameAvailable(name, parentId, excludeId);
    } catch (error) {
      console.error('检查分类名称可用性失败:', error);
      return false;
    }
  }

  /**
   * 获取子分类列表
   */
  static async getSubcategories(
    parentId: string,
    includeInactive: boolean = false
  ): Promise<Category[]> {
    try {
      const subcategories = await getSubcategories(parentId, includeInactive);
      return subcategories;
    } catch (error) {
      console.error('获取子分类失败:', error);
      throw new Error('获取子分类失败');
    }
  }

  /**
   * 移动分类
   */
  static async moveCategory(categoryId: string, newParentId?: string): Promise<CategoryOperationResult> {
    try {
      const movedCategory = await moveCategory(categoryId, newParentId);
      
      // 清除相关缓存
      CategoryCacheManager.invalidateCache('update', categoryId);
      
      return {
        success: true,
        data: movedCategory,
        message: '分类移动成功'
      };
    } catch (error) {
      console.error('移动分类失败:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR' as any,
          message: error instanceof Error ? error.message : '移动分类失败'
        }
      };
    }
  }

  /**
   * 批量删除分类
   */
  static async batchDeleteCategories(
    categoryIds: string[],
    options: { force?: boolean; cascade?: boolean } = {}
  ): Promise<CategoryOperationResult> {
    try {
      if (categoryIds.length === 0) {
        return {
          success: true,
          message: '无需删除'
        };
      }

      const { batchDeleteCategories: simpleBatchDelete } = await import('@/lib/categoryDeleteSimple');
      const result = await simpleBatchDelete(categoryIds, options);
      
      // 清除相关缓存
      CategoryCacheManager.invalidateCache('delete');
      CategoryQueryOptimizer.clearCache();
      
      if (result.failed.length === 0) {
        return {
          success: true,
          message: `成功删除 ${result.success.length} 个分类`
        };
      } else if (result.success.length === 0) {
        return {
          success: false,
          error: {
            code: 'BATCH_DELETE_FAILED' as any,
            message: '所有分类删除失败',
            details: result.failed
          }
        };
      } else {
        return {
          success: true,
          message: `成功删除 ${result.success.length} 个分类，${result.failed.length} 个失败`,
          data: result
        };
      }
    } catch (error) {
      console.error('批量删除分类失败:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR' as any,
          message: error instanceof Error ? error.message : '批量删除分类失败'
        }
      };
    }
  }

  /**
   * 批量更新分类状态
   */
  static async batchUpdateCategoryStatus(
    categoryIds: string[],
    isActive: boolean
  ): Promise<CategoryOperationResult> {
    try {
      if (categoryIds.length === 0) {
        return {
          success: true,
          message: '无需更新'
        };
      }

      await batchUpdateCategoryStatus(categoryIds, isActive);
      
      // 清除相关缓存
      CategoryCacheManager.invalidateCache('update');
      
      return {
        success: true,
        message: `批量${isActive ? '激活' : '停用'}分类成功`
      };
    } catch (error) {
      console.error('批量更新分类状态失败:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR' as any,
          message: error instanceof Error ? error.message : '批量更新分类状态失败'
        }
      };
    }
  }

  /**
   * 验证分类层级结构
   */
  static async validateHierarchy(): Promise<CategoryValidationResult> {
    try {
      const categories = await this.getCategories({ includeInactive: true });
      return validateCategoryHierarchy(categories);
    } catch (error) {
      console.error('验证分类层级结构失败:', error);
      return {
        isValid: false,
        errors: [{
          code: 'INTERNAL_ERROR' as any,
          message: '验证分类层级结构失败'
        }]
      };
    }
  }

  /**
   * 验证分类选择
   */
  static async validateSelection(selection: CategorySelection): Promise<CategoryValidationResult> {
    try {
      const categories = await this.getCategories();
      return validateCategorySelection(selection, categories);
    } catch (error) {
      console.error('验证分类选择失败:', error);
      return {
        isValid: false,
        errors: [{
          code: 'INTERNAL_ERROR' as any,
          message: '验证分类选择失败'
        }]
      };
    }
  }

  /**
   * 获取分类路径
   */
  static async getCategoryPath(categoryId?: string, subcategoryId?: string): Promise<CategoryPath> {
    try {
      const categories = await this.getCategories();
      return getCategoryPath(categories, categoryId, subcategoryId);
    } catch (error) {
      console.error('获取分类路径失败:', error);
      return {
        breadcrumb: []
      };
    }
  }

  /**
   * 获取分类选项列表
   */
  static async getCategoryOptions(level?: CategoryLevel): Promise<CategoryOption[]> {
    try {
      const categories = await this.getCategories();
      return generateCategoryOptions(categories, level);
    } catch (error) {
      console.error('获取分类选项失败:', error);
      return [];
    }
  }

  /**
   * 获取子分类选项列表
   */
  static async getSubcategoryOptions(parentId: string): Promise<CategoryOption[]> {
    try {
      const categories = await this.getCategories();
      return getSubcategoryOptionsUtil(categories, parentId);
    } catch (error) {
      console.error('获取子分类选项失败:', error);
      return [];
    }
  }

  /**
   * 筛选分类
   */
  static async filterCategories(filter: CategoryFilter): Promise<Category[]> {
    try {
      const categories = await this.getCategories({ includeInactive: true });
      return filterCategories(categories, filter);
    } catch (error) {
      console.error('筛选分类失败:', error);
      return [];
    }
  }

  /**
   * 获取热门分类（按音频数量排序）
   */
  static async getPopularCategories(limit: number = 10): Promise<Category[]> {
    try {
      const categories = await this.getCategories({ includeCount: true });
      
      return categories
        .filter(cat => cat.isActive && (cat.audioCount || 0) > 0)
        .sort((a, b) => (b.audioCount || 0) - (a.audioCount || 0))
        .slice(0, limit);
    } catch (error) {
      console.error('获取热门分类失败:', error);
      return [];
    }
  }

  /**
   * 获取空分类（没有音频的分类）
   */
  static async getEmptyCategories(): Promise<Category[]> {
    try {
      const categories = await this.getCategories({ includeCount: true });
      
      return categories.filter(cat => (cat.audioCount || 0) === 0);
    } catch (error) {
      console.error('获取空分类失败:', error);
      return [];
    }
  }

  /**
   * 预热缓存
   */
  static async warmupCache(): Promise<void> {
    try {
      // 预热优化查询器缓存
      await CategoryQueryOptimizer.warmupCache();
      
      // 预热传统缓存管理器
      await CategoryCacheManager.warmupCache();
    } catch (error) {
      console.error('预热分类缓存失败:', error);
    }
  }

  /**
   * 清除缓存
   */
  static clearCache(pattern?: string): void {
    CategoryCacheManager.clearAllCache();
    CategoryQueryOptimizer.clearCache(pattern);
  }

  /**
   * 获取缓存统计
   */
  static getCacheStats() {
    return CategoryCacheManager.getCacheStats();
  }

  /**
   * 检查缓存健康状态
   */
  static checkCacheHealth() {
    return CategoryCacheManager.checkCacheHealth();
  }

  /**
   * 导出分类数据
   */
  static async exportCategories(): Promise<{
    categories: Category[];
    stats: CategoryStats;
    exportTime: string;
    version: string;
  }> {
    try {
      const [categories, stats] = await Promise.all([
        this.getCategories({ includeInactive: true, includeCount: true }),
        this.getCategoryStats()
      ]);

      return {
        categories,
        stats,
        exportTime: new Date().toISOString(),
        version: '1.0'
      };
    } catch (error) {
      console.error('导出分类数据失败:', error);
      throw new Error('导出分类数据失败');
    }
  }

  /**
   * 获取分类使用情况报告
   */
  static async getCategoryUsageReport(): Promise<{
    totalCategories: number;
    activeCategories: number;
    categoriesWithAudio: number;
    emptyCategories: number;
    topCategories: Category[];
    recentlyCreated: Category[];
    recentlyUpdated: Category[];
  }> {
    try {
      const [categories, stats, popularCategories] = await Promise.all([
        this.getCategories({ includeInactive: true, includeCount: true }),
        this.getCategoryStats(),
        this.getPopularCategories(5)
      ]);

      // 最近创建的分类（7天内）
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentlyCreated = categories
        .filter(cat => new Date(cat.createdAt) > sevenDaysAgo)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      // 最近更新的分类（7天内）
      const recentlyUpdated = categories
        .filter(cat => new Date(cat.updatedAt) > sevenDaysAgo && cat.createdAt !== cat.updatedAt)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5);

      return {
        totalCategories: stats.totalCategories,
        activeCategories: stats.activeCount,
        categoriesWithAudio: stats.categoriesWithAudio,
        emptyCategories: stats.emptyCategoriesCount,
        topCategories: popularCategories,
        recentlyCreated,
        recentlyUpdated
      };
    } catch (error) {
      console.error('获取分类使用情况报告失败:', error);
      throw new Error('获取分类使用情况报告失败');
    }
  }
}

// 导出服务实例
export default CategoryService;