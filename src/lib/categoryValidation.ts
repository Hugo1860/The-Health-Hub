/**
 * 分类层级验证函数
 * 提供完整的分类数据验证和业务规则检查
 */

import {
  Category,
  CategoryLevel,
  CategoryError,
  CategoryErrorCode,
  CategoryValidationResult,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategorySelection
} from '@/types/category';

import { CATEGORY_CONSTANTS } from '@/lib/categoryUtils';

/**
 * 验证分类层级结构
 */
export function validateCategoryHierarchy(categories: Category[]): CategoryValidationResult {
  const errors: CategoryError[] = [];
  const warnings: string[] = [];

  // 检查层级一致性
  for (const category of categories) {
    // 一级分类不应该有父分类
    if (category.level === CategoryLevel.PRIMARY && category.parentId) {
      errors.push({
        code: CategoryErrorCode.INVALID_HIERARCHY,
        message: `一级分类 "${category.name}" 不应该有父分类`,
        details: { categoryId: category.id }
      });
    }

    // 二级分类必须有父分类
    if (category.level === CategoryLevel.SECONDARY && !category.parentId) {
      errors.push({
        code: CategoryErrorCode.INVALID_HIERARCHY,
        message: `二级分类 "${category.name}" 必须有父分类`,
        details: { categoryId: category.id }
      });
    }

    // 检查父分类是否存在且为一级分类
    if (category.parentId) {
      const parentCategory = categories.find(cat => cat.id === category.parentId);
      
      if (!parentCategory) {
        errors.push({
          code: CategoryErrorCode.PARENT_NOT_FOUND,
          message: `分类 "${category.name}" 的父分类不存在`,
          details: { categoryId: category.id, parentId: category.parentId }
        });
      } else if (parentCategory.level !== CategoryLevel.PRIMARY) {
        errors.push({
          code: CategoryErrorCode.INVALID_LEVEL,
          message: `分类 "${category.name}" 的父分类必须是一级分类`,
          details: { categoryId: category.id, parentId: category.parentId }
        });
      }
    }
  }

  // 检查循环引用
  const circularRefs = findCircularReferences(categories);
  for (const ref of circularRefs) {
    errors.push({
      code: CategoryErrorCode.CIRCULAR_REFERENCE,
      message: `检测到循环引用: ${ref.path.join(' -> ')}`,
      details: { categoryIds: ref.categoryIds }
    });
  }

  // 检查同层级重名
  const duplicateNames = findDuplicateNames(categories);
  for (const duplicate of duplicateNames) {
    errors.push({
      code: CategoryErrorCode.DUPLICATE_NAME,
      message: `同层级下存在重复名称: "${duplicate.name}"`,
      details: { 
        name: duplicate.name, 
        categoryIds: duplicate.categoryIds,
        parentId: duplicate.parentId 
      }
    });
  }

  // 检查子分类数量限制
  const overLimitParents = findOverLimitParents(categories);
  for (const parent of overLimitParents) {
    warnings.push(
      `一级分类 "${parent.name}" 下有 ${parent.childCount} 个子分类，` +
      `超过建议上限 ${CATEGORY_CONSTANTS.MAX_SUBCATEGORIES_PER_PARENT} 个`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 查找循环引用
 */
function findCircularReferences(categories: Category[]): Array<{
  categoryIds: string[];
  path: string[];
}> {
  const circularRefs: Array<{ categoryIds: string[]; path: string[] }> = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(categoryId: string, path: string[]): void {
    if (recursionStack.has(categoryId)) {
      // 找到循环引用
      const cycleStart = path.indexOf(categoryId);
      const cyclePath = path.slice(cycleStart);
      const cycleIds = cyclePath.map(name => {
        const cat = categories.find(c => c.name === name);
        return cat?.id || '';
      }).filter(id => id);

      circularRefs.push({
        categoryIds: cycleIds,
        path: cyclePath
      });
      return;
    }

    if (visited.has(categoryId)) {
      return;
    }

    visited.add(categoryId);
    recursionStack.add(categoryId);

    const category = categories.find(cat => cat.id === categoryId);
    if (category && category.parentId) {
      const parentCategory = categories.find(cat => cat.id === category.parentId);
      if (parentCategory) {
        dfs(category.parentId, [...path, category.name]);
      }
    }

    recursionStack.delete(categoryId);
  }

  // 检查所有分类
  for (const category of categories) {
    if (!visited.has(category.id)) {
      dfs(category.id, [category.name]);
    }
  }

  return circularRefs;
}

/**
 * 查找同层级重名
 */
function findDuplicateNames(categories: Category[]): Array<{
  name: string;
  categoryIds: string[];
  parentId?: string;
}> {
  const duplicates: Array<{ name: string; categoryIds: string[]; parentId?: string }> = [];
  const nameGroups = new Map<string, Category[]>();

  // 按层级和父分类分组
  for (const category of categories) {
    const key = `${category.name}|${category.parentId || 'root'}`;
    if (!nameGroups.has(key)) {
      nameGroups.set(key, []);
    }
    nameGroups.get(key)!.push(category);
  }

  // 查找重复
  for (const [key, group] of nameGroups) {
    if (group.length > 1) {
      const [name, parentId] = key.split('|');
      duplicates.push({
        name,
        categoryIds: group.map(cat => cat.id),
        parentId: parentId === 'root' ? undefined : parentId
      });
    }
  }

  return duplicates;
}

/**
 * 查找子分类数量超限的父分类
 */
function findOverLimitParents(categories: Category[]): Array<{
  id: string;
  name: string;
  childCount: number;
}> {
  const parentCounts = new Map<string, { category: Category; count: number }>();

  // 统计每个父分类的子分类数量
  for (const category of categories) {
    if (category.parentId) {
      const parentCategory = categories.find(cat => cat.id === category.parentId);
      if (parentCategory) {
        if (!parentCounts.has(category.parentId)) {
          parentCounts.set(category.parentId, { category: parentCategory, count: 0 });
        }
        parentCounts.get(category.parentId)!.count++;
      }
    }
  }

  // 查找超限的父分类
  const overLimitParents: Array<{ id: string; name: string; childCount: number }> = [];
  for (const [parentId, { category, count }] of parentCounts) {
    if (count > CATEGORY_CONSTANTS.MAX_SUBCATEGORIES_PER_PARENT) {
      overLimitParents.push({
        id: parentId,
        name: category.name,
        childCount: count
      });
    }
  }

  return overLimitParents;
}

/**
 * 验证分类创建请求
 */
export function validateCreateCategoryRequest(
  request: CreateCategoryRequest,
  existingCategories: Category[]
): CategoryValidationResult {
  const errors: CategoryError[] = [];
  const warnings: string[] = [];

  // 基础字段验证
  if (!request.name || request.name.trim().length === 0) {
    errors.push({
      code: CategoryErrorCode.INVALID_HIERARCHY,
      message: '分类名称不能为空',
      field: 'name'
    });
  } else if (request.name.length > CATEGORY_CONSTANTS.MAX_NAME_LENGTH) {
    errors.push({
      code: CategoryErrorCode.INVALID_HIERARCHY,
      message: `分类名称不能超过 ${CATEGORY_CONSTANTS.MAX_NAME_LENGTH} 个字符`,
      field: 'name'
    });
  }

  if (request.description && request.description.length > CATEGORY_CONSTANTS.MAX_DESCRIPTION_LENGTH) {
    errors.push({
      code: CategoryErrorCode.INVALID_HIERARCHY,
      message: `分类描述不能超过 ${CATEGORY_CONSTANTS.MAX_DESCRIPTION_LENGTH} 个字符`,
      field: 'description'
    });
  }

  // 颜色格式验证
  if (request.color && !/^#[0-9A-Fa-f]{6}$/.test(request.color)) {
    errors.push({
      code: CategoryErrorCode.INVALID_HIERARCHY,
      message: '颜色格式不正确，请使用十六进制格式（如 #FF0000）',
      field: 'color'
    });
  }

  // 父分类验证
  if (request.parentId) {
    const parentCategory = existingCategories.find(cat => cat.id === request.parentId);
    
    if (!parentCategory) {
      errors.push({
        code: CategoryErrorCode.PARENT_NOT_FOUND,
        message: '指定的父分类不存在',
        field: 'parentId'
      });
    } else {
      if (parentCategory.level !== CategoryLevel.PRIMARY) {
        errors.push({
          code: CategoryErrorCode.INVALID_LEVEL,
          message: '只能在一级分类下创建二级分类',
          field: 'parentId'
        });
      }

      // 检查子分类数量限制
      const siblingCount = existingCategories.filter(cat => cat.parentId === request.parentId).length;
      if (siblingCount >= CATEGORY_CONSTANTS.MAX_SUBCATEGORIES_PER_PARENT) {
        errors.push({
          code: CategoryErrorCode.INVALID_HIERARCHY,
          message: `该一级分类下的二级分类数量已达到上限 ${CATEGORY_CONSTANTS.MAX_SUBCATEGORIES_PER_PARENT} 个`,
          field: 'parentId'
        });
      } else if (siblingCount >= CATEGORY_CONSTANTS.MAX_SUBCATEGORIES_PER_PARENT * 0.8) {
        warnings.push(`该一级分类下的二级分类数量接近上限`);
      }
    }
  }

  // 检查同层级重名
  if (request.name) {
    const parentId = request.parentId || null;
    const duplicateCategory = existingCategories.find(cat => 
      cat.name === request.name && cat.parentId === parentId
    );

    if (duplicateCategory) {
      errors.push({
        code: CategoryErrorCode.DUPLICATE_NAME,
        message: '同层级下已存在相同名称的分类',
        field: 'name'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 验证分类更新请求
 */
export function validateUpdateCategoryRequest(
  categoryId: string,
  request: UpdateCategoryRequest,
  existingCategories: Category[]
): CategoryValidationResult {
  const errors: CategoryError[] = [];
  const warnings: string[] = [];

  const currentCategory = existingCategories.find(cat => cat.id === categoryId);
  if (!currentCategory) {
    errors.push({
      code: CategoryErrorCode.PARENT_NOT_FOUND,
      message: '要更新的分类不存在'
    });
    return { isValid: false, errors, warnings };
  }

  // 基础字段验证
  if (request.name !== undefined) {
    if (!request.name || request.name.trim().length === 0) {
      errors.push({
        code: CategoryErrorCode.INVALID_HIERARCHY,
        message: '分类名称不能为空',
        field: 'name'
      });
    } else if (request.name.length > CATEGORY_CONSTANTS.MAX_NAME_LENGTH) {
      errors.push({
        code: CategoryErrorCode.INVALID_HIERARCHY,
        message: `分类名称不能超过 ${CATEGORY_CONSTANTS.MAX_NAME_LENGTH} 个字符`,
        field: 'name'
      });
    }
  }

  if (request.description !== undefined && request.description.length > CATEGORY_CONSTANTS.MAX_DESCRIPTION_LENGTH) {
    errors.push({
      code: CategoryErrorCode.INVALID_HIERARCHY,
      message: `分类描述不能超过 ${CATEGORY_CONSTANTS.MAX_DESCRIPTION_LENGTH} 个字符`,
      field: 'description'
    });
  }

  // 颜色格式验证
  if (request.color && !/^#[0-9A-Fa-f]{6}$/.test(request.color)) {
    errors.push({
      code: CategoryErrorCode.INVALID_HIERARCHY,
      message: '颜色格式不正确，请使用十六进制格式（如 #FF0000）',
      field: 'color'
    });
  }

  // 父分类变更验证
  if (request.parentId !== undefined) {
    // 防止循环引用
    if (request.parentId === categoryId) {
      errors.push({
        code: CategoryErrorCode.CIRCULAR_REFERENCE,
        message: '不能将分类设置为自己的子分类',
        field: 'parentId'
      });
    }

    // 检查是否会创建循环引用
    if (request.parentId && wouldCreateCircularReference(categoryId, request.parentId, existingCategories)) {
      errors.push({
        code: CategoryErrorCode.CIRCULAR_REFERENCE,
        message: '此操作会创建循环引用',
        field: 'parentId'
      });
    }

    // 验证新父分类
    if (request.parentId) {
      const newParentCategory = existingCategories.find(cat => cat.id === request.parentId);
      
      if (!newParentCategory) {
        errors.push({
          code: CategoryErrorCode.PARENT_NOT_FOUND,
          message: '指定的父分类不存在',
          field: 'parentId'
        });
      } else if (newParentCategory.level !== CategoryLevel.PRIMARY) {
        errors.push({
          code: CategoryErrorCode.INVALID_LEVEL,
          message: '只能移动到一级分类下',
          field: 'parentId'
        });
      }
    }

    // 检查子分类处理
    const hasChildren = existingCategories.some(cat => cat.parentId === categoryId);
    if (hasChildren && request.parentId) {
      errors.push({
        code: CategoryErrorCode.INVALID_HIERARCHY,
        message: '有子分类的分类不能移动到其他分类下',
        field: 'parentId'
      });
    }
  }

  // 检查重名（如果名称或父分类发生变化）
  if (request.name !== undefined || request.parentId !== undefined) {
    const newName = request.name !== undefined ? request.name : currentCategory.name;
    const newParentId = request.parentId !== undefined ? request.parentId : currentCategory.parentId;
    
    const duplicateCategory = existingCategories.find(cat => 
      cat.name === newName && 
      cat.parentId === newParentId &&
      cat.id !== categoryId
    );

    if (duplicateCategory) {
      errors.push({
        code: CategoryErrorCode.DUPLICATE_NAME,
        message: '同层级下已存在相同名称的分类',
        field: 'name'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 检查是否会创建循环引用
 */
function wouldCreateCircularReference(
  categoryId: string,
  newParentId: string,
  categories: Category[]
): boolean {
  const visited = new Set<string>();
  
  function hasPath(fromId: string, toId: string): boolean {
    if (fromId === toId) {
      return true;
    }
    
    if (visited.has(fromId)) {
      return false;
    }
    
    visited.add(fromId);
    
    const children = categories.filter(cat => cat.parentId === fromId);
    for (const child of children) {
      if (hasPath(child.id, toId)) {
        return true;
      }
    }
    
    return false;
  }
  
  return hasPath(categoryId, newParentId);
}

/**
 * 验证分类删除操作
 */
export function validateCategoryDeletion(
  categoryId: string,
  categories: Category[]
): CategoryValidationResult {
  const errors: CategoryError[] = [];
  const warnings: string[] = [];

  const category = categories.find(cat => cat.id === categoryId);
  if (!category) {
    errors.push({
      code: CategoryErrorCode.PARENT_NOT_FOUND,
      message: '要删除的分类不存在'
    });
    return { isValid: false, errors, warnings };
  }

  // 检查是否有子分类
  const hasChildren = categories.some(cat => cat.parentId === categoryId);
  if (hasChildren) {
    errors.push({
      code: CategoryErrorCode.DELETE_RESTRICTED,
      message: '该分类下还有子分类，请先删除子分类'
    });
  }

  // 检查是否有关联音频
  if ((category.audioCount || 0) > 0) {
    errors.push({
      code: CategoryErrorCode.DELETE_RESTRICTED,
      message: '该分类下还有音频内容，无法删除'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
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

  if (selection.categoryId) {
    const category = categories.find(cat => cat.id === selection.categoryId);
    if (!category) {
      errors.push({
        code: CategoryErrorCode.PARENT_NOT_FOUND,
        message: '指定的一级分类不存在'
      });
    } else if (category.level !== CategoryLevel.PRIMARY) {
      errors.push({
        code: CategoryErrorCode.INVALID_LEVEL,
        message: '选择的分类必须是一级分类'
      });
    }
  }

  if (selection.subcategoryId) {
    const subcategory = categories.find(cat => cat.id === selection.subcategoryId);
    if (!subcategory) {
      errors.push({
        code: CategoryErrorCode.PARENT_NOT_FOUND,
        message: '指定的二级分类不存在'
      });
    } else {
      if (subcategory.level !== CategoryLevel.SECONDARY) {
        errors.push({
          code: CategoryErrorCode.INVALID_LEVEL,
          message: '选择的子分类必须是二级分类'
        });
      }
      
      if (selection.categoryId && subcategory.parentId !== selection.categoryId) {
        errors.push({
          code: CategoryErrorCode.DATA_INCONSISTENCY,
          message: '选择的子分类不属于指定的父分类'
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 验证批量操作
 */
export function validateBatchOperation(
  categoryIds: string[],
  operation: 'activate' | 'deactivate' | 'delete' | 'move',
  categories: Category[],
  targetParentId?: string
): CategoryValidationResult {
  const errors: CategoryError[] = [];
  const warnings: string[] = [];

  if (categoryIds.length === 0) {
    errors.push({
      code: CategoryErrorCode.INVALID_HIERARCHY,
      message: '请选择要操作的分类'
    });
    return { isValid: false, errors, warnings };
  }

  // 验证所有分类是否存在
  for (const categoryId of categoryIds) {
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) {
      errors.push({
        code: CategoryErrorCode.PARENT_NOT_FOUND,
        message: `分类 ${categoryId} 不存在`
      });
    }
  }

  // 根据操作类型进行特定验证
  switch (operation) {
    case 'delete':
      for (const categoryId of categoryIds) {
        const deleteValidation = validateCategoryDeletion(categoryId, categories);
        if (!deleteValidation.isValid) {
          errors.push(...deleteValidation.errors);
        }
      }
      break;

    case 'move':
      if (!targetParentId) {
        errors.push({
          code: CategoryErrorCode.INVALID_HIERARCHY,
          message: '移动操作需要指定目标父分类'
        });
      } else {
        const targetParent = categories.find(cat => cat.id === targetParentId);
        if (!targetParent) {
          errors.push({
            code: CategoryErrorCode.PARENT_NOT_FOUND,
            message: '目标父分类不存在'
          });
        } else if (targetParent.level !== CategoryLevel.PRIMARY) {
          errors.push({
            code: CategoryErrorCode.INVALID_LEVEL,
            message: '只能移动到一级分类下'
          });
        }

        // 检查是否会创建循环引用
        for (const categoryId of categoryIds) {
          if (wouldCreateCircularReference(categoryId, targetParentId, categories)) {
            errors.push({
              code: CategoryErrorCode.CIRCULAR_REFERENCE,
              message: `移动分类 ${categoryId} 会创建循环引用`
            });
          }
        }
      }
      break;
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}