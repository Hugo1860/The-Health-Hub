import React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface AdminAuthHook {
  isAdmin: boolean;
  isLoading: boolean;
  user: any;
  hasPermission: (permission: string) => boolean;
  checkAdminAccess: () => boolean;
}

export const useAdminAuth = (redirectOnFail: boolean = false): AdminAuthHook => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  const user = session?.user as any;
  
  // 使用session中的用户信息来判断是否为管理员
  const isAdmin = user?.role === 'admin' && (user?.status === 'active' || !user?.status);
  
  // 添加错误处理
  useEffect(() => {
    try {
      if (status === 'authenticated' && user) {
        console.log('useAdminAuth - User info:', {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
          isAdmin,
          redirectOnFail
        });
      }
    } catch (error) {
      console.error('useAdminAuth error:', error);
    }
  }, [user, isAdmin, status, redirectOnFail]);
  


  useEffect(() => {
    try {
      if (status === 'loading') {
        return;
      }

      setIsLoading(false);

      // 只在明确要求重定向时才执行重定向逻辑
      if (redirectOnFail && !isAdmin) {
        console.log('Redirecting due to admin auth failure:', { status, isAdmin, user: user?.role });
        if (status === 'unauthenticated') {
          router.push('/auth/signin?callbackUrl=' + encodeURIComponent(window.location.pathname));
        } else if (user && user.role !== 'admin') {
          router.push('/');
        }
      }
    } catch (error) {
      console.error('useAdminAuth useEffect error:', error);
      setIsLoading(false);
    }
  }, [status, isAdmin, redirectOnFail, router, user]);

  const hasPermission = (permission: string): boolean => {
    if (!isAdmin) {
      return false;
    }

    // 这里可以实现更细粒度的权限控制
    // 目前所有管理员都有所有权限
    return true;
  };

  const checkAdminAccess = (): boolean => {
    return isAdmin;
  };

  return {
    isAdmin,
    isLoading: status === 'loading' || isLoading,
    user,
    hasPermission,
    checkAdminAccess,
  };
};

// 管理员权限常量
export const ADMIN_PERMISSIONS = {
  // 用户管理
  VIEW_USERS: 'view_users',
  CREATE_USER: 'create_user',
  UPDATE_USER: 'update_user',
  DELETE_USER: 'delete_user',
  MANAGE_ROLES: 'manage_roles',

  // 内容管理
  UPLOAD_AUDIO: 'upload_audio',
  EDIT_AUDIO: 'edit_audio',
  DELETE_AUDIO: 'delete_audio',
  MANAGE_CATEGORIES: 'manage_categories',

  // 系统管理
  VIEW_LOGS: 'view_logs',
  SYSTEM_SETTINGS: 'system_settings',
  BACKUP_DATA: 'backup_data',
  MAINTENANCE_MODE: 'maintenance_mode',

  // 分析和报告
  VIEW_ANALYTICS: 'view_analytics',
  EXPORT_DATA: 'export_data',
  USER_REPORTS: 'user_reports',
};

// 管理员组件包装器
export function withAdminAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermission?: string
) {
  return function AdminProtectedComponent(props: P) {
    const { isAdmin, isLoading, hasPermission } = useAdminAuth();

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!isAdmin) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">访问被拒绝</h1>
            <p className="text-gray-600">您没有权限访问此页面。</p>
          </div>
        </div>
      );
    }

    if (requiredPermission && !hasPermission(requiredPermission)) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">权限不足</h1>
            <p className="text-gray-600">您没有执行此操作的权限。</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

// 管理员路由保护hook
export const useAdminRoute = (requiredPermission?: string) => {
  const { isAdmin, isLoading, hasPermission } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAdmin) {
      router.push('/');
      return;
    }

    if (requiredPermission && !hasPermission(requiredPermission)) {
      router.push('/admin');
      return;
    }
  }, [isAdmin, isLoading, hasPermission, requiredPermission, router]);

  return {
    isAuthorized: isAdmin && (!requiredPermission || hasPermission(requiredPermission)),
    isLoading,
  };
};