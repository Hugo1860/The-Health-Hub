'use client';

import { useState } from 'react';
import { Button, Card, Space, Typography, Alert, Spin, Tabs } from 'antd';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

export default function TestAdminApisPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, any>>({});

  const testApi = async (endpoint: string, name: string) => {
    setLoading(true);
    try {
      console.log(`Testing ${endpoint}...`);
      const response = await fetch(endpoint, {
        credentials: 'include'
      });
      
      const data = await response.json();
      
      setResults(prev => ({
        ...prev,
        [name]: {
          status: response.status,
          success: response.ok,
          data
        }
      }));
      
      if (!response.ok) {
        setErrors(prev => ({
          ...prev,
          [name]: `HTTP ${response.status}: ${data.error?.message || '未知错误'}`
        }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    } catch (error) {
      console.error(`Error testing ${endpoint}:`, error);
      setErrors(prev => ({
        ...prev,
        [name]: error instanceof Error ? error.message : '网络错误'
      }));
    } finally {
      setLoading(false);
    }
  };

  const testAllApis = async () => {
    await Promise.all([
      testApi('/api/admin/dashboard/stats', 'stats'),
      testApi('/api/admin/dashboard/recent-activity?pageSize=5', 'activity'),
      testApi('/api/admin/dashboard/popular-content?recentLimit=3&popularLimit=3', 'content')
    ]);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>管理员 API 测试</Title>
      
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <Space>
            <Button 
              type="primary" 
              onClick={testAllApis}
              loading={loading}
            >
              测试所有 API
            </Button>
            <Button 
              onClick={() => testApi('/api/admin/dashboard/stats', 'stats')}
              loading={loading}
            >
              测试统计 API
            </Button>
            <Button 
              onClick={() => testApi('/api/admin/dashboard/recent-activity?pageSize=5', 'activity')}
              loading={loading}
            >
              测试活动 API
            </Button>
            <Button 
              onClick={() => testApi('/api/admin/dashboard/popular-content?recentLimit=3&popularLimit=3', 'content')}
              loading={loading}
            >
              测试内容 API
            </Button>
          </Space>
        </Card>

        {Object.keys(errors).length > 0 && (
          <Card title="错误信息" style={{ borderColor: '#ff4d4f' }}>
            {Object.entries(errors).map(([name, error]) => (
              <Alert
                key={name}
                message={`${name} API 错误`}
                description={error as string}
                type="error"
                style={{ marginBottom: 8 }}
              />
            ))}
          </Card>
        )}

        {Object.keys(results).length > 0 && (
          <Card title="测试结果">
            <Tabs defaultActiveKey="stats">
              {Object.entries(results).map(([name, result]: [string, any]) => (
                <TabPane tab={`${name} API`} key={name}>
                  <Card 
                    type="inner" 
                    title={`${name} API 结果`}
                    extra={
                      <Space>
                        <Text type={result.success ? 'success' : 'danger'}>
                          {result.status}
                        </Text>
                        {result.success ? '✅' : '❌'}
                      </Space>
                    }
                  >
                    <Paragraph>
                      <Text strong>状态:</Text> {result.success ? '成功' : '失败'}
                    </Paragraph>
                    <Paragraph>
                      <Text strong>响应数据:</Text>
                    </Paragraph>
                    <pre style={{ 
                      background: '#f5f5f5', 
                      padding: '12px', 
                      borderRadius: '4px',
                      fontSize: '12px',
                      overflow: 'auto',
                      maxHeight: '400px'
                    }}>
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </Card>
                </TabPane>
              ))}
            </Tabs>
          </Card>
        )}

        <Card title="修复总结">
          <Paragraph>
            <Title level={4}>已修复的问题：</Title>
            <ul>
              <li>✅ 修复了数据库列名不匹配问题（deleted_at, created_at, play_count）</li>
              <li>✅ 统计 API 现在正常工作</li>
              <li>✅ 热门内容 API 现在正常工作</li>
              <li>✅ 最近活动 API 现在正常工作</li>
              <li>✅ 修复了 JSX 语法错误</li>
              <li>✅ 修复了 TypeScript 类型错误</li>
            </ul>
          </Paragraph>
          <Paragraph>
            <Title level={4}>数据库结构对应关系：</Title>
            <ul>
              <li>audios 表：使用 uploadDate 而不是 created_at</li>
              <li>users 表：使用 createdAt 而不是 created_at</li>
              <li>comments 表：使用 createdAt 和 audioId</li>
              <li>移除了不存在的 deleted_at 和 play_count 列</li>
            </ul>
          </Paragraph>
        </Card>
      </Space>
    </div>
  );
}