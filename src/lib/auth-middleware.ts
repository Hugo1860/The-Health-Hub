/**
 * 认证中间件系统
 * 提供统一的API认证和权限控制中间件
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateSession, validateAdminSession, validateUserSession, AuthenticatedUser } from './session-validator'
import { AuthResponseBuilder } from './auth-response-builder'
import { getClientIP } from './session-validator'

// 中间件选项接口
export interface AuthMiddlewareOptions {
  requireAuth?: boolean
  requireAdmin?: boolean
  requireUser?: boolean
  allowPublic?: boolean
  rateLimit?: {
    maxRequests: number
    windowMs: number
  }
  permissions?: string[]
  logAccess?: boolean
}

// 认证上下文接口
export interface AuthContext {
  user?: AuthenticatedUser
  isAuthenticated: boolean
  isAdmin: boolean
  clientIP: string
  userAgent: string
  requestId: string
}

// API处理函数类型
export type AuthenticatedHandler = (
  request: NextRequest,
  context: AuthContext
) => Promise<NextResponse>

// 速率限制存储
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// 清理过期的速率限制记录
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // 每分钟清理一次

/**
 * 基础认证中间件
 * 验证用户会话但不强制要求认证
 */
export function withAuth(
  handler: AuthenticatedHandler,
  options: AuthMiddlewareOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const requestId = generateRequestId()
    const clientIP = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'

    try {
      // 创建基础上下文
      const context: AuthContext = {
        isAuthenticated: false,
        isAdmin: false,
        clientIP,
        userAgent,
        requestId
      }

      // 如果允许公开访问且不要求认证，直接执行处理函数
      if (options.allowPublic && !options.requireAuth && !options.requireAdmin && !options.requireUser) {
        return await handler(request, context)
      }

      // 验证会话
      const sessionResult = await validateSession()
      
      if (sessionResult.isValid && sessionResult.user) {
        context.user = sessionResult.user
        context.isAuthenticated = true
        context.isAdmin = sessionResult.user.role === 'admin'
      }

      // 检查认证要求
      if (options.requireAuth && !context.isAuthenticated) {
        return AuthResponseBuilder.unauthorized('需要登录访问')
      }

      // 记录访问日志
      if (options.logAccess) {
        logApiAccess(request, context)
      }

      return await handler(request, context)
    } catch (error) {
      console.error(`[${requestId}] Auth middleware error:`, error)
      return AuthResponseBuilder.fromError(error)
    }
  }
}

/**
 * 用户认证中间件
 * 要求用户已登录（普通用户或管理员）
 */
export function withUserAuth(
  handler: AuthenticatedHandler,
  options: AuthMiddlewareOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const requestId = generateRequestId()
    const clientIP = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'

    try {
      // 应用速率限制
      if (options.rateLimit) {
        const rateLimitResult = await applyRateLimit(
          clientIP,
          options.rateLimit.maxRequests,
          options.rateLimit.windowMs
        )
        
        if (!rateLimitResult.allowed) {
          return AuthResponseBuilder.rateLimited(
            '请求过于频繁，请稍后重试',
            rateLimitResult.retryAfter
          )
        }
      }

      // 验证用户会话
      const sessionResult = await validateUserSession()
      
      if (!sessionResult.isValid || !sessionResult.user) {
        return AuthResponseBuilder.fromError(
          sessionResult.error || '需要用户权限'
        )
      }

      const context: AuthContext = {
        user: sessionResult.user,
        isAuthenticated: true,
        isAdmin: sessionResult.user.role === 'admin',
        clientIP,
        userAgent,
        requestId
      }

      // 记录访问日志
      if (options.logAccess) {
        logApiAccess(request, context)
      }

      return await handler(request, context)
    } catch (error) {
      console.error(`[${requestId}] User auth middleware error:`, error)
      return AuthResponseBuilder.fromError(error)
    }
  }
}

/**
 * 管理员认证中间件
 * 要求管理员权限
 */
