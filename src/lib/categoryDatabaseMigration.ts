/**
 * 分类数据库迁移工具
 * 用于自动执行数据库结构迁移
 */

import db from '@/lib/db';

export interface MigrationResult {
  success: boolean;
  message: string;
  details: string[];
  errors: string[];
}

export class CategoryDatabaseMigration {
  /**
   * 执行完整的数据库迁移
   */
  static async runMigration(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      message: '',
      details: [],
      errors: []
    };

    try {
      // 1. 添加缺失的字段
      await this.addMissingFields(result);
      
      // 2. 添加约束
      await this.addConstraints(result);
      
      // 3. 添加索引
      await this.addIndexes(result);
      
      // 4. 更新现有数据
      await this.updateExistingData(result);
      
      result.success = result.errors.length === 0;
      result.message = result.success ? '数据库迁移完成' : '迁移过程中出现错误';
      
    } catch (error) {
      result.errors.push(`迁移失败: ${error instanceof Error ? error.message : '未知错误'}`);
      result.success = false;
      result.message = '数据库迁移失败';
    }

    return result;
  }

  /**
   * 添加缺失的字段
   */
  private static async addMissingFields(result: MigrationResult): Promise<void> {
    const fields = [
      {
        name: 'parent_id',
        sql: 'ALTER TABLE categories ADD COLUMN parent_id VARCHAR(255) DEFAULT NULL'
      },
      {
        name: 'level',
        sql: 'ALTER TABLE categories ADD COLUMN level INTEGER DEFAULT 1 CHECK (level IN (1, 2))'
      },
      {
        name: 'sort_order',
        sql: 'ALTER TABLE categories ADD COLUMN sort_order INTEGER DEFAULT 0'
      }
    ];

    for (const field of fields) {
      try {
        // 检查字段是否存在
        const checkQuery = `
          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'categories' AND column_name = $1
          ) as exists
        `;
        
        const checkResult = await db.query(checkQuery, [field.name]);
        const exists = checkResult.rows[0].exists;
        
        if (!exists) {
          await db.query(field.sql);
          result.details.push(`✅ 添加字段: ${field.name}`);
        } else {
          result.details.push(`ℹ️ 字段已存在: ${field.name}`);
        }
      } catch (error) {
        result.errors.push(`❌ 添加字段 ${field.name} 失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }
  }  /*
*
   * 添加约束
   */
  private static async addConstraints(result: MigrationResult): Promise<void> {
    const constraints = [
      {
        name: 'fk_categories_parent',
        sql: 'ALTER TABLE categories ADD CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE'
      },
      {
        name: 'chk_category_hierarchy',
        sql: `ALTER TABLE categories ADD CONSTRAINT chk_category_hierarchy 
              CHECK ((level = 1 AND parent_id IS NULL) OR (level = 2 AND parent_id IS NOT NULL))`
      }
    ];

    for (const constraint of constraints) {
      try {
        // 检查约束是否存在
        const checkQuery = `
          SELECT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE table_name = 'categories' AND constraint_name = $1
          ) as exists
        `;
        
        const checkResult = await db.query(checkQuery, [constraint.name]);
        const exists = checkResult.rows[0].exists;
        
        if (!exists) {
          await db.query(constraint.sql);
          result.details.push(`✅ 添加约束: ${constraint.name}`);
        } else {
          result.details.push(`ℹ️ 约束已存在: ${constraint.name}`);
        }
      } catch (error) {
        result.errors.push(`❌ 添加约束 ${constraint.name} 失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }
  }

  /**
   * 添加索引
   */
  private static async addIndexes(result: MigrationResult): Promise<void> {
    const indexes = [
      {
        name: 'idx_categories_parent',
        sql: 'CREATE INDEX idx_categories_parent ON categories(parent_id)'
      },
      {
        name: 'idx_categories_level',
        sql: 'CREATE INDEX idx_categories_level ON categories(level)'
      },
      {
        name: 'idx_categories_hierarchy',
        sql: 'CREATE INDEX idx_categories_hierarchy ON categories(level, parent_id, sort_order)'
      }
    ];

    for (const index of indexes) {
      try {
        // 检查索引是否存在
        const checkQuery = `
          SELECT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE tablename = 'categories' AND indexname = $1
          ) as exists
        `;
        
        const checkResult = await db.query(checkQuery, [index.name]);
        const exists = checkResult.rows[0].exists;
        
        if (!exists) {
          await db.query(index.sql);
          result.details.push(`✅ 添加索引: ${index.name}`);
        } else {
          result.details.push(`ℹ️ 索引已存在: ${index.name}`);
        }
      } catch (error) {
        result.errors.push(`❌ 添加索引 ${index.name} 失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }
  }

  /**
   * 更新现有数据
   */
  private static async updateExistingData(result: MigrationResult): Promise<void> {
    try {
      // 确保所有现有分类都有正确的level值
      const updateLevelQuery = `
        UPDATE categories 
        SET level = 1 
        WHERE level IS NULL OR level = 0
      `;
      
      const updateResult = await db.query(updateLevelQuery);
      if (updateResult.rowCount && updateResult.rowCount > 0) {
        result.details.push(`✅ 更新了 ${updateResult.rowCount} 个分类的层级信息`);
      }
      
      // 确保所有现有分类都有sort_order值
      const updateSortQuery = `
        UPDATE categories 
        SET sort_order = 0 
        WHERE sort_order IS NULL
      `;
      
      const sortResult = await db.query(updateSortQuery);
      if (sortResult.rowCount && sortResult.rowCount > 0) {
        result.details.push(`✅ 更新了 ${sortResult.rowCount} 个分类的排序信息`);
      }
      
    } catch (error) {
      result.errors.push(`❌ 更新现有数据失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }
}

export default CategoryDatabaseMigration;