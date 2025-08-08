# Ant Design 统一权限管理系统

## 概述

本系统使用统一的 Ant Design 权限管理系统，避免多个权限管理系统的混乱冲突。所有管理后台页面都使用相同的权限检查机制。

## 核心组件

### 1. useAntdAdminAuth Hook

主要的权限管理 Hook，提供以下功能：

```typescript
const {
  isAdmin,           // 是否为管理员
  isLoading,         // 加载状态
  user,              // 用户信息
  userRole,          // 用户角色
  hasPermission,     // 检查单个权限
  hasAnyPermission,  // 检查是否拥有任意一个权限
  hasAllPermissions, // 检查是否拥有所有权限
  checkAdminAccess,  // 检查管理员访问权限
  getUserPermissions // 获取用户权限列表
} = useAntdAdminAuth();
```

### 2. AntdAdminGuard 组件

权限保护组件，用于包装需要权限验证的页面：

```typescript
<AntdAdminGuard requiredPermission={ANTD_ADMIN_PERMISSIONS.UPLOAD_AUDIO}>
  <YourComponent />
</AntdAdminGuard>
```

### 3. useAntdPermissionCheck Hook

便捷的权限检查 Hook，用于条件渲染：

```typescript
const { hasPermission, canManageAudio, canViewUsers } = useAntdPermissionCheck();
```

## 权限常量

### ANTD_ADMIN_PERMISSIONS

```typescript
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
  MANAGE_SLIDES: 'manage_slides',
};
```

## 用户角色权限映射

### 管理员 (admin)
- 拥有所有权限

### 版主 (moderator)
- 查看用户
- 音频管理（上传、编辑）
- 分类管理
- 查看分析数据

### 编辑 (editor)
- 音频管理（上传、编辑）
- 分类管理

## 使用示例

### 1. 页面级权限保护

```typescript
export default function AudioManagementPage() {
  return (
    <AntdAdminGuard requiredPermission={ANTD_ADMIN_PERMISSIONS.UPLOAD_AUDIO}>
      <AudioManagement />
    </AntdAdminGuard>
  );
}
```

### 2. 组件内权限检查

```typescript
function AudioManagement() {
  const { hasPermission } = useAntdPermissionCheck();

  return (
    <div>
      <Button 
        disabled={!hasPermission(ANTD_ADMIN_PERMISSIONS.UPLOAD_AUDIO)}
      >
        上传音频
      </Button>
      
      <Button 
        disabled={!hasPermission(ANTD_ADMIN_PERMISSIONS.DELETE_AUDIO)}
      >
        删除音频
      </Button>
    </div>
  );
}
```

### 3. 多权限检查

```typescript
function AdminPanel() {
  const { hasAnyPermission, hasAllPermissions } = useAntdAdminAuth();

  const canManageContent = hasAnyPermission([
    ANTD_ADMIN_PERMISSIONS.UPLOAD_AUDIO,
    ANTD_ADMIN_PERMISSIONS.EDIT_AUDIO,
    ANTD_ADMIN_PERMISSIONS.MANAGE_CATEGORIES
  ]);

  const canFullyManageUsers = hasAllPermissions([
    ANTD_ADMIN_PERMISSIONS.VIEW_USERS,
    ANTD_ADMIN_PERMISSIONS.UPDATE_USER,
    ANTD_ADMIN_PERMISSIONS.DELETE_USER
  ]);

  return (
    <div>
      {canManageContent && <ContentManagementPanel />}
      {canFullyManageUsers && <UserManagementPanel />}
    </div>
  );
}
```

## 布局组件

### AntdAdminLayout

统一的管理后台布局组件，自动处理：
- 权限验证
- 菜单权限过滤
- 用户信息显示
- 面包屑导航

```typescript
function YourAdminPage() {
  return (
    <AntdAdminLayout>
      <YourContent />
    </AntdAdminLayout>
  );
}
```

## 迁移指南

### 从旧权限系统迁移

1. **替换导入**：
   ```typescript
   // 旧的
   import { useAdminAuth, ADMIN_PERMISSIONS } from '@/hooks/useAdminAuth';
   
   // 新的
   import { useAntdAdminAuth, ANTD_ADMIN_PERMISSIONS } from '@/hooks/useAntdAdminAuth';
   ```

2. **更新权限常量**：
   ```typescript
   // 旧的
   ADMIN_PERMISSIONS.UPLOAD_AUDIO
   
   // 新的
   ANTD_ADMIN_PERMISSIONS.UPLOAD_AUDIO
   ```

3. **添加页面保护**：
   ```typescript
   export default function YourPage() {
     return (
       <AntdAdminGuard requiredPermission={ANTD_ADMIN_PERMISSIONS.YOUR_PERMISSION}>
         <YourComponent />
       </AntdAdminGuard>
     );
   }
   ```

## 最佳实践

1. **页面级保护**：每个管理页面都应该用 `AntdAdminGuard` 包装
2. **组件级权限**：在组件内部使用 `useAntdPermissionCheck` 进行条件渲染
3. **权限粒度**：根据实际需求设置合适的权限粒度
4. **错误处理**：权限检查失败时提供友好的错误提示
5. **调试模式**：开发环境下会输出详细的权限信息到控制台

## 注意事项

1. 所有权限检查都是基于用户角色的
2. 权限验证在客户端和服务端都需要进行
3. 权限常量应该保持一致性，避免拼写错误
4. 新增权限时需要同时更新角色权限映射
5. 权限系统支持动态权限检查，无需重新加载页面