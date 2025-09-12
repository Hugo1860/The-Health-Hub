/**
 * 分类层级数据库查询函数
 * 提供高效的分类数据查询和操作
 */

import { getDatabase } from '@/lib/database';

const db = getDatabase();
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

  try {
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
    WHERE c.id = $1
    GROUP BY c.id
  `;

  try {
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
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
      WHERE ${data.parentId ? 'parent_id = $1' : 'parent_id IS NULL'}
    `;
    
    const sortResult = await db.query(
      maxSortQuery, 
      data.parentId ? [data.parentId] : []
    );
    sortOrder = sortResult.rows[0].next_sort_order;
  }

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
    data.description || '',
    data.color || '#6b7280',
    data.icon || '📂',
    data.parentId || null,
    level,
    sortOrder,
    true
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
    updateFields.push(`level = $${paramIndex++}`);
    updateParams.push(data.parentId);
    updateParams.push(data.parentId ? CategoryLevel.SECONDARY : CategoryLevel.PRIMARY);
  }

  if (data.sortOrder !== undefined) {
    updateFields.push(`sort_order = $${paramIndex++}`);
    updateParams.push(data.sortOrder);
  }

  if (data.isActive !== undefined) {
    updateFields.push(`is_active = $${paramIndex++}`);
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

  // 如果不是强制删除，进行安全检查
  if (!force) {
    const existingCategories = await getAllCategories({ includeInactive: true });
    const deleteCheck = canDeleteCategory(id, existingCategories);
    if (!deleteCheck.canDelete) {
      throw new Error(deleteCheck.reason);
    }
  }

  // 开始事务
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');

    // 如果需要更新音频关联，将关联的音频分类设为null
    if (updateAudios) {
      // 更新以此分类为主分类的音频
      await client.query(
        'UPDATE audios SET category_id = NULL WHERE category_id = $1',
        [id]
      );
      
      // 更新以此分类为子分类的音频
      await client.query(
        'UPDATE audios SET subcategory_id = NULL WHERE subcategory_id = $1',
        [id]
      );
    }

    // 删除分类
    const deleteQuery = `DELETE FROM categories WHERE id = $1`;
    const result = await client.query(deleteQuery, [id]);
    
    if (result.rowCount === 0) {
      throw new Error('分类不存在');
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('删除分类失败:', error);
    
    // 检查外键约束冲突
    if (error && typeof error === 'object' && 'code' in error && error.code === '23503') {
      throw new Error('该分类下还有关联数据，无法删除。请使用强制删除或先处理关联数据。');
    }
    
    throw new Error(error instanceof Error ? error.message : '删除分类失败');
  } finally {
    client.release();
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

  // 开始事务
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');

    for (const request of requests) {
      const updateQuery = `
        UPDATE categories 
        SET sort_order = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;
      
      await client.query(updateQuery, [request.newSortOrder, request.categoryId]);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('重新排序分类失败:', error);
    throw new Error('重新排序分类失败');
  } finally {
    client.release();
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
    const [categoryResult, audioResult] = await Promise.all([
      db.query(query),
      db.query(audioStatsQuery)
    ]);

    const categoryStats = categoryResult.rows[0];
    const audioStats = audioResult.rows[0];

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
      ts_rank(to_tsvector('simple', c.name || ' ' || COALESCE(c.description, '')), plainto_tsquery('simple', $1)) as rank
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

  try {
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
    const result = await db.query(query, queryParams);
    return parseInt(result.rows[0].count) === 0;
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
    WHERE ${newParentId ? 'parent_id = $1' : 'parent_id IS NULL'}
  `;

  const sortResult = await db.query(
    maxSortQuery,
    newParentId ? [newParentId] : []
  );
  const newSortOrder = sortResult.rows[0].next_sort_order;

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
    await db.query(query, [...categoryIds, isActive]);
  } catch (error) {
    console.error('批量更新分类状态失败:', error);
    throw new Error('批量更新分类状态失败');
  }
}