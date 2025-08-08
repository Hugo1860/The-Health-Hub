// Admin 认证和授权中间件

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AdminApiResponseBuilder, AdminApiErrorCode, logAdminAction } from './adminApiUtils'

// 管理员角色定义
export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  EDITOR = 'editor'
}

// 权限定义
export enum AdminPermission {
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

// 角色权限映射
const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  [AdminRole.SUPER_ADMIN]: Object.values(AdminPermission), // 超级管理员拥有所有权限
  
  [AdminRole.ADMIN]: [
    AdminPermission.VIEW_USERS,
    AdminPermission.CREATE_USER,
    AdminPermission.UPDATE_USER,
    AdminPermission.DELETE_USER,
    AdminPermission.VIEW_CONTENT,
    AdminPermission.CREATE_CONTENT,
    AdminPermission.UPDATE_CONTENT,
    AdminPermission.DELETE_CONTENT,
    AdminPermission.PUBLISH_CONTENT,
    AdminPermission.VIEW_SYSTEM_STATS,
    AdminPermission.MANAGE_CATEGORIES,
    AdminPermission.MANAGE_SETTINGS,
    AdminPermission.VIEW_AUDIT_LOGS
  ],
  
  [AdminRole.MODERATOR]: [
    AdminPermission.VIEW_USERS,
    AdminPermission.UPDATE_USER,
    AdminPermission.VIEW_CONTENT,
    AdminPermission.CREATE_CONTENT,
    AdminPermission.UPDATE_CONTENT,
    AdminPermission.DELETE_CONTENT,
    AdminPermission.VIEW_SYSTEM_STATS,
    AdminPermission.MANAGE_CATEGORIES
  ],
  
  [AdminRole.EDITOR]: [
    AdminPermission.VIEW_USERS,
    AdminPermission.VIEW_CONTENT,
    AdminPermission.CREATE_CONTENT,
    AdminPermission.UPDATE_CONTENT,
    AdminPermission.VIEW_SYSTEM_STATS
  ]
}

// 认证用户信息接口
export interface AuthenticatedAdmin {
  id: string
  username: string
  email: string
  role: AdminRole
  permissions: AdminPermission[]
  sessionId?: string
}

// 会话验证结果
interface SessionValidationResult {
  isValid: boolean
  admin?: AuthenticatedAdmin
  error?: string
}

// 验证管理员会话
export async function validateAdminSession(request: NextRequest): Promise<SessionValidationResult> {
  try {
    // 获取服务器端会话
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return {
        isValid: false,
        error: '未找到有效会话'
      }
    }
    
    const user = session.user as any
    
    // 检查用户是否具有管理员角色
    const adminRoles = [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MODERATOR, AdminRole.EDITOR]
    if (!adminRoles.includes(user.role)) {
      return {
        isValid: false,
        error: '用户不具有管理员权限'
      }
    }
    
    // 获取用户权限
    const permissions = ROLE_PERMISSIONS[user.role as AdminRole] || []
    
    const admin: AuthenticatedAdmin = {
      id: user.id,
      username: user.username || user.name || user.email,
      email: user.email,
      role: user.role as AdminRole,
      permissions,
      sessionId: session.user.id
    }
    
    return {
      isValid: true,
      admin
    }
  } catch (error) {
    console.error('Session validation error:', error)
    return {
      isValid: false,
      error: '会话验证失败'
    }
  }
}

// 检查权限
export function hasPermission(admin: AuthenticatedAdmin, permission: AdminPermission): boolean {
  return admin.permissions.includes(permission)
}

// 检查多个权限（需要全部满足）
export function hasAllPermissions(admin: AuthenticatedAdmin, permissions: AdminPermission[]): boolean {
  return permissions.every(permission => admin.permissions.includes(permission))
}

// 检查多个权限（满足任一即可）
export function hasAnyPermission(admin: AuthenticatedAdmin, permissions: AdminPermission[]): boolean {
  return permissions.some(permission => admin.permissions.includes(permission))
}

// 权限检查装饰器函数
export function requirePermissions(permissions: AdminPermission | AdminPermission[]) {
  return function(handler: (request: NextRequest) => Promise<Response>) {
    return async function(request: NextRequest): Promise<Response> {
      // 验证会话
      const sessionResult = await validateAdminSession(request)
      
      if (!sessionResult.isValid || !sessionResult.admin) {
        return AdminApiResponseBuilder.unauthorized(sessionResult.error)
      }
      
      const admin = sessionResult.admin
      const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions]
      
      // 检查权限
      if (!hasAllPermissions(admin, requiredPermissions)) {
        logAdminAction('PERMISSION_DENIED', admin.id, {
          requiredPermissions,
          userPermissions: admin.permissions,
          endpoint: request.url
        })
        
        return AdminApiResponseBuilder.forbidden('权限不足，无法执行此操作')
      }
      
      // 记录管理员操作
      logAdminAction('API_ACCESS', admin.id, {
        method: request.method,
        url: request.url,
        permissions: requiredPermissions
      })
      
      // 将admin信息添加到request中，供处理函数使用
      (request as any).admin = admin
      
      // 执行处理函数
      return handler(request)
    }
  }
}

