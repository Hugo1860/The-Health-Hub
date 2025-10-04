/**
 * 权限验证中间件
 * 提供细粒度的权限控制和基于角色的访问控制
 */

import { NextRequest, NextResponse } from 'next/server'
import { AuthenticatedUser, canAccessResource } from './session-validator'
import { AuthResponseBuilder } from './auth-response-builder'
import { AuthContext, AuthenticatedHandler } from './auth-middleware'

// 权限枚举
export enum Permission {
  // 用户管理权限
  VIEW_USERS = 'view_users',
  CREATE_USER = 'create_user',
  UPDATE_USER = 'update_user',
  DELETE_USER = 'delete_user',
  MANAGE_USER_ROLES = 'manage_user_roles',
  
  // 内容管理权限
  VIEW_CONTENT = 'view_content',
  CREATE_CONTENT = 'create_content',
  UPDATE_CONTENT = 'update_content',
  DELETE_CONTENT = 'delete_content',
  PUBLISH_CONTENT = 'publish_content',
  
  // 系统管理权限
  VIEW_SYSTEM_STATS = 'view_system_stats',
  MANAGE_CATEGORIES = 'manage_categories',
  MANAGE_SETTINGS = 'manage_settings',
  VIEW_AUDIT_LOGS = 'view_audit_logs',
  
  // 高级权限
  MANAGE_ADMINS = 'manage_admins',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  DATABASE_ACCESS = 'database_access'
}

// 角色枚举
export enum Role {
  USER = 'user',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

// 操作类型枚举
export enum Operation {
  READ = 'read',
  write = 'write',
  delete = 'delete',
  admin = 'admin'
}

// 权限检查结果接口
export interface PermissionResult {
  granted: boolean
  reason?: string
  requiredPermissions?: Permission[]
  userPermissions?: Permission[]
}

// 权限验证选项
export interface PermissionOptions {
  permissions?: Permission[]
  roles?: Role[]
  operation?: Operation
  resource?: string
  resourceOwnerId?: string
  allowSelfAccess?: boolean
  requireAllPermissions?: boolean // true: 需要所有权限, false: 需要任一权限
}

// 角色权限映射
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.USER]: [
    Permission.VIEW_CONTENT,
    Permission.VIEW_SYSTEM_STATS
  ],
  
  [Role.ADMIN]: [
    Permission.VIEW_USERS,
    Permission.CREATE_USER,
    Permission.UPDATE_USER,
    Permission.DELETE_USER,
    Permission.VIEW_CONTENT,
    Permission.CREATE_CONTENT,
    Permission.UPDATE_CONTENT,
    Permission.DELETE_CONTENT,
    Permission.PUBLISH_CONTENT,
    Permission.VIEW_SYSTEM_STATS,
    Permission.MANAGE_CATEGORIES,
    Permission.MANAGE_SETTINGS,
    Permission.VIEW_AUDIT_LOGS
  ],
  
  [Role.SUPER_ADMIN]: Object.values(Permission) // 超级管理员拥有所有权限
}

/**
 * 权限验证器类
 */
export class PermissionValidator {
  /**
   * 获取用户权限列表
   */
  static getUserPermissions(user: AuthenticatedUser): Permission[] {
    const role = user.role as Role
    return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS[Role.USER]
  }

  /**
   * 检查用户是否有特定权限
   */
  static hasPermission(user: AuthenticatedUser, permission: Permission): boolean {
    const userPermissions = this.getUserPermissions(user)
    return userPermissions.includes(permission)
  }

  /**
   * 检查用户是否有任一权限
   */
  static hasAnyPermission(user: AuthenticatedUser, permissions: Permission[]): boolean {
    const userPermissions = this.getUserPermissions(user)
    return permissions.some(permission => userPermissions.includes(permission))
  }

  /**
   * 检查用户是否有所有权限
   */
  static hasAllPermissions(user: AuthenticatedUser, permissions: Permission[]): boolean {
    const userPermissions = this.getUserPermissions(user)
    return permissions.every(permission => userPermissions.includes(permission))
  }

  /**
   * 检查用户角色
   */
  static hasRole(user: AuthenticatedUser, role: Role): boolean {
    return user.role === role
  }

  /**
   * 检查用户是否有任一角色
   */
  static hasAnyRole(user: AuthenticatedUser, roles: Role[]): boolean {
    return roles.includes(user.role as Role)
  }

  /**
   * 检查资源访问权限
   */
  static canAccessResource(
    user: AuthenticatedUser,
    resourceOwnerId: string,
    allowSelfAccess: boolean = true
  ): boolean {
    // 管理员可以访问所有资源
    if (user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN) {
      return true
    }
    
    // 检查是否为资源所有者
    if (allowSelfAccess && user.id === resourceOwnerId) {
      return true
    }
    
    return false
  }

