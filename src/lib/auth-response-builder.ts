/**
 * 统一的认证响应构建器
 * 提供标准化的认证错误和成功响应格式
 */

import { NextResponse } from 'next/server'

// 认证错误类型枚举
export enum AuthErrorType {
  NO_SESSION = 'NO_SESSION',
  INVALID_SESSION = 'INVALID_SESSION',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',
  ACCOUNT_BANNED = 'ACCOUNT_BANNED',
  ACCOUNT_INACTIVE = 'ACCOUNT_INACTIVE',
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

// 认证错误响应接口
export interface AuthErrorResponse {
  error: {
    type: AuthErrorType
    code: string
    message: string
    details?: Record<string, any>
  }
  timestamp: string
  path?: string
}

// 成功响应接口
export interface AuthSuccessResponse<T = any> {
  success: true
  data: T
  timestamp: string
}

// 认证响应构建器类
export class AuthResponseBuilder {
  /**
   * 创建未授权响应 (401)
   */
  static unauthorized(
    message: string = '未授权访问',
    type: AuthErrorType = AuthErrorType.NO_SESSION,
    details?: Record<string, any>
  ): NextResponse {
    const response: AuthErrorResponse = {
      error: {
        type,
        code: type,
        message,
        details
      },
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response, { 
      status: 401,
      headers: {
        'WWW-Authenticate': 'Bearer realm="API"'
      }
    })
  }

  /**
   * 创建权限不足响应 (403)
   */
  static forbidden(
    message: string = '权限不足',
    details?: Record<string, any>
  ): NextResponse {
    const response: AuthErrorResponse = {
      error: {
        type: AuthErrorType.INSUFFICIENT_PERMISSIONS,
        code: 'FORBIDDEN',
        message,
        details
      },
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response, { status: 403 })
  }

  /**
   * 创建会话过期响应 (401)
   */
  static sessionExpired(
    message: string = '会话已过期，请重新登录'
  ): NextResponse {
    const response: AuthErrorResponse = {
      error: {
        type: AuthErrorType.SESSION_EXPIRED,
        code: 'SESSION_EXPIRED',
        message
      },
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response, { 
      status: 401,
      headers: {
        'WWW-Authenticate': 'Bearer realm="API"'
      }
    })
  }

  /**
   * 创建账户被禁用响应 (403)
   */
  static accountDisabled(
    message: string = '账户已被禁用',
    reason?: string
  ): NextResponse {
    const response: AuthErrorResponse = {
      error: {
        type: AuthErrorType.ACCOUNT_DISABLED,
        code: 'ACCOUNT_DISABLED',
        message,
        details: reason ? { reason } : undefined
      },
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response, { status: 403 })
  }

  /**
   * 创建账户被封禁响应 (403)
   */
  static accountBanned(
    message: string = '账户已被封禁',
    banReason?: string,
    banExpiry?: string
  ): NextResponse {
    const response: AuthErrorResponse = {
      error: {
        type: AuthErrorType.ACCOUNT_BANNED,
        code: 'ACCOUNT_BANNED',
        message,
        details: {
          ...(banReason && { reason: banReason }),
          ...(banExpiry && { expiresAt: banExpiry })
        }
      },
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response, { status: 403 })
  }

  /**
   * 创建账户未激活响应 (403)
   */
  static accountInactive(
    message: string = '账户未激活，请先激活账户'
  ): NextResponse {
    const response: AuthErrorResponse = {
      error: {
        type: AuthErrorType.ACCOUNT_INACTIVE,
        code: 'ACCOUNT_INACTIVE',
        message
      },
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response, { status: 403 })
  }

  /**
   * 创建频率限制响应 (429)
   */
  static rateLimited(
    message: string = '请求过于频繁，请稍后重试',
    retryAfter?: number
  ): NextResponse {
    const response: AuthErrorResponse = {
      error: {
        type: AuthErrorType.RATE_LIMITED,
        code: 'RATE_LIMITED',
        message,
        details: retryAfter ? { retryAfter } : undefined
      },
      timestamp: new Date().toISOString()
    }

    const headers: Record<string, string> = {}
    if (retryAfter) {
      headers['Retry-After'] = retryAfter.toString()
    }

    return NextResponse.json(response, { 
      status: 429,
      headers
    })
  }

