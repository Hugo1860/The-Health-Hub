/**
 * 分类层级管理工具函数
 * 提供分类验证、转换、查询等功能
 */

import {
  Category,
  CategoryLevel,
  CategoryTreeNode,
  CategoryChild,
  CategoryPath,
  CategorySelection,
  CategoryOption,
  CategoryError,
  CategoryErrorCode,
  CategoryValidationResult,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategoryStats,
  CategoryFilter
} from '@/types/category';

// 分类层级常量
export const CATEGORY_CONSTANTS = {
  MAX_DEPTH: 2,
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_SUBCATEGORIES_PER_PARENT: 50,
  DEFAULT_COLOR: '#6b7280',
  DEFAULT_ICON: '📂'
} as const;

/**
 * 验证分类数据
 */
export function validateCategory(
  data: CreateCategoryRequest | UpdateCategoryRequest,
  existingCategories: Category[] = [],
  currentCategoryId?: string
): CategoryValidationResult {
  const errors: CategoryError[] = [];
  const warnings: string[] = [];

  // 验证名称
  if ('name' in data && data.name !== undefined) {
    if (!data.name || data.name.trim().length === 0) {
      errors.push({
        code: CategoryErrorCode.INVALID_HIERARCHY,
        message: '分类名称不能为空',
        field: 'name'
      });
    } else if (data.name.length > CATEGORY_CONSTANTS.MAX_NAME_LENGTH) {
      errors.push({
        code: CategoryErrorCode.INVALID_HIERARCHY,
        message: `分类名称不能超过 ${CATEGORY_CONSTANTS.MAX_NAME_LENGTH} 个字符`,
        field: 'name'
      });
    }

    // 检查同层级重名
    const parentId = data.parentId || null;
    const duplicateCategory = existingCategories.find(cat => 
      cat.name === data.name && 
      cat.parentId === parentId &&
      cat.id !== currentCategoryId
    );

    if (duplicateCategory) {
      errors.push({
        code: CategoryErrorCode.DUPLICATE_NAME,
        message: '同层级下已存在相同名称的分类',
        field: 'name'
      });
    }
  }

  // 验证描述长度
  if (data.description && data.description.length > CATEGORY_CONSTANTS.MAX_DESCRIPTION_LENGTH) {
    errors.push({
      code: CategoryErrorCode.INVALID_HIERARCHY,
      message: `分类描述不能超过 ${CATEGORY_CONSTANTS.MAX_DESCRIPTION_LENGTH} 个字符`,
      field: 'description'
    });
  }

  // 验证父分类
  if (data.parentId) {
    const parentCategory = existingCategories.find(cat => cat.id === data.parentId);
    
    if (!parentCategory) {
      errors.push({
        code: CategoryErrorCode.PARENT_NOT_FOUND,
        message: '指定的父分类不存在',
        field: 'parentId'
      });
    } else if (parentCategory.level !== CategoryLevel.PRIMARY) {
      errors.push({
        code: CategoryErrorCode.INVALID_LEVEL,
        message: '只能在一级分类下创建二级分类',
        field: 'parentId'
      });
    } else {
      // 检查子分类数量限制
      const siblingCount = existingCategories.filter(cat => 
        cat.parentId === data.parentId && cat.id !== currentCategoryId
      ).length;

      if (siblingCount >= CATEGORY_CONSTANTS.MAX_SUBCATEGORIES_PER_PARENT) {
        warnings.push(`该一级分类下的二级分类数量已达到 ${CATEGORY_CONSTANTS.MAX_SUBCATEGORIES_PER_PARENT} 个上限`);
      }
    }

    // 防止循环引用
    if (currentCategoryId && data.parentId === currentCategoryId) {
      errors.push({
        code: CategoryErrorCode.CIRCULAR_REFERENCE,
        message: '不能将分类设置为自己的子分类',
        field: 'parentId'
      });
    }
  }

  // 验证颜色格式
  if (data.color && !/^#[0-9A-Fa-f]{6}$/.test(data.color)) {
    errors.push({
      code: CategoryErrorCode.INVALID_HIERARCHY,
      message: '颜色格式不正确，请使用十六进制格式（如 #FF0000）',
      field: 'color'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 构建分类树结构
 */
export function buildCategoryTree(categories: Category[]): CategoryTreeNode[] {
  // 筛选出一级分类
  const primaryCategories = categories.filter(cat => cat.level === CategoryLevel.PRIMARY);
  
  // 构建树结构
  return primaryCategories
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(primary => {
      // 查找子分类
      const children = categories
        .filter(cat => cat.parentId === primary.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(child => ({
          ...child,
          parentId: child.parentId!,
          level: CategoryLevel.SECONDARY as const,
          audioCount: child.audioCount || 0
        }));

      return {
        ...primary,
        level: CategoryLevel.PRIMARY as const,
        audioCount: primary.audioCount || 0,
        children
      };
    });
}

/**
 * 扁平化分类树
 */
export function flattenCategoryTree(tree: CategoryTreeNode[]): Category[] {
  const result: Category[] = [];
  
  tree.forEach(node => {
    result.push(node);
    result.push(...node.children);
  });
  
  return result;
}

/**
 * 获取分类路径
 */
export function getCategoryPath(
  categories: Category[],
  categoryId?: string,
  subcategoryId?: string
): CategoryPath {
  const breadcrumb: string[] = [];
  let category: Category | undefined;
  let subcategory: Category | undefined;

  if (subcategoryId) {
    subcategory = categories.find(cat => cat.id === subcategoryId);
    if (subcategory && subcategory.parentId) {
      category = categories.find(cat => cat.id === subcategory!.parentId);
    }
  } else if (categoryId) {
    category = categories.find(cat => cat.id === categoryId);
  }

  if (category) {
    breadcrumb.push(category.name);
  }
  
  if (subcategory) {
    breadcrumb.push(subcategory.name);
  }

  return {
    category,
    subcategory,
    breadcrumb
  };
}

/**
 * 生成分类选项列表
 */
export function generateCategoryOptions(
  categories: Category[],
  level?: CategoryLevel,
  includeInactive: boolean = false
): CategoryOption[] {
  let filteredCategories = categories;

  // 按层级筛选
  if (level !== undefined) {
    filteredCategories = categories.filter(cat => cat.level === level);
  }

  // 按激活状态筛选
  if (!includeInactive) {
    filteredCategories = filteredCategories.filter(cat => cat.isActive);
  }

  return filteredCategories
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(category => ({
      label: category.name,
      value: category.id,
      key: category.id,
      title: category.description,
      level: category.level,
      parentId: category.parentId || undefined,
      disabled: !category.isActive
    }));
}

/**
 * 生成层级分类选项（树形结构）
 */
export function generateHierarchicalOptions(
  tree: CategoryTreeNode[],
  includeInactive: boolean = false
): CategoryOption[] {
  return tree
    .filter(node => includeInactive || node.isActive)
    .map(node => ({
      label: node.name,
      value: node.id,
      key: node.id,
      title: node.description,
      level: CategoryLevel.PRIMARY,
      disabled: !node.isActive,
      children: node.children
        .filter(child => includeInactive || child.isActive)
        .map(child => ({
          label: child.name,
          value: child.id,
          key: child.id,
          title: child.description,
          level: CategoryLevel.SECONDARY,
          parentId: child.parentId,
          disabled: !child.isActive
        }))
    }));
}

/**
 * 获取子分类选项
 */
export function getSubcategoryOptions(
  categories: Category[],
  parentId: string,
  includeInactive: boolean = false
): CategoryOption[] {
  return categories
    .filter(cat => 
      cat.parentId === parentId && 
      cat.level === CategoryLevel.SECONDARY &&
      (includeInactive || cat.isActive)
    )
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(category => ({
      label: category.name,
      value: category.id,
      key: category.id,
      title: category.description,
      level: CategoryLevel.SECONDARY,
      parentId: category.parentId || undefined,
      disabled: !category.isActive
    }));
}

/**
 * 计算分类统计信息
 */
export function calculateCategoryStats(categories: Category[]): CategoryStats {
  const totalCategories = categories.length;
  const level1Count = categories.filter(cat => cat.level === CategoryLevel.PRIMARY).length;
  const level2Count = categories.filter(cat => cat.level === CategoryLevel.SECONDARY).length;
  const activeCount = categories.filter(cat => cat.isActive).length;
  const inactiveCount = totalCategories - activeCount;
  const categoriesWithAudio = categories.filter(cat => (cat.audioCount || 0) > 0).length;
  const emptyCategoriesCount = totalCategories - categoriesWithAudio;

  return {
    totalCategories,
    level1Count,
    level2Count,
    activeCount,
    inactiveCount,
    categoriesWithAudio,
    emptyCategoriesCount
  };
}

/**
 * 筛选分类
 */
export function filterCategories(
  categories: Category[],
  filter: CategoryFilter
): Category[] {
  return categories.filter(category => {
    // 按分类ID筛选
    if (filter.categoryId && category.id !== filter.categoryId && category.parentId !== filter.categoryId) {
      return false;
    }

    // 按子分类ID筛选
    if (filter.subcategoryId && category.id !== filter.subcategoryId) {
      return false;
    }

    // 按层级筛选
    if (filter.level !== undefined && category.level !== filter.level) {
      return false;
    }

    // 按激活状态筛选
    if (filter.isActive !== undefined && category.isActive !== filter.isActive) {
      return false;
    }

    // 按是否有音频筛选
    if (filter.hasAudio !== undefined) {
      const hasAudio = (category.audioCount || 0) > 0;
      if (hasAudio !== filter.hasAudio) {
        return false;
      }
    }

    return true;
  });
}

/**
 * 搜索分类
 */
export function searchCategories(
  categories: Category[],
  searchTerm: string,
  searchFields: (keyof Category)[] = ['name', 'description']
): Category[] {
  if (!searchTerm.trim()) {
    return categories;
  }

  const term = searchTerm.toLowerCase().trim();
  
  return categories.filter(category => {
    return searchFields.some(field => {
      const value = category[field];
      if (typeof value === 'string') {
        return value.toLowerCase().includes(term);
      }
      return false;
    });
  });
}

/**
 * 验证分类选择的一致性
 */
export function validateCategorySelection(
  selection: CategorySelection,
  categories: Category[]
): CategoryValidationResult {
  const errors: CategoryError[] = [];

  if (selection.subcategoryId && !selection.categoryId) {
    errors.push({
      code: CategoryErrorCode.DATA_INCONSISTENCY,
      message: '选择子分类时必须同时选择父分类'
    });
  }

  if (selection.categoryId && selection.subcategoryId) {
    const category = categories.find(cat => cat.id === selection.categoryId);
    const subcategory = categories.find(cat => cat.id === selection.subcategoryId);

    if (!category) {
      errors.push({
        code: CategoryErrorCode.PARENT_NOT_FOUND,
        message: '指定的一级分类不存在'
      });
    }

    if (!subcategory) {
      errors.push({
        code: CategoryErrorCode.PARENT_NOT_FOUND,
        message: '指定的二级分类不存在'
      });
    }

    if (category && subcategory && subcategory.parentId !== category.id) {
      errors.push({
        code: CategoryErrorCode.DATA_INCONSISTENCY,
        message: '选择的子分类不属于指定的父分类'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 生成分类ID
 */
export function generateCategoryId(name: string, parentId?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  const prefix = parentId ? 'subcategory' : 'category';
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * 检查分类是否可以删除
 */
export function canDeleteCategory(
  categoryId: string,
  categories: Category[]
): { canDelete: boolean; reason?: string } {
  const category = categories.find(cat => cat.id === categoryId);
  
  if (!category) {
    return { canDelete: false, reason: '分类不存在' };
  }

  // 检查是否有子分类
  const hasChildren = categories.some(cat => cat.parentId === categoryId);
  if (hasChildren) {
    return { canDelete: false, reason: '该分类下还有子分类，请先删除子分类' };
  }

  // 检查是否有关联音频
  if ((category.audioCount || 0) > 0) {
    return { canDelete: false, reason: '该分类下还有音频内容，无法删除' };
  }

  return { canDelete: true };
}

/**
 * 获取分类的完整路径字符串
 */
export function getCategoryPathString(
  categories: Category[],
  categoryId?: string,
  subcategoryId?: string,
  separator: string = ' > '
): string {
  const path = getCategoryPath(categories, categoryId, subcategoryId);
  return path.breadcrumb.join(separator);
}