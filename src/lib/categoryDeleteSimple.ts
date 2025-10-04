/**
 * 简化的分类删除函数
 * 直接使用数据库查询，避免连接池问题
 */

import { getDatabase } from '@/lib/database';
import { getAllCategories } from '@/lib/categoryQueriesFixed';
import { canDeleteCategory } from '@/lib/categoryUtils';

const db = getDatabase();

/**
 * 简单删除分类
 */
export async function deleteCategory(
  id: string, 
  options: { force?: boolean } = {}
): Promise<void> {
  const { force = false } = options;

  try {
    // 如果不是强制删除，进行安全检查
    if (!force) {
      const existingCategories = await getAllCategories({ includeInactive: true });
      const deleteCheck = canDeleteCategory(id, existingCategories);
      if (!deleteCheck.canDelete) {
        throw new Error(deleteCheck.reason);
      }
    }

    // 先清理音频关联
    await db.query(
      'UPDATE audios SET category_id = NULL WHERE category_id = $1',
      [id]
    );
    
    await db.query(
      'UPDATE audios SET subcategory_id = NULL WHERE subcategory_id = $1',
      [id]
    );

    // 删除分类
    const result = await db.query('DELETE FROM categories WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      throw new Error('分类不存在');
    }
  } catch (error) {
    console.error('删除分类失败:', error);
    throw new Error(error instanceof Error ? error.message : '删除分类失败');
  }
}

/**
 * 批量删除分类
 */
export async function batchDeleteCategories(
  categoryIds: string[],
  options: { force?: boolean } = {}
): Promise<{ 
  success: string[]; 
  failed: Array<{ id: string; error: string }> 
}> {
  const success: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];

  for (const categoryId of categoryIds) {
    try {
      await deleteCategory(categoryId, options);
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