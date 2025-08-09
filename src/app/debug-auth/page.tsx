'use client';

import { useState, useEffect } from 'react';
import { Card, Button, message } from 'antd';

export default function DebugAuthPage() {
  const [authInfo, setAuthInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkAuth = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/check-session', {
        credentials: 'include'
      });
      const data = await response.json();
      setAuthInfo(data);
      console.log('Auth info:', data);
    } catch (error) {
      console.error('Auth check failed:', error);
      message.error('认证检查失败');
    } finally {
      setLoading(false);
    }
  };

  const testUploadAPI = async () => {
    try {
      const response = await fetch('/api/admin/simple-upload', {
        method: 'GET', // 只是测试API是否可访问
        credentials: 'include'
      });
      const data = await response.text();
      console.log('Upload API test:', response.status, data);
      message.info(`API响应: ${response.status} - ${data}`);
    } catch (error) {
      console.error('Upload API test failed:', error);
      message.error('API测试失败');
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <Card title="认证调试信息" className="mb-4">
        <div className="space-y-4">
          <Button onClick={checkAuth} loading={loading}>
            刷新认证状态
          </Button>
          
          <Button onClick={testUploadAPI}>
            测试上传API
          </Button>
          
          <div className="bg-gray-100 p-4 rounded">
            <h3 className="font-bold mb-2">当前认证信息:</h3>
            <pre className="text-sm">
              {authInfo ? JSON.stringify(authInfo, null, 2) : '加载中...'}
            </pre>
          </div>
          
          <div className="bg-blue-50 p-4 rounded">
            <h3 className="font-bold mb-2">说明:</h3>
            <ul className="text-sm space-y-1">
              <li>• 如果user为null，说明未登录</li>
              <li>• 如果user.role不是'admin'，说明没有管理员权限</li>
              <li>• 检查浏览器控制台的详细日志</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}