export function withAdminAuth(
  handler: AuthenticatedHandler,
  options: AuthMiddlewareOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const requestId = generateRequestId()
    const clientIP = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'

    try {
      // 应用速率限制（管理员API通常有更严格的限制）
      if (options.rateLimit) {
        const rateLimitResult = await applyRateLimit(
          `admin:${clientIP}`,
          options.rateLimit.maxRequests,
          options.rateLimit.windowMs
        )
        
        if (!rateLimitResult.allowed) {
          return AuthResponseBuilder.rateLimited(
            '管理员API请求过于频繁',
            rateLimitResult.retryAfter
          )
        }
      }

      // 验证管理员会话
      const sessionResult = await validateAdminSession()
      
      if (!sessionResult.isValid || !sessionResult.user) {
        return AuthResponseBuilder.fromError(
          sessionResult.error || '需要管理员权限'
        )
      }

      const context: AuthContext = {
        user: sessionResult.user,
        isAuthenticated: true,
        isAdmin: true,
        clientIP,
        userAgent,
        requestId
      }

      // 记录管理员访问日志
      logAdminApiAccess(request, context)

      return await handler(request, context)
    } catch (error) {
      console.error(`[${requestId}] Admin auth middleware error:`, error)
      return AuthResponseBuilder.fromError(error)
    }
  }
}

/**
 * 应用速率限制
 */
async function applyRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const now = Date.now()
  let record = rateLimitStore.get(key)

  if (!record || now > record.resetTime) {
    record = {
      count: 0,
      resetTime: now + windowMs
    }
  }

  if (record.count >= maxRequests) {
    return {
      allowed: false,
      retryAfter: Math.ceil((record.resetTime - now) / 1000)
    }
  }

  record.count++
  rateLimitStore.set(key, record)

  return { allowed: true }
}

/**
 * 生成请求ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

/**
 * 记录API访问日志
 */
function logApiAccess(request: NextRequest, context: AuthContext) {
  const logData = {
    requestId: context.requestId,
    method: request.method,
    url: request.url,
    userAgent: context.userAgent,
    clientIP: context.clientIP,
    userId: context.user?.id,
    userRole: context.user?.role,
    timestamp: new Date().toISOString()
  }

  console.log('[API_ACCESS]', JSON.stringify(logData))
}

/**
 * 记录管理员API访问日志
 */
function logAdminApiAccess(request: NextRequest, context: AuthContext) {
  const logData = {
    requestId: context.requestId,
    method: request.method,
    url: request.url,
    userAgent: context.userAgent,
    clientIP: context.clientIP,
    adminId: context.user?.id,
    adminEmail: context.user?.email,
    timestamp: new Date().toISOString(),
    level: 'ADMIN_ACCESS'
  }

  console.log('[ADMIN_API_ACCESS]', JSON.stringify(logData))
  
  // 这里可以添加更详细的安全日志记录
  // 例如写入专门的安全日志文件或发送到监控系统
}

/**
 * 组合中间件工厂函数
 * 根据选项创建合适的中间件
 */
export function createAuthMiddleware(options: AuthMiddlewareOptions) {
  if (options.requireAdmin) {
    return withAdminAuth
  } else if (options.requireUser || options.requireAuth) {
    return withUserAuth
  } else {
    return withAuth
  }
}

/**
 * 便捷的中间件装饰器
 */
export const authMiddleware = {
  // 公开访问（可选认证）
  public: (handler: AuthenticatedHandler, options?: Omit<AuthMiddlewareOptions, 'allowPublic'>) =>
    withAuth(handler, { ...options, allowPublic: true }),

  // 用户认证
  user: (handler: AuthenticatedHandler, options?: Omit<AuthMiddlewareOptions, 'requireUser'>) =>
    withUserAuth(handler, { ...options, requireUser: true }),

  // 管理员认证
  admin: (handler: AuthenticatedHandler, options?: Omit<AuthMiddlewareOptions, 'requireAdmin'>) =>
    withAdminAuth(handler, { ...options, requireAdmin: true }),

  // 带速率限制的用户认证
  userWithRateLimit: (
    handler: AuthenticatedHandler,
    maxRequests: number = 100,
    windowMs: number = 60000,
    options?: AuthMiddlewareOptions
  ) =>
    withUserAuth(handler, {
      ...options,
      requireUser: true,
      rateLimit: { maxRequests, windowMs }
    }),

  // 带速率限制的管理员认证
  adminWithRateLimit: (
    handler: AuthenticatedHandler,
    maxRequests: number = 50,
    windowMs: number = 60000,
    options?: AuthMiddlewareOptions
  ) =>
    withAdminAuth(handler, {
      ...options,
      requireAdmin: true,
      rateLimit: { maxRequests, windowMs }
    })
}

// 导出类型
export type { AuthMiddlewareOptions, AuthContext, AuthenticatedHandler }