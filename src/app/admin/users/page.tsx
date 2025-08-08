'use client';

import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Card, 
  Button, 
  Space, 
  Tag, 
  Modal, 
  Form, 
  Input, 
  Select, 
  message,
  Popconfirm,
  Avatar,
  Typography,
  Row,
  Col,
  Statistic
} from 'antd';
import {
  UserOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import AntdAdminLayout from '../../../components/AntdAdminLayout';
import { useAntdPermissionCheck, ANTD_ADMIN_PERMISSIONS } from '@/hooks/useAntdAdminAuth';
import { AntdAdminGuard } from '@/components/AntdAdminGuard';

const { Title, Text } = Typography;
const { Option } = Select;

interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  status: 'active' | 'inactive' | 'banned';
  createdAt: string;
  lastLogin?: string;
}

function AntdUsersManagement() {
  const { hasPermission } = useAntdPermissionCheck();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();

  // 获取用户数据
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // 构建查询参数
      const params = new URLSearchParams({
        page: '1',
        pageSize: '20'
      });
      
      if (searchText) {
        params.append('query', searchText);
      }
      
      const response = await fetch(`/api/admin/users?${params.toString()}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('获取用户列表失败');
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || '获取用户列表失败');
      }
      
      setUsers(result.data);
    } catch (error) {
      console.error('获取用户列表失败:', error);
      message.error(error instanceof Error ? error.message : '获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 搜索用户
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 500); // 防抖处理
    
    return () => clearTimeout(timer);
  }, [searchText]);

  // 表格列定义
  const columns = [
    {
      title: '用户',
      dataIndex: 'username',
      key: 'username',
      render: (text: string, record: User) => (
        <Space>
          <Avatar 
            style={{ backgroundColor: record.role === 'admin' ? '#f56a00' : '#87d068' }}
            icon={<UserOutlined />}
          >
            {text.charAt(0)}
          </Avatar>
          <div>
            <div><Text strong>{text}</Text></div>
            <div><Text type="secondary" style={{ fontSize: '12px' }}>{record.email}</Text></div>
          </div>
        </Space>
      ),
      filterable: true,
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'red' : 'blue'}>
          {role === 'admin' ? '管理员' : '普通用户'}
        </Tag>
      ),
      filters: [
        { text: '管理员', value: 'admin' },
        { text: '普通用户', value: 'user' },
      ],
      onFilter: (value: any, record: User) => record.role === value,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusConfig = {
          active: { color: 'green', text: '活跃' },
          inactive: { color: 'orange', text: '非活跃' },
          banned: { color: 'red', text: '已封禁' },
        };
        const config = statusConfig[status as keyof typeof statusConfig];
        return <Tag color={config.color}>{config.text}</Tag>;
      },
      filters: [
        { text: '活跃', value: 'active' },
        { text: '非活跃', value: 'inactive' },
        { text: '已封禁', value: 'banned' },
      ],
      onFilter: (value: any, record: User) => record.status === value,
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: (a: User, b: User) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: '最后登录',
      dataIndex: 'lastLogin',
      key: 'lastLogin',
      render: (date: string) => date || '从未登录',
      sorter: (a: User, b: User) => {
        if (!a.lastLogin) return -1;
        if (!b.lastLogin) return 1;
        return new Date(a.lastLogin).getTime() - new Date(b.lastLogin).getTime();
      },
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: User) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            disabled={!hasPermission(ANTD_ADMIN_PERMISSIONS.UPDATE_USER)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个用户吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
            disabled={!hasPermission(ANTD_ADMIN_PERMISSIONS.DELETE_USER)}
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              disabled={!hasPermission(ANTD_ADMIN_PERMISSIONS.DELETE_USER)}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 处理编辑用户
  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue(user);
    setEditModalVisible(true);
  };

  // 处理删除用户
  const handleDelete = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('删除用户失败');
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || '删除用户失败');
      }
      
      message.success('用户删除成功');
      fetchUsers(); // 重新获取用户列表
    } catch (error) {
      console.error('删除用户失败:', error);
      message.error(error instanceof Error ? error.message : '删除用户失败');
    }
  };

  // 处理保存编辑
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      if (!editingUser) return;
      
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(values)
      });
      
      if (!response.ok) {
        throw new Error('更新用户失败');
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || '更新用户失败');
      }
      
      message.success('用户信息更新成功');
      setEditModalVisible(false);
      setEditingUser(null);
      form.resetFields();
      fetchUsers(); // 重新获取用户列表
    } catch (error) {
      console.error('更新用户失败:', error);
      message.error(error instanceof Error ? error.message : '更新用户失败');
    }
  };

  // 过滤用户数据
  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchText.toLowerCase()) ||
    user.email.toLowerCase().includes(searchText.toLowerCase())
  );

  // 统计数据
  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    admins: users.filter(u => u.role === 'admin').length,
    banned: users.filter(u => u.status === 'banned').length,
  };

  if (!hasPermission(ANTD_ADMIN_PERMISSIONS.VIEW_USERS)) {
    return (
      <AntdAdminLayout>
        <Card>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <ExclamationCircleOutlined style={{ fontSize: '48px', color: '#faad14' }} />
            <Title level={3}>权限不足</Title>
            <Text>您没有权限访问用户管理功能。</Text>
          </div>
        </Card>
      </AntdAdminLayout>
    );
  }

  return (
    <AntdAdminLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 统计卡片 */}
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总用户数"
                value={stats.total}
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="活跃用户"
                value={stats.active}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="管理员"
                value={stats.admins}
                valueStyle={{ color: '#cf1322' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="已封禁"
                value={stats.banned}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 用户表格 */}
        <Card
          title="用户管理"
          extra={
            <Space>
              <Input.Search
                placeholder="搜索用户名或邮箱"
                allowClear
                style={{ width: 250 }}
                onSearch={setSearchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                disabled={!hasPermission(ANTD_ADMIN_PERMISSIONS.CREATE_USER)}
              >
                添加用户
              </Button>
            </Space>
          }
        >
          <Table
            columns={columns}
            dataSource={filteredUsers}
            loading={loading}
            rowKey="id"
            pagination={{
              total: filteredUsers.length,
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            }}
          />
        </Card>

        {/* 编辑用户模态框 */}
        <Modal
          title="编辑用户"
          open={editModalVisible}
          onOk={handleSave}
          onCancel={() => {
            setEditModalVisible(false);
            setEditingUser(null);
            form.resetFields();
          }}
          okText="保存"
          cancelText="取消"
        >
          <Form
            form={form}
            layout="vertical"
            initialValues={editingUser || {}}
          >
            <Form.Item
              name="username"
              label="用户名"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input />
            </Form.Item>
            
            <Form.Item
              name="email"
              label="邮箱"
              rules={[
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '请输入有效的邮箱地址' }
              ]}
            >
              <Input />
            </Form.Item>
            
            <Form.Item
              name="role"
              label="角色"
              rules={[{ required: true, message: '请选择角色' }]}
            >
              <Select>
                <Option value="user">普通用户</Option>
                <Option value="admin">管理员</Option>
              </Select>
            </Form.Item>
            
            <Form.Item
              name="status"
              label="状态"
              rules={[{ required: true, message: '请选择状态' }]}
            >
              <Select>
                <Option value="active">活跃</Option>
                <Option value="inactive">非活跃</Option>
                <Option value="banned">已封禁</Option>
              </Select>
            </Form.Item>
          </Form>
        </Modal>
      </Space>
    </AntdAdminLayout>
  );
}
export 
default function AntdUsersPage() {
  return (
    <AntdAdminGuard requiredPermission={ANTD_ADMIN_PERMISSIONS.VIEW_USERS}>
      <AntdUsersManagement />
    </AntdAdminGuard>
  );
}