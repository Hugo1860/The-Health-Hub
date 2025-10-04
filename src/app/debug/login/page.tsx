'use client';

import { useState } from 'react';
import { Button, Form, Input, Card, Space, Typography, Alert, App } from 'antd';
import { useSession, signIn, signOut } from 'next-auth/react';

const { Title, Text } = Typography;

export default function DebugLoginPage() {
  const { message } = App.useApp();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [form] = Form.useForm();

  const handleLogin = async (values: { email: string; password: string }) => {
    setIsLoading(true);
    setError('');

    try {
      console.log('🔐 开始调试登录:', values.email);
      
      const result = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false
      });

      console.log('📊 NextAuth登录结果:', result);

      if (result?.ok && !result?.error) {
        console.log('✅ 登录成功');
        setError('');
        message.success('登录成功');
      } else {
        console.log('❌ 登录失败:', result?.error);
        setError(result?.error || '登录失败');
        message.error(result?.error || '登录失败');
      }
    } catch (error) {
      console.error('❌ 登录错误:', error);
      setError('登录过程中发生错误');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
      console.log('✅ 登出成功');
      message.success('登出成功');
    } catch (error) {
      console.error('❌ 登出错误:', error);
      message.error('登出失败');
    }
  };

  const testApi = async () => {
    try {
      console.log('🔍 测试API调用...');
      const response = await fetch('/api/debug/session', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status}`);
      }

      const data = await response.json();
      console.log('📊 API响应:', data);

      if (data.success) {
        message.success('API测试成功');
      } else {
        message.error(data.error?.message || 'API测试失败');
      }
    } catch (error) {
      console.error('❌ API测试失败:', error);
      const errorMessage = error instanceof Error ? error.message : 'API测试失败';
      message.error(errorMessage);
    }
  };

  const testDatabase = async () => {
    try {
      console.log('🔍 测试数据库连接...');
      const response = await fetch('/api/debug/database', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status}`);
      }

      const data = await response.json();
      console.log('📊 数据库测试结果:', data);

      if (data.success) {
        message.success('数据库连接正常');
      } else {
        message.error(data.error?.message || '数据库连接失败');
      }
    } catch (error) {
      console.error('❌ 数据库测试失败:', error);
      const errorMessage = error instanceof Error ? error.message : '数据库测试失败';
      message.error(errorMessage);
    }
  };

  return (
    <App>
      <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
        <Title level={2}>调试登录页面</Title>

        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 当前会话状态 */}
          <Card title="当前会话状态">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text><strong>状态:</strong> {status}</Text>
              <Text><strong>用户ID:</strong> {(session?.user as any)?.id || '无'}</Text>
              <Text><strong>邮箱:</strong> {(session?.user as any)?.email || '无'}</Text>
              <Text><strong>角色:</strong> {(session?.user as any)?.role || '无'}</Text>
              <Text><strong>状态:</strong> {(session?.user as any)?.status || '无'}</Text>
              <Text><strong>会话过期:</strong> {session?.expires || '无'}</Text>
            </Space>
          </Card>

        {/* 登录表单 */}
        <Card title="登录测试">
          {error && (
            <Alert
              message={error}
              type="error"
              style={{ marginBottom: 16 }}
            />
          )}
          
          <Form
            form={form}
            onFinish={handleLogin}
            layout="vertical"
          >
            <Form.Item
              name="email"
              label="邮箱"
              rules={[{ required: true, message: '请输入邮箱' }]}
            >
              <Input placeholder="admin@example.com" />
            </Form.Item>
            
            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password placeholder="admin123" />
            </Form.Item>
            
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={isLoading}>
                  登录
                </Button>
                <Button onClick={handleLogout}>
                  登出
                </Button>
                <Button onClick={testApi}>
                  测试API
                </Button>
                <Button onClick={testDatabase}>
                  测试数据库
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        {/* 测试用户信息 */}
        <Card title="测试用户">
          <Space direction="vertical">
            <Text><strong>管理员用户:</strong></Text>
            <Text>邮箱: admin@example.com</Text>
            <Text>密码: admin123</Text>
            <Text>角色: admin</Text>
            <Text>状态: active</Text>
          </Space>
        </Card>
      </Space>
    </div>
    </App>
  );
}
