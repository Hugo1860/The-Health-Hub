/**
 * 分类层级数据库查询函数
 * 提供高效的分类数据查询和操作
 */

import { sqlClient } from '@/lib/sqlClient';
import { ilike } from '@/lib/sqlCompat';
import {
  Category,
  CategoryLevel,
  CategoryTreeNode,
  CategoryChild,
  CategoryStats,
  CategoryQueryParams,
  CategoryReorderRequest,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategoryValidationResult,
  CategoryErrorCode
} from '@/types/category';

import {
  validateCategory,
  buildCategoryTree,
  calculateCategoryStats,
  canDeleteCategory,
  generateCategoryId
} from '@/lib/categoryUtils';

/**
 * 获取所有分类（扁平结构）
 */
export async function getAllCategories(params: CategoryQueryParams = {}): Promise<Category[]> {
  const {
    includeInactive = false,
    includeCount = false,
    parentId,
    level
  } = params;

  let query = `
    SELECT 
      c.*,
      ${includeCount ? 'COUNT(a.id) as audio_count' : '0 as audio_count'}
    FROM categories c
    ${includeCount ? 'LEFT JOIN audios a ON (c.id = a.category_id OR c.id = a.subcategory_id)' : ''}
    WHERE 1=1
  `;

  const queryParams: any[] = [];

  // 筛选条件
  if (!includeInactive) {
    query += ` AND c.is_active = ?`;
    queryParams.push(true);
  }

  if (parentId !== undefined) {
    if (parentId === null) {
      query += ` AND c.parent_id IS NULL`;
    } else {
      query += ` AND c.parent_id = ?`;
      queryParams.push(parentId);
    }
  }

  if (level !== undefined) {
    query += ` AND c.level = ?`;
    queryParams.push(level);
  }

  // 分组和排序
  if (includeCount) {
    query += ` GROUP BY c.id`;
  }
  query += ` ORDER BY c.level, c.sort_order, c.name`;

  try {
    const rows = await sqlClient.query<any>(query, queryParams);
    
    return rows.map((row: any) => ({
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
  } catch (error) {
    console.error('获取分类列表失败:', error);
    throw new Error('获取分类列表失败');
  }
}

/**
 * 获取分类树结构
 */
export async function getCategoryTree(includeCount: boolean = false): Promise<CategoryTreeNode[]> {
  const categories = await getAllCategories({ 
    format: 'flat', 
    includeInactive: false, 
    includeCount 
  });
  
  return buildCategoryTree(categories);
}

/**
 * 根据ID获取单个分类
 */
export async function getCategoryById(id: string): Promise<Category | null> {
  const query = `
    SELECT 
      c.*,
      COUNT(a.id) as audio_count
    FROM categories c
    LEFT JOIN audios a ON (c.id = a.category_id OR c.id = a.subcategory_id)
    WHERE c.id = ?
    GROUP BY c.id
  `;

  try {
    const rows = await sqlClient.query<any>(query, [id]);
    
    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
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
    };
  } catch (error) {
    console.error('获取分类详情失败:', error);
    throw new Error('获取分类详情失败');
  }
}

/**
 * 创建新分类
 */
export async function createCategory(data: CreateCategoryRequest): Promise<Category> {
  // 获取现有分类进行验证
  const existingCategories = await getAllCategories({ includeInactive: true });
  
  // 验证数据
  const validation = validateCategory(data, existingCategories);
  if (!validation.isValid) {
    throw new Error(validation.errors[0].message);
  }

  // 生成分类ID
  const categoryId = generateCategoryId(data.name, data.parentId);
  
  // 确定分类层级
  const level = data.parentId ? CategoryLevel.SECONDARY : CategoryLevel.PRIMARY;
  
  // 获取排序顺序
  let sortOrder = data.sortOrder;
  if (sortOrder === undefined) {
    const maxSortQuery = `
      SELECT COALESCE(MAX(sort_order), -1) + 1 as next_sort_order
      FROM categories 
      WHERE ${data.parentId ? 'parent_id = ?' : 'parent_id IS NULL'}
    `;
    
    const sortRows = await sqlClient.query<any>(
      maxSortQuery, 
      data.parentId ? [data.parentId] : []
    );
    sortOrder = sortRows[0]?.next_sort_order ?? 0;
  }

  const insertQuery = `
    INSERT INTO categories (
      id, name, description, color, icon, parent_id, level, 
      sort_order, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;

  const insertParams = [
    categoryId,
    data.name,
    data.description || '',
    data.color || '#6b7280',
    data.icon || '📂',
    data.parentId || null,
    level,
    sortOrder,
    true
  ];

  try {
    await sqlClient.query(insertQuery, insertParams);
    const selectRows = await sqlClient.query<any>('SELECT * FROM categories WHERE id = ?', [categoryId]);
    const row = selectRows[0];
    
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      color: row.color,
      icon: row.icon,
      parentId: row.parent_id,
      level: row.level,
      sortOrder: row.sort_order,
      isActive: row.is_active,
      audioCount: 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  } catch (error) {
    console.error('创建分类失败:', error);
    
    // 检查唯一约束冲突
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      throw new Error('分类名称已存在');
    }
    
    throw new Error('创建分类失败');
  }
}

/**
 * 更新分类
 */
export async function updateCategory(id: string, data: UpdateCategoryRequest): Promise<Category> {
  // 获取现有分类进行验证
  const existingCategories = await getAllCategories({ includeInactive: true });
  const currentCategory = existingCategories.find(cat => cat.id === id);
  
  if (!currentCategory) {
    throw new Error('分类不存在');
  }

  // 验证数据
  const validation = validateCategory(data, existingCategories, id);
  if (!validation.isValid) {
    throw new Error(validation.errors[0].message);
  }

  // 构建更新查询
  const updateFields: string[] = [];
  const updateParams: any[] = [];

  if (data.name !== undefined) {
    updateFields.push(`name = ?`);
    updateParams.push(data.name);
  }

  if (data.description !== undefined) {
    updateFields.push(`description = ?`);
    updateParams.push(data.description);
  }

  if (data.color !== undefined) {
    updateFields.push(`color = ?`);
    updateParams.push(data.color);
  }

  if (data.icon !== undefined) {
    updateFields.push(`icon = ?`);
    updateParams.push(data.icon);
  }

  if (data.parentId !== undefined) {
    updateFields.push(`parent_id = ?`);
    updateFields.push(`level = ?`);
    updateParams.push(data.parentId);
    updateParams.push(data.parentId ? CategoryLevel.SECONDARY : CategoryLevel.PRIMARY);
  }

  if (data.sortOrder !== undefined) {
    updateFields.push(`sort_order = ?`);
    updateParams.push(data.sortOrder);
  }

  if (data.isActive !== undefined) {
    updateFields.push(`is_active = ?`);
    updateParams.push(data.isActive);
  }

  if (updateFields.length === 0) {
    return currentCategory;
  }

  updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
  updateParams.push(id);

  const updateQuery = `
    UPDATE categories 
    SET ${updateFields.join(', ')}
    WHERE id = ?
  `;

  try {
    await sqlClient.query(updateQuery, updateParams);
    const rows = await sqlClient.query<any>('SELECT * FROM categories WHERE id = ?', [id]);
    if (rows.length === 0) {
      throw new Error('分类不存在');
    }

    const row = rows[0];
    
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      color: row.color,
      icon: row.icon,
      parentId: row.parent_id,
      level: row.level,
      sortOrder: row.sort_order,
      isActive: row.is_active,
      audioCount: currentCategory.audioCount,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  } catch (error) {
    console.error('更新分类失败:', error);
    
    // 检查唯一约束冲突
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      throw new Error('分类名称已存在');
    }
    
    throw new Error('更新分类失败');
  }
}

/**
 * 删除分类
 */
export async function deleteCategory(
  id: string, 
  options: { force?: boolean; updateAudios?: boolean } = {}
): Promise<void> {
  const { force = false, updateAudios = true } = options;

  if (!force) {
    const existingCategories = await getAllCategories({ includeInactive: true });
    const deleteCheck = canDeleteCategory(id, existingCategories);
    if (!deleteCheck.canDelete) {
      throw new Error(deleteCheck.reason);
    }
  }

  const runTx = async () => {
    if (updateAudios) {
      await sqlClient.query(
        'UPDATE audios SET category_id = NULL WHERE category_id = ?',
        [id]
      );
      await sqlClient.query(
        'UPDATE audios SET subcategory_id = NULL WHERE subcategory_id = ?',
        [id]
      );
    }

    const res: any = await sqlClient.query('DELETE FROM categories WHERE id = ?', [id]);
    if (res?.rowCount === 0) {
      const check = await sqlClient.query<any>('SELECT id FROM categories WHERE id = ?', [id]);
      if (check.length > 0) throw new Error('分类不存在');
    }
  };

  if (sqlClient.transaction) {
    await sqlClient.transaction(async () => {
      await runTx();
    });
  } else {
    await runTx();
  }
}

/**
 * 批量删除分类
 */
export async function batchDeleteCategories(
  categoryIds: string[],
  options: { force?: boolean; cascade?: boolean } = {}
): Promise<{ 
  success: string[]; 
  failed: Array<{ id: string; error: string }> 
}> {
  const { force = false, cascade = false } = options;
  const success: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];

  // 如果是级联删除，需要按层级顺序删除（先删子分类，再删父分类）
  let sortedIds = [...categoryIds];
  
  if (cascade) {
    const allCategories = await getAllCategories({ includeInactive: true });
    
    // 按层级排序：二级分类优先删除
    sortedIds = categoryIds.sort((a, b) => {
      const catA = allCategories.find(c => c.id === a);
      const catB = allCategories.find(c => c.id === b);
      
      if (!catA || !catB) return 0;
      
      // 二级分类(level=2)排在前面
      return (catB.level || 1) - (catA.level || 1);
    });
  }

  // 逐个删除分类
  for (const categoryId of sortedIds) {
    try {
      await deleteCategory(categoryId, { force, updateAudios: true });
      success.push(categoryId);
    } catch (error) {
      failed.push({
        id: categoryId,
        error: error instanceof Error ? error.message : '删除失败'
      });
    }
  }

  return { success, failed };
}

/**
 * 批量重新排序分类
 */
export async function reorderCategories(requests: CategoryReorderRequest[]): Promise<void> {
  if (requests.length === 0) {
    return;
  }

  const runTx = async () => {
    for (const request of requests) {
      await sqlClient.query(
        'UPDATE categories SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [request.newSortOrder, request.categoryId]
      );
    }
  };

  if (sqlClient.transaction) {
    await sqlClient.transaction(async () => {
      await runTx();
    });
  } else {
    await runTx();
  }
}

/**
 * 获取分类统计信息
 */
export async function getCategoryStatistics(): Promise<CategoryStats> {
  const query = `
    SELECT 
      COUNT(*) as total_categories,
      COUNT(CASE WHEN level = 1 THEN 1 END) as level1_count,
      COUNT(CASE WHEN level = 2 THEN 1 END) as level2_count,
      COUNT(CASE WHEN is_active = true THEN 1 END) as active_count,
      COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_count
    FROM categories
  `;

  const audioStatsQuery = `
    SELECT 
      COUNT(DISTINCT CASE WHEN a.category_id IS NOT NULL OR a.subcategory_id IS NOT NULL THEN c.id END) as categories_with_audio,
      COUNT(DISTINCT CASE WHEN a.category_id IS NULL AND a.subcategory_id IS NULL THEN c.id END) as empty_categories
    FROM categories c
    LEFT JOIN audios a ON (c.id = a.category_id OR c.id = a.subcategory_id)
  `;

  try {
    const [categoryRows, audioRows] = await Promise.all([
      sqlClient.query<any>(query),
      sqlClient.query<any>(audioStatsQuery)
    ]);

    const categoryStats: any = categoryRows[0] || {};
    const audioStats: any = audioRows[0] || {};

    return {
      totalCategories: parseInt(categoryStats.total_categories) || 0,
      level1Count: parseInt(categoryStats.level1_count) || 0,
      level2Count: parseInt(categoryStats.level2_count) || 0,
      activeCount: parseInt(categoryStats.active_count) || 0,
      inactiveCount: parseInt(categoryStats.inactive_count) || 0,
      categoriesWithAudio: parseInt(audioStats.categories_with_audio) || 0,
      emptyCategoriesCount: parseInt(audioStats.empty_categories) || 0
    };
  } catch (error) {
    console.error('获取分类统计失败:', error);
    throw new Error('获取分类统计失败');
  }
}

/**
 * 搜索分类
 */
export async function searchCategories(
  searchTerm: string,
  options: {
    includeInactive?: boolean;
    level?: CategoryLevel;
    limit?: number;
  } = {}
): Promise<Category[]> {
  const { includeInactive = false, level, limit = 50 } = options;

  let query = `
    SELECT 
      c.*,
      COUNT(a.id) as audio_count,
      0 as rank
    FROM categories c
    LEFT JOIN audios a ON (c.id = a.category_id OR c.id = a.subcategory_id)
    WHERE (
      ${ilike('c.name', '?')} OR 
      ${ilike('c.description', '?')}
    )
  `;

  const like = `%${searchTerm}%`;
  const queryParams: any[] = [like, like];

  if (!includeInactive) {
    query += ` AND c.is_active = ?`;
    queryParams.push(true);
  }

  if (level !== undefined) {
    query += ` AND c.level = ?`;
    queryParams.push(level);
  }

  query += ` 
    GROUP BY c.id
    ORDER BY c.level, c.sort_order, c.name
    LIMIT ?
  `;
  queryParams.push(limit);

  try {
    const rows = await sqlClient.query<any>(query, queryParams);
    
    return rows.map((row: any) => ({
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
  } catch (error) {
    console.error('搜索分类失败:', error);
    throw new Error('搜索分类失败');
  }
}

/**
 * 检查分类名称是否可用
 */
export async function isCategoryNameAvailable(
  name: string,
  parentId?: string,
  excludeId?: string
): Promise<boolean> {
  let query = `
    SELECT COUNT(*) as count
    FROM categories 
    WHERE name = $1 AND ${parentId ? 'parent_id = $2' : 'parent_id IS NULL'}
  `;

  const queryParams: any[] = [name];
  let paramIndex = 2;

  if (parentId) {
    queryParams.push(parentId);
    paramIndex++;
  }

  if (excludeId) {
    query += ` AND id != $${paramIndex}`;
    queryParams.push(excludeId);
  }

  try {
    const rows = await sqlClient.query<any>(query, queryParams);
    return parseInt(rows[0]?.count ?? '0') === 0;
  } catch (error) {
    console.error('检查分类名称可用性失败:', error);
    return false;
  }
}

/**
 * 获取分类的子分类列表
 */
export async function getSubcategories(
  parentId: string,
  includeInactive: boolean = false
): Promise<CategoryChild[]> {
  const categories = await getAllCategories({
    parentId,
    includeInactive,
    includeCount: true
  });

  return categories.map(cat => ({
    ...cat,
    parentId: cat.parentId!,
    level: CategoryLevel.SECONDARY as const
  }));
}

/**
 * 移动分类到新的父分类下
 */
export async function moveCategory(
  categoryId: string,
  newParentId?: string
): Promise<Category> {
  // 验证移动操作
  if (newParentId) {
    const parentCategory = await getCategoryById(newParentId);
    if (!parentCategory) {
      throw new Error('目标父分类不存在');
    }
    if (parentCategory.level !== CategoryLevel.PRIMARY) {
      throw new Error('只能移动到一级分类下');
    }
    if (parentCategory.id === categoryId) {
      throw new Error('不能将分类移动到自己下面');
    }
  }

  const newLevel = newParentId ? CategoryLevel.SECONDARY : CategoryLevel.PRIMARY;

  // 获取新的排序位置
  const maxSortQuery = `
    SELECT COALESCE(MAX(sort_order), -1) + 1 as next_sort_order
    FROM categories 
    WHERE ${newParentId ? 'parent_id = ?' : 'parent_id IS NULL'}
  `;

  const sortRows = await sqlClient.query<any>(
    maxSortQuery,
    newParentId ? [newParentId] : []
  );
  const newSortOrder = sortRows[0]?.next_sort_order ?? 0;

  // 更新分类
  return await updateCategory(categoryId, {
    parentId: newParentId,
    sortOrder: newSortOrder
  });
}

/**
 * 批量激活/停用分类
 */
export async function batchUpdateCategoryStatus(
  categoryIds: string[],
  isActive: boolean
): Promise<void> {
  if (categoryIds.length === 0) {
    return;
  }

  const placeholders = categoryIds.map((_, index) => `$${index + 1}`).join(',');
  const query = `
    UPDATE categories 
    SET is_active = $${categoryIds.length + 1}, updated_at = CURRENT_TIMESTAMP
    WHERE id IN (${placeholders})
  `;

  try {
    await sqlClient.query(query, [...categoryIds, isActive]);
  } catch (error) {
    console.error('批量更新分类状态失败:', error);
    throw new Error('批量更新分类状态失败');
  }
}