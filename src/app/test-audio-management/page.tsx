'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Table, Typography, Space, Tag, message, App } from 'antd';
import { SoundOutlined, ReloadOutlined, BugOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useSession } from 'next-auth/react';

const { Title, Text } = Typography;

interface Audio {
  id: string;
  title: string;
  description?: string;
  filename: string;
  url: string;
  coverImage?: string;
  duration?: number;
  filesize?: number;
  subject: string;
  categoryId?: string;
  subcategoryId?: string;
  speaker?: string;
  uploadDate: string;
  status: string;
  category?: {
    id: string;
    name: string;
    color?: string;
    icon?: string;
  };
  subcategory?: {
    id: string;
    name: string;
  };
}

export default function TestAudioManagementPage() {
  const { message } = App.useApp();
  const { data: session, status } = useSession();
  const [audios, setAudios] = useState<Audio[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAudios = async () => {
    setLoading(true);
    try {
      console.log('🔍 测试获取音频列表...');
      const response = await fetch('/api/admin/simple-audio', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'x-user-id': ((session?.user as any)?.id) || '',
          'x-user-role': ((session as any)?.user?.role) || '',
          'x-user-email': ((session as any)?.user?.email) || ''
        },
        cache: 'no-store'
      });

      console.log('📡 API响应状态:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API错误响应:', errorText);
        throw new Error(`获取音频列表失败: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ API响应数据:', data);

      if (data.success) {
        setAudios(data.audios || []);
        message.success(`成功获取 ${data.audios?.length || 0} 条音频记录`);
      } else {
        throw new Error(data.error?.message || '获取音频列表失败');
      }
    } catch (error) {
      console.error('获取音频列表失败:', error);
      message.error(error instanceof Error ? error.message : '获取音频列表失败');
    } finally {
      setLoading(false);
    }
  };

  const testBypass = async () => {
    try {
      console.log('🔍 测试智能绕过...');
      const response = await fetch('/api/admin/simple-audio-bypass', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'x-user-id': ((session?.user as any)?.id) || '',
          'x-user-role': ((session as any)?.user?.role) || '',
          'x-user-email': ((session as any)?.user?.email) || ''
        }
      });
      const data = await response.json();
      console.log('📊 智能绕过结果:', data);
      if (data.success) {
        setAudios(data.audios || []);
        message.success(`智能绕过获取 ${data.audios?.length || 0} 条音频记录`);
      } else {
        message.error(data.error?.message || '智能绕过失败');
      }
    } catch (error) {
      console.error('智能绕过失败:', error);
      message.error('智能绕过失败');
    }
  };

  const testDirect = async () => {
    try {
      console.log('🔍 测试直接API...');
      const response = await fetch('/api/test-audio-direct', {
        method: 'GET',
        credentials: 'include'
      });
      const data = await response.json();
      console.log('📊 直接API结果:', data);
      if (data.success) {
        setAudios(data.audios || []);
        message.success(`直接获取 ${data.audios?.length || 0} 条音频记录`);
      } else {
        message.error(data.error?.message || '直接获取失败');
      }
    } catch (error) {
      console.error('直接API失败:', error);
      message.error('直接API失败');
    }
  };

  const testSession = async () => {
    try {
      console.log('🔍 测试会话API...');
      const response = await fetch('/api/test-session', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'x-user-id': ((session?.user as any)?.id) || '',
          'x-user-role': ((session as any)?.user?.role) || '',
          'x-user-email': ((session as any)?.user?.email) || ''
        }
      });
      const data = await response.json();
      console.log('📊 会话测试结果:', data);
      message.success('会话测试完成，请查看控制台');
    } catch (error) {
      console.error('会话测试失败:', error);
      message.error('会话测试失败');
    }
  };

  const columns: ColumnsType<Audio> = [
    {
      title: '音频',
      dataIndex: 'audio',
      key: 'audio',
      render: (_, record) => (
        <Space>
          <div>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>
              {record.title}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.speaker && `${record.speaker} • `}
              {record.duration ? `${Math.floor(record.duration / 60)}:${(record.duration % 60).toString().padStart(2, '0')}` : '0:00'} • {record.filesize ? `${Math.round(record.filesize / 1024 / 1024)}MB` : '-'}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (_, record) => {
        if (record.category) {
          return (
            <Space direction="vertical" size="small">
              <Tag color="blue">
                {record.category.icon && <span>{record.category.icon} </span>}
                {record.category.name}
              </Tag>
              {record.subcategory && (
                <Tag color="green" size="small">
                  {record.subcategory.name}
                </Tag>
              )}
            </Space>
          );
        } else if (record.subject) {
          return <Tag color="orange">{record.subject}</Tag>;
        }
        return <Text type="secondary">未分类</Text>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'published' ? 'green' : status === 'draft' ? 'orange' : 'red'}>
          {status === 'published' ? '已发布' : status === 'draft' ? '草稿' : '已归档'}
        </Tag>
      ),
    },
    {
      title: '上传时间',
      dataIndex: 'uploadDate',
      key: 'uploadDate',
      render: (uploadDate: string) => (
        <Text>{new Date(uploadDate).toLocaleString()}</Text>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>音频管理测试页面</Title>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 当前会话状态 */}
        <Card title="当前会话状态">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text><strong>状态:</strong> {status}</Text>
            <Text><strong>用户ID:</strong> {(session?.user as any)?.id || '无'}</Text>
            <Text><strong>邮箱:</strong> {(session?.user as any)?.email || '无'}</Text>
            <Text><strong>角色:</strong> {(session?.user as any)?.role || '无'}</Text>
            <Text><strong>状态:</strong> {(session?.user as any)?.status || '无'}</Text>
          </Space>
        </Card>

        {/* 测试按钮 */}
        <Card title="测试功能">
          <Space wrap>
            <Button
              type="primary"
              icon={<BugOutlined />}
              onClick={fetchAudios}
              loading={loading}
            >
              测试主要API
            </Button>
            <Button
              icon={<BugOutlined />}
              onClick={testBypass}
              loading={loading}
            >
              测试智能绕过
            </Button>
            <Button
              icon={<BugOutlined />}
              onClick={testDirect}
              loading={loading}
            >
              测试直接API
            </Button>
            <Button
              icon={<BugOutlined />}
              onClick={testSession}
            >
              测试会话
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchAudios}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        </Card>

        {/* 音频列表 */}
        <Card title="音频列表">
          <Table
            columns={columns}
            dataSource={audios}
            rowKey="id"
            loading={loading}
            pagination={{
              total: audios.length,
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
            }}
          />
        </Card>

        {/* 调试信息 */}
        <Card title="调试信息">
          <Space direction="vertical">
            <Text><strong>主要API:</strong> /api/admin/simple-audio</Text>
            <Text><strong>智能绕过:</strong> /api/admin/simple-audio-bypass</Text>
            <Text><strong>直接API:</strong> /api/test-audio-direct</Text>
            <Text><strong>会话测试:</strong> /api/test-session</Text>
            <Text><strong>调试登录:</strong> /debug/login</Text>
          </Space>
        </Card>
      </Space>
    </div>
  );
}
