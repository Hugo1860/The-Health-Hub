'use client';

import React from 'react';
import { Spin, Result, Button, Space, Typography } from 'antd';
import { useAntdAdminAuth, ANTD_ADMIN_PERMISSIONS, type PermissionValue } from '../hooks/useAntdAdminAuth';

const { Text } = Typography;

// Ant Design 风格的权限保护组件
interface AntdAdminGuardProps {
  children: React.ReactNode;
  requiredPermission?: PermissionValue;
  requiredPermissions?: PermissionValue[];
  requireAll?: boolean; // true: 需要所有权限, false: 需要任意一个权限
  fallback?: React.ReactNode;
}

export const AntdAdminGuard: React.FC<AntdAdminGuardProps> = ({
  children,
  requiredPermission,
  requiredPermissions,
  requireAll = false,
  fallback,
}) => {
  const { isAdmin, isLoading, hasPermission, hasAnyPermission, hasAllPermissions, user } = useAntdAdminAuth();

  if (isLoading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <Spin size="large" tip="正在验证权限..." />
      </div>
    );
  }

  if (!isAdmin) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <Result
          status="403"
          title="访问被拒绝"
          subTitle="您没有权限访问此页面"
          extra={
            <Space direction="vertical">
              <Text type="secondary">
                当前用户角色: {user?.role || '未知'}
              </Text>
              <Text type="secondary">
                当前用户状态: {user?.status || '未知'}
              </Text>
              <Text type="secondary">
                需要管理员权限 (admin/moderator/editor)
              </Text>
              <Button type="primary" onClick={() => window.location.href = '/'}>
                返回首页
              </Button>
            </Space>
          }
        />
      </div>
    );
  }

  // 检查特定权限
  let hasRequiredPermission = true;

  if (requiredPermission) {
    hasRequiredPermission = hasPermission(requiredPermission);
  } else if (requiredPermissions && requiredPermissions.length > 0) {
    hasRequiredPermission = requireAll 
      ? hasAllPermissions(requiredPermissions)
      : hasAnyPermission(requiredPermissions);
  }

  if (!hasRequiredPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <Result
          status="403"
          title="权限不足"
          subTitle="您没有执行此操作的权限"
          extra={
            <Space direction="vertical">
              <Text type="secondary">
                当前用户角色: {user?.role || '未知'}
              </Text>
              <Text type="secondary">
                所需权限: {requiredPermission || requiredPermissions?.join(', ') || '未知'}
              </Text>
              <Button type="primary" onClick={() => window.history.back()}>
                返回上一页
              </Button>
            </Space>
          }
        />
      </div>
    );
  }

  return <>{children}</>;
};

// 高阶组件：权限保护
export function withAntdAdminAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermission?: PermissionValue,
  requiredPermissions?: PermissionValue[],
  requireAll: boolean = false
) {
  return function AntdAdminProtectedComponent(props: P) {
    return (
      <AntdAdminGuard
        requiredPermission={requiredPermission}
        requiredPermissions={requiredPermissions}
        requireAll={requireAll}
      >
        <Component {...props} />
      </AntdAdminGuard>
    );
  };
}

export default AntdAdminGuard;