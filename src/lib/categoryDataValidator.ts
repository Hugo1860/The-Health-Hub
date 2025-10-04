/**
 * 分类数据验证和一致性检查工具
 */

import CategoryService from '@/lib/categoryService';
import { Category } from '@/types/category';

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  categoryId: string;
  categoryName: string;
  issue: string;
  suggestion: string;
  autoFixable: boolean;
}

export interface ValidationResult {
  success: boolean;
  totalCategories: number;
  issuesFound: number;
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
}

export interface FixResult {
  success: boolean;
  message: string;
  fixed: Array<{
    categoryId: string;
    issue: string;
    action: string;
  }>;
  failed: Array<{
    categoryId: string;
    issue: string;
    error: string;
  }>;
}

export class CategoryDataValidator {
  /**
   * 执行完整的数据验证
   */
  static async validateAllData(): Promise<ValidationResult> {
    const result: ValidationResult = {
      success: false,
      totalCategories: 0,
      issuesFound: 0,
      issues: [],
      summary: {
        errors: 0,
        warnings: 0,
        info: 0
      }
    };

    try {
      // 获取所有分类数据
      const categories = await CategoryService.getCategories({ 
        includeInactive: true,
        includeCount: true 
      });
      
      result.totalCategories = categories.length;
      
      // 执行各种验证
      await this.validateHierarchyConsistency(categories, result);
      await this.validateOrphanedCategories(categories, result);
      await this.validateDuplicateNames(categories, result);
      await this.validateEmptyCategories(categories, result);
      await this.validateMissingFields(categories, result);
      
      // 统计结果
      result.issuesFound = result.issues.length;
      result.summary.errors = result.issues.filter(i => i.type === 'error').length;
      result.summary.warnings = result.issues.filter(i => i.type === 'warning').length;
      result.summary.info = result.issues.filter(i => i.type === 'info').length;
      
      result.success = result.summary.errors === 0;
      
    } catch (error) {
      console.error('数据验证失败:', error);
      result.issues.push({
        type: 'error',
        categoryId: 'system',
        categoryName: '系统',
        issue: '数据验证过程失败',
        suggestion: '检查数据库连接和权限',
        autoFixable: false
      });
    }

    return result;
  }

  /**
   * 验证层级一致性
   */
  private static async validateHierarchyConsistency(
    categories: Category[], 
    result: ValidationResult
  ): Promise<void> {
    for (const category of categories) {
      // 检查一级分类不应该有父分类
      if (category.level === 1 && category.parentId) {
        result.issues.push({
          type: 'error',
          categoryId: category.id,
          categoryName: category.name,
          issue: '一级分类不应该有父分类',
          suggestion: '移除父分类ID或将层级改为2',
          autoFixable: true
        });
      }
      
      // 检查二级分类必须有父分类
      if (category.level === 2 && !category.parentId) {
        result.issues.push({
          type: 'error',
          categoryId: category.id,
          categoryName: category.name,
          issue: '二级分类缺少父分类',
          suggestion: '设置父分类ID或将层级改为1',
          autoFixable: true
        });
      }
      
      // 检查层级值是否有效
      if (category.level && (category.level < 1 || category.level > 2)) {
        result.issues.push({
          type: 'error',
          categoryId: category.id,
          categoryName: category.name,
          issue: `无效的层级值: ${category.level}`,
          suggestion: '将层级设置为1或2',
          autoFixable: true
        });
      }
    }
  }

  /**
   * 验证孤立分类
   */
  private static async validateOrphanedCategories(
    categories: Category[], 
    result: ValidationResult
  ): Promise<void> {
    for (const category of categories) {
      if (category.parentId) {
        const parentExists = categories.some(c => c.id === category.parentId);
        if (!parentExists) {
          result.issues.push({
            type: 'error',
            categoryId: category.id,
            categoryName: category.name,
            issue: `父分类不存在: ${category.parentId}`,
            suggestion: '移除父分类引用或创建对应的父分类',
            autoFixable: true
          });
        }
      }
    }
  }

  /**
   * 验证重复名称
   */
  private static async validateDuplicateNames(
    categories: Category[], 
    result: ValidationResult
  ): Promise<void> {
    const nameGroups = new Map<string, Category[]>();
    
    // 按名称分组
    for (const category of categories) {
      const key = `${category.name}_${category.parentId || 'root'}`;
      if (!nameGroups.has(key)) {
        nameGroups.set(key, []);
      }
      nameGroups.get(key)!.push(category);
    }
    
    // 检查重复
    for (const [key, group] of nameGroups) {
      if (group.length > 1) {
        for (const category of group) {
          result.issues.push({
            type: 'warning',
            categoryId: category.id,
            categoryName: category.name,
            issue: '同层级下存在重复名称',
            suggestion: '修改分类名称以避免混淆',
            autoFixable: false
          });
        }
      }
    }
  }

