'use client';

import React, { useState, useCallback } from 'react';
import {
  Card,
  Button,
  Space,
  Modal,
  Drawer,
  Tabs,
  Statistic,
  Row,
  Col,
  message,
  Spin
} from 'antd';
import {
  PlusOutlined,
  FolderOutlined,
  TagOutlined,
  BarChartOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { CategoryTree } from './CategoryTree';
import { CategoryForm } from './CategoryForm';
import { CategorySelector } from './CategorySelector';
import {
  Category,
  CategoryLevel,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategoryReorderRequest
} from '@/types/category';
import { useCategories } from '@/contexts/CategoriesContextNew';

// 移除过时的 TabPane 导入

interface CategoryManagerProps {
  mode?: 'full' | 'selector' | 'tree';
  onCategorySelect?: (category: Category) => void;
  showStats?: boolean;
  allowEdit?: boolean;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  mode = 'full',
  onCategorySelect,
  showStats = true,
  allowEdit = true
}) => {
  const {
    categoryTree,
    loading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    getCategoryStats
  } = useCategories();

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isCreatingSubcategory, setIsCreatingSubcategory] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // 获取统计信息
  const stats = getCategoryStats();

  // 处理分类选择
  const handleCategorySelect = useCallback((category: Category) => {
    setSelectedCategory(category);
    onCategorySelect?.(category);
  }, [onCategorySelect]);

  // 处理创建新分类
  const handleCreateCategory = useCallback((parentId?: string) => {
    setEditingCategory(null);
    setIsCreatingSubcategory(!!parentId);
    setIsFormVisible(true);
  }, []);

  // 处理编辑分类
  const handleEditCategory = useCallback((category: Category) => {
    if (category.id === '') {
      // 新建子分类
      setEditingCategory(null);
      setIsCreatingSubcategory(true);
    } else {
      setEditingCategory(category);
      setIsCreatingSubcategory(false);
    }
    setIsFormVisible(true);
  }, []);

  // 处理删除分类
  const handleDeleteCategory = useCallback(async (category: Category) => {
    try {
      const result = await deleteCategory(category.id);
      if (result.success) {
        message.success('分类删除成功');
        if (selectedCategory?.id === category.id) {
          setSelectedCategory(null);
        }
      } else {
        message.error(result.error?.message || '删除失败');
      }
    } catch (error) {
      message.error('删除分类失败');
    }
  }, [deleteCategory, selectedCategory]);

  // 处理分类重新排序
  const handleReorderCategories = useCallback(async (requests: CategoryReorderRequest[]) => {
    try {
      const result = await reorderCategories(requests);
      if (result.success) {
        message.success('分类排序更新成功');
      } else {
        message.error(result.error?.message || '排序更新失败');
      }
    } catch (error) {
      message.error('排序更新失败');
    }
  }, [reorderCategories]);

  // 处理表单提交
  const handleFormSubmit = useCallback(async (data: CreateCategoryRequest | UpdateCategoryRequest) => {
    setFormLoading(true);
    try {
      let result;
      if (editingCategory?.id) {
        // 更新现有分类
        result = await updateCategory(editingCategory.id, data);
      } else {
        // 创建新分类
        result = await createCategory(data);
      }

      if (result.success) {
        setIsFormVisible(false);
        setEditingCategory(null);
        setIsCreatingSubcategory(false);
      } else {
        throw new Error(result.error?.message || '操作失败');
      }
    } catch (error) {
      throw error; // 让表单组件处理错误
    } finally {
      setFormLoading(false);
    }
  }, [editingCategory, createCategory, updateCategory]);

  // 处理表单取消
  const handleFormCancel = useCallback(() => {
    setIsFormVisible(false);
    setEditingCategory(null);
    setIsCreatingSubcategory(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="text-center py-8 text-red-500">
          加载分类失败: {error}
        </div>
      </Card>
    );
  }

  // 选择器模式
  if (mode === 'selector') {
    return (
      <CategorySelector
        onChange={onCategorySelect ? (selection) => {
          const category = categoryTree
            .flatMap(c => [c, ...c.children])
            .find(c => c.id === selection.subcategoryId || c.id === selection.categoryId);
          if (category) {
            onCategorySelect(category);
          }
        } : undefined}
      />
    );
  }

  // 树形模式
  if (mode === 'tree') {
    return (
      <Card title="分类管理" size="small">
        <CategoryTree
          categories={categoryTree}
          onSelect={handleCategorySelect}
          onEdit={allowEdit ? handleEditCategory : undefined}
          onDelete={allowEdit ? handleDeleteCategory : undefined}
          onReorder={allowEdit ? handleReorderCategories : undefined}
          showAudioCount={true}
          draggable={allowEdit}
        />
      </Card>
    );
  }

  // 完整模式
  return (
    <div className="category-manager">
      <Tabs defaultActiveKey="tree" type="card">
        {/* 分类树管理 */}
        <Tabs.TabPane
          tab={
            <Space>
              <FolderOutlined />
              <span>分类管理</span>
            </Space>
          }
          key="tree"
        >
          <Card
            title="分类结构"
            extra={
              allowEdit && (
                <Space>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => handleCreateCategory()}
                  >
                    新建分类
                  </Button>
                </Space>
              )
            }
          >
            <CategoryTree
              categories={categoryTree}
              onSelect={handleCategorySelect}
              onEdit={allowEdit ? handleEditCategory : undefined}
              onDelete={allowEdit ? handleDeleteCategory : undefined}
              onReorder={allowEdit ? handleReorderCategories : undefined}
              showAudioCount={true}
              draggable={allowEdit}
              selectedKeys={selectedCategory ? [selectedCategory.id] : []}
            />
          </Card>
        </Tabs.TabPane>

        {/* 统计信息 */}
        {showStats && (
          <Tabs.TabPane
            tab={
              <Space>
                <BarChartOutlined />
                <span>统计信息</span>
              </Space>
            }
            key="stats"
          >
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={8} md={6}>
                <Card size="small">
                  <Statistic
                    title="总分类数"
                    value={stats.totalCategories}
                    prefix={<FolderOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={8} md={6}>
                <Card size="small">
                  <Statistic
                    title="一级分类"
                    value={stats.level1Count}
                    prefix={<FolderOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={8} md={6}>
                <Card size="small">
                  <Statistic
                    title="二级分类"
                    value={stats.level2Count}
                    prefix={<TagOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={8} md={6}>
                <Card size="small">
                  <Statistic
                    title="激活分类"
                    value={stats.activeCount}
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={8} md={6}>
                <Card size="small">
                  <Statistic
                    title="有音频分类"
                    value={stats.categoriesWithAudio}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={8} md={6}>
                <Card size="small">
                  <Statistic
                    title="空分类"
                    value={stats.emptyCategoriesCount}
                    valueStyle={{ color: '#cf1322' }}
                  />
                </Card>
              </Col>
            </Row>
          </Tabs.TabPane>
        )}
      </Tabs>

      {/* 分类表单抽屉 */}
      <Drawer
        title={
          editingCategory?.id
            ? '编辑分类'
            : isCreatingSubcategory
            ? '创建子分类'
            : '创建分类'
        }
        open={isFormVisible}
        onClose={handleFormCancel}
        width={480}
        destroyOnHidden
      >
        <CategoryForm
          category={editingCategory || undefined}
          parentId={isCreatingSubcategory ? selectedCategory?.id : undefined}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          loading={formLoading}
        />
      </Drawer>
    </div>
  );
};

export default CategoryManager;