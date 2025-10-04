import { useState, useEffect } from 'react';
import { message } from 'antd';

// 导入新的类型定义
import {
  Category,
  CategoryLevel,
  CategoryOption,
  CreateCategoryRequest
} from '@/types/category';

import { generateCategoryOptions } from '@/lib/categoryUtils';

interface UseCategoriesOptions {
  requireAuth?: boolean;
  autoFetch?: boolean;
}

export function useCategories(options: UseCategoriesOptions = {}) {
  const { requireAuth = false, autoFetch = true } = options;
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 默认分类作为后备
  const defaultCategories: Category[] = [
    {
      id: 'cardiology',
      name: '心血管',
      description: '心血管疾病相关内容',
      level: CategoryLevel.PRIMARY,
      sortOrder: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'neurology',
      name: '神经科',
      description: '神经系统疾病相关内容',
      level: CategoryLevel.PRIMARY,
      sortOrder: 1,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'internal-medicine',
      name: '内科学',
      description: '内科疾病相关内容',
      level: CategoryLevel.PRIMARY,
      sortOrder: 2,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'surgery',
      name: '外科',
      description: '外科手术相关内容',
      level: CategoryLevel.PRIMARY,
      sortOrder: 3,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'pediatrics',
      name: '儿科',
      description: '儿童疾病相关内容',
      level: CategoryLevel.PRIMARY,
      sortOrder: 4,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'other',
      name: '其他',
      description: '其他医学相关内容',
      level: CategoryLevel.PRIMARY,
      sortOrder: 5,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 根据是否需要认证选择不同的API端点
      const apiUrl = requireAuth ? '/api/admin/simple-categories' : '/api/simple-categories';
      
      const response = await fetch(apiUrl, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.categories && Array.isArray(data.categories)) {
          setCategories(data.categories);
        } else if (Array.isArray(data)) {
          // 兼容直接返回数组的情况，转换为新格式
          const convertedCategories = data.map((cat: any) => ({
            ...cat,
            level: cat.level || CategoryLevel.PRIMARY,
            sortOrder: cat.sortOrder || 0,
            isActive: cat.isActive !== false,
            parentId: cat.parentId || null
          }));
          setCategories(convertedCategories);
        } else {
          console.warn('分类数据格式异常，使用默认分类:', data);
          setCategories(defaultCategories);
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取分类失败';
      console.error('获取分类失败:', error);
      setError(errorMessage);
      
      // 使用默认分类作为后备
      setCategories(defaultCategories);
      
      // 只在非自动获取时显示错误消息
      if (!autoFetch) {
        message.error('获取分类失败，已加载默认分类');
      }
    } finally {
      setLoading(false);
    }
  };

  // 创建新分类（仅管理员）
  const createCategory = async (categoryData: CreateCategoryRequest) => {
    if (!requireAuth) {
      throw new Error('创建分类需要管理员权限');
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/simple-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(categoryData)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // 添加新分类到列表
          setCategories(prev => [...prev, data.data]);
          message.success('分类创建成功');
          return data.data;
        } else {
          throw new Error(data.error?.message || '创建分类失败');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || '创建分类失败');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '创建分类失败';
      setError(errorMessage);
      message.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 获取分类选项（用于Select组件）
  const getCategoryOptions = () => {
    return generateCategoryOptions(categories);
  };

  // 根据名称查找分类
  const findCategoryByName = (name: string) => {
    return categories.find(category => category.name === name);
  };

  // 根据ID查找分类
  const findCategoryById = (id: string) => {
    return categories.find(category => category.id === id);
  };

  // 自动获取分类数据
  useEffect(() => {
    if (autoFetch) {
      fetchCategories();
    }
  }, [autoFetch, requireAuth]);

  return {
    categories,
    loading,
    error,
    fetchCategories,
    createCategory,
    getCategoryOptions,
    findCategoryByName,
    findCategoryById,
    defaultCategories
  };
}