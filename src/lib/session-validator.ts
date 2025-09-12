/**
 * 统一的会话验证工具函数
 * 提供标准化的会话验证和用户认证功能
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'

// 认证用户接口
export interface AuthenticatedUser {
  id: string
  email: string
  name: string
  role: 'user' | 'admin'
  status: 'active' | 'inactive' | 'banned'
}

// 会话验证结果接口
export interface SessionValidationResult {
  isValid: boolean
  user?: AuthenticatedUser
  error?: string
  errorCode?: string
}

// 基础会话验证
export async function validateSession(): Promise<SessionValidationResult> {
  try {
    console.log('🔍 开始会话验证')
    
    const session = await getServerSession(authOptions)
    console.log('📋 获取到的会话:', session ? '存在' : '不存在')
    
    if (!session?.user) {
      console.log('❌ 未找到有效会话')
      return {
        isValid: false,
        error: '未找到有效会话',
        errorCode: 'NO_SESSION'
      }
    }

    const user = session.user as any
    console.log('👤 用户信息:', { 
      id: user.id, 
      email: user.email, 
      role: user.role, 
      status: user.status 
    })
    
    // 检查用户状态
    if (user.status === 'banned') {
      console.log('❌ 账户已被禁用')
      return {
        isValid: false,
        error: '账户已被禁用',
        errorCode: 'ACCOUNT_BANNED'
      }
    }

    if (user.status === 'inactive') {
      console.log('❌ 账户未激活')
      return {
        isValid: false,
        error: '账户未激活',
        errorCode: 'ACCOUNT_INACTIVE'
      }
    }

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      name: user.name || user.username || user.email,
      role: user.role || 'user',
      status: user.status || 'active'
    }

    console.log('✅ 会话验证成功:', authenticatedUser)
    return {
      isValid: true,
      user: authenticatedUser
    }
  } catch (error) {
    console.error('❌ 会话验证失败:', error)
    return {
      isValid: false,
      error: '会话验证失败',
      errorCode: 'VALIDATION_ERROR'
    }
  }
}

// 管理员会话验证
export async function validateAdminSession(): Promise<SessionValidationResult> {
  const sessionResult = await validateSession()
  
  if (!sessionResult.isValid) {
    return sessionResult
  }

  const user = sessionResult.user!
  
  if (user.role !== 'admin') {
    return {
      isValid: false,
      error: '需要管理员权限',
      errorCode: 'INSUFFICIENT_PERMISSIONS'
    }
  }

  return sessionResult
}

// 用户会话验证（普通用户或管理员）
export async function validateUserSession(): Promise<SessionValidationResult> {
  const sessionResult = await validateSession()
  
  if (!sessionResult.isValid) {
    return sessionResult
  }

  const user = sessionResult.user!
  
  // 用户和管理员都可以访问用户级别的功能
  if (user.role !== 'user' && user.role !== 'admin') {
    return {
      isValid: false,
      error: '需要用户权限',
      errorCode: 'INSUFFICIENT_PERMISSIONS'
    }
  }

  return sessionResult
}

// 检查用户是否有特定权限
export function hasPermission(user: AuthenticatedUser, permission: string): boolean {
  switch (permission) {
    case 'admin':
      return user.role === 'admin'
    case 'user':
      return user.role === 'user' || user.role === 'admin'
    default:
      return false
  }
}

// 检查用户是否可以访问特定资源
export function canAccessResource(user: AuthenticatedUser, resourceOwnerId: string): boolean {
  // 管理员可以访问所有资源
  if (user.role === 'admin') {
    return true
  }
  
  // 用户只能访问自己的资源
  return user.id === resourceOwnerId
}

// 从请求中获取客户端IP地址
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  return 'unknown'
}

// 会话验证装饰器类型
export type SessionValidatorFunction = () => Promise<SessionValidationResult>

// 创建会话验证装饰器
export function createSessionValidator(validatorType: 'basic' | 'admin' | 'user'): SessionValidatorFunction {
  switch (validatorType) {
    case 'admin':
      return validateAdminSession
    case 'user':
      return validateUserSession
    case 'basic':
    default:
      return validateSession
  }
}

// 验证会话并返回用户信息的便捷函数
export async function requireAuth(): Promise<AuthenticatedUser> {
  const result = await validateSession()
  
  if (!result.isValid || !result.user) {
    throw new Error(result.error || '认证失败')
  }
  
  return result.user
}

// 验证管理员权限并返回用户信息的便捷函数
export async function requireAdmin(): Promise<AuthenticatedUser> {
  const result = await validateAdminSession()
  
  if (!result.isValid || !result.user) {
    throw new Error(result.error || '需要管理员权限')
  }
  
  return result.user
}

// 验证用户权限并返回用户信息的便捷函数
export async function requireUser(): Promise<AuthenticatedUser> {
  const result = await validateUserSession()
  
  if (!result.isValid || !result.user) {
    throw new Error(result.error || '需要用户权限')
  }
  
  return result.user
}