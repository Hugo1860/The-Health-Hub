// Admin API 标准化响应工具

import { NextRequest, NextResponse } from 'next/server'

// 标准化成功响应接口
export interface AdminApiSuccessResponse<T = any> {
  success: true
  data: T
  message?: string
  pagination?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  meta?: {
    timestamp: string
    requestId?: string
    version?: string
  }
}

// 标准化错误响应接口
export interface AdminApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: any
    field?: string // 用于表单验证错误
  }
  meta?: {
    timestamp: string
    requestId?: string
    version?: string
  }
}

// 联合类型
export type AdminApiResponse<T = any> = AdminApiSuccessResponse<T> | AdminApiErrorResponse

// 分页参数接口
export interface PaginationParams {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// 搜索参数接口
export interface SearchParams extends PaginationParams {
  query?: string
  filters?: Record<string, any>
}

// 错误代码枚举
export enum AdminApiErrorCode {
  // 认证和授权错误
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  
  // 数据验证错误
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  
  // 资源错误
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  
  // 数据库错误
  DATABASE_ERROR = 'DATABASE_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  QUERY_ERROR = 'QUERY_ERROR',
  
  // 服务器错误
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMITED = 'RATE_LIMITED',
  
  // 业务逻辑错误
  OPERATION_FAILED = 'OPERATION_FAILED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  INVALID_OPERATION = 'INVALID_OPERATION'
}

// 错误消息映射
const ERROR_MESSAGES: Record<AdminApiErrorCode, string> = {
  [AdminApiErrorCode.UNAUTHORIZED]: '未授权访问',
  [AdminApiErrorCode.FORBIDDEN]: '权限不足',
  [AdminApiErrorCode.INVALID_TOKEN]: '无效的访问令牌',
  [AdminApiErrorCode.SESSION_EXPIRED]: '会话已过期',
  
  [AdminApiErrorCode.VALIDATION_ERROR]: '数据验证失败',
  [AdminApiErrorCode.INVALID_INPUT]: '输入数据无效',
  [AdminApiErrorCode.MISSING_REQUIRED_FIELD]: '缺少必填字段',
  [AdminApiErrorCode.INVALID_FORMAT]: '数据格式错误',
  
  [AdminApiErrorCode.NOT_FOUND]: '资源不存在',
  [AdminApiErrorCode.ALREADY_EXISTS]: '资源已存在',
  [AdminApiErrorCode.RESOURCE_CONFLICT]: '资源冲突',
  
  [AdminApiErrorCode.DATABASE_ERROR]: '数据库操作失败',
  [AdminApiErrorCode.CONNECTION_ERROR]: '数据库连接失败',
  [AdminApiErrorCode.QUERY_ERROR]: '查询执行失败',
  
  [AdminApiErrorCode.INTERNAL_ERROR]: '服务器内部错误',
  [AdminApiErrorCode.SERVICE_UNAVAILABLE]: '服务暂时不可用',
  [AdminApiErrorCode.RATE_LIMITED]: '请求过于频繁',
  
  [AdminApiErrorCode.OPERATION_FAILED]: '操作执行失败',
  [AdminApiErrorCode.INSUFFICIENT_PERMISSIONS]: '权限不足',
  [AdminApiErrorCode.INVALID_OPERATION]: '无效操作'
}

// 生成请求ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 创建成功响应
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  pagination?: AdminApiSuccessResponse<T>['pagination']
): AdminApiSuccessResponse<T> {
  return {
    success: true,
    data,
    message,
    pagination,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      version: '1.0'
    }
  }
}

// 创建错误响应
export function createErrorResponse(
  code: AdminApiErrorCode,
  message?: string,
  details?: any,
  field?: string
): AdminApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message: message || ERROR_MESSAGES[code],
      details,
      field
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      version: '1.0'
    }
  }
}

// 创建分页信息
export function createPagination(
  page: number,
  pageSize: number,
  total: number
): AdminApiSuccessResponse['pagination'] {
  const totalPages = Math.ceil(total / pageSize)
  
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  }
}

// 解析分页参数
export function parsePaginationParams(request: NextRequest): PaginationParams {
  const searchParams = request.nextUrl.searchParams
  
  return {
    page: Math.max(1, parseInt(searchParams.get('page') || '1')),
    pageSize: Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '10'))),
    sortBy: searchParams.get('sortBy') || undefined,
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
  }
}

// 解析搜索参数
export function parseSearchParams(request: NextRequest): SearchParams {
  const searchParams = request.nextUrl.searchParams
  const paginationParams = parsePaginationParams(request)
  
  // 解析过滤器参数
  const filters: Record<string, any> = {}
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith('filter_')) {
      const filterKey = key.replace('filter_', '')
      filters[filterKey] = value
    }
  }
  
  return {
    ...paginationParams,
    query: searchParams.get('query') || undefined,
    filters: Object.keys(filters).length > 0 ? filters : undefined
  }
}

// NextResponse 包装器
export class AdminApiResponseBuilder {
  static success<T>(
    data: T,
    message?: string,
    pagination?: AdminApiSuccessResponse<T>['pagination'],
    status: number = 200
  ): NextResponse {
    const response = createSuccessResponse(data, message, pagination)
    return NextResponse.json(response, { status })
  }
  
