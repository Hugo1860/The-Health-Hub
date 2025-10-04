'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { message } from 'antd';

// 导入新的类型定义
import {
  Category,
  CategoryLevel,
  CategoryTreeNode,
  CategorySelection,
  CategoryPath,
  CategoryOption,
  CategoryStats,
  CategoryContextType,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategoryOperationResult,
  CategoryValidationResult,
  CategoryReorderRequest,
  CategoryPermissions
} from '@/types/category';

import {
  buildCategoryTree,
  getCategoryPath,
  generateCategoryOptions,
  getSubcategoryOptions,
  calculateCategoryStats,
  validateCategory,
  validateCategorySelection
} from '@/lib/categoryUtils';

// 使用新的上下文类型定义
// CategoryContextType 已在 @/types/category 中定义

const CategoriesContext = createContext<CategoriesContextType | undefined>(undefined);

// 默认分类数据
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cardiology', name: '心血管', description: '心血管疾病相关内容' },
  { id: 'neurology', name: '神经科', description: '神经系统疾病相关内容' },
  { id: 'internal-medicine', name: '内科学', description: '内科疾病相关内容' },
  { id: 'surgery', name: '外科', description: '外科手术相关内容' },
  { id: 'pediatrics', name: '儿科', description: '儿童疾病相关内容' },
  { id: 'pharmacology', name: '药理学', description: '药物相关内容' },
  { id: 'other', name: '其他', description: '其他医学相关内容' }
];

interface CategoriesProviderProps {
  children: React.ReactNode;
}

export function CategoriesProvider({ children }: CategoriesProviderProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取分类数据
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 优先使用数据库分类API
      const response = await fetch('/api/simple-categories', {
        credentials: 'include',
        cache: 'no-cache' // 确保获取最新数据
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.categories && Array.isArray(data.categories)) {
          setCategories(data.categories);
        } else if (Array.isArray(data)) {
          setCategories(data);
        } else {
          console.warn('分类数据格式异常，使用默认分类:', data);
          setCategories(DEFAULT_CATEGORIES);
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取分类失败';
      console.error('获取分类失败:', error);
      setError(errorMessage);
      
      // 使用默认分类作为后备
      setCategories(DEFAULT_CATEGORIES);
    } finally {
      setLoading(false);
    }
  }, []);

  // 创建新分类
  const createCategory = useCallback(async (categoryData: { name: string; description?: string }) => {
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
          // 立即更新本地状态
          setCategories(prev => [...prev, data.data]);
          message.success('分类创建成功');
          
          // 触发全局刷新事件
          window.dispatchEvent(new CustomEvent('categoriesUpdated'));
          
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
  }, []);

  // 更新分类
  const updateCategory = useCallback(async (id: string, categoryData: { name: string; description?: string }) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/simple-categories/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(categoryData)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // 立即更新本地状态
          setCategories(prev => prev.map(cat => cat.id === id ? data.data : cat));
          message.success('分类更新成功');
          
          // 触发全局刷新事件
          window.dispatchEvent(new CustomEvent('categoriesUpdated'));
          
          return data.data;
        } else {
          throw new Error(data.error?.message || '更新分类失败');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || '更新分类失败');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新分类失败';
      setError(errorMessage);
      message.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 删除分类
  const deleteCategory = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/simple-categories/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // 立即更新本地状态
          setCategories(prev => prev.filter(cat => cat.id !== id));
          message.success('分类删除成功');
          
          // 触发全局刷新事件
          window.dispatchEvent(new CustomEvent('categoriesUpdated'));
        } else {
          throw new Error(data.error?.message || '删除分类失败');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || '删除分类失败');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除分类失败';
      setError(errorMessage);
      message.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取分类选项（用于Select组件）
  const getCategoryOptions = useCallback(() => {
    return categories.map(category => ({
      label: category.name,
      value: category.name,
      key: category.id,
      title: category.description
    }));
  }, [categories]);

  // 根据名称查找分类
  const findCategoryByName = useCallback((name: string) => {
    return categories.find(category => category.name === name);
  }, [categories]);

  // 根据ID查找分类
  const findCategoryById = useCallback((id: string) => {
    return categories.find(category => category.id === id);
  }, [categories]);

  // 手动刷新分类数据
  const refreshCategories = useCallback(() => {
    fetchCategories();
  }, [fetchCategories]);

  // 监听全局分类更新事件
  useEffect(() => {
    const handleCategoriesUpdated = () => {
      // 延迟刷新，确保数据库操作完成
      setTimeout(() => {
        fetchCategories();
      }, 500);
    };

    window.addEventListener('categoriesUpdated', handleCategoriesUpdated);
    
    return () => {
      window.removeEventListener('categoriesUpdated', handleCategoriesUpdated);
    };
  }, [fetchCategories]);

  // 初始化时获取分类数据
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const value: CategoriesContextType = {
    categories,
    loading,
    error,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryOptions,
    findCategoryByName,
    findCategoryById,
    refreshCategories
  };

  return (
    <CategoriesContext.Provider value={value}>
      {children}
    </CategoriesContext.Provider>
  );
}

// Hook for using categories context
export function useCategories() {
  const context = useContext(CategoriesContext);
  if (context === undefined) {
    throw new Error('useCategories must be used within a CategoriesProvider');
  }
  return context;
}

// 兼容性Hook，保持向后兼容
export function useCategoriesCompat(options: { requireAuth?: boolean; autoFetch?: boolean } = {}) {
  const context = useCategories();
  
  return {
    categories: context.categories,
    loading: context.loading,
    error: context.error,
    fetchCategories: context.fetchCategories,
    createCategory: context.createCategory,
    getCategoryOptions: context.getCategoryOptions,
    findCategoryByName: context.findCategoryByName,
    findCategoryById: context.findCategoryById,
    defaultCategories: DEFAULT_CATEGORIES
  };
}