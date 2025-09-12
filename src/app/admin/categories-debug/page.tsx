'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Alert, Space, Typography, Spin, Divider } from 'antd';
import { ReloadOutlined, DatabaseOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface ApiTestResult {
  name: string;
  url: string;
  status: 'loading' | 'success' | 'error';
  data?: any;
  error?: string;
  duration?: number;
}

export default function CategoriesDebugPage() {
  const [tests, setTests] = useState<ApiTestResult[]>([]);
  const [loading, setLoading] = useState(false);

  const apiTests = [
    {
      name: '获取分类列表 (扁平)',
      url: '/api/categories?format=flat&limit=5'
    },
    {
      name: '获取分类列表 (树形)',
      url: '/api/categories?format=tree&includeCount=true'
    },
    {
      name: '获取分类树',
      url: '/api/categories/tree'
    },
    {
      name: '数据库健康检查',
      url: '/api/health/database'
    }
  ];

  const runApiTest = async (test: { name: string; url: string }): Promise<ApiTestResult> => {
    const startTime = Date.now();
    
    try {
      const response = await fetch(test.url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-cache'
      });

      const duration = Date.now() - startTime;
      const data = await response.json();

      if (response.ok) {
        return {
          name: test.name,
          url: test.url,
          status: 'success',
          data,
          duration
        };
      } else {
        return {
          name: test.name,
          url: test.url,
          status: 'error',
          error: `HTTP ${response.status}: ${data.error?.message || response.statusText}`,
          duration
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        name: test.name,
        url: test.url,
        status: 'error',
        error: error instanceof Error ? error.message : '未知错误',
        duration
      };
    }
  };

  const runAllTests = async () => {
    setLoading(true);
    setTests([]);

    // 初始化测试状态
    const initialTests = apiTests.map(test => ({
      name: test.name,
      url: test.url,
      status: 'loading' as const
    }));
    setTests(initialTests);

    // 逐个运行测试
    for (let i = 0; i < apiTests.length; i++) {
      const result = await runApiTest(apiTests[i]);
      
      setTests(prev => prev.map((test, index) => 
        index === i ? result : test
      ));
    }

    setLoading(false);
  };

  const testCreateCategory = async () => {
    const testData = {
      name: `测试分类_${Date.now()}`,
      description: '这是一个测试分类',
      color: '#3b82f6',
      icon: '🧪'
    };

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        alert(`✅ 创建成功！分类ID: ${result.data.id}`);
      } else {
        alert(`❌ 创建失败: ${result.error?.message || '未知错误'}`);
      }
    } catch (error) {
      alert(`❌ 请求失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  useEffect(() => {
    runAllTests();
  }, []);

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 页面标题 */}
        <Card>
          <Title level={2}>
            <DatabaseOutlined /> 分类 API 调试页面
          </Title>
          <Paragraph>
            这个页面用于诊断分类 API 的问题。如果你遇到了 "创建分类失败" 或页面无法正确打开的问题，
            这里可以帮助你找到根本原因。
          </Paragraph>
          
          <Space>
            <Button 
              type="primary" 
              icon={<ReloadOutlined />} 
              onClick={runAllTests}
              loading={loading}
            >
              重新测试
            </Button>
            <Button onClick={testCreateCategory}>
              测试创建分类
            </Button>
          </Space>
        </Card>

        {/* API 测试结果 */}
        <Card title="API 测试结果">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {tests.map((test, index) => (
              <Card key={index} size="small" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <Text strong>{test.name}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {test.url}
                    </Text>
                    
                    {test.status === 'loading' && (
                      <div style={{ marginTop: '8px' }}>
                        <Spin size="small" /> 测试中...
                      </div>
                    )}
                    
                    {test.status === 'success' && (
                      <Alert
                        message="测试通过"
                        description={
                          <div>
                            <Text>响应时间: {test.duration}ms</Text>
                            {test.data && (
                              <div style={{ marginTop: '8px' }}>
                                {test.data.success !== undefined && (
                                  <Text>API 状态: {test.data.success ? '✅ 成功' : '❌ 失败'}</Text>
                                )}
                                {test.data.data && Array.isArray(test.data.data) && (
                                  <div>数据量: {test.data.data.length} 条记录</div>
                                )}
                                {test.data.stats && (
                                  <div>统计: {JSON.stringify(test.data.stats)}</div>
                                )}
                              </div>
                            )}
                          </div>
                        }
                        type="success"
                        showIcon
                        style={{ marginTop: '8px' }}
                      />
                    )}
                    
                    {test.status === 'error' && (
                      <Alert
                        message="测试失败"
                        description={
                          <div>
                            <Text>错误: {test.error}</Text>
                            {test.duration && (
                              <div>响应时间: {test.duration}ms</div>
                            )}
                          </div>
                        }
                        type="error"
                        showIcon
                        style={{ marginTop: '8px' }}
                      />
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </Space>
        </Card>

        {/* 诊断信息 */}
        <Card title="诊断信息">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Alert
              message="常见问题和解决方案"
              description={
                <div>
                  <p><strong>1. 如果所有 API 测试都失败：</strong></p>
                  <ul>
                    <li>检查应用是否正在运行 (npm run dev)</li>
                    <li>检查数据库连接是否正常</li>
                    <li>查看控制台错误信息</li>
                  </ul>
                  
                  <p><strong>2. 如果数据库健康检查失败：</strong></p>
                  <ul>
                    <li>检查 DATABASE_URL 环境变量</li>
                    <li>确保 PostgreSQL 服务正在运行</li>
                    <li>检查数据库权限</li>
                  </ul>
                  
                  <p><strong>3. 如果分类 API 返回空数据：</strong></p>
                  <ul>
                    <li>可能需要运行数据库迁移</li>
                    <li>可能需要初始化默认分类数据</li>
                  </ul>
                  
                  <p><strong>4. 如果创建分类失败：</strong></p>
                  <ul>
                    <li>检查数据库表结构是否正确</li>
                    <li>检查是否有必要的字段和约束</li>
                    <li>查看具体的错误信息</li>
                  </ul>
                </div>
              }
              type="info"
              showIcon
            />

            <Divider />

            <Alert
              message="数据库迁移命令"
              description={
                <div>
                  <p>如果需要运行数据库迁移，请在终端中执行：</p>
                  <pre style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                    psql $DATABASE_URL -f database/migrations/001_add_category_hierarchy.sql
                  </pre>
                  <p>或者使用备用方法：</p>
                  <pre style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                    node scripts/run-migration.js
                  </pre>
                </div>
              }
              type="warning"
              showIcon
            />
          </Space>
        </Card>
      </Space>
    </div>
  );
}