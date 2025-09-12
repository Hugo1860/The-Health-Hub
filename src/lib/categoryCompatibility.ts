/**
 * 分类层级功能向后兼容性适配器
 * 
 * 功能：
 * 1. 提供旧版 API 的兼容性支持
 * 2. 自动同步新旧数据字段
 * 3. 处理数据格式转换
 * 4. 提供平滑的迁移过渡
 */

import {
  Category,
  CategoryLevel,
  CategoryTreeNode,
  CategorySelection,
  CategoryOption
} from '@/types/category';

/**
 * 旧版分类接口（向后兼容）
 */
export interface LegacyCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 旧版音频接口（向后兼容）
 */
export interface LegacyAudio {
  id: string;
  title: string;
  description: string;
  url: string;
  filename: string;
  "uploadDate": string;
  subject: string; // 旧版分类字段
  tags: string[];
  "coverImage"?: string;
  playCount?: number;
  duration?: number;
}

/**
 * 增强版音频接口（新版）
 */
export interface EnhancedAudio extends LegacyAudio {
  categoryId?: string;
  subcategoryId?: string;
  category?: {
    id: string;
    name: string;
    color?: string;
    icon?: string;
  };
  subcategory?: {
    id: string;
    name: string;
  };
}

/**
 * 分类兼容性适配器类
 */
