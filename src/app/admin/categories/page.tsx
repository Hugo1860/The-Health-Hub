'use client';

import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Card, 
  Button, 
  Space, 
  Tag, 
  Typography,
  Modal,
  Form,
  Input,
  Select,
  ColorPicker,
  message,
  Popconfirm,
  Row,
  Col,
  Statistic
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  TagOutlined
} from '@ant-design/icons';
import AntdAdminLayout from '../../../components/AntdAdminLayout';

const { Title, Text } = Typography;

interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
  audioCount?: number;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        // 为每个分类添加音频数量统计
        const categoriesWithCount = data.map((category: Category) => ({
          ...category,
          audioCount: Math.floor(Math.random() * 50) + 1 // 模拟音频数量
        }));
        setCategories(categoriesWithCount);
      } else {
        message.error('获取分类失败');
      }
    } catch (error) {
      console.error('获取分类失败:', error);
      message.error('获取分类失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const url = editingCategory 
        ? `/api/categories/${editingCategory.id}`
        : '/api/categories';
      
      const method = editingCategory ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...values,
          color: typeof values.color === 'string' ? values.color : values.color?.toHexString?.() || '#6b7280'
        }),
      });

      if (response.ok) {
        message.success(editingCategory ? '更新成功' : '添加成功');
        await fetchCategories();
        handleCancel();
      } else {
        const error = await response.json();
        message.error(error.error || '操作失败');
      }
    } catch (error) {
      console.error('提交失败:', error);
      message.error('操作失败');
    }
  };

  const handleAdd = () => {
    setEditingCategory(null);
    form.resetFields();
    form.setFieldsValue({
      name: '',
      description: '',
      color: '#6b7280',
      icon: '📂'
    });
    setModalVisible(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    form.setFieldsValue({
      name: category.name,
      description: category.description || '',
      color: category.color || '#6b7280',
      icon: category.icon || '📂'
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        message.success('删除成功');
        await fetchCategories();
      } else {
        const error = await response.json();
        message.error(error.error || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      message.error('删除失败');
    }
  };

  const handleCancel = () => {
    setModalVisible(false);
    setEditingCategory(null);
    form.resetFields();
  };

  const commonIcons = ['📂', '❤️', '🧠', '🏥', '🔬', '👶', '🦷', '👁️', '🫁', '🦴', '💊', '🩺', '📚', '📖', '📝'];

  // 表格列定义
  const columns = [
    {
      title: '分类信息',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Category) => (
        <Space>
          <span style={{ fontSize: '18px' }}>{record.icon}</span>
          <div>
            <div style={{ fontWeight: 500 }}>{text}</div>
            <Space size="small">
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: record.color,
                  display: 'inline-block'
                }}
              />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {record.color}
              </Text>
            </Space>
          </div>
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => text || <Text type="secondary">无描述</Text>,
    },
    {
      title: '音频数量',
      dataIndex: 'audioCount',
      key: 'audioCount',
      render: (count: number) => (
        <Tag color="blue" icon={<TagOutlined />}>
          {count || 0} 个音频
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: Category) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个分类吗？"
            description="删除后无法恢复，请谨慎操作。"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 统计数据
  const stats = {
    total: categories.length,
    totalAudios: categories.reduce((sum, cat) => sum + (cat.audioCount || 0), 0),
  };

  return (
    <AntdAdminLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 统计卡片 */}
        <Row gutter={16}>
          <Col span={8}>
            <Card>
              <Statistic
                title="分类总数"
                value={stats.total}
                prefix={<AppstoreOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="音频总数"
                value={stats.totalAudios}
                prefix={<TagOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="平均每分类"
                value={stats.total > 0 ? Math.round(stats.totalAudios / stats.total) : 0}
                suffix="个音频"
              />
            </Card>
          </Col>
        </Row>

        {/* 分类管理表格 */}
        <Card
          title="学科分类管理"
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              添加分类
            </Button>
          }
        >
          <Table
            columns={columns}
            dataSource={categories}
            loading={loading}
            rowKey="id"
            pagination={{
              total: categories.length,
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            }}
          />
        </Card>

        {/* 添加/编辑模态框 */}
        <Modal
          title={editingCategory ? '编辑分类' : '添加分类'}
          open={modalVisible}
          onCancel={handleCancel}
          footer={null}
          width={600}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              name: '',
              description: '',
              color: '#6b7280',
              icon: '📂'
            }}
          >
            <Form.Item
              name="name"
              label="分类名称"
              rules={[{ required: true, message: '请输入分类名称' }]}
            >
              <Input placeholder="请输入分类名称" />
            </Form.Item>

            <Form.Item
              name="description"
              label="描述"
            >
              <Input.TextArea 
                rows={3} 
                placeholder="请输入分类描述（可选）" 
              />
            </Form.Item>

            <Form.Item
              name="icon"
              label="图标"
            >
              <div>
                <div style={{ marginBottom: 8 }}>
                  <Text type="secondary">选择常用图标：</Text>
                </div>
                <Space wrap style={{ marginBottom: 12 }}>
                  {commonIcons.map((icon) => (
                    <Button
                      key={icon}
                      size="small"
                      onClick={() => form.setFieldValue('icon', icon)}
                      style={{ 
                        fontSize: '16px',
                        height: 'auto',
                        padding: '4px 8px'
                      }}
                    >
                      {icon}
                    </Button>
                  ))}
                </Space>
                <Input placeholder="或输入自定义图标" />
              </div>
            </Form.Item>

            <Form.Item
              name="color"
              label="颜色"
            >
              <ColorPicker showText />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button onClick={handleCancel}>
                  取消
                </Button>
                <Button type="primary" htmlType="submit">
                  {editingCategory ? '更新' : '添加'}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </Space>
    </AntdAdminLayout>
  );
}