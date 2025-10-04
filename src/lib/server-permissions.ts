// 服务器端权限定义 - 从客户端权限定义复制，避免服务器端导入客户端代码
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

export type PermissionKey = keyof typeof ANTD_ADMIN_PERMISSIONS;
export type PermissionValue = typeof ANTD_ADMIN_PERMISSIONS[PermissionKey];

// 用户角色权限映射 - 服务器端版本
export const SERVER_ROLE_PERMISSIONS: Record<string, PermissionValue[]> = {
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



