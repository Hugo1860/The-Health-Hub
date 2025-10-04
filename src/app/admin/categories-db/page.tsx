'use client';

import React, { useState } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Select,
  message,
  Space,
  Typography,
  Popconfirm,
  Tag,
  Alert,
  App,
  Drawer,
  Spin
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  ReloadOutlined,
  DatabaseOutlined,
  BugOutlined,
  ToolOutlined
} from '@ant-design/icons';
import AntdAdminLayout from '../../../components/AntdAdminLayout';
import { CategoriesProvider, useCategories } from '../../../contexts/CategoriesContextNew';
import { Category } from '../../../types/category';
import CategoryDeleteModal from '../../../components/CategoryDeleteModal';
import CategoryBatchToolbar from '../../../components/CategoryBatchToolbar';
import CategoryStatistics from '../../../components/CategoryStatistics';

const { Title, Text } = Typography;
const { TextArea } = Input;

function CategoriesDbPageContent() {
  const { message } = App.useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [categoriesToDelete, setCategoriesToDelete] = useState<Category[]>([]);
  const [diagnosticVisible, setDiagnosticVisible] = useState(false);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);
  const [form] = Form.useForm();

  const { 
    categories, 
    loading, 
    error, 
    fetchCategories, 
    createCategory,
    updateCategory,
    deleteCategory,
    refreshCategories
  } = useCategories();

  const handleAdd = () => {
    setEditingCategory(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    form.setFieldsValue({
      name: category.name,
      description: category.description,
      parentId: category.parentId,
      color: category.color,
      icon: category.icon
    });
    setModalVisible(true);
  };

  const handleSubmit = async (values: { 
    name: string; 
    description?: string; 
    parentId?: string;
    color?: string;
    icon?: string;
  }) => {
    try {
      if (editingCategory) {
        // 更新现有分类
        const updateData: any = {};
        
        // 只包含有值的字段
        if (values.name !== undefined && values.name !== '') {
          updateData.name = values.name;
        }
        if (values.description !== undefined) {
          updateData.description = values.description || '';
        }
        if (values.parentId !== undefined) {
          updateData.parentId = values.parentId === '' ? null : values.parentId;
        }
        if (values.color !== undefined && values.color !== '') {
          // 确保颜色格式正确
          const colorValue = values.color.startsWith('#') ? values.color : `#${values.color}`;
          if (/^#[0-9A-Fa-f]{6}$/.test(colorValue)) {
            updateData.color = colorValue;
          }
        } else if (!editingCategory.color) {
          updateData.color = '#6b7280';
        }
        if (values.icon !== undefined && values.icon !== '') {
          updateData.icon = values.icon;
        } else if (!editingCategory.icon) {
          updateData.icon = '📂';
        }
        
        const result = await updateCategory(editingCategory.id, updateData);
        
        if (result.success) {
          message.success('分类更新成功');
          // 刷新分类列表
          await fetchCategories();
        } else {
          console.error('更新失败:', result.error);
          message.error(result.error?.message || '更新失败');
          return; // 不关闭模态框，让用户可以重试
        }
      } else {
        // 创建新分类，包含层级信息
        const categoryData = {
          name: values.name,
          description: values.description,
          parentId: values.parentId,
          color: values.color || '#6b7280',
          icon: values.icon || '📂'
        };
        
        const result = await createCategory(categoryData);
        
        if (result.success) {
          message.success(`${values.parentId ? '二级' : '一级'}分类创建成功`);
          // 刷新分类列表
          await fetchCategories();
        } else {
          message.error(result.error?.message || '创建失败');
          return; // 不关闭模态框，让用户可以重试
        }
      }
      setModalVisible(false);
      form.resetFields();
    } catch (error) {
      // 错误已在hook中处理
    }
  };

  const handleDelete = async (category: Category) => {
    setCategoriesToDelete([category]);
    setDeleteModalVisible(true);
  };

  const handleBatchDelete = async (categoryIds: string[], options?: {
    force?: boolean;
    cascade?: boolean;
  }) => {
    try {
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
        setSelectedRowKeys([]);
      } else {
        message.error(result.error?.message || '批量删除失败');
      }
    } catch (error) {
      message.error('批量删除分类失败');
    }
  };

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
        setSelectedRowKeys([]);
      } else {
        message.error(result.error?.message || `批量${isActive ? '激活' : '停用'}失败`);
      }
    } catch (error) {
      message.error(`批量${isActive ? '激活' : '停用'}分类失败`);
    }
  };

  const handleDeleteConfirm = async (options: {
    force: boolean;
    cascade: boolean;
    updateAudios: boolean;
  }) => {
    try {
      for (const category of categoriesToDelete) {
        const result = await deleteCategory(category.id, {
          force: options.force,
          cascade: options.cascade
        });
        
        if (!result.success) {
          throw new Error(result.error?.message || '删除失败');
        }
      }
      
      setDeleteModalVisible(false);
      setCategoriesToDelete([]);
      refreshCategories();
      message.success('分类删除成功');
    } catch (error) {
      message.error('删除失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalVisible(false);
    setCategoriesToDelete([]);
  };

  const initializeDefaultCategories = async () => {
    const defaultCategories = [
      { name: '心血管', description: '心血管疾病相关内容' },
      { name: '神经科', description: '神经系统疾病相关内容' },
      { name: '内科学', description: '内科疾病相关内容' },
      { name: '外科', description: '外科手术相关内容' },
      { name: '儿科', description: '儿童疾病相关内容' },
      { name: '药理学', description: '药物相关内容' },
      { name: '其他', description: '其他医学相关内容' }
    ];

    try {
      for (const category of defaultCategories) {
        try {
          await createCategory(category);
        } catch (error) {
          // 忽略重复创建的错误
          console.log(`分类 ${category.name} 可能已存在`);
        }
      }
      message.success('默认分类初始化完成');
    } catch (error) {
      message.error('初始化默认分类失败');
    }
  };

  const runDiagnostic = async () => {
    setDiagnosticLoading(true);
    setDiagnosticVisible(true);
    
    try {
      const response = await fetch('/api/admin/categories/diagnostic');
      const result = await response.json();
      
      if (result.success) {
        setDiagnosticResult(result.data);
        message.success('诊断完成');
      } else {
        message.error(result.error?.message || '诊断失败');
      }
    } catch (error) {
      message.error('运行诊断失败');
      console.error('诊断错误:', error);
    } finally {
      setDiagnosticLoading(false);
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      render: (id: string) => (
        <Text code style={{ fontSize: '12px' }}>{id}</Text>
      )
    },
    {
      title: '分类名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Category) => (
        <Space>
          {/* 层级缩进 */}
          {record.level === 2 && (
            <span style={{ 
              marginLeft: '20px', 
              color: '#ccc',
              fontSize: '12px'
            }}>
              └─
            </span>
          )}
          
          {/* 层级标签 */}
          <Tag 
            color={record.level === 1 ? 'blue' : 'green'} 
            style={{ fontSize: '12px' }}
          >
            {record.level === 1 ? '一级' : '二级'}
          </Tag>
          
          {/* 分类图标 */}
          {record.icon && (
            <span style={{ fontSize: '16px' }}>{record.icon}</span>
          )}
          
          {/* 分类名称 */}
          <span style={{ 
            fontWeight: record.level === 1 ? 'bold' : 'normal',
            fontSize: record.level === 1 ? '14px' : '13px',
            color: record.level === 1 ? '#1890ff' : '#666'
          }}>
            {name}
          </span>
          
          {/* 音频数量 */}
          {record.audioCount !== undefined && record.audioCount > 0 && (
            <Tag color="orange" size="small">
              {record.audioCount} 个音频
            </Tag>
          )}
          
          {/* 状态标签 */}
          {record.isActive === false && (
            <Tag color="default" size="small">已停用</Tag>
          )}
        </Space>
      )
    },
    {
      title: '父分类',
      dataIndex: 'parentId',
      key: 'parentId',
      width: 150,
      render: (parentId: string, record: Category) => {
        if (!parentId) {
          return record.level === 1 ? (
            <Tag color="blue" size="small" icon="🏠">根分类</Tag>
          ) : (
            <Text type="danger">⚠️ 缺少父分类</Text>
          );
        }
        
        const parent = categories.find(cat => cat.id === parentId);
        return parent ? (
          <Space>
            <Tag color="blue" size="small">
              {parent.icon && <span>{parent.icon}</span>}
              {parent.name}
            </Tag>
            {parent.level !== 1 && (
              <Text type="warning" style={{ fontSize: '12px' }}>
                ⚠️ 父分类层级错误
              </Text>
            )}
          </Space>
        ) : (
          <Text type="danger" style={{ fontSize: '12px' }}>
            ❌ 父分类不存在 ({parentId})
          </Text>
        );
      }
    },
    {
      title: '层级',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level: number, record: Category) => {
        const levelConfig = {
          1: { color: 'blue', icon: '📁', text: '一级' },
          2: { color: 'green', icon: '📄', text: '二级' }
        };
        
        const config = levelConfig[level as keyof typeof levelConfig] || 
                      { color: 'red', icon: '❓', text: '未知' };
        
        return (
          <Space>
            <span>{config.icon}</span>
            <Tag color={config.color} size="small">
              {config.text}
            </Tag>
            {level > 2 && (
              <Text type="danger" style={{ fontSize: '10px' }}>
                层级过深
              </Text>
            )}
          </Space>
        );
      }
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (description: string) => description || (
        <Text type="secondary" style={{ fontStyle: 'italic' }}>
          暂无描述
        </Text>
      )
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? '激活' : '停用'}
        </Tag>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (createdAt: string) => 
        createdAt ? new Date(createdAt).toLocaleString('zh-CN') : '-'
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record: Category) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          >
            编辑
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            size="small"
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      )
    }
  ];

  return (
    <AntdAdminLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={2} style={{ margin: 0 }}>
                <DatabaseOutlined /> 分类管理（数据库版）
              </Title>
              <Text type="secondary">
                管理音频分类数据，确保所有音频功能使用统一的分类数据源
              </Text>
            </div>
            <Space>
              <Button
                icon={<BugOutlined />}
                onClick={runDiagnostic}
                loading={diagnosticLoading}
              >
                数据库诊断
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchCategories}
                loading={loading}
              >
                刷新
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
                onClick={handleAdd}
              >
                新增分类
              </Button>
            </Space>
          </div>
        </Card>

        {error && (
          <Alert
            message="数据加载错误"
            description={error}
            type="error"
            showIcon
            action={
              <Button size="small" onClick={fetchCategories}>
                重试
              </Button>
            }
          />
        )}

        {/* 层级健康状态 */}
        {(() => {
          const level2Count = categories.filter(c => c.level === 2).length;
          const orphanedCount = categories.filter(c => 
            c.parentId && !categories.some(parent => parent.id === c.parentId)
          ).length;
          const inconsistentCount = categories.filter(c => 
            (c.level === 1 && c.parentId) || (c.level === 2 && !c.parentId)
          ).length;
          
          if (level2Count === 0) {
            return (
              <Alert
                message="未发现二级分类"
                description="这就是为什么在分类管理界面看不到二级分类的原因。建议创建一些测试数据或检查数据库结构。"
                type="warning"
                showIcon
                action={
                  <Space>
                    <Button size="small" onClick={runDiagnostic}>
                      运行诊断
                    </Button>
                  </Space>
                }
                style={{ marginBottom: 16 }}
              />
            );
          } else if (orphanedCount > 0 || inconsistentCount > 0) {
            return (
              <Alert
                message="发现数据一致性问题"
                description={`孤立分类: ${orphanedCount}个，层级错误: ${inconsistentCount}个。建议运行数据修复。`}
                type="error"
                showIcon
                action={
                  <Button size="small" onClick={runDiagnostic}>
                    查看详情
                  </Button>
                }
                style={{ marginBottom: 16 }}
              />
            );
          } else {
            return (
              <Alert
                message="层级结构健康"
                description={`发现 ${level2Count} 个二级分类，数据结构完整。`}
                type="success"
                showIcon
                style={{ marginBottom: 16 }}
              />
            );
          }
        })()}

        {/* 增强的统计信息 */}
        <CategoryStatistics 
          categories={categories} 
          selectedCount={selectedRowKeys.length}
        />

        {/* 筛选和搜索 */}
        <Card size="small" title="筛选和搜索">
          <Space wrap>
            <Select
              placeholder="按层级筛选"
              allowClear
              style={{ width: 120 }}
              onChange={(value) => {
                // 这里可以添加筛选逻辑
                console.log('筛选层级:', value);
              }}
            >
              <Select.Option value={1}>一级分类</Select.Option>
              <Select.Option value={2}>二级分类</Select.Option>
            </Select>
            <Select
              placeholder="按状态筛选"
              allowClear
              style={{ width: 120 }}
              onChange={(value) => {
                console.log('筛选状态:', value);
              }}
            >
              <Select.Option value={true}>已激活</Select.Option>
              <Select.Option value={false}>已停用</Select.Option>
            </Select>
            <Select
              placeholder="按音频数量筛选"
              allowClear
              style={{ width: 140 }}
              onChange={(value) => {
                console.log('筛选音频:', value);
              }}
            >
              <Select.Option value="has-audio">有音频</Select.Option>
              <Select.Option value="no-audio">无音频</Select.Option>
            </Select>
            <Input.Search
              placeholder="搜索分类名称"
              allowClear
              style={{ width: 200 }}
              onSearch={(value) => {
                console.log('搜索:', value);
              }}
            />
          </Space>
        </Card>

        {/* 批量操作工具栏 */}
        {selectedRowKeys.length > 0 && (
          <CategoryBatchToolbar
            selectedCategories={categories.filter(cat => selectedRowKeys.includes(cat.id))}
            allCategories={categories}
            onBatchDelete={handleBatchDelete}
            onBatchUpdateStatus={handleBatchUpdateStatus}
            onClearSelection={() => setSelectedRowKeys([])}
            loading={loading}
          />
        )}

        <Card>
          <Table
            columns={columns}
            dataSource={categories.sort((a, b) => {
              // 首先按层级排序
              if (a.level !== b.level) {
                return (a.level || 1) - (b.level || 1);
              }
              // 同层级按父分类分组
              if (a.level === 2 && b.level === 2) {
                if (a.parentId !== b.parentId) {
                  return (a.parentId || '').localeCompare(b.parentId || '');
                }
              }
              // 最后按排序字段和名称排序
              if (a.sortOrder !== b.sortOrder) {
                return (a.sortOrder || 0) - (b.sortOrder || 0);
              }
              return a.name.localeCompare(b.name);
            })}
            rowKey="id"
            loading={loading}
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
              getCheckboxProps: (record) => ({
                name: record.name,
              }),
            }}
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `第 ${range?.[0]}-${range?.[1]} 条，共 ${total} 个分类${
                  selectedRowKeys.length > 0 ? `，已选择 ${selectedRowKeys.length} 个` : ''
                }`,
              pageSizeOptions: ['10', '20', '50', '100'],
              defaultPageSize: 20
            }}
            scroll={{ x: 1200 }}
            size="small"
          />
        </Card>

        <Card title="使用说明">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Alert
              message="层级分类管理"
              description={
                <div>
                  <p>此页面支持完整的分类层级管理功能：</p>
                  <ul>
                    <li><strong>层级结构</strong>：支持一级和二级分类</li>
                    <li><strong>批量操作</strong>：支持批量删除、激活/停用</li>
                    <li><strong>智能删除</strong>：自动检查依赖关系，支持强制删除和级联删除</li>
                    <li><strong>状态管理</strong>：支持激活/停用分类</li>
                    <li><strong>音频关联</strong>：显示每个分类关联的音频数量</li>
                  </ul>
                  <p><strong>重要</strong>：删除分类前会检查是否有子分类或关联音频，确保数据安全。</p>
                </div>
              }
              type="info"
              showIcon
            />
            
            <Alert
              message="增强的API端点"
              description={
                <div>
                  <p>此页面使用以下增强的API端点：</p>
                  <ul>
                    <li><code>GET /api/categories</code> - 获取层级分类列表</li>
                    <li><code>POST /api/categories</code> - 创建新分类（支持层级）</li>
                    <li><code>DELETE /api/categories/[id]</code> - 删除分类（支持强制删除）</li>
                    <li><code>POST /api/categories/batch</code> - 批量操作分类</li>
                  </ul>
                </div>
              }
              type="success"
              showIcon
            />

            <Alert
              message="删除功能说明"
              description={
                <div>
                  <p>删除功能提供多种选项：</p>
                  <ul>
                    <li><strong>安全删除</strong>：检查依赖关系，阻止删除有子分类或音频的分类</li>
                    <li><strong>强制删除</strong>：跳过安全检查，强制删除分类</li>
                    <li><strong>级联删除</strong>：删除分类时同时删除其所有子分类</li>
                    <li><strong>批量删除</strong>：一次性删除多个选中的分类</li>
                  </ul>
                </div>
              }
              type="warning"
              showIcon
            />
          </Space>
        </Card>
      </Space>

      <Modal
        title={
          <Space>
            {editingCategory ? (
              <>
                <EditOutlined />
                <span>编辑分类</span>
                <Tag color={editingCategory.level === 1 ? 'blue' : 'green'}>
                  {editingCategory.level === 1 ? '一级' : '二级'}分类
                </Tag>
              </>
            ) : (
              <>
                <PlusOutlined />
                <span>新增分类</span>
              </>
            )}
          </Space>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingCategory(null);
        }}
        footer={null}
        destroyOnHidden
      >
        {editingCategory && (
          <Alert
            message="正在编辑分类"
            description={
              <Space>
                <span>当前编辑:</span>
                {editingCategory.icon && <span>{editingCategory.icon}</span>}
                <Tag color={editingCategory.level === 1 ? 'blue' : 'green'}>
                  {editingCategory.level === 1 ? '一级' : '二级'}
                </Tag>
                <span>{editingCategory.name}</span>
                {editingCategory.parentId && (
                  <>
                    <span>→ 父分类:</span>
                    <Tag color="blue">
                      {categories.find(c => c.id === editingCategory.parentId)?.name || '未知'}
                    </Tag>
                  </>
                )}
              </Space>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="分类名称"
            rules={[
              { required: true, message: '请输入分类名称' },
              { max: 50, message: '分类名称不能超过50个字符' }
            ]}
          >
            <Input placeholder="请输入分类名称" />
          </Form.Item>

          <Form.Item
            name="parentId"
            label="父分类"
            tooltip="选择父分类将创建二级分类，不选择则创建一级分类"
          >
            <Select
              placeholder="选择父分类（可选）"
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {categories
                .filter(cat => {
                  // 只显示一级分类且激活的分类
                  if (cat.level !== 1 || cat.isActive === false) return false;
                  
                  // 编辑时，不能选择自己作为父分类
                  if (editingCategory && cat.id === editingCategory.id) return false;
                  
                  // 编辑时，不能选择自己的子分类作为父分类（避免循环）
                  if (editingCategory && cat.parentId === editingCategory.id) return false;
                  
                  return true;
                })
                .map(cat => (
                  <Select.Option key={cat.id} value={cat.id} label={cat.name}>
                    <Space>
                      {cat.icon && <span>{cat.icon}</span>}
                      <span>{cat.name}</span>
                      <Tag color="blue" size="small">一级</Tag>
                      {categories.filter(sub => sub.parentId === cat.id).length > 0 && (
                        <Tag color="green" size="small">
                          {categories.filter(sub => sub.parentId === cat.id).length}个子分类
                        </Tag>
                      )}
                    </Space>
                  </Select.Option>
                ))
              }
            </Select>
          </Form.Item>

          {/* 层级提示 */}
          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => 
            prevValues.parentId !== currentValues.parentId
          }>
            {({ getFieldValue }) => {
              const parentId = getFieldValue('parentId');
              const parentCategory = categories.find(c => c.id === parentId);
              
              if (editingCategory) {
                // 编辑模式的提示
                const originalParentId = editingCategory.parentId;
                const originalLevel = editingCategory.level;
                const newLevel = parentId ? 2 : 1;
                
                if (parentId !== originalParentId) {
                  if (parentId && parentCategory) {
                    return (
                      <Alert
                        message={originalLevel === 2 ? "修改父分类" : "转换为二级分类"}
                        description={
                          <Space>
                            <span>分类将移动到</span>
                            <Tag color="blue">
                              {parentCategory.icon && <span>{parentCategory.icon}</span>}
                              {parentCategory.name}
                            </Tag>
                            <span>下作为二级分类</span>
                          </Space>
                        }
                        type="warning"
                        showIcon
                        style={{ marginBottom: 16 }}
                      />
                    );
                  } else if (!parentId && originalLevel === 2) {
                    return (
                      <Alert
                        message="转换为一级分类"
                        description="分类将成为根级分类，其下的子分类将保持不变"
                        type="warning"
                        showIcon
                        style={{ marginBottom: 16 }}
                      />
                    );
                  }
                }
              } else {
                // 创建模式的提示
                if (parentId && parentCategory) {
                  return (
                    <Alert
                      message="将创建二级分类"
                      description={
                        <Space>
                          <span>新分类将作为</span>
                          <Tag color="blue">
                            {parentCategory.icon && <span>{parentCategory.icon}</span>}
                            {parentCategory.name}
                          </Tag>
                          <span>的子分类</span>
                        </Space>
                      }
                      type="info"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                  );
                } else if (!parentId) {
                  return (
                    <Alert
                      message="将创建一级分类"
                      description="新分类将作为根级分类，可以在其下创建子分类"
                      type="success"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                  );
                }
              }
              return null;
            }}
          </Form.Item>

          <Form.Item
            name="description"
            label="分类描述"
            rules={[
              { max: 200, message: '描述不能超过200个字符' }
            ]}
          >
            <TextArea
              rows={3}
              placeholder="请输入分类描述（可选）"
              showCount
              maxLength={200}
            />
          </Form.Item>

          <Form.Item
            name="color"
            label="分类颜色"
            tooltip="用于在界面中区分不同分类"
          >
            <Input
              type="color"
              placeholder="#6b7280"
              style={{ width: 100 }}
            />
          </Form.Item>

          <Form.Item
            name="icon"
            label="分类图标"
            tooltip="可以使用emoji或简短文字"
          >
            <Input
              placeholder="📂"
              maxLength={10}
              style={{ width: 100 }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingCategory ? '更新' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 删除确认模态框 */}
      <CategoryDeleteModal
        visible={deleteModalVisible}
        categories={categoriesToDelete}
        allCategories={categories}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />

      {/* 数据库诊断抽屉 */}
      <Drawer
        title={
          <Space>
            <BugOutlined />
            <span>数据库诊断报告</span>
          </Space>
        }
        open={diagnosticVisible}
        onClose={() => setDiagnosticVisible(false)}
        width={600}
        destroyOnHidden
      >
        {diagnosticLoading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" tip="正在诊断数据库结构..." />
          </div>
        ) : diagnosticResult ? (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 诊断结果概览 */}
            <Card size="small" title="诊断概览">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>表结构状态: </Text>
                  <Tag color={diagnosticResult.result.hasRequiredFields ? 'success' : 'error'}>
                    {diagnosticResult.result.hasRequiredFields ? '完整' : '缺失字段'}
                  </Tag>
                </div>
                <div>
                  <Text strong>数据约束: </Text>
                  <Tag color={diagnosticResult.result.hasConstraints ? 'success' : 'warning'}>
                    {diagnosticResult.result.hasConstraints ? '完整' : '缺失约束'}
                  </Tag>
                </div>
                <div>
                  <Text strong>性能索引: </Text>
                  <Tag color={diagnosticResult.result.hasIndexes ? 'success' : 'warning'}>
                    {diagnosticResult.result.hasIndexes ? '完整' : '缺失索引'}
                  </Tag>
                </div>
              </Space>
            </Card>

            {/* 数据统计 */}
            <Card size="small" title="数据统计">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text>总分类数: </Text>
                  <Text strong>{diagnosticResult.result.dataConsistency.totalCategories}</Text>
                </div>
                <div>
                  <Text>一级分类: </Text>
                  <Text strong>{diagnosticResult.result.dataConsistency.level1Categories}</Text>
                </div>
                <div>
                  <Text>二级分类: </Text>
                  <Text strong style={{ 
                    color: diagnosticResult.result.dataConsistency.level2Categories > 0 ? '#52c41a' : '#ff4d4f' 
                  }}>
                    {diagnosticResult.result.dataConsistency.level2Categories}
                  </Text>
                  {diagnosticResult.result.dataConsistency.level2Categories === 0 && (
                    <Text type="secondary"> (这就是为什么看不到二级分类的原因)</Text>
                  )}
                </div>
                {diagnosticResult.result.dataConsistency.orphanedCategories > 0 && (
                  <div>
                    <Text>孤立分类: </Text>
                    <Text strong style={{ color: '#ff4d4f' }}>
                      {diagnosticResult.result.dataConsistency.orphanedCategories}
                    </Text>
                  </div>
                )}
                {diagnosticResult.result.dataConsistency.inconsistentLevels > 0 && (
                  <div>
                    <Text>层级错误: </Text>
                    <Text strong style={{ color: '#ff4d4f' }}>
                      {diagnosticResult.result.dataConsistency.inconsistentLevels}
                    </Text>
                  </div>
                )}
              </Space>
            </Card>

            {/* 修复建议 */}
            <Card size="small" title="修复建议">
              <Space direction="vertical" style={{ width: '100%' }}>
                {diagnosticResult.result.recommendations.map((recommendation: string, index: number) => (
                  <Alert
                    key={index}
                    message={recommendation}
                    type={recommendation.includes('良好') ? 'success' : 'info'}
                    showIcon
                    style={{ fontSize: '12px' }}
                  />
                ))}
              </Space>
            </Card>

            {/* 详细报告 */}
            <Card size="small" title="详细报告">
              <pre style={{ 
                fontSize: '12px', 
                lineHeight: '1.4',
                whiteSpace: 'pre-wrap',
                backgroundColor: '#f5f5f5',
                padding: '12px',
                borderRadius: '4px',
                maxHeight: '300px',
                overflow: 'auto'
              }}>
                {diagnosticResult.report}
              </pre>
            </Card>

            {/* 操作按钮 */}
            <Card size="small" title="快速修复">
              <Space wrap>
                <Button 
                  type="primary" 
                  icon={<ToolOutlined />}
                  onClick={async () => {
                    try {
                      message.loading('正在修复数据库结构...', 0);
                      const response = await fetch('/api/admin/categories/diagnostic', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'fix-structure' })
                      });
                      const result = await response.json();
                      message.destroy();
                      
                      if (result.success) {
                        message.success(result.message || '数据库结构修复完成');
                        // 重新运行诊断
                        await runDiagnostic();
                      } else {
                        message.error(result.error?.message || '修复失败');
                      }
                    } catch (error) {
                      message.destroy();
                      message.error('修复数据库结构失败');
                    }
                  }}
                >
                  修复数据库结构
                </Button>
                <Button 
                  icon={<DatabaseOutlined />}
                  onClick={async () => {
                    try {
                      message.loading('正在创建测试数据...', 0);
                      const response = await fetch('/api/admin/categories/diagnostic', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'create-test-data' })
                      });
                      const result = await response.json();
                      message.destroy();
                      
                      if (result.success) {
                        message.success(result.message || '测试数据创建完成');
                        // 刷新分类列表
                        await fetchCategories();
                        // 重新运行诊断
                        await runDiagnostic();
                      } else {
                        message.error(result.error?.message || '创建失败');
                      }
                    } catch (error) {
                      message.destroy();
                      message.error('创建测试数据失败');
                    }
                  }}
                >
                  创建测试数据
                </Button>
                <Button 
                  onClick={async () => {
                    try {
                      message.loading('正在验证API数据格式...', 0);
                      const response = await fetch('/api/admin/categories/diagnostic', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'validate-api' })
                      });
                      const result = await response.json();
                      message.destroy();
                      
                      if (result.success) {
                        message.success('API数据格式验证通过');
                      } else {
                        message.warning('API数据格式存在问题，请查看详细报告');
                      }
                    } catch (error) {
                      message.destroy();
                      message.error('API验证失败');
                    }
                  }}
                >
                  验证API格式
                </Button>
                <Button 
                  onClick={async () => {
                    try {
                      message.loading('正在验证数据一致性...', 0);
                      const response = await fetch('/api/admin/categories/diagnostic', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'validate-data' })
                      });
                      const result = await response.json();
                      message.destroy();
                      
                      if (result.success) {
                        message.success('数据一致性验证通过');
                      } else {
                        message.warning(`发现 ${result.data?.issuesFound || 0} 个数据问题`);
                      }
                      // 重新运行诊断显示详细结果
                      await runDiagnostic();
                    } catch (error) {
                      message.destroy();
                      message.error('数据验证失败');
                    }
                  }}
                >
                  验证数据一致性
                </Button>
                <Button 
                  onClick={async () => {
                    try {
                      message.loading('正在修复数据问题...', 0);
                      const response = await fetch('/api/admin/categories/diagnostic', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'fix-data' })
                      });
                      const result = await response.json();
                      message.destroy();
                      
                      if (result.success) {
                        message.success(result.message || '数据修复完成');
                        // 刷新分类列表和诊断
                        await fetchCategories();
                        await runDiagnostic();
                      } else {
                        message.error(result.error?.message || '数据修复失败');
                      }
                    } catch (error) {
                      message.destroy();
                      message.error('数据修复失败');
                    }
                  }}
                >
                  自动修复数据
                </Button>
                <Button 
                  icon={<ReloadOutlined />}
                  onClick={runDiagnostic}
                  loading={diagnosticLoading}
                >
                  重新诊断
                </Button>
              </Space>
            </Card>
          </Space>
        ) : (
          <Alert
            message="暂无诊断结果"
            description="点击数据库诊断按钮开始诊断"
            type="info"
            showIcon
          />
        )}
      </Drawer>
    </AntdAdminLayout>
  );
}

export default function CategoriesDbPage() {
  return (
    <CategoriesProvider>
      <CategoriesDbPageContent />
    </CategoriesProvider>
  );
}