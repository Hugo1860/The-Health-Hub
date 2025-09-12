/**
 * 分类API数据格式验证工具
 */

import CategoryService from '@/lib/categoryService';

export interface ApiValidationResult {
  success: boolean;
  message: string;
  details: {
    totalCategories: number;
    level1Categories: number;
    level2Categories: number;
    categoriesWithParentId: number;
    categoriesWithLevel: number;
    missingFields: string[];
    sampleData: any[];
  };
  issues: string[];
}

export class CategoryApiValidator {
  /**
   * 验证分类API数据格式
   */
  static async validateApiData(): Promise<ApiValidationResult> {
    const result: ApiValidationResult = {
      success: false,
      message: '',
      details: {
        totalCategories: 0,
        level1Categories: 0,
        level2Categories: 0,
        categoriesWithParentId: 0,
        categoriesWithLevel: 0,
        missingFields: [],
        sampleData: []
      },
      issues: []
    };

    try {
      // 直接使用CategoryService获取数据
      const categories = await CategoryService.getCategories({ 
        includeCount: true,
        includeInactive: true 
      });
      
      // 基本统计
      result.details.totalCategories = categories.length;
      result.details.level1Categories = categories.filter((c: any) => c.level === 1).length;
      result.details.level2Categories = categories.filter((c: any) => c.level === 2).length;
      result.details.categoriesWithParentId = categories.filter((c: any) => c.parentId).length;
      result.details.categoriesWithLevel = categories.filter((c: any) => c.level !== undefined && c.level !== null).length;
      
      // 检查必要字段
      const requiredFields = ['id', 'name', 'level', 'parentId', 'isActive', 'createdAt', 'updatedAt'];
      const missingFields: string[] = [];
      
      if (categories.length > 0) {
        const sampleCategory = categories[0];
        for (const field of requiredFields) {
          if (!(field in sampleCategory)) {
            missingFields.push(field);
          }
        }
      }
      
      result.details.missingFields = missingFields;
      result.details.sampleData = categories.slice(0, 3); // 前3个作为样本
      
      // 验证数据一致性
      this.validateDataConsistency(categories, result);
      
      // 生成结果
      result.success = result.issues.length === 0;
      result.message = result.success ? 'API数据格式验证通过' : '发现数据格式问题';
      
    } catch (error) {
      result.issues.push(`验证过程出错: ${error instanceof Error ? error.message : '未知错误'}`);
      result.message = 'API验证失败';
    }

    return result;
  }

  /**
   * 验证数据一致性
   */
  private static validateDataConsistency(categories: any[], result: ApiValidationResult): void {
    for (const category of categories) {
      // 检查层级一致性
      if (category.level === 1 && category.parentId) {
        result.issues.push(`一级分类 "${category.name}" 不应该有父分类ID`);
      }
      
      if (category.level === 2 && !category.parentId) {
        result.issues.push(`二级分类 "${category.name}" 缺少父分类ID`);
      }
      
      // 检查父分类是否存在
      if (category.parentId) {
        const parentExists = categories.some(c => c.id === category.parentId);
        if (!parentExists) {
          result.issues.push(`分类 "${category.name}" 的父分类不存在`);
        }
      }
      
      // 检查必要字段
      if (!category.id) {
        result.issues.push(`分类缺少ID字段`);
      }
      
      if (!category.name) {
        result.issues.push(`分类 "${category.id}" 缺少名称`);
      }
      
      if (category.level === undefined || category.level === null) {
        result.issues.push(`分类 "${category.name}" 缺少层级信息`);
      }
    }
  }

  /**
   * 测试分类树API
   */
  static async validateTreeApi(): Promise<{
    success: boolean;
    message: string;
    treeStructure?: any;
    issues: string[];
  }> {
    const result = {
      success: false,
      message: '',
      treeStructure: undefined,
      issues: [] as string[]
    };

    try {
      // 直接使用CategoryService获取树形数据
      const treeData = await CategoryService.getCategoryTree(true);
      
      result.treeStructure = treeData;
      
      // 验证树形结构
      if (!Array.isArray(treeData)) {
        result.issues.push('树形数据应该返回数组');
      } else {
        for (const node of treeData) {
          if (!node.id || !node.name) {
            result.issues.push('树形节点缺少必要字段');
          }
          
          if (node.children && !Array.isArray(node.children)) {
            result.issues.push('children字段应该是数组');
          }
        }
      }
      
      result.success = result.issues.length === 0;
      result.message = result.success ? '树形API验证通过' : '树形API存在问题';
      
    } catch (error) {
      result.issues.push(`树形API验证出错: ${error instanceof Error ? error.message : '未知错误'}`);
      result.message = '树形API验证失败';
    }

    return result;
  }
}

export default CategoryApiValidator;