  /**
   * 综合权限检查
   */
  static validatePermissions(
    user: AuthenticatedUser,
    options: PermissionOptions
  ): PermissionResult {
    const userPermissions = this.getUserPermissions(user)

    // 检查角色权限
    if (options.roles && options.roles.length > 0) {
      if (!this.hasAnyRole(user, options.roles)) {
        return {
          granted: false,
          reason: '用户角色不足',
          requiredPermissions: options.permissions,
          userPermissions
        }
      }
    }

    // 检查具体权限
    if (options.permissions && options.permissions.length > 0) {
      const hasPermission = options.requireAllPermissions
        ? this.hasAllPermissions(user, options.permissions)
        : this.hasAnyPermission(user, options.permissions)

      if (!hasPermission) {
        return {
          granted: false,
          reason: options.requireAllPermissions ? '缺少必要权限' : '权限不足',
          requiredPermissions: options.permissions,
          userPermissions
        }
      }
    }

    // 检查资源访问权限
    if (options.resourceOwnerId) {
      if (!this.canAccessResource(user, options.resourceOwnerId, options.allowSelfAccess)) {
        return {
          granted: false,
          reason: '无权访问此资源',
          userPermissions
        }
      }
    }

    return {
      granted: true,
      userPermissions
    }
  }
}

/**
 * 权限验证中间件
 */
export function withPermissions(
  handler: AuthenticatedHandler,
  options: PermissionOptions
) {
  return async (request: NextRequest, context: AuthContext): Promise<NextResponse> => {
    // 检查是否已认证
    if (!context.isAuthenticated || !context.user) {
      return AuthResponseBuilder.unauthorized('需要登录后访问')
    }

    // 验证权限
    const permissionResult = PermissionValidator.validatePermissions(context.user, options)

    if (!permissionResult.granted) {
      // 记录权限拒绝日志
      logPermissionDenied(request, context, options, permissionResult)

      return AuthResponseBuilder.forbidden(
        permissionResult.reason || '权限不足',
        {
          requiredPermissions: permissionResult.requiredPermissions,
          userPermissions: permissionResult.userPermissions
        }
      )
    }

    // 记录权限授予日志
    logPermissionGranted(request, context, options)

    return await handler(request, context)
  }
}

/**
 * 基于操作的权限中间件
 */
export function withOperationPermission(
  handler: AuthenticatedHandler,
  operation: Operation,
  resourceType?: string
) {
  return async (request: NextRequest, context: AuthContext): Promise<NextResponse> => {
    if (!context.isAuthenticated || !context.user) {
      return AuthResponseBuilder.unauthorized('需要登录后访问')
    }

    const permissions = getPermissionsForOperation(operation, resourceType)
    
    if (permissions.length > 0) {
      const hasPermission = PermissionValidator.hasAnyPermission(context.user, permissions)
      
      if (!hasPermission) {
        logOperationDenied(request, context, operation, resourceType)
        
        return AuthResponseBuilder.forbidden(
          `无权执行${operation}操作`,
          { operation, resourceType, requiredPermissions: permissions }
        )
      }
    }

    logOperationGranted(request, context, operation, resourceType)
    
    return await handler(request, context)
  }
}

/**
 * 资源所有权验证中间件
 */
export function withResourceOwnership(
  handler: AuthenticatedHandler,
  getResourceOwnerId: (request: NextRequest) => Promise<string | null>
) {
  return async (request: NextRequest, context: AuthContext): Promise<NextResponse> => {
    if (!context.isAuthenticated || !context.user) {
      return AuthResponseBuilder.unauthorized('需要登录后访问')
    }

    try {
      const resourceOwnerId = await getResourceOwnerId(request)
      
      if (!resourceOwnerId) {
        return AuthResponseBuilder.customError('资源不存在', 'RESOURCE_NOT_FOUND', 404)
      }

      if (!canAccessResource(context.user, resourceOwnerId)) {
        logResourceAccessDenied(request, context, resourceOwnerId)
        
        return AuthResponseBuilder.forbidden('无权访问此资源')
      }

      logResourceAccessGranted(request, context, resourceOwnerId)
      
      return await handler(request, context)
    } catch (error) {
      console.error('Resource ownership validation error:', error)
      return AuthResponseBuilder.fromError(error)
    }
  }
}

/**
 * 根据操作获取所需权限
 */
function getPermissionsForOperation(operation: Operation, resourceType?: string): Permission[] {
  const basePermissions: Record<Operation, Permission[]> = {
    [Operation.read]: [Permission.VIEW_CONTENT, Permission.VIEW_USERS, Permission.VIEW_SYSTEM_STATS],
    [Operation.write]: [Permission.CREATE_CONTENT, Permission.UPDATE_CONTENT, Permission.CREATE_USER, Permission.UPDATE_USER],
    [Operation.delete]: [Permission.DELETE_CONTENT, Permission.DELETE_USER],
    [Operation.admin]: [Permission.MANAGE_SETTINGS, Permission.MANAGE_CATEGORIES, Permission.MANAGE_ADMINS]
  }

  // 根据资源类型细化权限
  if (resourceType) {
    switch (resourceType) {
      case 'user':
        return operation === Operation.read ? [Permission.VIEW_USERS] :
               operation === Operation.write ? [Permission.CREATE_USER, Permission.UPDATE_USER] :
               operation === Operation.delete ? [Permission.DELETE_USER] : []
      case 'content':
        return operation === Operation.read ? [Permission.VIEW_CONTENT] :
               operation === Operation.write ? [Permission.CREATE_CONTENT, Permission.UPDATE_CONTENT] :
               operation === Operation.delete ? [Permission.DELETE_CONTENT] : []
      default:
        return basePermissions[operation] || []
    }
  }

  return basePermissions[operation] || []
}