// 角色检查装饰器函数
export function requireRole(roles: AdminRole | AdminRole[]) {
  return function(handler: (request: NextRequest) => Promise<Response>) {
    return async function(request: NextRequest): Promise<Response> {
      // 验证会话
      const sessionResult = await validateAdminSession(request)
      
      if (!sessionResult.isValid || !sessionResult.admin) {
        return AdminApiResponseBuilder.unauthorized(sessionResult.error)
      }
      
      const admin = sessionResult.admin
      const requiredRoles = Array.isArray(roles) ? roles : [roles]
      
      // 检查角色
      if (!requiredRoles.includes(admin.role)) {
        logAdminAction('ROLE_ACCESS_DENIED', admin.id, {
          requiredRoles,
          userRole: admin.role,
          endpoint: request.url
        })
        
        return AdminApiResponseBuilder.forbidden('角色权限不足，无法访问此资源')
      }
      
      // 记录管理员操作
      logAdminAction('API_ACCESS', admin.id, {
        method: request.method,
        url: request.url,
        role: admin.role
      })
      
      // 将admin信息添加到request中
      (request as any).admin = admin
      
      // 执行处理函数
      return handler(request)
    }
  }
}

// 基础认证检查（只验证是否为管理员，不检查具体权限）
export function requireAdmin(handler: (request: NextRequest) => Promise<Response>) {
  return async function(request: NextRequest): Promise<Response> {
    // 验证会话
    const sessionResult = await validateAdminSession(request)
    
    if (!sessionResult.isValid || !sessionResult.admin) {
      return AdminApiResponseBuilder.unauthorized(sessionResult.error)
    }
    
    const admin = sessionResult.admin
    
    // 记录管理员操作
    logAdminAction('API_ACCESS', admin.id, {
      method: request.method,
      url: request.url
    })
    
    // 将admin信息添加到request中
    (request as any).admin = admin
    
    // 执行处理函数
    return handler(request)
  }
}

// 速率限制检查
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(maxRequests: number = 100, windowMs: number = 60000) {
  return function(handler: (request: NextRequest) => Promise<Response>) {
    return async function(request: NextRequest): Promise<Response> {
      // 验证会话
      const sessionResult = await validateAdminSession(request)
      
      if (!sessionResult.isValid || !sessionResult.admin) {
        return AdminApiResponseBuilder.unauthorized(sessionResult.error)
      }
      
      const admin = sessionResult.admin
      const key = `${admin.id}:${request.url}`
      const now = Date.now()
      
      // 获取或创建速率限制记录
      let limitRecord = rateLimitMap.get(key)
      
      if (!limitRecord || now > limitRecord.resetTime) {
        limitRecord = {
          count: 0,
          resetTime: now + windowMs
        }
      }
      
      // 检查是否超过限制
      if (limitRecord.count >= maxRequests) {
        logAdminAction('RATE_LIMIT_EXCEEDED', admin.id, {
          endpoint: request.url,
          count: limitRecord.count,
          maxRequests
        })
        
        return AdminApiResponseBuilder.error(
          AdminApiErrorCode.RATE_LIMITED,
          `请求过于频繁，请在 ${Math.ceil((limitRecord.resetTime - now) / 1000)} 秒后重试`,
          { retryAfter: Math.ceil((limitRecord.resetTime - now) / 1000) }
        )
      }
      
      // 增加计数
      limitRecord.count++
      rateLimitMap.set(key, limitRecord)
      
      // 将admin信息添加到request中
      (request as any).admin = admin
      
      // 执行处理函数
      return handler(request)
    }
  }
}

// 组合中间件
export function createAdminMiddleware(options: {
  permissions?: AdminPermission[]
  roles?: AdminRole[]
  rateLimit?: { maxRequests: number; windowMs: number }
}) {
  return function(handler: (request: NextRequest) => Promise<Response>) {
    let wrappedHandler = handler
    
    // 应用速率限制
    if (options.rateLimit) {
      wrappedHandler = rateLimit(options.rateLimit.maxRequests, options.rateLimit.windowMs)(wrappedHandler)
    }
    
    // 应用权限检查
    if (options.permissions && options.permissions.length > 0) {
      wrappedHandler = requirePermissions(options.permissions)(wrappedHandler)
    }
    
    // 应用角色检查
    if (options.roles && options.roles.length > 0) {
      wrappedHandler = requireRole(options.roles)(wrappedHandler)
    }
    
    // 如果没有指定权限或角色，至少需要基础管理员认证
    if (!options.permissions && !options.roles) {
      wrappedHandler = requireAdmin(wrappedHandler)
    }
    
    return wrappedHandler
  }
}

// 清理过期的速率限制记录
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key)
    }
  }
}, 60000) // 每分钟清理一次