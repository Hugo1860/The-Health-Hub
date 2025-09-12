'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  Alert,
  Tabs,
  Row,
  Col,
  Statistic,
  message,
  Modal,
  Drawer
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  DatabaseOutlined,
  FolderOutlined,
  TagOutlined,
  BarChartOutlined,
  SettingOutlined,
  ExportOutlined,
  ImportOutlined
} from '@ant-design/icons';
import AntdAdminLayout from '../../../components/AntdAdminLayout';
import { CategoryManager } from '../../../components/CategoryManager';
import { CategoryTree } from '../../../components/CategoryTree';
import { CategoryForm } from '../../../components/CategoryForm';
import CategoryBatchToolbar from '../../../components/CategoryBatchToolbar';
import {
  Category,
  CategoryLevel,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategoryReorderRequest
} from '@/types/category';
import { CategoriesProvider, useCategories } from '../../../contexts/CategoriesContextNew';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

function CategoriesPageContent() {
  const {
    categories,
    categoryTree,
    loading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    getCategoryStats,
    refreshCategories
  } = useCategories();

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isCreatingSubcategory, setIsCreatingSubcategory] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('tree');

  // 获取统计信息
  const stats = getCategoryStats();

  // 处理分类选择
  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
  };

  // 处理创建新分类
  const handleCreateCategory = (parentId?: string) => {
    setEditingCategory(null);
    setIsCreatingSubcategory(!!parentId);
    setIsFormVisible(true);
  };

  // 处理编辑分类
  const handleEditCategory = (category: Category) => {
    if (category.id === '') {
      // 新建子分类
      setEditingCategory(null);
      setIsCreatingSubcategory(true);
    } else {
      setEditingCategory(category);
      setIsCreatingSubcategory(false);
    }
    setIsFormVisible(true);
  };

  // 处理删除分类
  const handleDeleteCategory = async (category: Category) => {
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
  };

  // 处理批量删除分类
  const handleBatchDeleteCategories = async (categoryIds: string[], options?: {
    force?: boolean;
    cascade?: boolean;
  }) => {
    try {
      // 调用批量删除API
      const response = await fetch('/api/categories/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'delete',
          categoryIds,
          ...options
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        message.success(result.message || '批量删除成功');
        refreshCategories();
      } else {
        message.error(result.error?.message || '批量删除失败');
      }
    } catch (error) {
      message.error('批量删除分类失败');
    }
  };

  // 处理批量更新状态
  const handleBatchUpdateStatus = async (categoryIds: string[], isActive: boolean) => {
    try {
      const response = await fetch('/api/categories/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: isActive ? 'activate' : 'deactivate',
          categoryIds
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        message.success(result.message || `批量${isActive ? '激活' : '停用'}成功`);
        refreshCategories();
      } else {
        message.error(result.error?.message || `批量${isActive ? '激活' : '停用'}失败`);
      }
    } catch (error) {
      message.error(`批量${isActive ? '激活' : '停用'}分类失败`);
    }
  };

  // 清除选择
  const handleClearSelection = () => {
    setSelectedCategories([]);
  };

  // 获取所有分类的扁平列表
  const allCategoriesFlat = React.useMemo(() => {
    const result: Category[] = [];
    categoryTree.forEach(category => {
      result.push(category);
      if (category.children) {
        result.push(...category.children);
      }
    });
    return result;
  }, [categoryTree]);

  // 处理分类重新排序
  const handleReorderCategories = async (requests: CategoryReorderRequest[]) => {
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
  };

  // 处理表单提交
  const handleFormSubmit = async (data: CreateCategoryRequest | UpdateCategoryRequest) => {
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
        message.success(editingCategory?.id ? '分类更新成功' : '分类创建成功');
      } else {
        throw new Error(result.error?.message || '操作失败');
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败');
    } finally {
      setFormLoading(false);
    }
  };

  // 处理表单取消
  const handleFormCancel = () => {
    setIsFormVisible(false);
    setEditingCategory(null);
    setIsCreatingSubcategory(false);
  };

  // 初始化默认分类
  const initializeDefaultCategories = async () => {
    const defaultCategories = [
      { name: '心血管', description: '心血管疾病相关内容', color: '#ef4444', icon: '❤️' },
      { name: '神经科', description: '神经系统疾病相关内容', color: '#8b5cf6', icon: '🧠' },
      { name: '内科学', description: '内科疾病相关内容', color: '#10b981', icon: '🏥' },
      { name: '外科', description: '外科手术相关内容', color: '#f59e0b', icon: '🔬' },
      { name: '儿科', description: '儿童疾病相关内容', color: '#3b82f6', icon: '👶' },
      { name: '药理学', description: '药物相关内容', color: '#06b6d4', icon: '💊' },
      { name: '其他', description: '其他医学相关内容', color: '#6b7280', icon: '📚' }
    ];

    try {
      for (const category of defaultCategories) {
        try {
          await createCategory(category);
        } catch (error) {
          console.log(`分类 ${category.name} 可能已存在`);
        }
      }
      message.success('默认分类初始化完成');
    } catch (error) {
      message.error('初始化默认分类失败');
    }
  };

  // 导出分类数据
  const handleExportCategories = async () => {
    try {
      const exportData = {
        categories,
        exportTime: new Date().toISOString(),
        version: '1.0',
        stats
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `categories-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      message.success('分类数据导出成功');
    } catch (error) {
      message.error('导出失败');
    }
  };

  return (
    <AntdAdminLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 页面标题和操作 */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={2} style={{ margin: 0 }}>
                <FolderOutlined /> 分类层级管理
              </Title>
              <Text type="secondary">
                管理音频分类的层级结构，支持一级和二级分类
              </Text>
            </div>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={refreshCategories}
                loading={loading}
              >
                刷新
              </Button>
              <Button
                icon={<ExportOutlined />}
                onClick={handleExportCategories}
              >
                导出数据
              </Button>
              <Button
                type="default"
                onClick={initializeDefaultCategories}
                loading={loading}
              >
                初始化默认分类
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => handleCreateCategory()}
              >
                新建分类
              </Button>
            </Space>
          </div>
        </Card>

        {/* 错误提示 */}
        {error && (
          <Alert
            message="数据加载错误"
            description={error}
            type="error"
            showIcon
            action={
              <Button size="small" onClick={refreshCategories}>
                重试
              </Button>
            }
          />
        )}

        {/* 统计信息 */}
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={8} md={6}>
            <Card size="small">
              <Statistic
                title="总分类数"
                value={stats.totalCategories}
                prefix={<DatabaseOutlined />}
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

        {/* 批量操作工具栏 */}
        <CategoryBatchToolbar
          selectedCategories={selectedCategories}
          allCategories={allCategoriesFlat}
          onBatchDelete={handleBatchDeleteCategories}
          onBatchUpdateStatus={handleBatchUpdateStatus}
          onClearSelection={handleClearSelection}
          loading={loading}
        />

        {/* 主要内容 */}
        <Card>
          <Tabs activeKey={activeTab} onChange={setActiveTab} type="card">
            {/* 分类树管理 */}
            <TabPane
              tab={
                <Space>
                  <FolderOutlined />
                  <span>层级管理</span>
                </Space>
              }
              key="tree"
            >
              <CategoryTree
                categories={categoryTree}
                onSelect={handleCategorySelect}
                onEdit={handleEditCategory}
                onDelete={handleDeleteCategory}
                onReorder={handleReorderCategories}
                onCheck={setSelectedCategories}
                showAudioCount={true}
                draggable={true}
                checkable={true}
                selectedKeys={selectedCategory ? [selectedCategory.id] : []}
                loading={loading}
              />
            </TabPane>

            {/* 完整管理器 */}
            <TabPane
              tab={
                <Space>
                  <SettingOutlined />
                  <span>完整管理</span>
                </Space>
              }
              key="manager"
            >
              <CategoryManager
                mode="full"
                onCategorySelect={handleCategorySelect}
                showStats={false} // 已在上方显示
                allowEdit={true}
              />
            </TabPane>
          </Tabs>
        </Card>

        {/* 使用说明 */}
        <Card title="使用说明">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Alert
              message="层级分类管理"
              description={
                <div>
                  <p>此页面管理的分类数据支持两级层级结构：</p>
                  <ul>
                    <li><strong>一级分类</strong>：主要的分类类别，如"心血管"、"神经科"等</li>
                    <li><strong>二级分类</strong>：一级分类下的细分类别，如"高血压"、"心律失常"等</li>
                  </ul>
                  <p>支持拖拽排序、批量操作、状态管理等功能。</p>
                </div>
              }
              type="info"
              showIcon
            />
            
            <Alert
              message="API端点"
              description={
                <div>
                  <p>此页面使用以下增强的API端点：</p>
                  <ul>
                    <li><code>GET /api/categories</code> - 获取分类列表（支持树形和扁平格式）</li>
                    <li><code>POST /api/categories</code> - 创建新分类（支持层级）</li>
                    <li><code>PUT /api/categories/[id]</code> - 更新分类（支持层级修改）</li>
                    <li><code>DELETE /api/categories/[id]</code> - 删除分类（带依赖检查）</li>
                    <li><code>GET /api/categories/tree</code> - 获取分类树结构</li>
                    <li><code>POST /api/categories/reorder</code> - 批量重新排序</li>
                  </ul>
                </div>
              }
              type="success"
              showIcon
            />

            <Alert
              message="数据迁移"
              description={
                <div>
                  <p>系统已支持从旧版分类数据的平滑迁移：</p>
                  <ul>
                    <li>现有分类将自动转换为一级分类</li>
                    <li>音频的分类关联将保持不变</li>
                    <li>支持向后兼容，不影响现有功能</li>
                  </ul>
                </div>
              }
              type="warning"
              showIcon
            />
          </Space>
        </Card>
      </Space>

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
    </AntdAdminLayout>
  );
}

export default function CategoriesPage() {
  return (
    <CategoriesProvider>
      <CategoriesPageContent />
    </CategoriesProvider>
  );
}