/**
 * 记录权限拒绝日志
 */
function logPermissionDenied(
  request: NextRequest,
  context: AuthContext,
  options: PermissionOptions,
  result: PermissionResult
) {
  const logData = {
    requestId: context.requestId,
    event: 'PERMISSION_DENIED',
    userId: context.user?.id,
    userRole: context.user?.role,
    method: request.method,
    url: request.url,
    clientIP: context.clientIP,
    reason: result.reason,
    requiredPermissions: result.requiredPermissions,
    userPermissions: result.userPermissions,
    timestamp: new Date().toISOString()
  }

  console.warn('[PERMISSION_DENIED]', JSON.stringify(logData))
}

/**
 * 记录权限授予日志
 */
function logPermissionGranted(
  request: NextRequest,
  context: AuthContext,
  options: PermissionOptions
) {
  const logData = {
    requestId: context.requestId,
    event: 'PERMISSION_GRANTED',
    userId: context.user?.id,
    userRole: context.user?.role,
    method: request.method,
    url: request.url,
    permissions: options.permissions,
    timestamp: new Date().toISOString()
  }

  console.log('[PERMISSION_GRANTED]', JSON.stringify(logData))
}

/**
 * 记录操作拒绝日志
 */
function logOperationDenied(
  request: NextRequest,
  context: AuthContext,
  operation: Operation,
  resourceType?: string
) {
  const logData = {
    requestId: context.requestId,
    event: 'OPERATION_DENIED',
    userId: context.user?.id,
    userRole: context.user?.role,
    method: request.method,
    url: request.url,
    operation,
    resourceType,
    timestamp: new Date().toISOString()
  }

  console.warn('[OPERATION_DENIED]', JSON.stringify(logData))
}

/**
 * 记录操作授予日志
 */
function logOperationGranted(
  request: NextRequest,
  context: AuthContext,
  operation: Operation,
  resourceType?: string
) {
  const logData = {
    requestId: context.requestId,
    event: 'OPERATION_GRANTED',
    userId: context.user?.id,
    userRole: context.user?.role,
    method: request.method,
    url: request.url,
    operation,
    resourceType,
    timestamp: new Date().toISOString()
  }

  console.log('[OPERATION_GRANTED]', JSON.stringify(logData))
}

/**
 * 记录资源访问拒绝日志
 */
function logResourceAccessDenied(
  request: NextRequest,
  context: AuthContext,
  resourceOwnerId: string
) {
  const logData = {
    requestId: context.requestId,
    event: 'RESOURCE_ACCESS_DENIED',
    userId: context.user?.id,
    userRole: context.user?.role,
    method: request.method,
    url: request.url,
    resourceOwnerId,
    timestamp: new Date().toISOString()
  }

  console.warn('[RESOURCE_ACCESS_DENIED]', JSON.stringify(logData))
}

/**
 * 记录资源访问授予日志
 */
function logResourceAccessGranted(
  request: NextRequest,
  context: AuthContext,
  resourceOwnerId: string
) {
  const logData = {
    requestId: context.requestId,
    event: 'RESOURCE_ACCESS_GRANTED',
    userId: context.user?.id,
    userRole: context.user?.role,
    method: request.method,
    url: request.url,
    resourceOwnerId,
    timestamp: new Date().toISOString()
  }

  console.log('[RESOURCE_ACCESS_GRANTED]', JSON.stringify(logData))
}

/**
 * 便捷的权限中间件装饰器
 */
export const permissionMiddleware = {
  // 需要特定权限
  require: (permissions: Permission[], requireAll: boolean = false) =>
    (handler: AuthenticatedHandler) =>
      withPermissions(handler, { permissions, requireAllPermissions: requireAll }),

  // 需要特定角色
  role: (roles: Role[]) =>
    (handler: AuthenticatedHandler) =>
      withPermissions(handler, { roles }),

  // 需要管理员权限
  admin: (handler: AuthenticatedHandler) =>
    withPermissions(handler, { roles: [Role.ADMIN, Role.SUPER_ADMIN] }),

  // 需要超级管理员权限
  superAdmin: (handler: AuthenticatedHandler) =>
    withPermissions(handler, { roles: [Role.SUPER_ADMIN] }),

  // 基于操作的权限
  operation: (operation: Operation, resourceType?: string) =>
    (handler: AuthenticatedHandler) =>
      withOperationPermission(handler, operation, resourceType),

  // 资源所有权验证
  ownership: (getResourceOwnerId: (request: NextRequest) => Promise<string | null>) =>
    (handler: AuthenticatedHandler) =>
      withResourceOwnership(handler, getResourceOwnerId)
}

// 导出类型（枚举已在定义时导出）
export type { PermissionOptions, PermissionResult }