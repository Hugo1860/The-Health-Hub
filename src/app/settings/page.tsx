'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Card,
  Row,
  Col,
  Typography,
  Form,
  Input,
  Select,
  Switch,
  Slider,
  Button,
  Space,
  Divider,
  message,
  Breadcrumb,
  Avatar,
  Tabs,
  Spin
} from 'antd';
import {
  UserOutlined,
  SettingOutlined,
  HomeOutlined,
  BellOutlined,
  SoundOutlined,
  BgColorsOutlined,
  KeyOutlined,
  HeartOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import Link from 'next/link';
import AntdHomeLayout from '../../components/AntdHomeLayout';

const { Title, Text } = Typography;

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  autoplay: boolean;
  defaultPlaybackRate: number;
  defaultVolume: number;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    theme: 'light',
    autoplay: false,
    defaultPlaybackRate: 1,
    defaultVolume: 0.8
  });

  useEffect(() => {
    console.log('Settings page - Session status:', status, 'Session:', !!session);
    
    if (status === 'loading') return;
    
    // 设置表单初始值
    if (session?.user) {
      form.setFieldsValue({
        username: session.user.name || '',
        email: session.user.email || '',
      });
      
      // 加载用户偏好设置
      loadUserPreferences();
    }
  }, [session, status, form]);

  // 不自动重定向，让用户手动选择登录

  const loadUserPreferences = async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.user.preferences) {
          setUserPreferences(data.data.user.preferences);
          form.setFieldsValue({
            ...form.getFieldsValue(),
            ...data.data.user.preferences
          });
        }
      }
    } catch (error) {
      console.error('加载用户偏好失败:', error);
    }
  };

  const handleProfileSubmit = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: values.username,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        message.success('个人资料更新成功！');
      } else {
        message.error(data.error?.message || '更新失败');
      }
    } catch (error) {
      message.error('更新失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesSubmit = async (values: any) => {
    setLoading(true);
    try {
      const preferences = {
        theme: values.theme,
        autoplay: values.autoplay,
        defaultPlaybackRate: values.defaultPlaybackRate,
        defaultVolume: values.defaultVolume,
      };

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUserPreferences(preferences);
        message.success('偏好设置保存成功！');
      } else {
        message.error(data.error?.message || '保存失败');
      }
    } catch (error) {
      message.error('保存失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (values: any) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        message.success('密码修改成功！');
        passwordForm.resetFields();
      } else {
        message.error(data.error?.message || '密码修改失败');
      }
    } catch (error) {
      message.error('密码修改失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <AntdHomeLayout>
        <div style={{ textAlign: 'center', padding: '100px' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text>加载中...</Text>
          </div>
        </div>
      </AntdHomeLayout>
    );
  }

  if (!session) {
    return (
      <AntdHomeLayout>
        <div style={{ textAlign: 'center', padding: '100px' }}>
          <Card style={{ maxWidth: 400, margin: '0 auto' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <UserOutlined style={{ fontSize: 48, color: '#ccc' }} />
              <Title level={3}>需要登录</Title>
              <Text type="secondary">
                请先登录以访问账户设置
              </Text>
              <Button 
                type="primary" 
                size="large"
                href="/auth/signin?callbackUrl=/settings"
                style={{ borderRadius: 8 }}
              >
                前往登录
              </Button>
            </Space>
          </Card>
        </div>
      </AntdHomeLayout>
    );
  }

  const user = session.user as any;

  const tabItems = [
    {
      key: 'profile',
      label: (
        <span>
          <UserOutlined />
          个人资料
        </span>
      ),
      children: (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleProfileSubmit}
          style={{ maxWidth: 600 }}
        >
          <Form.Item
            label="用户名"
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 2, max: 50, message: '用户名长度必须在2-50个字符之间' }
            ]}
          >
            <Input size="large" />
          </Form.Item>

          <Form.Item
            label="邮箱"
            name="email"
          >
            <Input size="large" disabled />
          </Form.Item>

          <Form.Item
            label="角色"
          >
            <Input 
              size="large" 
              value={user.role === 'admin' ? '管理员' : '用户'} 
              disabled 
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              size="large"
              style={{ borderRadius: 8 }}
            >
              保存个人资料
            </Button>
          </Form.Item>
        </Form>
      )
    },
    {
      key: 'password',
      label: (
        <span>
          <KeyOutlined />
          修改密码
        </span>
      ),
      children: (
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handlePasswordSubmit}
          style={{ maxWidth: 600 }}
        >
          <Form.Item
            label="当前密码"
            name="currentPassword"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password size="large" />
          </Form.Item>

          <Form.Item
            label="新密码"
            name="newPassword"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码长度至少6个字符' }
            ]}
          >
            <Input.Password size="large" />
          </Form.Item>

          <Form.Item
            label="确认新密码"
            name="confirmPassword"
            rules={[{ required: true, message: '请确认新密码' }]}
          >
            <Input.Password size="large" />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              size="large"
              style={{ borderRadius: 8 }}
            >
              修改密码
            </Button>
          </Form.Item>
        </Form>
      )
    },
    {
      key: 'appearance',
      label: (
        <span>
          <BgColorsOutlined />
          外观设置
        </span>
      ),
      children: (
        <Form
          form={form}
          layout="vertical"
          onFinish={handlePreferencesSubmit}
          style={{ maxWidth: 600 }}
          initialValues={userPreferences}
        >
          <Form.Item
            label="主题模式"
            name="theme"
          >
            <Select size="large">
              <Select.Option value="light">浅色模式</Select.Option>
              <Select.Option value="dark">深色模式</Select.Option>
              <Select.Option value="system">跟随系统</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              size="large"
              style={{ borderRadius: 8 }}
            >
              保存外观设置
            </Button>
          </Form.Item>
        </Form>
      )
    },
    {
      key: 'audio',
      label: (
        <span>
          <SoundOutlined />
          音频设置
        </span>
      ),
      children: (
        <Form
          form={form}
          layout="vertical"
          onFinish={handlePreferencesSubmit}
          style={{ maxWidth: 600 }}
          initialValues={userPreferences}
        >
          <Form.Item
            label="自动播放"
            name="autoplay"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            label="默认播放速度"
            name="defaultPlaybackRate"
          >
            <Slider
              min={0.5}
              max={2}
              step={0.25}
              marks={{
                0.5: '0.5x',
                1: '1x',
                1.5: '1.5x',
                2: '2x'
              }}
            />
          </Form.Item>

          <Form.Item
            label="默认音量"
            name="defaultVolume"
          >
            <Slider
              min={0}
              max={1}
              step={0.1}
              marks={{
                0: '0%',
                0.5: '50%',
                1: '100%'
              }}
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              size="large"
              style={{ borderRadius: 8 }}
            >
              保存音频设置
            </Button>
          </Form.Item>
        </Form>
      )
    },
    {
      key: 'favorites',
      label: (
        <span>
          <HeartOutlined />
          我的收藏
        </span>
      ),
      children: (
        <div style={{ maxWidth: 600 }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Title level={5}>收藏管理</Title>
              <Text type="secondary">
                在这里可以管理您的收藏内容
              </Text>
            </div>
            
            <Button 
              type="primary" 
              size="large"
              style={{ borderRadius: 8 }}
              onClick={() => router.push('/favorites')}
            >
              查看我的收藏
            </Button>
          </Space>
        </div>
      )
    },
    {
      key: 'history',
      label: (
        <span>
          <HistoryOutlined />
          播放历史
        </span>
      ),
      children: (
        <div style={{ maxWidth: 600 }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Title level={5}>播放历史</Title>
              <Text type="secondary">
                查看和管理您的播放历史记录
              </Text>
            </div>
            
            <Space>
              <Button 
                type="primary" 
                size="large"
                style={{ borderRadius: 8 }}
                onClick={() => router.push('/profile')}
              >
                查看播放历史
              </Button>
              <Button 
                size="large"
                style={{ borderRadius: 8 }}
              >
                清空历史记录
              </Button>
            </Space>
          </Space>
        </div>
      )
    }
  ];

  return (
    <AntdHomeLayout>
      <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
        {/* 面包屑导航 */}
        <Breadcrumb style={{ marginBottom: 24 }}>
          <Breadcrumb.Item>
            <Link href="/">
              <HomeOutlined /> 首页
            </Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <Link href="/profile">
              <UserOutlined /> 个人中心
            </Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <SettingOutlined /> 账户设置
          </Breadcrumb.Item>
        </Breadcrumb>

        <Row gutter={[24, 24]}>
          <Col xs={24} lg={6}>
            {/* 用户信息卡片 */}
            <Card style={{ borderRadius: 12 }}>
              <div style={{ textAlign: 'center' }}>
                <Avatar
                  size={80}
                  style={{ backgroundColor: '#13C2C2', marginBottom: 16 }}
                  icon={<UserOutlined />}
                >
                  {user.name?.charAt(0) || user.email?.charAt(0)}
                </Avatar>
                <Title level={4} style={{ margin: 0, marginBottom: 8 }}>
                  {user.name || user.email}
                </Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                  {user.email}
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {user.role === 'admin' ? '管理员' : '用户'}
                </Text>
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={18}>
            <Card style={{ borderRadius: 12 }}>
              <Tabs 
                activeKey={activeTab} 
                onChange={setActiveTab}
                items={tabItems}
                size="large"
              />
            </Card>
          </Col>
        </Row>
      </div>
    </AntdHomeLayout>
  );
}