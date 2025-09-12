/**
 * 分类数据库诊断工具
 * 用于检查数据库结构和数据完整性
 */

import db from '@/lib/db';

export interface DatabaseDiagnosticResult {
  hasRequiredFields: boolean;
  missingFields: string[];
  hasConstraints: boolean;
  missingConstraints: string[];
  hasIndexes: boolean;
  missingIndexes: string[];
  dataConsistency: {
    totalCategories: number;
    level1Categories: number;
    level2Categories: number;
    orphanedCategories: number;
    inconsistentLevels: number;
  };
  recommendations: string[];
}

export class CategoryDatabaseDiagnostic {
  /**
   * 执行完整的数据库诊断
   */
  static async runFullDiagnostic(): Promise<DatabaseDiagnosticResult> {
    const result: DatabaseDiagnosticResult = {
      hasRequiredFields: false,
      missingFields: [],
      hasConstraints: false,
      missingConstraints: [],
      hasIndexes: false,
      missingIndexes: [],
      dataConsistency: {
        totalCategories: 0,
        level1Categories: 0,
        level2Categories: 0,
        orphanedCategories: 0,
        inconsistentLevels: 0
      },
      recommendations: []
    };

    try {
      // 检查表结构
      await this.checkTableStructure(result);
      
      // 检查约束
      await this.checkConstraints(result);
      
      // 检查索引
      await this.checkIndexes(result);
      
      // 检查数据一致性
      await this.checkDataConsistency(result);
      
      // 生成建议
      this.generateRecommendations(result);
      
    } catch (error) {
      console.error('数据库诊断失败:', error);
      result.recommendations.push('数据库连接失败，请检查数据库配置');
    }

    return result;
  }

  /**
   * 检查表结构
   */
  private static async checkTableStructure(result: DatabaseDiagnosticResult): Promise<void> {
    const requiredFields = ['parent_id', 'level', 'sort_order'];
    
    try {
      const query = `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'categories' 
        AND column_name = ANY($1)
        ORDER BY ordinal_position
      `;
      
      const { rows } = await db.query(query, [requiredFields]);
      const existingFields = rows.map(row => row.column_name);
      
      result.missingFields = requiredFields.filter(field => !existingFields.includes(field));
      result.hasRequiredFields = result.missingFields.length === 0;
      
    } catch (error) {
      console.error('检查表结构失败:', error);
      result.missingFields = requiredFields;
    }
  }

  /**
   * 检查约束
   */
  private static async checkConstraints(result: DatabaseDiagnosticResult): Promise<void> {
    const requiredConstraints = [
      'fk_categories_parent',
      'chk_category_hierarchy'
    ];
    
    try {
      const query = `
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_name = 'categories'
        AND constraint_name = ANY($1)
      `;
      
      const { rows } = await db.query(query, [requiredConstraints]);
      const existingConstraints = rows.map(row => row.constraint_name);
      
      result.missingConstraints = requiredConstraints.filter(
        constraint => !existingConstraints.includes(constraint)
      );
      result.hasConstraints = result.missingConstraints.length === 0;
      
    } catch (error) {
      console.error('检查约束失败:', error);
      result.missingConstraints = requiredConstraints;
    }
  }

  /**
   * 检查索引
   */
  private static async checkIndexes(result: DatabaseDiagnosticResult): Promise<void> {
    const requiredIndexes = [
      'idx_categories_parent',
      'idx_categories_level',
      'idx_categories_hierarchy'
    ];
    
    try {
      const query = `
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'categories'
        AND indexname = ANY($1)
      `;
      
      const { rows } = await db.query(query, [requiredIndexes]);
      const existingIndexes = rows.map(row => row.indexname);
      
      result.missingIndexes = requiredIndexes.filter(
        index => !existingIndexes.includes(index)
      );
      result.hasIndexes = result.missingIndexes.length === 0;
      
    } catch (error) {
      console.error('检查索引失败:', error);
      result.missingIndexes = requiredIndexes;
    }
  }

