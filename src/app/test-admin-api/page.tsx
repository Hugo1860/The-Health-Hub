'use client';

import React, { useState } from 'react';
import { Card, Button, Space, Typography, Alert, Spin } from 'antd';
import { useSession } from 'next-auth/react';

const { Title, Text, Paragraph } = Typography;

export default function TestAdminApiPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const testApi = async (endpoint: string, name: string) => {
    setLoading(true);
    try {
      console.log(`Testing ${name}: ${endpoint}`);
      const response = await fetch(endpoint, {
        credentials: 'include'
      });
      
      const data = await response.json();
      
      setResults(prev => [...prev, {
        name,
        endpoint,
        status: response.status,
        success: response.ok,
        data,
        timestamp: new Date().toISOString()
      }]);
      
    } catch (error) {
      setResults(prev => [...prev, {
        name,
        endpoint,
        status: 'ERROR',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const testUploadApi = async () => {
    setLoading(true);
    try {
      // 创建一个测试用的FormData
      const formData = new FormData();
      formData.append('title', '测试音频标题');
      formData.append('description', '这是一个测试音频');
      formData.append('subject', '测试分类');
      formData.append('tags', JSON.stringify(['测试', '音频']));
      formData.append('speaker', '测试演讲者');
      
      // 创建一个空的音频文件用于测试
      const blob = new Blob(['test audio content'], { type: 'audio/mpeg' });
      const file = new File([blob], 'test-audio.mp3', { type: 'audio/mpeg' });
      formData.append('audio', file);

      console.log('Testing upload API with FormData');
      const response = await fetch('/api/admin/simple-upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      const data = await response.json();
      
      setResults(prev => [...prev, {
        name: '音频上传API测试',
        endpoint: '/api/admin/simple-upload',
        status: response.status,
        success: response.ok,
        data,
        timestamp: new Date().toISOString()
      }]);
      
    } catch (error) {
      setResults(prev => [...prev, {
        name: '音频上传API测试',
        endpoint: '/api/admin/simple-upload',
        status: 'ERROR',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Title level={2}>管理员API测试</Title>
      <Paragraph>
        这个页面用于测试管理员相关的API端点，帮助诊断后台管理页面的问题。
      </Paragraph>

      <Card className="mb-6">
        <Title level={4}>当前登录状态</Title>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>会话状态: </Text>
            <Text>{status}</Text>
          </div>
          {session?.user && (
            <>
              <div>
                <Text strong>用户邮箱: </Text>
                <Text>{session.user.email}</Text>
              </div>
              <div>
                <Text strong>用户角色: </Text>
                <Text>{(session.user as any)?.role || '未知'}</Text>
              </div>
              <div>
                <Text strong>用户状态: </Text>
                <Text>{(session.user as any)?.status || '未知'}</Text>
              </div>
            </>
          )}
          {!session && status === 'unauthenticated' && (
            <Alert 
              message="未登录" 
              description={
                <div>
                  请先登录后再测试管理员API。
                  <Button 
                    type="link" 
                    onClick={() => window.location.href = '/auth/signin'}
                    style={{ padding: 0, marginLeft: 8 }}
                  >
                    点击登录
                  </Button>
                </div>
              }
              type="warning" 
              showIcon 
            />
          )}
        </Space>
      </Card>

      <Card className="mb-6">
        <Title level={4}>测试操作</Title>
        <Space wrap>
          <Button 
            type="primary" 
            onClick={() => testApi('/api/test-admin', '管理员权限测试')}
            loading={loading}
          >
            测试管理员权限
          </Button>
          <Button 
            onClick={() => testApi('/api/admin/audio', '管理员音频API')}
            loading={loading}
          >
            测试音频API
          </Button>
          <Button 
            onClick={() => testApi('/api/admin/simple-audio', '简化音频API')}
            loading={loading}
          >
            测试简化音频API
          </Button>
          <Button 
            onClick={() => testApi('/api/check-session', '检查会话')}
            loading={loading}
          >
            检查会话状态
          </Button>
          <Button 
            onClick={() => testApi('/api/admin/simple-audio/1753770623178', '测试音频详情')}
            loading={loading}
          >
            测试音频详情API
          </Button>
          <Button 
            onClick={() => testApi('/api/admin/categories', '管理员分类API')}
            loading={loading}
          >
            测试分类API
          </Button>
          <Button 
            onClick={() => testApi('/api/admin/simple-categories', '简化分类API')}
            loading={loading}
          >
            测试简化分类API
          </Button>
          <Button 
            onClick={() => testApi('/api/audio', '公共音频API')}
            loading={loading}
          >
            测试公共音频API
          </Button>
          <Button 
            onClick={() => testUploadApi()}
            loading={loading}
          >
            测试音频上传API
          </Button>
          <Button 
            onClick={clearResults}
            disabled={results.length === 0}
          >
            清空结果
          </Button>
        </Space>
      </Card>

      {loading && (
        <Card className="mb-4">
          <div className="text-center">
            <Spin size="large" />
            <div className="mt-2">正在测试API...</div>
          </div>
        </Card>
      )}

      {results.map((result, index) => (
        <Card key={index} className="mb-4">
          <div className="flex justify-between items-start mb-3">
            <Title level={5}>{result.name}</Title>
            <Space>
              <Text type="secondary">{result.timestamp}</Text>
              {result.success ? (
                <Alert message={`${result.status} 成功`} type="success" showIcon />
              ) : (
                <Alert message={`${result.status} 失败`} type="error" showIcon />
              )}
            </Space>
          </div>
          
          <div className="mb-3">
            <Text strong>端点: </Text>
            <Text code>{result.endpoint}</Text>
          </div>

          {result.error ? (
            <Alert 
              message="错误信息" 
              description={result.error} 
              type="error" 
              showIcon 
            />
          ) : (
            <div>
              <Text strong>响应数据:</Text>
              <pre className="bg-gray-50 p-3 rounded mt-2 overflow-auto text-sm">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          )}
        </Card>
      ))}

      {results.length === 0 && (
        <Card>
          <div className="text-center text-gray-500">
            点击上方按钮开始测试API
          </div>
        </Card>
      )}
    </div>
  );
}