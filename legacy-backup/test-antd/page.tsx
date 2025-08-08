'use client';

import React from 'react';
import { Card, Button, Space, Alert, Typography } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function TestAntd() {
  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Alert
          message="Ant Design 测试页面"
          description="如果你能看到这个页面，说明 Ant Design 已经正常工作"
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
        />

        <Card title="测试组件">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Title level={4}>这是一个 Ant Design 卡片</Title>
            <Text>如果样式正常显示，说明 Ant Design 配置正确。</Text>
            
            <Space>
              <Button type="primary">主要按钮</Button>
              <Button>默认按钮</Button>
              <Button type="dashed">虚线按钮</Button>
            </Space>
          </Space>
        </Card>

        <Card title="导航测试">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>点击下面的按钮测试页面导航：</Text>
            <Space wrap>
              <Button 
                onClick={() => window.location.href = '/admin/debug-auth'}
              >
                认证调试页面
              </Button>
              <Button 
                onClick={() => window.location.href = '/admin/antd'}
              >
                仪表盘
              </Button>
              <Button 
                onClick={() => window.location.href = '/admin/audio-antd'}
              >
                音频管理
              </Button>
              <Button 
                onClick={() => window.location.href = '/auth/signin'}
              >
                登录页面
              </Button>
            </Space>
          </Space>
        </Card>
      </Space>
    </div>
  );
}