  /**
   * 检查数据一致性
   */
  private static async checkDataConsistency(result: DatabaseDiagnosticResult): Promise<void> {
    try {
      // 基本统计
      const statsQuery = `
        SELECT 
          COUNT(*) as total_categories,
          COUNT(CASE WHEN level = 1 OR level IS NULL THEN 1 END) as level_1,
          COUNT(CASE WHEN level = 2 THEN 1 END) as level_2
        FROM categories
      `;
      
      const statsResult = await db.query(statsQuery);
      const stats = statsResult.rows[0];
      
      result.dataConsistency.totalCategories = parseInt(stats.total_categories);
      result.dataConsistency.level1Categories = parseInt(stats.level_1);
      result.dataConsistency.level2Categories = parseInt(stats.level_2);
      
      // 检查孤立的分类（有parent_id但父分类不存在）
      if (!result.missingFields.includes('parent_id')) {
        const orphanQuery = `
          SELECT COUNT(*) as orphaned
          FROM categories c1
          WHERE c1.parent_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM categories c2 
            WHERE c2.id = c1.parent_id
          )
        `;
        
        const orphanResult = await db.query(orphanQuery);
        result.dataConsistency.orphanedCategories = parseInt(orphanResult.rows[0].orphaned);
      }
      
      // 检查层级不一致的数据
      if (!result.missingFields.includes('level') && !result.missingFields.includes('parent_id')) {
        const inconsistentQuery = `
          SELECT COUNT(*) as inconsistent
          FROM categories
          WHERE (level = 1 AND parent_id IS NOT NULL)
          OR (level = 2 AND parent_id IS NULL)
        `;
        
        const inconsistentResult = await db.query(inconsistentQuery);
        result.dataConsistency.inconsistentLevels = parseInt(inconsistentResult.rows[0].inconsistent);
      }
      
    } catch (error) {
      console.error('检查数据一致性失败:', error);
    }
  }

  /**
   * 生成建议
   */
  private static generateRecommendations(result: DatabaseDiagnosticResult): void {
    const recommendations: string[] = [];
    
    // 表结构建议
    if (!result.hasRequiredFields) {
      recommendations.push(`需要执行数据库迁移，添加缺失字段: ${result.missingFields.join(', ')}`);
      recommendations.push('运行命令: psql $DATABASE_URL -f database/migrations/001_add_category_hierarchy.sql');
    }
    
    // 约束建议
    if (!result.hasConstraints) {
      recommendations.push(`需要添加数据库约束: ${result.missingConstraints.join(', ')}`);
    }
    
    // 索引建议
    if (!result.hasIndexes) {
      recommendations.push(`建议添加索引以优化性能: ${result.missingIndexes.join(', ')}`);
    }
    
    // 数据建议
    if (result.dataConsistency.level2Categories === 0) {
      recommendations.push('数据库中没有二级分类，建议创建一些测试数据');
      recommendations.push('可以使用管理界面的"初始化测试数据"功能');
    }
    
    if (result.dataConsistency.orphanedCategories > 0) {
      recommendations.push(`发现 ${result.dataConsistency.orphanedCategories} 个孤立分类，需要修复数据一致性`);
    }
    
    if (result.dataConsistency.inconsistentLevels > 0) {
      recommendations.push(`发现 ${result.dataConsistency.inconsistentLevels} 个层级不一致的分类，需要修复`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('数据库结构和数据完整性良好！');
    }
    
    result.recommendations = recommendations;
  }

  /**
   * 生成诊断报告
   */
  static generateReport(result: DatabaseDiagnosticResult): string {
    const lines: string[] = [];
    
    lines.push('=== 分类数据库诊断报告 ===');
    lines.push(`生成时间: ${new Date().toLocaleString('zh-CN')}`);
    lines.push('');
    
    // 表结构状态
    lines.push('📋 表结构状态:');
    lines.push(`  ✅ 必要字段: ${result.hasRequiredFields ? '完整' : '缺失'}`);
    if (result.missingFields.length > 0) {
      lines.push(`     缺失字段: ${result.missingFields.join(', ')}`);
    }
    lines.push('');
    
    // 约束状态
    lines.push('🔒 约束状态:');
    lines.push(`  ✅ 数据约束: ${result.hasConstraints ? '完整' : '缺失'}`);
    if (result.missingConstraints.length > 0) {
      lines.push(`     缺失约束: ${result.missingConstraints.join(', ')}`);
    }
    lines.push('');
    
    // 索引状态
    lines.push('⚡ 索引状态:');
    lines.push(`  ✅ 性能索引: ${result.hasIndexes ? '完整' : '缺失'}`);
    if (result.missingIndexes.length > 0) {
      lines.push(`     缺失索引: ${result.missingIndexes.join(', ')}`);
    }
    lines.push('');
    
    // 数据统计
    lines.push('📊 数据统计:');
    lines.push(`  总分类数: ${result.dataConsistency.totalCategories}`);
    lines.push(`  一级分类: ${result.dataConsistency.level1Categories}`);
    lines.push(`  二级分类: ${result.dataConsistency.level2Categories}`);
    lines.push(`  孤立分类: ${result.dataConsistency.orphanedCategories}`);
    lines.push(`  层级错误: ${result.dataConsistency.inconsistentLevels}`);
    lines.push('');
    
    // 建议
    lines.push('💡 修复建议:');
    result.recommendations.forEach((rec, index) => {
      lines.push(`  ${index + 1}. ${rec}`);
    });
    
    return lines.join('\n');
  }
}

export default CategoryDatabaseDiagnostic;