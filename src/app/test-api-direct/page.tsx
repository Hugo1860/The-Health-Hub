'use client';

import React, { useState } from 'react';
import { Card, Button, Typography, Alert, Space, Table } from 'antd';
import { DatabaseOutlined, UserOutlined, SoundOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function TestApiDirectPage() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const testAPI = async (name: string, url: string) => {
    try {
      console.log(`Testing ${name}: ${url}`);
      const response = await fetch(url, {
        credentials: 'include'
      });
      
      const data = await response.json();
      console.log(`${name} response:`, data);
      
      setResults(prev => ({
        ...prev,
        [name]: {
          status: response.ok ? 'success' : 'error',
          data: data,
          statusCode: response.status
        }
      }));
    } catch (error) {
      console.error(`${name} error:`, error);
      setResults(prev => ({
        ...prev,
        [name]: {
          status: 'error',
          error: error.message,
          statusCode: 0
        }
      }));
    }
  };

  const runTests = async () => {
    setLoading(true);
    setResults({});
    
    await Promise.all([
      testAPI('用户管理API', '/api/admin/users-simple'),
      testAPI('音频管理API', '/api/admin/simple-audio'),
      testAPI('数据库健康检查', '/api/health/database')
    ]);
    
    setLoading(false);
  };

  const renderResult = (name: string) => {
    const result = results[name];
    if (!result) return <Text type="secondary">等待测试...</Text>;
    
    if (result.status === 'success') {
      return (
        <div>
          <Text type="success">✅ 成功 (状态码: {result.statusCode})</Text>
          {result.data?.data && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                数据条数: {Array.isArray(result.data.data) ? result.data.data.length : '未知'}
              </Text>
            </div>
          )}
          {result.data?.audios && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                音频条数: {Array.isArray(result.data.audios) ? result.data.audios.length : '未知'}
              </Text>
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div>
          <Text type="danger">❌ 失败 (状态码: {result.statusCode})</Text>
          <div style={{ marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {result.data?.error?.message || result.error || '未知错误'}
            </Text>
          </div>
        </div>
      );
    }
  };

  const renderDataTable = (name: string) => {
    const result = results[name];
    if (!result || result.status !== 'success') return null;
    
    let dataArray = [];
    if (result.data?.data && Array.isArray(result.data.data)) {
      dataArray = result.data.data.slice(0, 3); // 只显示前3条
    } else if (result.data?.audios && Array.isArray(result.data.audios)) {
      dataArray = result.data.audios.slice(0, 3); // 只显示前3条
    }
    
    if (dataArray.length === 0) return null;
    
    // 动态生成列
    const sampleItem = dataArray[0];
    const columns = Object.keys(sampleItem).slice(0, 4).map(key => ({
      title: key,
      dataIndex: key,
      key: key,
      render: (value: any) => {
        if (typeof value === 'string' && value.length > 30) {
          return value.substring(0, 30) + '...';
        }
        return String(value || '-');
      }
    }));
    
    return (
      <div style={{ marginTop: 12 }}>
        <Text strong>数据预览 (前3条):</Text>
        <Table 
          columns={columns}
          dataSource={dataArray}
          size="small"
          pagination={false}
          rowKey="id"
          style={{ marginTop: 8 }}
        />
      </div>
    );
  };

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <Card>
        <Title level={2}>
          <DatabaseOutlined /> API直接测试
        </Title>
        
        <Alert
          message="测试说明"
          description="此页面直接测试管理员API端点，无需登录验证，用于快速诊断API连通性。"
          type="info"
          style={{ marginBottom: 24 }}
        />

        <div style={{ marginBottom: 24 }}>
          <Button 
            type="primary" 
            onClick={runTests} 
            loading={loading}
            disabled={loading}
          >
            开始测试
          </Button>
        </div>

        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Card title={<><UserOutlined /> 用户管理API</>} size="small">
            {renderResult('用户管理API')}
            {renderDataTable('用户管理API')}
          </Card>

          <Card title={<><SoundOutlined /> 音频管理API</>} size="small">
            {renderResult('音频管理API')}
            {renderDataTable('音频管理API')}
          </Card>

          <Card title={<><DatabaseOutlined /> 数据库健康检查</>} size="small">
            {renderResult('数据库健康检查')}
          </Card>
        </Space>

        <Alert
          message="测试结果说明"
          description={
            <div>
              <p>• ✅ 成功：API正常响应，可以获取数据</p>
              <p>• ❌ 失败：API无法访问或返回错误</p>
              <p>• 如果用户/音频API显示"权限不足"，这是正常的，说明API端点存在且工作正常</p>
            </div>
          }
          type="info"
          style={{ marginTop: 24 }}
        />
      </Card>
    </div>
  );
}