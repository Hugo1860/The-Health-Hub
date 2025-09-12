'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { message } from 'antd';

// 导入新的类型定义
import {
    Category,
    CategoryLevel,
    CategoryTreeNode,
    CategoryContextType,
    CreateCategoryRequest,
    UpdateCategoryRequest,
    CategoryOperationResult,
    CategoryReorderRequest,
    CategoryPermissions
} from '@/types/category';

import {
    buildCategoryTree,
    getCategoryPath,
    generateCategoryOptions,
    getSubcategoryOptions,
    calculateCategoryStats,
    validateCategory
} from '@/lib/categoryUtils';

const CategoriesContext = createContext<CategoryContextType | undefined>(undefined);

// 默认分类数据（兼容性）
const DEFAULT_CATEGORIES: Category[] = [
    {
        id: 'cardiology',
        name: '心血管',
        description: '心血管疾病相关内容',
        color: '#ef4444',
        icon: '❤️',
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
        color: '#8b5cf6',
        icon: '🧠',
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
        color: '#10b981',
        icon: '🏥',
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
        color: '#f59e0b',
        icon: '🔬',
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
        color: '#3b82f6',
        icon: '👶',
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
        color: '#6b7280',
        icon: '📚',
        level: CategoryLevel.PRIMARY,
        sortOrder: 5,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
];

interface CategoriesProviderProps {
    children: React.ReactNode;
}

export function CategoriesProvider({ children }: CategoriesProviderProps) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoryTree, setCategoryTree] = useState<CategoryTreeNode[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 权限管理（这里简化处理，实际应该从用户会话获取）
    const [permissions] = useState<CategoryPermissions>({
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canReorder: true,
        canViewInactive: true
    });

    // 获取分类数据
    const fetchCategories = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // 先尝试简化的 API，如果失败再尝试完整的 API
            let response;
            try {
                response = await fetch('/api/categories/simple?format=flat&limit=50', {
                    credentials: 'include',
                    cache: 'no-cache'
                });
            } catch (error) {
                console.log('简化 API 失败，尝试完整 API');
                response = await fetch('/api/categories?format=flat&includeCount=true', {
                    credentials: 'include',
                    cache: 'no-cache'
                });
            }

            if (response.ok) {
                const data = await response.json();

                if (data.success && Array.isArray(data.data)) {
                    setCategories(data.data);
                } else if (Array.isArray(data)) {
                    // 兼容旧格式，转换为新格式
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

    // 获取分类树
    const fetchCategoryTree = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // 先尝试简化的 API
            let response;
            try {
                response = await fetch('/api/categories/simple?format=tree', {
                    credentials: 'include',
                    cache: 'no-cache'
                });
            } catch (error) {
                console.log('简化树形 API 失败，尝试完整 API');
                response = await fetch('/api/categories/tree?includeCount=true', {
                    credentials: 'include',
                    cache: 'no-cache'
                });
            }

            if (response.ok) {
                const data = await response.json();

                if (data.success && Array.isArray(data.data)) {
                    setCategoryTree(data.data);
                } else {
                    // 从现有分类构建树结构
                    const tree = buildCategoryTree(categories);
                    setCategoryTree(tree);
                }
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '获取分类树失败';
            console.error('获取分类树失败:', error);
            setError(errorMessage);

            // 从现有分类构建树结构
            const tree = buildCategoryTree(categories);
            setCategoryTree(tree);
        } finally {
            setLoading(false);
        }
    }, [categories]);

    // 创建分类
    const createCategory = useCallback(async (data: CreateCategoryRequest): Promise<CategoryOperationResult> => {
        // 验证数据
        const validation = validateCategory(data, categories);
        if (!validation.isValid) {
            const error = validation.errors[0];
            message.error(error.message);
            return { success: false, error };
        }

        setLoading(true);
        try {
            // 先尝试简化的创建 API
            let response;
            try {
                response = await fetch('/api/categories/simple', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify(data)
                });
            } catch (error) {
                console.log('简化创建 API 失败，尝试完整 API');
                response = await fetch('/api/categories', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify(data)
                });
            }

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    // 更新本地状态
                    setCategories(prev => [...prev, result.data]);
                    message.success('分类创建成功');

                    // 触发全局刷新事件
                    window.dispatchEvent(new CustomEvent('categoriesUpdated'));

                    return { success: true, data: result.data };
                } else {
                    throw new Error(result.error?.message || '创建分类失败');
                }
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || '创建分类失败');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '创建分类失败';
            const categoryError = {
                code: 'INTERNAL_ERROR' as any,
                message: errorMessage
            };
            setError(errorMessage);
            message.error(errorMessage);
            return { success: false, error: categoryError };
        } finally {
            setLoading(false);
        }
    }, [categories]);

    // 更新分类
    const updateCategory = useCallback(async (id: string, data: UpdateCategoryRequest): Promise<CategoryOperationResult> => {
        console.log('更新分类 - ID:', id, '数据:', data);
        
        // 验证数据
        const validation = validateCategory(data, categories, id);
        console.log('验证结果:', validation);
        
        if (!validation.isValid) {
            const error = validation.errors[0];
            console.error('验证失败:', error);
            message.error(error.message);
            return { success: false, error };
        }

        setLoading(true);
        try {
            const response = await fetch(`/api/categories/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(data)
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    // 更新本地状态
                    setCategories(prev => prev.map(cat => cat.id === id ? result.data : cat));
                    message.success('分类更新成功');

                    // 触发全局刷新事件
                    window.dispatchEvent(new CustomEvent('categoriesUpdated'));

                    return { success: true, data: result.data };
                } else {
                    throw new Error(result.error?.message || '更新分类失败');
                }
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || '更新分类失败');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '更新分类失败';
            const categoryError = {
                code: 'INTERNAL_ERROR' as any,
                message: errorMessage
            };
            setError(errorMessage);
            message.error(errorMessage);
            return { success: false, error: categoryError };
        } finally {
            setLoading(false);
        }
    }, [categories]);

    // 删除分类
    const deleteCategory = useCallback(async (
        id: string, 
        options: { force?: boolean; cascade?: boolean } = {}
    ): Promise<CategoryOperationResult> => {
        setLoading(true);
        try {
            // 构建查询参数
            const queryParams = new URLSearchParams();
            if (options.force) queryParams.set('force', 'true');
            if (options.cascade) queryParams.set('cascade', 'true');
            
            const url = `/api/categories/${id}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
            
            const response = await fetch(url, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    // 更新本地状态
                    setCategories(prev => prev.filter(cat => cat.id !== id));
                    message.success('分类删除成功');

                    // 触发全局刷新事件
                    window.dispatchEvent(new CustomEvent('categoriesUpdated'));

                    return { success: true };
                } else {
                    throw new Error(result.error?.message || '删除分类失败');
                }
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || '删除分类失败');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '删除分类失败';
            const categoryError = {
                code: 'INTERNAL_ERROR' as any,
                message: errorMessage
            };
            setError(errorMessage);
            message.error(errorMessage);
            return { success: false, error: categoryError };
        } finally {
            setLoading(false);
        }
    }, []);

    // 重新排序分类
    const reorderCategories = useCallback(async (requests: CategoryReorderRequest[]): Promise<CategoryOperationResult> => {
        setLoading(true);
        try {
            const response = await fetch('/api/categories/reorder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ requests })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    // 刷新分类数据
                    await fetchCategories();
                    message.success('分类排序更新成功');

                    return { success: true };
                } else {
                    throw new Error(result.error?.message || '更新排序失败');
                }
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || '更新排序失败');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '更新排序失败';
            const categoryError = {
                code: 'INTERNAL_ERROR' as any,
                message: errorMessage
            };
            setError(errorMessage);
            message.error(errorMessage);
            return { success: false, error: categoryError };
        } finally {
            setLoading(false);
        }
    }, [fetchCategories]);

    // 查询操作
    const getCategoryById = useCallback((id: string) => {
        return categories.find(cat => cat.id === id);
    }, [categories]);

    const getCategoryByName = useCallback((name: string) => {
        return categories.find(cat => cat.name === name);
    }, [categories]);

    const getCategoryPathFunc = useCallback((categoryId?: string, subcategoryId?: string) => {
        return getCategoryPath(categories, categoryId, subcategoryId);
    }, [categories]);

    const getCategoryOptions = useCallback((level?: CategoryLevel) => {
        return generateCategoryOptions(categories, level);
    }, [categories]);

    const getSubcategoryOptionsFunc = useCallback((parentId: string) => {
        return getSubcategoryOptions(categories, parentId);
    }, [categories]);

    // 验证操作
    const validateCategoryFunc = useCallback((data: CreateCategoryRequest | UpdateCategoryRequest) => {
        return validateCategory(data, categories);
    }, [categories]);

    // 统计操作
    const getCategoryStats = useCallback(() => {
        return calculateCategoryStats(categories);
    }, [categories]);

    // 刷新操作
    const refreshCategories = useCallback(() => {
        fetchCategories();
    }, [fetchCategories]);

    // 监听全局分类更新事件
    useEffect(() => {
        const handleCategoriesUpdated = () => {
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

    // 当分类数据变化时更新分类树
    useEffect(() => {
        if (categories.length > 0) {
            const tree = buildCategoryTree(categories);
            setCategoryTree(tree);
        }
    }, [categories]);

    const value: CategoryContextType = {
        categories,
        categoryTree,
        loading,
        error,
        permissions,

        // 基础操作
        fetchCategories,
        fetchCategoryTree,
        createCategory,
        updateCategory,
        deleteCategory,

        // 排序操作
        reorderCategories,

        // 查询操作
        getCategoryById,
        getCategoryByName,
        getCategoryPath: getCategoryPathFunc,
        getCategoryOptions,
        getSubcategoryOptions: getSubcategoryOptionsFunc,

        // 验证操作
        validateCategory: validateCategoryFunc,

        // 统计操作
        getCategoryStats,

        // 刷新操作
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
export function useCategoriesCompat(_options: { requireAuth?: boolean; autoFetch?: boolean } = {}) {
    const context = useCategories();

    return {
        categories: context.categories,
        loading: context.loading,
        error: context.error,
        fetchCategories: context.fetchCategories,
        createCategory: (data: { name: string; description?: string }) =>
            context.createCategory(data),
        getCategoryOptions: () => context.getCategoryOptions().map(opt => ({
            label: opt.label,
            value: opt.value,
            key: opt.key,
            title: opt.title
        })),
        findCategoryByName: context.getCategoryByName,
        findCategoryById: context.getCategoryById,
        defaultCategories: DEFAULT_CATEGORIES
    };
}