export class CategoryCompatibilityAdapter {
  /**
   * 将新版分类转换为旧版格式
   */
  static toLegacyCategory(category: Category): LegacyCategory {
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      color: category.color,
      icon: category.icon,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    };
  }

  /**
   * 将新版分类列表转换为旧版格式
   */
  static toLegacyCategoryList(categories: Category[]): LegacyCategory[] {
    return categories.map(cat => this.toLegacyCategory(cat));
  }

  /**
   * 将旧版分类转换为新版格式
   */
  static fromLegacyCategory(
    legacyCategory: LegacyCategory,
    parentId?: string
  ): Category {
    return {
      ...legacyCategory,
      parentId: parentId || null,
      level: parentId ? CategoryLevel.SECONDARY : CategoryLevel.PRIMARY,
      sortOrder: 0,
      isActive: true,
      audioCount: 0
    };
  }

  /**
   * 将新版音频转换为旧版格式
   */
  static toLegacyAudio(audio: EnhancedAudio): LegacyAudio {
    return {
      id: audio.id,
      title: audio.title,
      description: audio.description,
      url: audio.url,
      filename: audio.filename, uploadDate: audio.uploadDate,
      subject: audio.subject || audio.category?.name || '未分类',
      tags: audio.tags, coverImage: audio.coverImage,
      playCount: audio.playCount,
      duration: audio.duration
    };
  }

  /**
   * 将旧版音频转换为新版格式
   */
  static fromLegacyAudio(
    legacyAudio: LegacyAudio,
    categoryMapping?: Map<string, string>
  ): EnhancedAudio {
    const categoryId = categoryMapping?.get(legacyAudio.subject);
    
    return {
      ...legacyAudio,
      categoryId,
      subcategoryId: undefined,
      category: categoryId ? {
        id: categoryId,
        name: legacyAudio.subject
      } : undefined,
      subcategory: undefined
    };
  }

  /**
   * 扁平化分类树为旧版格式
   */
  static flattenCategoryTree(tree: CategoryTreeNode[]): LegacyCategory[] {
    const flattened: LegacyCategory[] = [];
    
    for (const node of tree) {
      // 添加一级分类
      flattened.push(this.toLegacyCategory(node));
      
      // 添加二级分类
      if (node.children) {
        for (const child of node.children) {
          flattened.push(this.toLegacyCategory(child));
        }
      }
    }
    
    return flattened;
  }

  /**
   * 从分类选择生成旧版 subject 字段
   */
  static getSubjectFromSelection(
    selection: CategorySelection,
    categories: Category[]
  ): string {
    if (selection.subcategoryId) {
      const subcategory = categories.find(cat => cat.id === selection.subcategoryId);
      if (subcategory) {
        return subcategory.name;
      }
    }
    
    if (selection.categoryId) {
      const category = categories.find(cat => cat.id === selection.categoryId);
      if (category) {
        return category.name;
      }
    }
    
    return '未分类';
  }

  /**
   * 从旧版 subject 字段推断分类选择
   */
  static getSelectionFromSubject(
    subject: string,
    categories: Category[]
  ): CategorySelection {
    // 精确匹配分类名称
    const exactMatch = categories.find(cat => cat.name === subject);
    if (exactMatch) {
      if (exactMatch.level === CategoryLevel.SECONDARY) {
        return {
          categoryId: exactMatch.parentId!,
          subcategoryId: exactMatch.id
        };
      } else {
        return {
          categoryId: exactMatch.id
        };
      }
    }
    
    // 模糊匹配
    const fuzzyMatch = categories.find(cat => 
      subject.includes(cat.name) || cat.name.includes(subject)
    );
    
    if (fuzzyMatch) {
      if (fuzzyMatch.level === CategoryLevel.SECONDARY) {
        return {
          categoryId: fuzzyMatch.parentId!,
          subcategoryId: fuzzyMatch.id
        };
      } else {
        return {
          categoryId: fuzzyMatch.id
        };
      }
    }
    
    return {};
  }

  /**
   * 生成旧版分类选项列表
   */
  static getLegacyCategoryOptions(categories: Category[]): CategoryOption[] {
    return categories
      .filter(cat => cat.level === CategoryLevel.PRIMARY)
      .map(cat => ({
        value: cat.name,
        label: cat.name,
        color: cat.color,
        icon: cat.icon
      }));
  }

  /**
   * 同步新旧数据字段
   */
  static syncAudioFields(audio: Partial<EnhancedAudio>, categories: Category[]): {
    categoryId?: string;
    subcategoryId?: string;
    subject: string;
  } {
    let categoryId = audio.categoryId;
    let subcategoryId = audio.subcategoryId;
    let subject = audio.subject || '未分类';

    // 如果有新的分类字段，更新 subject
    if (categoryId || subcategoryId) {
      const selection: CategorySelection = { categoryId, subcategoryId };
      subject = this.getSubjectFromSelection(selection, categories);
    }
    // 如果只有 subject 字段，推断新的分类字段
    else if (audio.subject) {
      const selection = this.getSelectionFromSubject(audio.subject, categories);
      categoryId = selection.categoryId;
      subcategoryId = selection.subcategoryId;
      subject = audio.subject;
    }

    return { categoryId, subcategoryId, subject };
  }

  /**
   * 创建分类映射表（subject -> categoryId）
   */
  static createCategoryMapping(categories: Category[]): Map<string, string> {
    const mapping = new Map<string, string>();
    
    for (const category of categories) {
      mapping.set(category.name, category.id);
      
      // 添加常见的别名映射
      if (category.name === '心血管') {
        mapping.set('心血管科', category.id);
        mapping.set('心内科', category.id);
      } else if (category.name === '神经科') {
        mapping.set('神经内科', category.id);
        mapping.set('脑科', category.id);
      } else if (category.name === '肿瘤科') {
        mapping.set('肿瘤内科', category.id);
        mapping.set('癌症科', category.id);
      }
      // 可以根据需要添加更多映射
    }
    
    return mapping;
  }

  /**
   * 验证数据一致性
   */
  static validateDataConsistency(
    audio: EnhancedAudio,
    categories: Category[]
  ): {
    isConsistent: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // 检查分类ID是否存在
    if (audio.categoryId) {
      const category = categories.find(cat => cat.id === audio.categoryId);
      if (!category) {
        issues.push(`分类ID ${audio.categoryId} 不存在`);
        suggestions.push('清理无效的分类引用');
      } else if (category.level !== CategoryLevel.PRIMARY) {
        issues.push(`分类ID ${audio.categoryId} 不是一级分类`);
        suggestions.push('确保 categoryId 指向一级分类');
      }
    }

    // 检查子分类ID是否存在
    if (audio.subcategoryId) {
      const subcategory = categories.find(cat => cat.id === audio.subcategoryId);
      if (!subcategory) {
        issues.push(`子分类ID ${audio.subcategoryId} 不存在`);
        suggestions.push('清理无效的子分类引用');
      } else if (subcategory.level !== CategoryLevel.SECONDARY) {
        issues.push(`子分类ID ${audio.subcategoryId} 不是二级分类`);
        suggestions.push('确保 subcategoryId 指向二级分类');
      } else if (audio.categoryId && subcategory.parentId !== audio.categoryId) {
        issues.push('子分类与父分类不匹配');
        suggestions.push('确保子分类属于指定的父分类');
      }
    }

    // 检查 subject 字段与新分类字段的一致性
    if (audio.categoryId || audio.subcategoryId) {
      const selection: CategorySelection = {
        categoryId: audio.categoryId,
        subcategoryId: audio.subcategoryId
      };
      const expectedSubject = this.getSubjectFromSelection(selection, categories);
      
      if (audio.subject && audio.subject !== expectedSubject) {
        issues.push(`subject 字段 "${audio.subject}" 与分类选择不一致，应为 "${expectedSubject}"`);
        suggestions.push('同步 subject 字段与新分类字段');
      }
    }

    return {
      isConsistent: issues.length === 0,
      issues,
      suggestions
    };
  }

  /**
   * 修复数据不一致问题
   */
  static fixDataInconsistency(
    audio: EnhancedAudio,
    categories: Category[]
  ): EnhancedAudio {
    const syncedFields = this.syncAudioFields(audio, categories);
    
    return {
      ...audio,
      categoryId: syncedFields.categoryId,
      subcategoryId: syncedFields.subcategoryId,
      subject: syncedFields.subject
    };
  }

  /**
   * 批量修复数据不一致问题
   */
  static batchFixDataInconsistency(
    audios: EnhancedAudio[],
    categories: Category[]
  ): {
    fixed: EnhancedAudio[];
    errors: Array<{ audioId: string; error: string }>;
  } {
    const fixed: EnhancedAudio[] = [];
    const errors: Array<{ audioId: string; error: string }> = [];

    for (const audio of audios) {
      try {
        const fixedAudio = this.fixDataInconsistency(audio, categories);
        fixed.push(fixedAudio);
      } catch (error) {
        errors.push({
          audioId: audio.id,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }

    return { fixed, errors };
  }

  /**
   * 生成兼容性报告
   */
  static generateCompatibilityReport(
    audios: EnhancedAudio[],
    categories: Category[]
  ): {
    totalAudios: number;
    withNewFields: number;
    withLegacyOnly: number;
    inconsistent: number;
    issues: Array<{
      audioId: string;
      title: string;
      issues: string[];
    }>;
  } {
    let withNewFields = 0;
    let withLegacyOnly = 0;
    let inconsistent = 0;
    const issues: Array<{ audioId: string; title: string; issues: string[] }> = [];

    for (const audio of audios) {
      const hasNewFields = !!(audio.categoryId || audio.subcategoryId);
      const hasLegacyFields = !!audio.subject;

      if (hasNewFields) {
        withNewFields++;
      } else if (hasLegacyFields) {
        withLegacyOnly++;
      }

      const validation = this.validateDataConsistency(audio, categories);
      if (!validation.isConsistent) {
        inconsistent++;
        issues.push({
          audioId: audio.id,
          title: audio.title,
          issues: validation.issues
        });
      }
    }

    return {
      totalAudios: audios.length,
      withNewFields,
      withLegacyOnly,
      inconsistent,
      issues
    };
  }
}

/**
 * 兼容性中间件工厂
 */
export class CompatibilityMiddleware {
  /**
   * 创建 API 响应兼容性中间件
   */
  static createResponseMiddleware(version: 'v1' | 'v2' = 'v2') {
    return (data: any) => {
      if (version === 'v1') {
        // 转换为旧版格式
        if (Array.isArray(data)) {
          return data.map(item => {
            if (item.level !== undefined) {
              // 分类数据
              return CategoryCompatibilityAdapter.toLegacyCategory(item);
            } else if (item.categoryId !== undefined) {
              // 音频数据
              return CategoryCompatibilityAdapter.toLegacyAudio(item);
            }
            return item;
          });
        } else if (data.level !== undefined) {
          return CategoryCompatibilityAdapter.toLegacyCategory(data);
        } else if (data.categoryId !== undefined) {
          return CategoryCompatibilityAdapter.toLegacyAudio(data);
        }
      }
      
      return data;
    };
  }

  /**
   * 创建 API 请求兼容性中间件
   */
  static createRequestMiddleware(categories: Category[]) {
    return (requestData: any) => {
      if (requestData.subject && !requestData.categoryId && !requestData.subcategoryId) {
        // 从旧版 subject 字段推断新字段
        const selection = CategoryCompatibilityAdapter.getSelectionFromSubject(
          requestData.subject,
          categories
        );
        
        return {
          ...requestData,
          categoryId: selection.categoryId,
          subcategoryId: selection.subcategoryId
        };
      }
      
      if ((requestData.categoryId || requestData.subcategoryId) && !requestData.subject) {
        // 从新字段生成 subject 字段
        const selection: CategorySelection = {
          categoryId: requestData.categoryId,
          subcategoryId: requestData.subcategoryId
        };
        
        const subject = CategoryCompatibilityAdapter.getSubjectFromSelection(
          selection,
          categories
        );
        
        return {
          ...requestData,
          subject
        };
      }
      
      return requestData;
    };
  }
}

// 导出默认适配器实例
export default CategoryCompatibilityAdapter;