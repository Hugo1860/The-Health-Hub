// Admin API 错误处理中间件

import { NextRequest, NextResponse } from 'next/server'
import { AdminApiResponseBuilder, AdminApiErrorCode, logAdminAction } from './adminApiUtils'
import { AuthenticatedAdmin } from './adminAuthMiddleware'

// 错误类型定义
export class AdminApiError extends Error {
  constructor(
    public code: AdminApiErrorCode,
    message: string,
    public details?: any,
    public field?: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'AdminApiError'
  }
}

// 数据库错误类
export class DatabaseError extends AdminApiError {
  constructor(message: string, details?: any) {
    super(AdminApiErrorCode.DATABASE_ERROR, message, details, undefined, 500)
    this.name = 'DatabaseError'
  }
}

// 验证错误类
export class ValidationError extends AdminApiError {
  constructor(message: string, field?: string, details?: any) {
    super(AdminApiErrorCode.VALIDATION_ERROR, message, details, field, 400)
    this.name = 'ValidationError'
  }
}

// 权限错误类
export class PermissionError extends AdminApiError {
  constructor(message: string = '权限不足') {
    super(AdminApiErrorCode.INSUFFICIENT_PERMISSIONS, message, undefined, undefined, 403)
    this.name = 'PermissionError'
  }
}

// 资源不存在错误类
export class NotFoundError extends AdminApiError {
  constructor(resource: string = '资源') {
    super(AdminApiErrorCode.NOT_FOUND, `${resource}不存在`, undefined, undefined, 404)
    this.name = 'NotFoundError'
  }
}

// 资源冲突错误类
export class ConflictError extends AdminApiError {
  constructor(message: string, details?: any) {
    super(AdminApiErrorCode.RESOURCE_CONFLICT, message, details, undefined, 409)
    this.name = 'ConflictError'
  }
}

// 错误日志记录接口
interface ErrorLogEntry {
  timestamp: string
  errorType: string
  errorCode: AdminApiErrorCode
  message: string
  details?: any
  stack?: string
  request: {
    method: string
    url: string
    headers: Record<string, string>
    body?: any
  }
  admin?: {
    id: string
    username: string
    role: string
  }
  severity: 'low' | 'medium' | 'high' | 'critical'
}

// 错误严重程度映射
const ERROR_SEVERITY_MAP: Record<AdminApiErrorCode, ErrorLogEntry['severity']> = {
  [AdminApiErrorCode.UNAUTHORIZED]: 'medium',
  [AdminApiErrorCode.FORBIDDEN]: 'medium',
  [AdminApiErrorCode.INVALID_TOKEN]: 'medium',
  [AdminApiErrorCode.SESSION_EXPIRED]: 'low',
  
  [AdminApiErrorCode.VALIDATION_ERROR]: 'low',
  [AdminApiErrorCode.INVALID_INPUT]: 'low',
  [AdminApiErrorCode.MISSING_REQUIRED_FIELD]: 'low',
  [AdminApiErrorCode.INVALID_FORMAT]: 'low',
  
  [AdminApiErrorCode.NOT_FOUND]: 'low',
  [AdminApiErrorCode.ALREADY_EXISTS]: 'low',
  [AdminApiErrorCode.RESOURCE_CONFLICT]: 'medium',
  
  [AdminApiErrorCode.DATABASE_ERROR]: 'critical',
  [AdminApiErrorCode.CONNECTION_ERROR]: 'critical',
  [AdminApiErrorCode.QUERY_ERROR]: 'high',
  
  [AdminApiErrorCode.INTERNAL_ERROR]: 'critical',
  [AdminApiErrorCode.SERVICE_UNAVAILABLE]: 'high',
  [AdminApiErrorCode.RATE_LIMITED]: 'medium',
  
  [AdminApiErrorCode.OPERATION_FAILED]: 'medium',
  [AdminApiErrorCode.INSUFFICIENT_PERMISSIONS]: 'medium',
  [AdminApiErrorCode.INVALID_OPERATION]: 'low'
}

// 记录错误日志
async function logError(
  error: Error | AdminApiError,
  request: NextRequest,
  admin?: AuthenticatedAdmin
): Promise<void> {
  const isAdminError = error instanceof AdminApiError
  const errorCode = isAdminError ? error.code : AdminApiErrorCode.INTERNAL_ERROR
  const severity = ERROR_SEVERITY_MAP[errorCode] || 'medium'
  
  // 获取请求体（如果存在）
  let requestBody: any
  try {
    if (request.method !== 'GET' && request.method !== 'DELETE') {
      const clonedRequest = request.clone()
      requestBody = await clonedRequest.json().catch(() => null)
    }
  } catch {
    // 忽略请求体解析错误
  }
  
  const logEntry: ErrorLogEntry = {
    timestamp: new Date().toISOString(),
    errorType: error.constructor.name,
    errorCode,
    message: error.message,
    details: isAdminError ? error.details : undefined,
    stack: error.stack,
    request: {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
      body: requestBody
    },
    admin: admin ? {
      id: admin.id,
      username: admin.username,
      role: admin.role
    } : undefined,
    severity
  }
  
  // 控制台输出
  console.error('Admin API Error:', logEntry)
  
  // 记录管理员操作日志
  if (admin) {
    logAdminAction('API_ERROR', admin.id, {
      errorCode,
      errorMessage: error.message,
      endpoint: request.url,
      severity
    })
  }
  
  // 在生产环境中，发送到错误监控服务
  if (process.env.NODE_ENV === 'production') {
    try {
      // 这里可以集成 Sentry、LogRocket 等错误监控服务
      // await sendToErrorMonitoring(logEntry)
      
      // 对于严重错误，可以发送告警通知
      if (severity === 'critical') {
        // await sendCriticalErrorAlert(logEntry)
      }
    } catch (monitoringError) {
      console.error('Failed to send error to monitoring service:', monitoringError)
    }
  }
}

