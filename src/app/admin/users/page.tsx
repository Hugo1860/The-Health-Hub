'use client';

import { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Space, 
  Tag, 
  Avatar, 
  Typography, 
  Input,
  Select,
  DatePicker,
  Modal,
  Form,
  message,
  Popconfirm,
  Tooltip,
  App
} from 'antd';
import {
  UserOutlined,
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ExportOutlined,
  EyeOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import AntdAdminLayout from '../../../components/AntdAdminLayout';
import { AntdAdminGuard } from '../../../components/AntdAdminGuard';
import SafeTimeDisplay from '../../../components/SafeTimeDisplay';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface User {
  id: string;
  email: string;
  username?: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  profile?: {
    name?: string;
    avatar?: string;
    phone?: string;
  };
}

function UsersManagement() {
  const { message } = App.useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      console.log('=== 开始获取用户列表 ===');
      const response = await fetch('/api/admin/users-simple', {
        credentials: 'include',
        headers: {
          'x-user-id': (window as any).CURRENT_USER_ID || '',
          'x-user-role': (window as any).CURRENT_USER_ROLE || ''
        }
      });
      
      console.log('API响应状态:', response.status);
      console.log('API响应头:', Object.fromEntries(response.headers.entries()));
      
      const data = await response.json();
      console.log('API响应数据:', data);
      
      if (!response.ok) {
        console.error('API请求失败:', response.status, data);
        throw new Error(`获取用户列表失败: ${response.status} - ${data.error?.message || '未知错误'}`);
      }
      
      if (data.success) {
        const payload = data.data;
        const list = Array.isArray(payload) ? payload : (payload?.users || []);
        console.log('用户数据(list):', list);
        const normalized = (list as any[]).map((u) => ({
          id: String(u.id),
          email: u.email,
          username: u.username,
          role: u.role,
          status: u.status,
          createdAt: u.createdAt || u.created_at || u.createdAT || null,
          updatedAt: u.updatedAt || u.updated_at || null,
          lastLoginAt: u.lastLoginAt || u.last_login || u.lastLogin || null,
          profile: u.profile || undefined,
        }));
        setUsers(normalized as User[]);
        message.success(`成功获取 ${normalized.length} 个用户`);
      } else {
        console.error('API返回失败:', data);
        throw new Error(data.error?.message || '获取用户列表失败');
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
      message.error(error instanceof Error ? error.message : '获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const handleRoleFilter = (value: string) => {
    setSelectedRole(value);
  };

  const handleStatusFilter = (value: string) => {
    setSelectedStatus(value);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status,
      name: user.profile?.name,
      phone: user.profile?.phone,
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users-simple/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'x-user-id': (window as any).CURRENT_USER_ID || '',
          'x-user-role': (window as any).CURRENT_USER_ROLE || ''
        }
      });
      
      if (!response.ok) {
        throw new Error(`删除用户失败: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        message.success('用户删除成功');
        fetchUsers();
      } else {
        throw new Error(data.error?.message || '删除用户失败');
      }
    } catch (error) {
      console.error('删除用户失败:', error);
      message.error(error instanceof Error ? error.message : '删除用户失败');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const url = editingUser 
        ? `/api/admin/users-simple/${editingUser.id}`
        : '/api/admin/users-simple';
      
      const response = await fetch(url, {
        method: editingUser ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': (window as any).CURRENT_USER_ID || '',
          'x-user-role': (window as any).CURRENT_USER_ROLE || ''
        },
        credentials: 'include',
        body: JSON.stringify(values),
      });
      
      if (!response.ok) {
        throw new Error(`${editingUser ? '更新' : '创建'}用户失败: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        message.success(`用户${editingUser ? '更新' : '创建'}成功`);
        setIsModalVisible(false);
        setEditingUser(null);
        form.resetFields();
        fetchUsers();
      } else {
        throw new Error(data.error?.message || `${editingUser ? '更新' : '创建'}用户失败`);
      }
    } catch (error) {
      console.error('操作失败:', error);
      message.error(error instanceof Error ? error.message : '操作失败');
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    setEditingUser(null);
    form.resetFields();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'red';
      case 'moderator': return 'orange';
      case 'editor': return 'blue';
      case 'user': return 'green';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'inactive': return 'orange';
      case 'banned': return 'red';
      case 'pending': return 'blue';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '活跃';
      case 'inactive': return '非活跃';
      case 'banned': return '已封禁';
      case 'pending': return '待审核';
      default: return status;
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return '管理员';
      case 'moderator': return '版主';
      case 'editor': return '编辑';
      case 'user': return '用户';
      default: return role;
    }
  };

  // 过滤用户数据
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchText || 
      user.email.toLowerCase().includes(searchText.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchText.toLowerCase()) ||
      user.profile?.name?.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesRole = !selectedRole || user.role === selectedRole;
    const matchesStatus = !selectedStatus || user.status === selectedStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const columns: ColumnsType<User> = [
    {
      title: '用户',
      dataIndex: 'user',
      key: 'user',
      render: (_, record) => (
        <Space>
          <Avatar 
            src={record.profile?.avatar}
            icon={<UserOutlined />}
            size="small"
          />
          <div>
            <div style={{ fontWeight: 500 }}>
              {record.profile?.name || record.username || '未设置'}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.email}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={getRoleColor(role)}>
          {getRoleText(role)}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (createdAt: string) => (
        <SafeTimeDisplay timestamp={createdAt} format="datetime" />
      ),
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      render: (lastLoginAt?: string) => (
        lastLoginAt ? (
          <SafeTimeDisplay timestamp={lastLoginAt} format="relative" />
        ) : (
          <Text type="secondary">从未登录</Text>
        )
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="查看详情">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              size="small"
              onClick={() => {
                // 这里可以添加查看用户详情的逻辑
                message.info('查看用户详情功能待开发');
              }}
            />
          </Tooltip>
          <Tooltip title="编辑用户">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              size="small"
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个用户吗？"
            description="删除后无法恢复，请谨慎操作。"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除用户">
              <Button 
                type="text" 
                icon={<DeleteOutlined />} 
                size="small"
                danger
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <AntdAdminLayout>
      <div style={{ padding: '0 0 24px 0' }}>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>
            用户管理
          </Title>
          <Space>
            <Button 
              icon={<ExportOutlined />}
              onClick={() => message.info('导出功能待开发')}
            >
              导出
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setIsModalVisible(true)}
            >
              新增用户
            </Button>
          </Space>
        </div>

        <Card>
          <div style={{ marginBottom: 16 }}>
            <Space wrap>
              <Search
                placeholder="搜索用户邮箱、用户名或姓名"
                allowClear
                style={{ width: 300 }}
                onSearch={handleSearch}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <Select
                placeholder="筛选角色"
                allowClear
                style={{ width: 120 }}
                onChange={handleRoleFilter}
              >
                <Option value="admin">管理员</Option>
                <Option value="moderator">版主</Option>
                <Option value="editor">编辑</Option>
                <Option value="user">用户</Option>
              </Select>
              <Select
                placeholder="筛选状态"
                allowClear
                style={{ width: 120 }}
                onChange={handleStatusFilter}
              >
                <Option value="active">活跃</Option>
                <Option value="inactive">非活跃</Option>
                <Option value="banned">已封禁</Option>
                <Option value="pending">待审核</Option>
              </Select>
              <Button 
                icon={<ReloadOutlined />}
                onClick={fetchUsers}
                loading={loading}
              >
                刷新
              </Button>
            </Space>
          </div>

          <Table
            columns={columns}
            dataSource={filteredUsers}
            rowKey="id"
            loading={loading}
            pagination={{
              total: filteredUsers.length,
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
            }}
          />
        </Card>

        <Modal
          title={editingUser ? '编辑用户' : '新增用户'}
          open={isModalVisible}
          onOk={handleModalOk}
          onCancel={handleModalCancel}
          width={600}
        >
          <Form
            form={form}
            name="userForm"
            layout="vertical"
            initialValues={{
              role: 'user',
              status: 'active',
            }}
          >
            <Form.Item
              label="邮箱"
              name="email"
              rules={[
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '请输入有效的邮箱地址' }
              ]}
            >
              <Input placeholder="请输入邮箱" />
            </Form.Item>

            <Form.Item
              label="用户名"
              name="username"
            >
              <Input placeholder="请输入用户名" />
            </Form.Item>

            <Form.Item
              label="姓名"
              name="name"
            >
              <Input placeholder="请输入真实姓名" />
            </Form.Item>

            <Form.Item
              label="手机号"
              name="phone"
            >
              <Input placeholder="请输入手机号" />
            </Form.Item>

            <Form.Item
              label="角色"
              name="role"
              rules={[{ required: true, message: '请选择角色' }]}
            >
              <Select placeholder="请选择角色">
                <Option value="user">用户</Option>
                <Option value="editor">编辑</Option>
                <Option value="moderator">版主</Option>
                <Option value="admin">管理员</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="状态"
              name="status"
              rules={[{ required: true, message: '请选择状态' }]}
            >
              <Select placeholder="请选择状态">
                <Option value="active">活跃</Option>
                <Option value="inactive">非活跃</Option>
                <Option value="pending">待审核</Option>
                <Option value="banned">已封禁</Option>
              </Select>
            </Form.Item>

            {!editingUser && (
              <Form.Item
                label="密码"
                name="password"
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 6, message: '密码至少6位' }
                ]}
              >
                <Input.Password placeholder="请输入密码" />
              </Form.Item>
            )}
          </Form>
        </Modal>
      </div>
    </AntdAdminLayout>
  );
}

export default function UsersManagementPage() {
  return (
    <AntdAdminGuard>
      <UsersManagement />
    </AntdAdminGuard>
  );
}