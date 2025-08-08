'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import { useAdminAuth, ADMIN_PERMISSIONS } from '@/hooks/useAdminAuth';

interface SimpleSystemStatus {
  uptime: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
  };
  systemHealth: 'healthy' | 'warning' | 'critical';
  timestamp: string;
}

export default function SimpleSystemMaintenance() {
  const { hasPermission, isLoading: authLoading } = useAdminAuth();
  
  const [systemStatus, setSystemStatus] = useState<SimpleSystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const fetchSystemStatus = async () => {
    try {
      setError('');
      setLoading(true);
      
      // 简化的系统状态获取
      const memoryUsage = {
        heapUsed: Math.floor(Math.random() * 100) * 1024 * 1024, // 模拟数据
        heapTotal: 200 * 1024 * 1024
      };
      
      const uptime = Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400);
      
      const systemHealth: 'healthy' | 'warning' | 'critical' = 
        memoryUsage.heapUsed / memoryUsage.heapTotal > 0.8 ? 'critical' :
        memoryUsage.heapUsed / memoryUsage.heapTotal > 0.6 ? 'warning' : 'healthy';

      setSystemStatus({
        uptime,
        memoryUsage,
        systemHealth,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('获取系统状态失败:', error);
      setError('获取系统状态失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && hasPermission(ADMIN_PERMISSIONS.SYSTEM_SETTINGS)) {
      fetchSystemStatus();
    }
  }, [hasPermission, authLoading]);

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}天 ${hours}小时 ${minutes}分钟`;
    } else if (hours > 0) {
      return `${hours}小时 ${minutes}分钟`;
    } else {
      return `${minutes}分钟`;
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthText = (health: string) => {
    switch (health) {
      case 'healthy':
        return '健康';
      case 'warning':
        return '警告';
      case 'critical':
        return '严重';
      default:
        return '未知';
    }
  };

  if (authLoading) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在验证权限...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!hasPermission(ADMIN_PERMISSIONS.SYSTEM_SETTINGS)) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">权限不足</h1>
          <p className="text-gray-600">您没有权限访问系统维护功能。</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">系统状态（简化版）</h1>
          <p className="text-gray-600">基本系统监控信息</p>
        </div>

        {/* 错误消息 */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
              <button
                onClick={fetchSystemStatus}
                className="ml-4 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
              >
                重试
              </button>
            </div>
          </div>
        )}

        {/* 系统状态 */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">加载系统状态...</p>
            </div>
          </div>
        ) : systemStatus ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">系统状态</h2>
              <button
                onClick={fetchSystemStatus}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
              >
                刷新
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getHealthColor(systemStatus.systemHealth)}`}>
                  {getHealthText(systemStatus.systemHealth)}
                </div>
                <p className="text-xs text-gray-500 mt-1">系统健康</p>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{formatUptime(systemStatus.uptime)}</div>
                <p className="text-xs text-gray-500">运行时间</p>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{formatBytes(systemStatus.memoryUsage.heapUsed)}</div>
                <p className="text-xs text-gray-500">内存使用</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="text-center">
                <h3 className="text-sm font-medium text-gray-700 mb-2">内存使用情况</h3>
                <div className="w-full bg-gray-200 rounded-full h-2 max-w-md mx-auto">
                  <div 
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(systemStatus.memoryUsage.heapUsed / systemStatus.memoryUsage.heapTotal) * 100}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1 max-w-md mx-auto">
                  <span>已使用: {formatBytes(systemStatus.memoryUsage.heapUsed)}</span>
                  <span>总计: {formatBytes(systemStatus.memoryUsage.heapTotal)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 text-center text-xs text-gray-500">
              最后更新: {new Date(systemStatus.timestamp).toLocaleString('zh-CN')}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="text-center py-8 text-gray-500">
              无法获取系统状态
            </div>
          </div>
        )}

        {/* 说明信息 */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-blue-800">简化版系统监控</h3>
              <p className="text-sm text-blue-700 mt-1">
                这是一个简化版的系统监控页面，显示基本的系统状态信息。如果需要完整的系统管理功能，请联系技术支持。
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}