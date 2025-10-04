/**
 * 分类数据库查询函数
 * 提供完整的分类CRUD操作和复杂查询功能
 */

import db from '@/lib/db';

import {
  Category,
  CategoryLevel,
  CategoryTreeNode,
  CategoryQueryParams,
  CategoryReorderRequest,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategoryStats
} from '@/types/category';

import {
  buildCategoryTree,
  calculateCategoryStats,
  canDeleteCategory,
  generateCategoryId
} from '@/lib/categoryUtils';

// 使用统一的数据库连接

/**
 * 映射数据库行到分类对象
 */
function mapRowToCategory(row: any): Category {
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
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString()
  };
}

/**
 * 获取所有分类
 */
export async function getAllCategories(params: CategoryQueryParams = {}): Promise<Category[]> {
  const { includeInactive = false, level, parentId, limit } = params;

  let whereConditions: string[] = [];
  let queryParams: any[] = [];
  let paramIndex = 1;

  // 构建WHERE条件
  if (!includeInactive) {
    whereConditions.push(`c.is_active = $${paramIndex++}`);
    queryParams.push(true);
  }

  if (level !== undefined) {
    whereConditions.push(`c.level = $${paramIndex++}`);
    queryParams.push(level);
  }

  if (parentId !== undefined) {
    if (parentId === null) {
      whereConditions.push('c.parent_id IS NULL');
    } else {
      whereConditions.push(`c.parent_id = $${paramIndex++}`);
      queryParams.push(parentId);
    }
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
  const limitClause = limit ? `LIMIT ${limit}` : '';

  const query = `
    SELECT 
      c.*,
      COALESCE(audio_stats.audio_count, 0) as audio_count
    FROM categories c
    LEFT JOIN (
      SELECT 
        COALESCE(category_id, subcategory_id) as category_id,
        COUNT(*) as audio_count
      FROM audios 
      WHERE category_id IS NOT NULL OR subcategory_id IS NOT NULL
      GROUP BY COALESCE(category_id, subcategory_id)
    ) audio_stats ON c.id = audio_stats.category_id
    ${whereClause}
    ORDER BY c.level ASC, c.sort_order ASC, c.name ASC
    ${limitClause}
  `;

  try {
    const result = await db.query(query, queryParams);
    return result.rows.map(mapRowToCategory);
  } catch (error) {
    console.error('获取分类列表失败:', error);
    throw new Error('获取分类列表失败');
  }
}

/**
 * 根据ID获取分类
 */
export async function getCategoryById(id: string): Promise<Category | null> {
  const query = `
    SELECT 
      c.*,
      COALESCE(audio_stats.audio_count, 0) as audio_count
    FROM categories c
    LEFT JOIN (
      SELECT 
        COALESCE(category_id, subcategory_id) as category_id,
        COUNT(*) as audio_count
      FROM audios 
      WHERE category_id IS NOT NULL OR subcategory_id IS NOT NULL
      GROUP BY COALESCE(category_id, subcategory_id)
    ) audio_stats ON c.id = audio_stats.category_id
    WHERE c.id = $1
  `;

  try {
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return mapRowToCategory(result.rows[0]);
  } catch (error) {
    console.error('获取分类详情失败:', error);
    throw new Error('获取分类详情失败');
  }
}

/**
 * 创建分类
 */
export async function createCategory(data: CreateCategoryRequest): Promise<Category> {
  // 生成分类ID
  const categoryId = generateCategoryId(data.name, data.parentId);
  
  // 确定分类层级
  const level = data.parentId ? CategoryLevel.SECONDARY : CategoryLevel.PRIMARY;
  
  // 获取排序顺序
  const maxSortQuery = data.parentId 
    ? 'SELECT COALESCE(MAX(sort_order), -1) + 1 as next_sort FROM categories WHERE parent_id = $1'
    : 'SELECT COALESCE(MAX(sort_order), -1) + 1 as next_sort FROM categories WHERE parent_id IS NULL';
    
  const sortResult = await db.query(
    maxSortQuery, 
    data.parentId ? [data.parentId] : []
  );
  
  const sortOrder = sortResult.rows[0].next_sort;

  const insertQuery = `
    INSERT INTO categories (
      id, name, description, color, icon, parent_id, level, 
      sort_order, is_active, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING *
  `;

  const insertParams = [
    categoryId,
    data.name,
    data.description || null,
    data.color || null,
    data.icon || null,
    data.parentId || null,
    level,
    sortOrder,
    true // isActive
  ];

  try {
    const result = await db.query(insertQuery, insertParams);
    const row = result.rows[0];
    
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
      createdAt: row.createdAt || new Date().toISOString(),
      updatedAt: row.updatedAt || new Date().toISOString()
    };
  } catch (error) {
    console.error('创建分类失败:', error);
    
    // 检查唯一性约束冲突
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
  // 获取当前分类信息
  const currentCategory = await getCategoryById(id);
  if (!currentCategory) {
    throw new Error('分类不存在');
  }

  // 构建更新字段
  const updateFields: string[] = [];
  const updateParams: any[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    updateFields.push(`name = $${paramIndex++}`);
    updateParams.push(data.name);
  }

  if (data.description !== undefined) {
    updateFields.push(`description = $${paramIndex++}`);
    updateParams.push(data.description);
  }

  if (data.color !== undefined) {
    updateFields.push(`color = $${paramIndex++}`);
    updateParams.push(data.color);
  }

  if (data.icon !== undefined) {
    updateFields.push(`icon = $${paramIndex++}`);
    updateParams.push(data.icon);
  }

  if (data.parentId !== undefined) {
    updateFields.push(`parent_id = $${paramIndex++}`);
    updateParams.push(data.parentId);
    
    // 更新层级
    const newLevel = data.parentId ? CategoryLevel.SECONDARY : CategoryLevel.PRIMARY;
    updateFields.push(`level = $${paramIndex++}`);
    updateParams.push(newLevel);
  }

  if (data.sortOrder !== undefined) {
    updateFields.push(`sort_order = $${paramIndex++}`);
    updateParams.push(data.sortOrder);
  }

  if (data.isActive !== undefined) {
    updateFields.push(`is_active = $${paramIndex++}`);
    updateParams.push(data.isActive);
  }

  updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
  updateParams.push(id);

  const updateQuery = `
    UPDATE categories 
    SET ${updateFields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  try {
    const result = await db.query(updateQuery, updateParams);
    
    if (result.rows.length === 0) {
      throw new Error('分类不存在');
    }

    const row = result.rows[0];
    
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
      createdAt: row.createdAt || currentCategory.createdAt,
      updatedAt: row.updatedAt || new Date().toISOString()
    };
  } catch (error) {
    console.error('更新分类失败:', error);
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

  // 如果不是强制删除，进行安全检查
  if (!force) {
    const existingCategories = await getAllCategories({ includeInactive: true });
    const deleteCheck = canDeleteCategory(id, existingCategories);
    if (!deleteCheck.canDelete) {
      throw new Error(deleteCheck.reason);
    }
  }

  try {
    // 如果需要更新音频关联，将关联的音频分类设为null
    if (updateAudios) {
      // 更新以此分类为主分类的音频
      await db.query(
        'UPDATE audios SET category_id = NULL WHERE category_id = $1',
        [id]
      );
      
      // 更新以此分类为子分类的音频
      await db.query(
        'UPDATE audios SET subcategory_id = NULL WHERE subcategory_id = $1',
        [id]
      );
    }

    // 删除分类
    const deleteQuery = `DELETE FROM categories WHERE id = $1`;
    const result = await db.query(deleteQuery, [id]);
    
    if (result.rowCount === 0) {
      throw new Error('分类不存在');
    }
  } catch (error) {
    console.error('删除分类失败:', error);
    
    // 检查外键约束冲突
    if (error && typeof error === 'object' && 'code' in error && error.code === '23503') {
      throw new Error('该分类下还有关联数据，无法删除。请使用强制删除或先处理关联数据。');
    }
    
    throw new Error(error instanceof Error ? error.message : '删除分类失败');
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
 * 获取分类树结构
 */
export async function getCategoryTree(includeCount: boolean = false): Promise<CategoryTreeNode[]> {
  const categories = await getAllCategories({ includeInactive: false, includeCount });
  return buildCategoryTree(categories);
}

/**
 * 重新排序分类
 */
export async function reorderCategories(requests: CategoryReorderRequest[]): Promise<void> {
  for (const request of requests) {
    const updateQuery = `
      UPDATE categories 
      SET sort_order = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    await db.query(updateQuery, [request.newSortOrder, request.categoryId]);
  }
}

