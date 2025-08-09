'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// 权限常量定义
export const ANTD_ADMIN_PERMISSIONS = {
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

  // 资源管理
  MANAGE_RESOURCES: 'manage_resources',
} as const;

// 权限类型
export type PermissionKey = keyof typeof ANTD_ADMIN_PERMISSIONS;
export type PermissionValue = typeof ANTD_ADMIN_PERMISSIONS[PermissionKey];

// 用户角色权限映射
export const ROLE_PERMISSIONS: Record<string, PermissionValue[]> = {
  admin: Object.values(ANTD_ADMIN_PERMISSIONS), // 管理员拥有所有权限
  moderator: [
    ANTD_ADMIN_PERMISSIONS.VIEW_USERS,
    ANTD_ADMIN_PERMISSIONS.UPLOAD_AUDIO,
    ANTD_ADMIN_PERMISSIONS.EDIT_AUDIO,
    ANTD_ADMIN_PERMISSIONS.MANAGE_CATEGORIES,
    ANTD_ADMIN_PERMISSIONS.VIEW_ANALYTICS,
  ], // 版主权限
  editor: [
    ANTD_ADMIN_PERMISSIONS.UPLOAD_AUDIO,
    ANTD_ADMIN_PERMISSIONS.EDIT_AUDIO,
    ANTD_ADMIN_PERMISSIONS.MANAGE_CATEGORIES,
  ], // 编辑权限
};

// Hook 接口定义
interface AntdAdminAuthHook {
  isAdmin: boolean;
  isLoading: boolean;
  user: any;
  userRole: string | null;
  hasPermission: (permission: PermissionValue) => boolean;
  hasAnyPermission: (permissions: PermissionValue[]) => boolean;
  hasAllPermissions: (permissions: PermissionValue[]) => boolean;
  checkAdminAccess: () => boolean;
  getUserPermissions: () => PermissionValue[];
}

// 主要的权限管理 Hook
export const useAntdAdminAuth = (redirectOnFail: boolean = false): AntdAdminAuthHook => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // 安全地获取用户信息
  const user = useMemo(() => {
    try {
      return session?.user as any;
    } catch (error) {
      console.error('Error accessing session user:', error);
      return null;
    }
  }, [session]);

  // 获取用户角色
  const userRole = useMemo(() => {
    return user?.role || null;
  }, [user]);

  // 判断是否为管理员（拥有管理后台访问权限）
  const isAdmin = useMemo(() => {
    try {
      return user?.role && ['admin', 'moderator', 'editor'].includes(user.role) && 
             (user?.status === 'active' || !user?.status);
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }, [user]);

  // 获取用户权限列表
  const getUserPermissions = useCallback((): PermissionValue[] => {
    if (!userRole || !ROLE_PERMISSIONS[userRole]) {
      return [];
    }
    return ROLE_PERMISSIONS[userRole];
  }, [userRole]);

  // 检查单个权限
  const hasPermission = useCallback((permission: PermissionValue): boolean => {
    try {
      if (!isAdmin) {
        return false;
      }
      const userPermissions = getUserPermissions();
      return userPermissions.includes(permission);
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }, [isAdmin, getUserPermissions]);

  // 检查是否拥有任意一个权限
  const hasAnyPermission = useCallback((permissions: PermissionValue[]): boolean => {
    try {
      return permissions.some(permission => hasPermission(permission));
    } catch (error) {
      console.error('Error checking any permission:', error);
      return false;
    }
  }, [hasPermission]);

  // 检查是否拥有所有权限
  const hasAllPermissions = useCallback((permissions: PermissionValue[]): boolean => {
    try {
      return permissions.every(permission => hasPermission(permission));
    } catch (error) {
      console.error('Error checking all permissions:', error);
      return false;
    }
  }, [hasPermission]);

  // 检查管理员访问权限
  const checkAdminAccess = useCallback((): boolean => {
    try {
      return isAdmin;
    } catch (error) {
      console.error('Error checking admin access:', error);
      return false;
    }
  }, [isAdmin]);

  // 处理加载状态和重定向
  useEffect(() => {
    try {
      if (status === 'loading') {
        return;
      }

      setIsLoading(false);

      // 只在明确要求重定向时才执行重定向逻辑
      if (redirectOnFail && !isAdmin) {
        console.log('Redirecting due to admin auth failure:', { 
          status, 
          isAdmin, 
          userRole: user?.role 
        });
        
        if (status === 'unauthenticated') {
          router.push('/auth/signin?callbackUrl=' + encodeURIComponent(window.location.pathname));
        } else if (user && !['admin', 'moderator', 'editor'].includes(user.role)) {
          router.push('/');
        }
      }
    } catch (error) {
      console.error('useAntdAdminAuth useEffect error:', error);
      setIsLoading(false);
    }
  }, [status, isAdmin, redirectOnFail, router, user]);

  // 调试信息
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && status === 'authenticated' && user) {
      console.log('useAntdAdminAuth - User info:', {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        isAdmin,
        permissions: getUserPermissions(),
      });
    }
  }, [user, isAdmin, status, getUserPermissions]);

  return {
    isAdmin,
    isLoading: status === 'loading' || isLoading,
    user,
    userRole,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    checkAdminAccess,
    getUserPermissions,
  };
};

// 权限验证结果接口
export interface PermissionCheckResult {
  hasPermission: boolean;
  reason?: string;
}

// 权限检查 Hook（用于条件渲染）
export const useAntdPermissionCheck = () => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAntdAdminAuth();
  
  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    // 便捷方法
    canViewUsers: () => hasPermission(ANTD_ADMIN_PERMISSIONS.VIEW_USERS),
    canManageAudio: () => hasAnyPermission([
      ANTD_ADMIN_PERMISSIONS.UPLOAD_AUDIO,
      ANTD_ADMIN_PERMISSIONS.EDIT_AUDIO,
      ANTD_ADMIN_PERMISSIONS.DELETE_AUDIO,
    ]),
    canManageSystem: () => hasPermission(ANTD_ADMIN_PERMISSIONS.SYSTEM_SETTINGS),
    canViewAnalytics: () => hasPermission(ANTD_ADMIN_PERMISSIONS.VIEW_ANALYTICS),
  };
};