// 错误处理中间件
export function withErrorHandling(
  handler: (request: NextRequest, ...args: any[]) => Promise<Response>
) {
  return async function(request: NextRequest, ...args: any[]): Promise<Response> {
    try {
      return await handler(request, ...args)
    } catch (error) {
      // 从request中获取admin信息（如果存在）
      const admin = (request as any).admin as AuthenticatedAdmin | undefined
      
      // 记录错误
      await logError(error as Error, request, admin)
      
      // 处理不同类型的错误
      if (error instanceof AdminApiError) {
        return AdminApiResponseBuilder.error(
          error.code,
          error.message,
          error.details,
          error.field,
          error.statusCode
        )
      }
      
      // 处理数据库连接错误
      if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
        return AdminApiResponseBuilder.error(
          AdminApiErrorCode.CONNECTION_ERROR,
          '数据库连接失败，请稍后重试'
        )
      }
      
      // 处理数据库查询错误
      if (error instanceof Error && (
        error.message.includes('syntax error') ||
        error.message.includes('relation') ||
        error.message.includes('column')
      )) {
        return AdminApiResponseBuilder.error(
          AdminApiErrorCode.QUERY_ERROR,
          '数据查询失败'
        )
      }
      
      // 处理JSON解析错误
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        return AdminApiResponseBuilder.badRequest('请求数据格式错误')
      }
      
      // 处理网络超时错误
      if (error instanceof Error && error.name === 'AbortError') {
        return AdminApiResponseBuilder.error(
          AdminApiErrorCode.SERVICE_UNAVAILABLE,
          '请求超时，请稍后重试'
        )
      }
      
      // 默认内部服务器错误
      console.error('Unhandled error in admin API:', error)
      return AdminApiResponseBuilder.internalError(
        process.env.NODE_ENV === 'development' 
          ? (error as Error).message 
          : '服务器内部错误'
      )
    }
  }
}

// 数据库操作错误处理装饰器
export function withDatabaseErrorHandling<T extends any[], R>(
  operation: (...args: T) => Promise<R>
) {
  return async function(...args: T): Promise<R> {
    try {
      return await operation(...args)
    } catch (error) {
      console.error('Database operation failed:', error)
      
      if (error instanceof Error) {
        // 连接错误
        if (error.message.includes('ECONNREFUSED') || 
            error.message.includes('connection') ||
            error.message.includes('timeout')) {
          throw new DatabaseError('数据库连接失败')
        }
        
        // 查询语法错误
        if (error.message.includes('syntax error') ||
            error.message.includes('invalid') ||
            error.message.includes('malformed')) {
          throw new DatabaseError('数据库查询语法错误')
        }
        
        // 约束违反错误
        if (error.message.includes('constraint') ||
            error.message.includes('duplicate') ||
            error.message.includes('unique')) {
          throw new ConflictError('数据约束冲突', { originalError: error.message })
        }
        
        // 权限错误
        if (error.message.includes('permission') ||
            error.message.includes('access denied')) {
          throw new DatabaseError('数据库访问权限不足')
        }
      }
      
      // 默认数据库错误
      throw new DatabaseError('数据库操作失败', { originalError: error })
    }
  }
}

// 验证错误处理工具
export function createValidationError(
  field: string,
  message: string,
  value?: any
): ValidationError {
  return new ValidationError(
    `字段 "${field}" ${message}`,
    field,
    { value, field }
  )
}

// 批量验证错误处理
export function createBatchValidationError(
  errors: Array<{ field: string; message: string; value?: any }>
): ValidationError {
  const errorMessages = errors.map(e => `${e.field}: ${e.message}`).join(', ')
  return new ValidationError(
    `数据验证失败: ${errorMessages}`,
    undefined,
    { errors }
  )
}

// 异步操作超时处理
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 30000,
  errorMessage: string = '操作超时'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new AdminApiError(
          AdminApiErrorCode.SERVICE_UNAVAILABLE,
          errorMessage
        ))
      }, timeoutMs)
    })
  ])
}

// 重试机制
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      
      // 如果是不可重试的错误，直接抛出
      if (error instanceof ValidationError ||
          error instanceof PermissionError ||
          error instanceof NotFoundError) {
        throw error
      }
      
      // 如果是最后一次尝试，抛出错误
      if (attempt === maxRetries) {
        break
      }
      
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt))
    }
  }
  
  throw lastError!
}