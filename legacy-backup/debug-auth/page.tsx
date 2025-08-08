'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { Card, Descriptions, Button, Space, Alert } from 'antd';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import AntdProvider from '../../../components/AntdProvider';

function DebugAuthContent() {
  const { data: session, status } = useSession();
  const { isAdmin, isLoading, user, hasPermission } = useAdminAuth(false);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Alert
          message="认证调试页面"
          description="这个页面用于调试管理员认证问题"
          type="info"
          showIcon
        />

        <Card title="NextAuth Session 信息">
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Session Status">{status}</Descriptions.Item>
            <Descriptions.Item label="Session Data">
              <pre>{JSON.stringify(session, null, 2)}</pre>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="useAdminAuth Hook 信息">
          <Descriptions bordered column={1}>
            <Descriptions.Item label="isAdmin">{isAdmin ? '是' : '否'}</Descriptions.Item>
            <Descriptions.Item label="isLoading">{isLoading ? '是' : '否'}</Descriptions.Item>
            <Descriptions.Item label="User Data">
              <pre>{JSON.stringify(user, null, 2)}</pre>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="测试操作">
          <Space>
            <Button 
              type="primary" 
              onClick={() => window.location.href = '/auth/signin'}
            >
              去登录页面
            </Button>
            <Button 
              onClick={() => window.location.href = '/admin/audio-antd'}
            >
              访问音频管理页面
            </Button>
            <Button 
              onClick={() => window.location.reload()}
            >
              刷新页面
            </Button>
          </Space>
        </Card>

        <Card title="浏览器控制台">
          <Alert
            message="请打开浏览器开发者工具查看控制台输出"
            description="控制台会显示详细的认证调试信息"
            type="warning"
            showIcon
          />
        </Card>
      </Space>
    </div>
  );
}

export default function DebugAuth() {
  return (
    <AntdProvider>
      <DebugAuthContent />
    </AntdProvider>
  );
}