  /**
   * 创建无效凭据响应 (401)
   */
  static invalidCredentials(
    message: string = '用户名或密码错误'
  ): NextResponse {
    const response: AuthErrorResponse = {
      error: {
        type: AuthErrorType.INVALID_CREDENTIALS,
        code: 'INVALID_CREDENTIALS',
        message
      },
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response, { status: 401 })
  }

  /**
   * 创建验证错误响应 (400)
   */
  static validationError(
    message: string = '输入验证失败',
    validationErrors?: Record<string, string[]>
  ): NextResponse {
    const response: AuthErrorResponse = {
      error: {
        type: AuthErrorType.VALIDATION_ERROR,
        code: 'VALIDATION_ERROR',
        message,
        details: validationErrors ? { validationErrors } : undefined
      },
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response, { status: 400 })
  }

  /**
   * 创建成功响应 (200)
   */
  static success<T>(
    data: T,
    status: number = 200
  ): NextResponse {
    const response: AuthSuccessResponse<T> = {
      success: true,
      data,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response, { status })
  }

  /**
   * 创建创建成功响应 (201)
   */
  static created<T>(data: T): NextResponse {
    return this.success(data, 201)
  }

  /**
   * 创建无内容响应 (204)
   */
  static noContent(): NextResponse {
    return new NextResponse(null, { status: 204 })
  }

  /**
   * 根据错误类型自动选择响应
   */
  static fromError(
    error: Error | string,
    type?: AuthErrorType,
    details?: Record<string, any>
  ): NextResponse {
    const message = typeof error === 'string' ? error : error.message

    // 根据错误消息自动判断错误类型
    if (!type) {
      if (message.includes('未登录') || message.includes('未授权') || message.includes('会话')) {
        type = AuthErrorType.NO_SESSION
      } else if (message.includes('权限') || message.includes('管理员')) {
        type = AuthErrorType.INSUFFICIENT_PERMISSIONS
      } else if (message.includes('禁用') || message.includes('封禁')) {
        type = AuthErrorType.ACCOUNT_BANNED
      } else if (message.includes('激活')) {
        type = AuthErrorType.ACCOUNT_INACTIVE
      } else {
        type = AuthErrorType.VALIDATION_ERROR
      }
    }

    switch (type) {
      case AuthErrorType.NO_SESSION:
      case AuthErrorType.INVALID_SESSION:
      case AuthErrorType.SESSION_EXPIRED:
        return this.unauthorized(message, type, details)
      
      case AuthErrorType.INSUFFICIENT_PERMISSIONS:
        return this.forbidden(message, details)
      
      case AuthErrorType.ACCOUNT_BANNED:
        return this.accountBanned(message)
      
      case AuthErrorType.ACCOUNT_INACTIVE:
        return this.accountInactive(message)
      
      case AuthErrorType.RATE_LIMITED:
        return this.rateLimited(message)
      
      case AuthErrorType.INVALID_CREDENTIALS:
        return this.invalidCredentials(message)
      
      default:
        return this.validationError(message)
    }
  }

  /**
   * 创建自定义错误响应
   */
  static customError(
    message: string,
    code: string,
    status: number,
    type?: AuthErrorType,
    details?: Record<string, any>
  ): NextResponse {
    const response: AuthErrorResponse = {
      error: {
        type: type || AuthErrorType.VALIDATION_ERROR,
        code,
        message,
        details
      },
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response, { status })
  }
}

// 便捷的导出函数
export const authResponse = {
  unauthorized: AuthResponseBuilder.unauthorized,
  forbidden: AuthResponseBuilder.forbidden,
  sessionExpired: AuthResponseBuilder.sessionExpired,
  accountDisabled: AuthResponseBuilder.accountDisabled,
  accountBanned: AuthResponseBuilder.accountBanned,
  accountInactive: AuthResponseBuilder.accountInactive,
  rateLimited: AuthResponseBuilder.rateLimited,
  invalidCredentials: AuthResponseBuilder.invalidCredentials,
  validationError: AuthResponseBuilder.validationError,
  success: AuthResponseBuilder.success,
  created: AuthResponseBuilder.created,
  noContent: AuthResponseBuilder.noContent,
  fromError: AuthResponseBuilder.fromError,
  customError: AuthResponseBuilder.customError
}

// 类型导出
export type { AuthErrorResponse, AuthSuccessResponse }