/**
 * 获取分类统计
 */
export async function getCategoryStatistics(): Promise<CategoryStats> {
  const categories = await getAllCategories({ includeInactive: true, includeCount: true });
  return calculateCategoryStats(categories);
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

  let whereConditions: string[] = ['c.name ILIKE $1'];
  let queryParams: any[] = [`%${searchTerm}%`];
  let paramIndex = 2;

  if (!includeInactive) {
    whereConditions.push(`c.is_active = $${paramIndex++}`);
    queryParams.push(true);
  }

  if (level !== undefined) {
    whereConditions.push(`c.level = $${paramIndex++}`);
    queryParams.push(level);
  }

  const query = `
    SELECT 
      c.*,
      COALESCE(audio_stats.audio_count, 0) as audio_count
    FROM categories c
    LEFT JOIN (
      SELECT 
        COALESCE(category_id, subcategory_id) as category_id,
        COUNT(*) as audio_count
      FROM audios 
      WHERE category_id IS NOT NULL OR subcategory_id IS NOT NULL
      GROUP BY COALESCE(category_id, subcategory_id)
    ) audio_stats ON c.id = audio_stats.category_id
    WHERE ${whereConditions.join(' AND ')}
    ORDER BY c.level ASC, c.sort_order ASC, c.name ASC
    LIMIT $${paramIndex}
  `;

  queryParams.push(limit);

  try {
    const result = await db.query(query, queryParams);
    return result.rows.map(mapRowToCategory);
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
  let whereConditions = ['c.name = $1'];
  let queryParams: any[] = [name];
  let paramIndex = 2;

  if (parentId !== undefined) {
    if (parentId === null) {
      whereConditions.push('c.parent_id IS NULL');
    } else {
      whereConditions.push(`c.parent_id = $${paramIndex++}`);
      queryParams.push(parentId);
    }
  }

  if (excludeId) {
    whereConditions.push(`c.id != $${paramIndex++}`);
    queryParams.push(excludeId);
  }

  const query = `
    SELECT COUNT(*) as count
    FROM categories c
    WHERE ${whereConditions.join(' AND ')}
  `;

  try {
    const result = await db.query(query, queryParams);
    return parseInt(result.rows[0].count) === 0;
  } catch (error) {
    console.error('检查分类名称可用性失败:', error);
    return false;
  }
}

/**
 * 获取子分类
 */
export async function getSubcategories(
  parentId: string,
  includeInactive: boolean = false
): Promise<Category[]> {
  return getAllCategories({
    parentId,
    includeInactive,
    includeCount: true
  });
}

/**
 * 移动分类
 */
export async function moveCategory(categoryId: string, newParentId?: string): Promise<Category> {
  const newLevel = newParentId ? CategoryLevel.SECONDARY : CategoryLevel.PRIMARY;
  
  const updateQuery = `
    UPDATE categories 
    SET parent_id = $1, level = $2, updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING *
  `;

  try {
    const result = await db.query(updateQuery, [newParentId || null, newLevel, categoryId]);
    
    if (result.rows.length === 0) {
      throw new Error('分类不存在');
    }

    return mapRowToCategory(result.rows[0]);
  } catch (error) {
    console.error('移动分类失败:', error);
    throw new Error('移动分类失败');
  }
}

/**
 * 批量更新分类状态
 */
export async function batchUpdateCategoryStatus(
  categoryIds: string[],
  isActive: boolean
): Promise<void> {
  if (categoryIds.length === 0) return;

  const placeholders = categoryIds.map((_, index) => `$${index + 2}`).join(',');
  const query = `
    UPDATE categories 
    SET is_active = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id IN (${placeholders})
  `;

  try {
    await db.query(query, [isActive, ...categoryIds]);
  } catch (error) {
    console.error('批量更新分类状态失败:', error);
    throw new Error('批量更新分类状态失败');
  }
}