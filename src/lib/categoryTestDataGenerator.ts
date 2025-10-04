/**
 * 分类测试数据生成器
 * 用于创建二级分类测试数据
 */

import CategoryService from '@/lib/categoryService';

export interface TestDataResult {
  success: boolean;
  message: string;
  created: Array<{
    name: string;
    parentName: string;
    success: boolean;
    error?: string;
  }>;
  skipped: Array<{
    name: string;
    reason: string;
  }>;
}

export class CategoryTestDataGenerator {
  /**
   * 测试二级分类数据定义
   */
  private static testSubcategories = [
    {
      parentName: '心血管',
      parentId: 'cardiology',
      subcategories: [
        {
          name: '高血压',
          description: '高血压的诊断、治疗和管理',
          color: '#ef4444',
          icon: '💓'
        },
        {
          name: '心律失常',
          description: '心律失常的诊断和治疗',
          color: '#ef4444',
          icon: '💗'
        },
        {
          name: '心力衰竭',
          description: '心力衰竭的管理和治疗',
          color: '#ef4444',
          icon: '💔'
        },
        {
          name: '冠心病',
          description: '冠状动脉疾病的诊断和治疗',
          color: '#ef4444',
          icon: '❤️'
        }
      ]
    },
    {
      parentName: '神经外科',
      parentId: 'neurology',
      subcategories: [
        {
          name: '脑卒中',
          description: '脑卒中的预防、诊断和治疗',
          color: '#8b5cf6',
          icon: '🧠'
        },
        {
          name: '癫痫',
          description: '癫痫的诊断和管理',
          color: '#8b5cf6',
          icon: '⚡'
        },
        {
          name: '帕金森病',
          description: '帕金森病的诊断和治疗',
          color: '#8b5cf6',
          icon: '🤝'
        }
      ]
    },
    {
      parentName: '消化内科',
      parentId: 'internal-medicine',
      subcategories: [
        {
          name: '胃炎',
          description: '胃炎的诊断和治疗',
          color: '#10b981',
          icon: '🫄'
        },
        {
          name: '肝炎',
          description: '肝炎的诊断和管理',
          color: '#10b981',
          icon: '🫀'
        }
      ]
    },
    {
      parentName: '儿科',
      parentId: 'pediatrics',
      subcategories: [
        {
          name: '新生儿疾病',
          description: '新生儿常见疾病的诊断和治疗',
          color: '#3b82f6',
          icon: '👶'
        },
        {
          name: '儿童发育',
          description: '儿童生长发育相关问题',
          color: '#3b82f6',
          icon: '📈'
        }
      ]
    }
  ];

  /**
   * 创建所有测试二级分类数据
   */
  static async createTestData(): Promise<TestDataResult> {
    const result: TestDataResult = {
      success: false,
      message: '',
      created: [],
      skipped: []
    };

    try {
      // 获取现有分类
      const existingCategories = await CategoryService.getCategories({ includeInactive: true });
      
      for (const parentData of this.testSubcategories) {
        // 查找父分类
        const parentCategory = existingCategories.find(cat => 
          cat.id === parentData.parentId || cat.name === parentData.parentName
        );
        
        if (!parentCategory) {
          result.skipped.push({
            name: `${parentData.parentName} 的所有子分类`,
            reason: `父分类 "${parentData.parentName}" 不存在`
          });
          continue;
        }
        
        // 创建子分类
        for (const subcategory of parentData.subcategories) {
          try {
            // 检查是否已存在
            const exists = existingCategories.some(cat => 
              cat.name === subcategory.name && cat.parentId === parentCategory.id
            );
            
            if (exists) {
              result.skipped.push({
                name: subcategory.name,
                reason: '分类已存在'
              });
              continue;
            }
            
            // 创建分类
            const createResult = await CategoryService.createCategory({
              name: subcategory.name,
              description: subcategory.description,
              parentId: parentCategory.id,
              color: subcategory.color,
              icon: subcategory.icon
            });
            
            if (createResult.success) {
              result.created.push({
                name: subcategory.name,
                parentName: parentCategory.name,
                success: true
              });
            } else {
              result.created.push({
                name: subcategory.name,
                parentName: parentCategory.name,
                success: false,
                error: createResult.error?.message || '创建失败'
              });
            }
            
          } catch (error) {
            result.created.push({
              name: subcategory.name,
              parentName: parentCategory.name,
              success: false,
              error: error instanceof Error ? error.message : '未知错误'
            });
          }
        }
      }
      
      const successCount = result.created.filter(item => item.success).length;
      const failCount = result.created.filter(item => !item.success).length;
      
      result.success = failCount === 0;
      result.message = `创建完成: ${successCount} 个成功, ${failCount} 个失败, ${result.skipped.length} 个跳过`;
      
    } catch (error) {
      result.success = false;
      result.message = `创建测试数据失败: ${error instanceof Error ? error.message : '未知错误'}`;
    }

    return result;
  }

  /**
   * 获取测试数据预览
   */
  static getTestDataPreview(): Array<{
    parentName: string;
    subcategories: string[];
  }> {
    return this.testSubcategories.map(parent => ({
      parentName: parent.parentName,
      subcategories: parent.subcategories.map(sub => sub.name)
    }));
  }
}

export default CategoryTestDataGenerator;