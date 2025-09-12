'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Alert, Space, Typography, Spin } from 'antd';
import { ReloadOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface TestResult {
  name: string;
  status: 'loading' | 'success' | 'error';
  message?: string;
  data?: any;
}

export default function CategoriesTestPage() {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    setTests([]);

    const testCases = [
      {
        name: '数据库连接测试',
        url: '/api/categories/test'
      },
      {
        name: '简化分类 API 测试',
        url: '/api/categories/simple?format=flat&limit=5'
      },
      {
        name: '简化树形 API 测试',
        url: '/api/categories/simple?format=tree'
      },
      {
        name: '完整分类 API 测试',
        url: '/api/categories?format=flat&limit=5'
      }
    ];

    for (const testCase of testCases) {
      setTests(prev => [...prev, { name: testCase.name, status: 'loading' }]);

      try {
        const response = await fetch(testCase.url);
        const data = await response.json();

        if (response.ok && data.success) {
          setTests(prev => prev.map(test => 
            test.name === testCase.name 
              ? { 
                  ...test, 
                  status: 'success', 
                  message: `成功 (${response.status})`,
                  data: data.data 
                }
              : test
          ));
        } else {
          setTests(prev => prev.map(test => 
            test.name === testCase.name 
              ? { 
                  ...test, 
                  status: 'error', 
                  message: `失败 (${response.status}): ${data.error?.message || '未知错误'}` 
                }
              : test
          ));
        }
      } catch (error) {
        setTests(prev => prev.map(test => 
          test.name === testCase.name 
            ? { 
                ...test, 
                status: 'error', 
                message: `请求失败: ${error instanceof Error ? error.message : '未知错误'}` 
              }
            : test
        ));
      }
    }

    setLoading(false);
  };

  const testCreateCategory = async () => {
    try {
      const response = await fetch('/api/categories/simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `测试分类_${Date.now()}`,
          description: '这是一个测试分类',
          color: '#3b82f6',
          icon: '🧪'
        })
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
    runTests();
  }, []);

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <Title level={2}>分类功能测试页面</Title>
          <Text type="secondary">
            这个页面用于测试分类功能的各个组件是否正常工作
          </Text>
          
          <div style={{ marginTop: '16px' }}>
            <Space>
              <Button 
                type="primary" 
                icon={<ReloadOutlined />} 
                onClick={runTests}
                loading={loading}
              >
                重新测试
              </Button>
              <Button onClick={testCreateCategory}>
                测试创建分类
              </Button>
            </Space>
          </div>
        </Card>

        <Card title="测试结果">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {tests.map((test, index) => (
              <Card key={index} size="small">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {test.status === 'loading' && <Spin size="small" />}
                  {test.status === 'success' && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
                  {test.status === 'error' && <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
                  
                  <div style={{ flex: 1 }}>
                    <Text strong>{test.name}</Text>
                    {test.message && (
                      <div style={{ marginTop: '4px' }}>
                        <Text type={test.status === 'error' ? 'danger' : 'success'}>
                          {test.message}
                        </Text>
                      </div>
                    )}
                    {test.data && (
                      <div style={{ marginTop: '8px', fontSize: '12px' }}>
                        {Array.isArray(test.data) && (
                          <Text type="secondary">数据量: {test.data.length} 条</Text>
                        )}
                        {test.data.categoryCount !== undefined && (
                          <Text type="secondary">分类总数: {test.data.categoryCount}</Text>
                        )}
                        {test.data.databaseConnected !== undefined && (
                          <Text type="secondary">
                            数据库连接: {test.data.databaseConnected ? '✅' : '❌'}
                          </Text>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </Space>
        </Card>

        <Alert
          message="测试说明"
          description={
            <div>
              <p><strong>测试项目说明：</strong></p>
              <ul>
                <li><strong>数据库连接测试</strong>: 验证数据库连接和表结构</li>
                <li><strong>简化分类 API 测试</strong>: 测试简化版的分类获取功能</li>
                <li><strong>简化树形 API 测试</strong>: 测试简化版的分类树功能</li>
                <li><strong>完整分类 API 测试</strong>: 测试完整版的分类功能</li>
              </ul>
              <p>如果简化 API 测试通过，说明基础功能正常。如果完整 API 也通过，说明所有功能都正常。</p>
            </div>
          }
          type="info"
          showIcon
        />
      </Space>
    </div>
  );
}