  /**
   * 验证空分类
   */
  private static async validateEmptyCategories(
    categories: Category[], 
    result: ValidationResult
  ): Promise<void> {
    for (const category of categories) {
      if ((category.audioCount || 0) === 0) {
        // 检查是否有子分类
        const hasChildren = categories.some(c => c.parentId === category.id);
        
        if (!hasChildren) {
          result.issues.push({
            type: 'info',
            categoryId: category.id,
            categoryName: category.name,
            issue: '空分类（无音频且无子分类）',
            suggestion: '考虑添加内容或删除此分类',
            autoFixable: false
          });
        }
      }
    }
  }

  /**
   * 验证缺失字段
   */
  private static async validateMissingFields(
    categories: Category[], 
    result: ValidationResult
  ): Promise<void> {
    for (const category of categories) {
      // 检查必要字段
      if (!category.name || category.name.trim() === '') {
        result.issues.push({
          type: 'error',
          categoryId: category.id,
          categoryName: category.id,
          issue: '分类名称为空',
          suggestion: '设置有效的分类名称',
          autoFixable: false
        });
      }
      
      if (category.level === undefined || category.level === null) {
        result.issues.push({
          type: 'warning',
          categoryId: category.id,
          categoryName: category.name,
          issue: '缺少层级信息',
          suggestion: '设置正确的层级值',
          autoFixable: true
        });
      }
      
      if (!category.color) {
        result.issues.push({
          type: 'info',
          categoryId: category.id,
          categoryName: category.name,
          issue: '缺少颜色设置',
          suggestion: '设置分类颜色以改善视觉效果',
          autoFixable: true
        });
      }
    }
  }

  /**
   * 自动修复可修复的问题
   */
  static async autoFixIssues(issues: ValidationIssue[]): Promise<FixResult> {
    const result: FixResult = {
      success: false,
      message: '',
      fixed: [],
      failed: []
    };

    const fixableIssues = issues.filter(issue => issue.autoFixable);
    
    for (const issue of fixableIssues) {
      try {
        await this.fixSingleIssue(issue);
        result.fixed.push({
          categoryId: issue.categoryId,
          issue: issue.issue,
          action: issue.suggestion
        });
      } catch (error) {
        result.failed.push({
          categoryId: issue.categoryId,
          issue: issue.issue,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }
    
    result.success = result.failed.length === 0;
    result.message = `修复完成: ${result.fixed.length}个成功, ${result.failed.length}个失败`;
    
    return result;
  }

  /**
   * 修复单个问题
   */
  private static async fixSingleIssue(issue: ValidationIssue): Promise<void> {
    const category = await CategoryService.getCategoryById(issue.categoryId);
    if (!category) {
      throw new Error('分类不存在');
    }

    let updateData: any = {};

    // 根据问题类型确定修复方案
    if (issue.issue.includes('一级分类不应该有父分类')) {
      updateData.parentId = null;
    } else if (issue.issue.includes('二级分类缺少父分类')) {
      updateData.level = 1;
    } else if (issue.issue.includes('无效的层级值')) {
      updateData.level = category.parentId ? 2 : 1;
    } else if (issue.issue.includes('父分类不存在')) {
      updateData.parentId = null;
      updateData.level = 1;
    } else if (issue.issue.includes('缺少层级信息')) {
      updateData.level = category.parentId ? 2 : 1;
    } else if (issue.issue.includes('缺少颜色设置')) {
      updateData.color = '#6b7280';
    }

    if (Object.keys(updateData).length > 0) {
      await CategoryService.updateCategory(category.id, updateData);
    }
  }

  /**
   * 生成验证报告
   */
  static generateReport(result: ValidationResult): string {
    const lines: string[] = [];
    
    lines.push('=== 分类数据验证报告 ===');
    lines.push(`验证时间: ${new Date().toLocaleString('zh-CN')}`);
    lines.push(`总分类数: ${result.totalCategories}`);
    lines.push(`发现问题: ${result.issuesFound}`);
    lines.push('');
    
    lines.push('📊 问题统计:');
    lines.push(`  ❌ 错误: ${result.summary.errors}`);
    lines.push(`  ⚠️ 警告: ${result.summary.warnings}`);
    lines.push(`  ℹ️ 信息: ${result.summary.info}`);
    lines.push('');
    
    if (result.issues.length > 0) {
      lines.push('🔍 详细问题:');
      result.issues.forEach((issue, index) => {
        const icon = issue.type === 'error' ? '❌' : 
                    issue.type === 'warning' ? '⚠️' : 'ℹ️';
        lines.push(`  ${index + 1}. ${icon} ${issue.categoryName} (${issue.categoryId})`);
        lines.push(`     问题: ${issue.issue}`);
        lines.push(`     建议: ${issue.suggestion}`);
        lines.push(`     可自动修复: ${issue.autoFixable ? '是' : '否'}`);
        lines.push('');
      });
    } else {
      lines.push('✅ 未发现数据问题，分类数据完整性良好！');
    }
    
    return lines.join('\n');
  }
}

export default CategoryDataValidator;