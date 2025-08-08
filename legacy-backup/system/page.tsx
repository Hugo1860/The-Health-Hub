'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import SystemErrorBoundary from '../../../components/SystemErrorBoundary';
import { useSecureFetch } from '@/hooks/useCSRFToken';
import { useAdminAuth, ADMIN_PERMISSIONS } from '@/hooks/useAdminAuth';

interface SystemStatus {
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  diskSpace: {
    total: number;
    used: number;
    free: number;
  };
  lastBackup?: string;
  errorCount: number;
  activeUsers: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

interface BackupInfo {
  id: string;
  timestamp: string;
  type: 'full' | 'data' | 'config';
  size: number;
  files: string[];
  description?: string;
}

export default function SystemMaintenance() {
  const { hasPermission, isLoading: authLoading } = useAdminAuth();
  const { secureFetch, csrfToken, csrfLoading } = useSecureFetch();
  
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // 添加防护，确保认证完成且有权限后才执行
    if (!authLoading && hasPermission(ADMIN_PERMISSIONS.SYSTEM_SETTINGS)) {
      const initializeData = async () => {
        try {
          await Promise.all([
            fetchSystemStatus(),
            fetchBackups()
          ]);
          setRetryCount(0); // 成功后重置重试计数
        } catch (error) {
          console.error('Failed to initialize system data:', error);
          setError('初始化系统数据失败，请刷新页面重试');
        }
      };
      
      initializeData();
    }
  }, [hasPermission, authLoading]);

  // 添加定期刷新系统状态（但不刷新备份列表）
  useEffect(() => {
    if (!authLoading && hasPermission(ADMIN_PERMISSIONS.SYSTEM_SETTINGS) && !error && systemStatus) {
      const interval = setInterval(() => {
        fetchSystemStatus().catch(error => {
          console.error('Auto refresh system status failed:', error);
          // 不设置错误状态，避免干扰用户操作
        });
      }, 60000); // 每60秒刷新一次系统状态（降低频率）

      return () => clearInterval(interval);
    }
  }, [hasPermission, authLoading, error, systemStatus]);

  const fetchSystemStatus = async () => {
    try {
      setError(''); // 清除之前的错误
      const response = await fetch('/api/admin/system/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setSystemStatus(data.status);
      } else if (response.status === 403) {
        setError('权限不足，无法获取系统状态');
      } else if (response.status === 401) {
        setError('认证失败，请重新登录');
        // 可以考虑重定向到登录页面
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error?.message || `获取系统状态失败 (${response.status})`);
      }
    } catch (error) {
      console.error('获取系统状态失败:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setError('网络连接失败，请检查网络连接');
      } else {
        setError('获取系统状态时发生未知错误，请重试');
      }
    }
  };

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/system/backup', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setBackups(Array.isArray(data.backups) ? data.backups : []);
      } else if (response.status === 403) {
        setError('权限不足，无法获取备份列表');
      } else if (response.status === 401) {
        setError('认证失败，请重新登录');
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error?.message || `获取备份列表失败 (${response.status})`);
      }
    } catch (error) {
      console.error('获取备份列表失败:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setError('网络连接失败，请检查网络连接');
      } else {
        setError('获取备份列表时发生未知错误，请重试');
      }
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async (type: 'full' | 'data', description?: string) => {
    if (!csrfToken) {
      setError('安全验证失败，请刷新页面');
      return;
    }

    try {
      setActionLoading(`create-${type}`);
      setError('');
      setSuccess('');

      const response = await secureFetch('/api/admin/system/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, description }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(data.message);
        fetchBackups();
        fetchSystemStatus();
        setTimeout(() => setSuccess(''), 5000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error?.message || '创建备份失败');
      }
    } catch (error) {
      console.error('创建备份失败:', error);
      setError('网络错误，请重试');
    } finally {
      setActionLoading('');
    }
  };

  const deleteBackup = async (backupId: string) => {
    if (!csrfToken) {
      setError('安全验证失败，请刷新页面');
      return;
    }

    try {
      setActionLoading(`delete-${backupId}`);
      setError('');
      setSuccess('');

      const response = await secureFetch('/api/admin/system/backup', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ backupId }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(data.message);
        fetchBackups();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error?.message || '删除备份失败');
      }
    } catch (error) {
      console.error('删除备份失败:', error);
      setError('网络错误，请重试');
    } finally {
      setActionLoading('');
    }
  };

  const verifyBackup = async (backupId: string) => {
    if (!csrfToken) {
      setError('安全验证失败，请刷新页面');
      return;
    }

    try {
      setActionLoading(`verify-${backupId}`);
      setError('');
      setSuccess('');

      const response = await secureFetch('/api/admin/system/backup/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ backupId }),
      });

      if (response.ok) {
        const data = await response.json();
        const verification = data.verification;
        
        if (verification.isValid) {
          setSuccess('备份验证通过，文件完整');
        } else {
          setError(`备份验证失败: ${verification.errors.join(', ')}`);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error?.message || '验证备份失败');
      }
    } catch (error) {
      console.error('验证备份失败:', error);
      setError('网络错误，请重试');
    } finally {
      setActionLoading('');
    }
  };

  const cleanupBackups = async () => {
    if (!csrfToken) {
      setError('安全验证失败，请刷新页面');
      return;
    }

    try {
      setActionLoading('cleanup');
      setError('');
      setSuccess('');

      const response = await secureFetch('/api/admin/system/backup/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keepCount: 10 }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(data.message);
        fetchBackups();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error?.message || '清理备份失败');
      }
    } catch (error) {
      console.error('清理备份失败:', error);
      setError('网络错误，请重试');
    } finally {
      setActionLoading('');
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

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

  // 如果认证还在加载中，显示加载状态
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
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            刷新页面
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <SystemErrorBoundary>
      <AdminLayout>
        <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">系统维护</h1>
          <p className="text-gray-600">监控系统状态和管理数据备份</p>
        </div>

        {/* 错误和成功消息 */}
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
                onClick={async () => {
                  if (retryCount >= 3) {
                    setError('重试次数过多，请刷新页面');
                    return;
                  }
                  
                  setError('');
                  setRetryCount(prev => prev + 1);
                  
                  try {
                    await Promise.all([
                      fetchSystemStatus(),
                      fetchBackups()
                    ]);
                    setRetryCount(0);
                  } catch (error) {
                    console.error('Retry failed:', error);
                    setError('重试失败，请检查网络连接');
                  }
                }}
                disabled={retryCount >= 3}
                className="ml-4 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                重试 {retryCount > 0 && `(${retryCount}/3)`}
              </button>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {success}
            </div>
          </div>
        )}

        {/* 系统状态 */}
        {systemStatus && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">系统状态</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{systemStatus.errorCount}</div>
                <p className="text-xs text-gray-500">错误数量</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">磁盘使用情况</h3>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(systemStatus.diskSpace.used / systemStatus.diskSpace.total) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>已使用: {formatBytes(systemStatus.diskSpace.used)}</span>
                    <span>总计: {formatBytes(systemStatus.diskSpace.total)}</span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">最后备份</h3>
                  <p className="text-sm text-gray-900">
                    {systemStatus.lastBackup 
                      ? new Date(systemStatus.lastBackup).toLocaleString('zh-CN')
                      : '暂无备份'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 备份管理 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">备份管理</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => createBackup('data')}
                disabled={actionLoading === 'create-data' || csrfLoading || !csrfToken}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {actionLoading === 'create-data' ? '创建中...' : '数据备份'}
              </button>
              <button
                onClick={() => createBackup('full')}
                disabled={actionLoading === 'create-full' || csrfLoading || !csrfToken}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {actionLoading === 'create-full' ? '创建中...' : '完整备份'}
              </button>
              <button
                onClick={cleanupBackups}
                disabled={actionLoading === 'cleanup' || csrfLoading || !csrfToken}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {actionLoading === 'cleanup' ? '清理中...' : '清理旧备份'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">加载备份列表...</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无备份记录
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">备份ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">大小</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">描述</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {backups.map((backup) => (
                    <tr key={backup.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm font-mono text-gray-900">
                        {backup.id.substring(0, 16)}...
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          backup.type === 'full' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {backup.type === 'full' ? '完整备份' : '数据备份'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {formatBytes(backup.size)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {new Date(backup.timestamp).toLocaleString('zh-CN')}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {backup.description || '-'}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => verifyBackup(backup.id)}
                            disabled={actionLoading === `verify-${backup.id}`}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {actionLoading === `verify-${backup.id}` ? '验证中...' : '验证'}
                          </button>
                          <button
                            onClick={() => deleteBackup(backup.id)}
                            disabled={actionLoading === `delete-${backup.id}`}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {actionLoading === `delete-${backup.id}` ? '删除中...' : '删除'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </div>
      </AdminLayout>
    </SystemErrorBoundary>
  );
}