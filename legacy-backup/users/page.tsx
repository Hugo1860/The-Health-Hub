'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import { CardSkeleton } from '../../../components/SkeletonLoader';
import { useSecureFetch } from '@/hooks/useCSRFToken';
import { useSession } from 'next-auth/react';

interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
  lastLogin?: string;
  status: 'active' | 'inactive' | 'banned';
}

export default function UsersManagement() {
  const { data: session } = useSession();
  const { secureFetch, csrfToken, csrfLoading, csrfError } = useSecureFetch();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [actionLoading, setActionLoading] = useState<string>('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async (page: number = 1, resetUsers: boolean = true) => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      });
      
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('status', statusFilter);
      
      const response = await fetch(`/api/admin/users?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        if (resetUsers) {
          setUsers(data.users);
        } else {
          setUsers(prev => [...prev, ...data.users]);
        }
        setPagination({
          page: data.page,
          limit: data.limit,
          total: data.total,
          totalPages: data.totalPages,
          hasNextPage: data.hasNextPage,
          hasPrevPage: data.hasPrevPage,
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error?.message || '获取用户列表失败');
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!searchTerm.trim() || searchTerm.trim().length < 2) {
      setError('搜索关键词至少需要2个字符');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams({
        q: searchTerm.trim(),
        limit: '50',
      });
      
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('status', statusFilter);
      
      const response = await fetch(`/api/admin/users/search?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setPagination(prev => ({
          ...prev,
          total: data.total,
          hasNextPage: data.hasMore,
        }));
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error?.message || '搜索用户失败');
      }
    } catch (error) {
      console.error('搜索用户失败:', error);
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: User['status']) => {
    if (!csrfToken) {
      setError('安全验证失败，请刷新页面');
      return;
    }
    
    try {
      setActionLoading(`status-${userId}`);
      setError('');
      setSuccess('');
      
      const response = await secureFetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(users.map(user => 
          user.id === userId ? data.user : user
        ));
        setSuccess('用户状态更新成功');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error?.message || '更新用户状态失败');
      }
    } catch (error) {
      console.error('更新用户状态失败:', error);
      setError('网络错误，请重试');
    } finally {
      setActionLoading('');
    }
  };

  const handleRoleChange = async (userId: string, newRole: User['role']) => {
    if (!csrfToken) {
      setError('安全验证失败，请刷新页面');
      return;
    }
    
    // 防止用户修改自己的角色
    if (session?.user?.id === userId) {
      setError('不能修改自己的角色');
      return;
    }
    
    try {
      setActionLoading(`role-${userId}`);
      setError('');
      setSuccess('');
      
      const response = await secureFetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(users.map(user => 
          user.id === userId ? data.user : user
        ));
        setSuccess('用户角色更新成功');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error?.message || '更新用户角色失败');
      }
    } catch (error) {
      console.error('更新用户角色失败:', error);
      setError('网络错误，请重试');
    } finally {
      setActionLoading('');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!csrfToken) {
      setError('安全验证失败，请刷新页面');
      return;
    }
    
    // 防止用户删除自己
    if (session?.user?.id === userId) {
      setError('不能删除自己的账户');
      return;
    }
    
    try {
      setActionLoading(`delete-${userId}`);
      setError('');
      setSuccess('');
      
      const response = await secureFetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(users.filter(user => user.id !== userId));
        setDeleteConfirm(null);
        setSuccess(`用户 ${data.deletedUser?.username || ''} 删除成功`);
        setTimeout(() => setSuccess(''), 3000);
        
        // 更新分页信息
        setPagination(prev => ({
          ...prev,
          total: prev.total - 1,
        }));
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error?.message || '删除用户失败');
      }
    } catch (error) {
      console.error('删除用户失败:', error);
      setError('网络错误，请重试');
    } finally {
      setActionLoading('');
      setDeleteConfirm(null);
    }
  };

  // 当使用搜索时，不需要客户端过滤
  const displayUsers = searchTerm.trim() ? users : users.filter(user => {
    const matchesRole = !roleFilter || user.role === roleFilter;
    const matchesStatus = !statusFilter || user.status === statusFilter;
    return matchesRole && matchesStatus;
  });

  const handleSearch = () => {
    if (searchTerm.trim()) {
      searchUsers();
    } else {
      fetchUsers(1, true);
    }
  };

  const handleFilterChange = () => {
    if (searchTerm.trim()) {
      searchUsers();
    } else {
      fetchUsers(1, true);
    }
  };

  const loadMoreUsers = () => {
    if (pagination.hasNextPage && !loading) {
      fetchUsers(pagination.page + 1, false);
    }
  };

  const getStatusColor = (status: User['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-yellow-100 text-yellow-800';
      case 'banned':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: User['role']) => {
    return role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800';
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">用户管理</h1>
          <p className="text-gray-600">管理平台用户和权限</p>
        </div>

        {/* 错误和成功消息 */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
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

        {csrfError && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              安全验证失败: {csrfError}
            </div>
          </div>
        )}

        {/* 统计卡片 - 现代化设计 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 mb-1">总用户数</p>
                <p className="text-3xl font-bold text-blue-900">{pagination.total || users.length}</p>
                <p className="text-xs text-blue-500 mt-1">
                  {users.filter(u => u.status === 'active').length} 活跃用户
                </p>
              </div>
              <div className="w-14 h-14 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 mb-1">活跃用户</p>
                <p className="text-3xl font-bold text-green-900">
                  {users.filter(u => u.status === 'active').length}
                </p>
                <p className="text-xs text-green-500 mt-1">
                  {Math.round((users.filter(u => u.status === 'active').length / Math.max(users.length, 1)) * 100)}% 活跃率
                </p>
              </div>
              <div className="w-14 h-14 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 mb-1">管理员</p>
                <p className="text-3xl font-bold text-purple-900">
                  {users.filter(u => u.role === 'admin').length}
                </p>
                <p className="text-xs text-purple-500 mt-1">
                  {users.filter(u => u.role === 'user').length} 普通用户
                </p>
              </div>
              <div className="w-14 h-14 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 mb-1">已封禁</p>
                <p className="text-3xl font-bold text-orange-900">
                  {users.filter(u => u.status === 'banned').length}
                </p>
                <p className="text-xs text-orange-500 mt-1">
                  {users.filter(u => u.status === 'inactive').length} 未激活
                </p>
              </div>
              <div className="w-14 h-14 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* 筛选器 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">搜索用户</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="搜索用户名或邮箱..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSearch}
                  disabled={loading || !searchTerm.trim() || searchTerm.trim().length < 2}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  搜索
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">角色筛选</label>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setTimeout(handleFilterChange, 100);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">所有角色</option>
                <option value="user">普通用户</option>
                <option value="admin">管理员</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">状态筛选</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setTimeout(handleFilterChange, 100);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">所有状态</option>
                <option value="active">活跃</option>
                <option value="inactive">非活跃</option>
                <option value="banned">已封禁</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setRoleFilter('');
                  setStatusFilter('');
                  setError('');
                  setSuccess('');
                  fetchUsers(1, true);
                }}
                disabled={loading}
                className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                重置筛选
              </button>
            </div>
          </div>
        </div>

        {/* 用户列表 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {loading ? (
            <div className="p-6">
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="animate-pulse flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                    </div>
                    <div className="w-20 h-6 bg-gray-200 rounded"></div>
                    <div className="w-16 h-6 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : displayUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {searchTerm || roleFilter || statusFilter ? '未找到匹配的用户' : '暂无用户'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      用户
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      角色
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      注册时间
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      最后登录
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {displayUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-sm">
                              {user.username.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.username}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as User['role'])}
                          disabled={actionLoading === `role-${user.id}` || csrfLoading || !csrfToken || session?.user?.id === user.id}
                          className={`text-xs px-2 py-1 rounded-full border-0 ${getRoleColor(user.role)} ${
                            actionLoading === `role-${user.id}` ? 'opacity-50 cursor-not-allowed' : ''
                          } ${session?.user?.id === user.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <option value="user">普通用户</option>
                          <option value="admin">管理员</option>
                        </select>
                        {actionLoading === `role-${user.id}` && (
                          <div className="inline-block ml-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={user.status}
                          onChange={(e) => handleStatusChange(user.id, e.target.value as User['status'])}
                          disabled={actionLoading === `status-${user.id}` || csrfLoading || !csrfToken}
                          className={`text-xs px-2 py-1 rounded-full border-0 ${getStatusColor(user.status)} ${
                            actionLoading === `status-${user.id}` ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <option value="active">活跃</option>
                          <option value="inactive">非活跃</option>
                          <option value="banned">已封禁</option>
                        </select>
                        {actionLoading === `status-${user.id}` && (
                          <div className="inline-block ml-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('zh-CN') : '从未登录'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button 
                          className="text-blue-600 hover:text-blue-900 mr-3 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={actionLoading.includes(user.id)}
                        >
                          编辑
                        </button>
                        {deleteConfirm === user.id ? (
                          <div className="inline-flex space-x-2">
                            <button 
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={actionLoading === `delete-${user.id}` || csrfLoading || !csrfToken}
                              className="text-red-600 hover:text-red-900 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading === `delete-${user.id}` ? '删除中...' : '确认删除'}
                            </button>
                            <button 
                              onClick={() => setDeleteConfirm(null)}
                              disabled={actionLoading === `delete-${user.id}`}
                              className="text-gray-600 hover:text-gray-900 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setDeleteConfirm(user.id)}
                            disabled={actionLoading.includes(user.id) || session?.user?.id === user.id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={session?.user?.id === user.id ? '不能删除自己的账户' : ''}
                          >
                            删除
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* 分页信息和加载更多 */}
          {!loading && displayUsers.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  显示 {displayUsers.length} 个用户
                  {pagination.total > 0 && ` / 共 ${pagination.total} 个`}
                  {searchTerm && ` (搜索: "${searchTerm}")`}
                </div>
                
                {pagination.hasNextPage && !searchTerm && (
                  <button
                    onClick={loadMoreUsers}
                    disabled={loading}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? '加载中...' : '加载更多'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* 页面底部状态信息 */}
        {csrfLoading && (
          <div className="mt-4 text-center text-sm text-gray-500">
            正在进行安全验证...
          </div>
        )}
      </div>
    </AdminLayout>
  );
}