'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AntdAdminLayout from '../../../components/AntdAdminLayout';
import { useErrorHandler } from '../../../hooks/useErrorHandler';
import { useToast } from '../../../components/ToastContainer';

interface ErrorLog {
  id: string;
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  userAgent?: string;
  url?: string;
  userId?: string;
  level: 'error' | 'warning' | 'info';
  resolved: boolean;
}

interface ErrorLogsResponse {
  logs: ErrorLog[];
  total: number;
  hasMore: boolean;
}

export default function ErrorLogsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { handleError } = useErrorHandler();
  const { showToast } = useToast();

  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [showResolved, setShowResolved] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const ITEMS_PER_PAGE = 20;

  // 检查管理员权限
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session?.user || session.user.role !== 'admin') {
      router.push('/');
      return;
    }
  }, [session, status, router]);

  // 获取错误日志
  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetchErrorLogs();
    }
  }, [session, selectedLevel, showResolved, currentPage]);

  const fetchErrorLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: ITEMS_PER_PAGE.toString(),
        offset: (currentPage * ITEMS_PER_PAGE).toString(),
        resolved: showResolved.toString(),
      });

      if (selectedLevel !== 'all') {
        params.append('level', selectedLevel);
      }

      const response = await fetch(`/api/errors?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch error logs');
      }

      const data: ErrorLogsResponse = await response.json();
      
      if (currentPage === 0) {
        setLogs(data.logs);
      } else {
        setLogs(prev => [...prev, ...data.logs]);
      }
      
      setHasMore(data.hasMore);
    } catch (error) {
      handleError(error as Error);
    } finally {
      setLoading(false);
    }
  };

  const markAsResolved = async (logId: string, resolved: boolean = true) => {
    try {
      const response = await fetch('/api/errors', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: logId, resolved }),
      });

      if (!response.ok) {
        throw new Error('Failed to update error log');
      }

      // 更新本地状态
      setLogs(prev => prev.map(log => 
        log.id === logId ? { ...log, resolved } : log
      ));

      showToast(
        resolved ? '错误已标记为已解决' : '错误已标记为未解决',
        'success'
      );
    } catch (error) {
      handleError(error as Error);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'info':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const loadMore = () => {
    setCurrentPage(prev => prev + 1);
  };

  const resetFilters = () => {
    setCurrentPage(0);
    setSelectedLevel('all');
    setShowResolved(false);
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (!session?.user || session.user.role !== 'admin') {
    return null;
  }

  return (
    <AntdAdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">错误日志管理</h1>
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            重置筛选
          </button>
        </div>

        {/* 筛选器 */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                错误级别
              </label>
              <select
                value={selectedLevel}
                onChange={(e) => {
                  setSelectedLevel(e.target.value);
                  setCurrentPage(0);
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">全部</option>
                <option value="error">错误</option>
                <option value="warning">警告</option>
                <option value="info">信息</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="showResolved"
                checked={showResolved}
                onChange={(e) => {
                  setShowResolved(e.target.checked);
                  setCurrentPage(0);
                }}
                className="mr-2"
              />
              <label htmlFor="showResolved" className="text-sm text-gray-700">
                显示已解决的错误
              </label>
            </div>
          </div>
        </div>

        {/* 错误日志列表 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {loading && currentPage === 0 ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">加载中...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              没有找到错误日志
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {logs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(log.level)}`}>
                          {log.level.toUpperCase()}
                        </span>
                        {log.resolved && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            已解决
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-900 mb-2 line-clamp-2">
                        {log.message}
                      </p>
                      
                      {log.url && (
                        <p className="text-xs text-gray-500 mb-1">
                          URL: {log.url}
                        </p>
                      )}
                      
                      {log.userAgent && (
                        <p className="text-xs text-gray-500 truncate">
                          User Agent: {log.userAgent}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        详情
                      </button>
                      
                      <button
                        onClick={() => markAsResolved(log.id, !log.resolved)}
                        className={`px-3 py-1 text-xs rounded transition-colors ${
                          log.resolved
                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {log.resolved ? '标记未解决' : '标记已解决'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {hasMore && (
            <div className="p-4 text-center border-t border-gray-200">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? '加载中...' : '加载更多'}
              </button>
            </div>
          )}
        </div>

        {/* 错误详情模态框 */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold">错误详情</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-4 overflow-y-auto max-h-[60vh]">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      错误消息
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">
                      {selectedLog.message}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        级别
                      </label>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(selectedLog.level)}`}>
                        {selectedLog.level.toUpperCase()}
                      </span>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        时间
                      </label>
                      <p className="text-sm text-gray-900">
                        {formatTimestamp(selectedLog.timestamp)}
                      </p>
                    </div>
                  </div>

                  {selectedLog.url && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        URL
                      </label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded break-all">
                        {selectedLog.url}
                      </p>
                    </div>
                  )}

                  {selectedLog.stack && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        堆栈跟踪
                      </label>
                      <pre className="text-xs text-gray-900 bg-gray-50 p-3 rounded overflow-x-auto whitespace-pre-wrap">
                        {selectedLog.stack}
                      </pre>
                    </div>
                  )}

                  {selectedLog.componentStack && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        组件堆栈
                      </label>
                      <pre className="text-xs text-gray-900 bg-gray-50 p-3 rounded overflow-x-auto whitespace-pre-wrap">
                        {selectedLog.componentStack}
                      </pre>
                    </div>
                  )}

                  {selectedLog.userAgent && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        用户代理
                      </label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded break-all">
                        {selectedLog.userAgent}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AntdAdminLayout>
  );
}