  static error(
    code: AdminApiErrorCode,
    message?: string,
    details?: any,
    field?: string,
    status?: number
  ): NextResponse {
    const response = createErrorResponse(code, message, details, field)
    
    // 根据错误代码确定HTTP状态码
    const httpStatus = status || this.getHttpStatusFromErrorCode(code)
    
    return NextResponse.json(response, { status: httpStatus })
  }
  
  static created<T>(data: T, message?: string): NextResponse {
    return this.success(data, message, undefined, 201)
  }
  
  static noContent(): NextResponse {
    return new NextResponse(null, { status: 204 })
  }
  
  static badRequest(message?: string, details?: any, field?: string): NextResponse {
    return this.error(AdminApiErrorCode.VALIDATION_ERROR, message, details, field, 400)
  }
  
  static unauthorized(message?: string): NextResponse {
    return this.error(AdminApiErrorCode.UNAUTHORIZED, message, undefined, undefined, 401)
  }
  
  static forbidden(message?: string): NextResponse {
    return this.error(AdminApiErrorCode.FORBIDDEN, message, undefined, undefined, 403)
  }
  
  static notFound(message?: string): NextResponse {
    return this.error(AdminApiErrorCode.NOT_FOUND, message, undefined, undefined, 404)
  }
  
  static conflict(message?: string, details?: any): NextResponse {
    return this.error(AdminApiErrorCode.RESOURCE_CONFLICT, message, details, undefined, 409)
  }
  
  static internalError(message?: string, details?: any): NextResponse {
    return this.error(AdminApiErrorCode.INTERNAL_ERROR, message, details, undefined, 500)
  }
  
  static serviceUnavailable(message?: string): NextResponse {
    return this.error(AdminApiErrorCode.SERVICE_UNAVAILABLE, message, undefined, undefined, 503)
  }
  
  private static getHttpStatusFromErrorCode(code: AdminApiErrorCode): number {
    switch (code) {
      case AdminApiErrorCode.UNAUTHORIZED:
      case AdminApiErrorCode.INVALID_TOKEN:
      case AdminApiErrorCode.SESSION_EXPIRED:
        return 401
        
      case AdminApiErrorCode.FORBIDDEN:
      case AdminApiErrorCode.INSUFFICIENT_PERMISSIONS:
        return 403
        
      case AdminApiErrorCode.NOT_FOUND:
        return 404
        
      case AdminApiErrorCode.ALREADY_EXISTS:
      case AdminApiErrorCode.RESOURCE_CONFLICT:
        return 409
        
      case AdminApiErrorCode.VALIDATION_ERROR:
      case AdminApiErrorCode.INVALID_INPUT:
      case AdminApiErrorCode.MISSING_REQUIRED_FIELD:
      case AdminApiErrorCode.INVALID_FORMAT:
      case AdminApiErrorCode.INVALID_OPERATION:
        return 400
        
      case AdminApiErrorCode.RATE_LIMITED:
        return 429
        
      case AdminApiErrorCode.SERVICE_UNAVAILABLE:
        return 503
        
      case AdminApiErrorCode.DATABASE_ERROR:
      case AdminApiErrorCode.CONNECTION_ERROR:
      case AdminApiErrorCode.QUERY_ERROR:
      case AdminApiErrorCode.INTERNAL_ERROR:
      case AdminApiErrorCode.OPERATION_FAILED:
      default:
        return 500
    }
  }
}

// 验证工具函数
export function validateRequiredFields(
  data: Record<string, any>,
  requiredFields: string[]
): { isValid: boolean; missingFields: string[] } {
  const missingFields = requiredFields.filter(field => 
    data[field] === undefined || data[field] === null || data[field] === ''
  )
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  }
}

// 数据清理工具
export function sanitizeData<T extends Record<string, any>>(
  data: T,
  allowedFields: (keyof T)[]
): Partial<T> {
  const sanitized: Partial<T> = {}
  
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      sanitized[field] = data[field]
    }
  }
  
  return sanitized
}

// SQL注入防护 - 简单的字符串清理
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return ''
  
  return input
    .replace(/['"\\;]/g, '') // 移除危险字符
    .trim()
    .substring(0, 1000) // 限制长度
}

// 数字验证
export function validateNumber(
  value: any,
  min?: number,
  max?: number
): { isValid: boolean; value?: number; error?: string } {
  const num = Number(value)
  
  if (isNaN(num)) {
    return { isValid: false, error: '必须是有效数字' }
  }
  
  if (min !== undefined && num < min) {
    return { isValid: false, error: `数值不能小于 ${min}` }
  }
  
  if (max !== undefined && num > max) {
    return { isValid: false, error: `数值不能大于 ${max}` }
  }
  
  return { isValid: true, value: num }
}

// 邮箱验证
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// 日志记录工具
export function logAdminAction(
  action: string,
  userId: string,
  details?: Record<string, any>
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action,
    userId,
    details,
    requestId: generateRequestId()
  }
  
  console.log('Admin Action:', logEntry)
  
  // 在生产环境中，这里应该写入到专门的审计日志
  if (process.env.NODE_ENV === 'production') {
    // 写入审计日志数据库或发送到日志服务
  }
}