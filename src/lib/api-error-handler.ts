import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

// 错误类型定义
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  stack?: string;
  timestamp: string;
  requestId: string;
  path: string;
  method: string;
  statusCode: number;
}

// API响应接口
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    requestId: string;
    timestamp: string;
    version?: string;
    environment?: string;
  };
}

// 错误上下文接口
export interface ErrorContext {
  route: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
  query?: Record<string, string>;
  user?: string;
  timestamp: string;
  requestId: string;
  userAgent?: string;
  ip?: string;
}

// 错误分类
export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  DATABASE = 'DATABASE',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  INTERNAL_SERVER = 'INTERNAL_SERVER',
  BAD_REQUEST = 'BAD_REQUEST',
  TIMEOUT = 'TIMEOUT'
}

// 自定义错误类
export class ApiErrorClass extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly category: ErrorCategory;
  public readonly details?: any;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    category: ErrorCategory = ErrorCategory.INTERNAL_SERVER,
    details?: any,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.category = category;
    this.details = details;
    this.isOperational = isOperational;

    // 确保堆栈跟踪正确
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiErrorClass);
    }
  }
}

// 预定义的错误类型
export const ApiErrors = {
  // 验证错误
  VALIDATION_ERROR: (details?: any) => new ApiErrorClass(
    'Validation failed',
    'VALIDATION_ERROR',
    400,
    ErrorCategory.VALIDATION,
    details
  ),

  // 认证错误
  UNAUTHORIZED: (message = 'Authentication required') => new ApiErrorClass(
    message,
    'UNAUTHORIZED',
    401,
    ErrorCategory.AUTHENTICATION
  ),

  // 授权错误
  FORBIDDEN: (message = 'Access denied') => new ApiErrorClass(
    message,
    'FORBIDDEN',
    403,
    ErrorCategory.AUTHORIZATION
  ),

  // 资源未找到
  NOT_FOUND: (resource = 'Resource') => new ApiErrorClass(
    `${resource} not found`,
    'NOT_FOUND',
    404,
    ErrorCategory.NOT_FOUND
  ),

  // 请求错误
  BAD_REQUEST: (message = 'Bad request') => new ApiErrorClass(
    message,
    'BAD_REQUEST',
    400,
    ErrorCategory.BAD_REQUEST
  ),

  // 数据库错误
  DATABASE_ERROR: (message = 'Database operation failed', details?: any) => new ApiErrorClass(
    message,
    'DATABASE_ERROR',
    500,
    ErrorCategory.DATABASE,
    details
  ),

  // 外部服务错误
  EXTERNAL_SERVICE_ERROR: (service: string, details?: any) => new ApiErrorClass(
    `External service error: ${service}`,
    'EXTERNAL_SERVICE_ERROR',
    502,
    ErrorCategory.EXTERNAL_SERVICE,
    details
  ),

  // 超时错误
  TIMEOUT_ERROR: (operation = 'Operation') => new ApiErrorClass(
    `${operation} timed out`,
    'TIMEOUT_ERROR',
    408,
    ErrorCategory.TIMEOUT
  ),

  // 限流错误
  RATE_LIMIT_ERROR: (message = 'Rate limit exceeded') => new ApiErrorClass(
    message,
    'RATE_LIMIT_ERROR',
    429,
    ErrorCategory.RATE_LIMIT
  ),

  // 内部服务器错误
  INTERNAL_SERVER_ERROR: (message = 'Internal server error', details?: any) => new ApiErrorClass(
    message,
    'INTERNAL_SERVER_ERROR',
    500,
    ErrorCategory.INTERNAL_SERVER,
    details,
    false // 非操作性错误
  )
};

// 生成唯一请求ID
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 错误日志记录器
export class ApiErrorLogger {
  private static logError(error: ApiError, context: ErrorContext): void {
    const logLevel = error.statusCode >= 500 ? 'error' : 'warn';
    const timestamp = new Date().toISOString();
    
    const logEntry = {
      timestamp,
      level: logLevel,
      requestId: context.requestId,
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        stack: error.stack
      },
      context: {
        method: context.method,
        path: context.route,
        userAgent: context.userAgent,
        ip: context.ip
      },
      details: error.details
    };

    if (logLevel === 'error') {
      console.error('🚨 API Error:', JSON.stringify(logEntry, null, 2));
    } else {
      console.warn('⚠️ API Warning:', JSON.stringify(logEntry, null, 2));
    }

    // 在生产环境中，这里可以发送到外部日志服务
    if (process.env.NODE_ENV === 'production') {
      // 发送到监控服务（如 Sentry, DataDog 等）
      // await sendToMonitoringService(logEntry);
    }
  }

  static async logApiError(error: ApiError, context: ErrorContext): Promise<void> {
    try {
      this.logError(error, context);
    } catch (logError) {
      console.error('Failed to log API error:', logError);
    }
  }
}

// 错误处理中间件
export function withErrorHandling<T = any>(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse<ApiResponse<T>>>
) {
  return async function errorHandler(
    req: NextRequest,
    context?: any
  ): Promise<NextResponse<ApiResponse<T>>> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    // 构建错误上下文
    const errorContext: ErrorContext = {
      route: req.nextUrl.pathname,
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
      timestamp: new Date().toISOString(),
      requestId,
      userAgent: req.headers.get('user-agent') || undefined,
      ip: req.headers.get('x-forwarded-for') || 
          req.headers.get('x-real-ip') || 
          'unknown'
    };

    try {
      // 尝试解析请求体（如果存在）
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        try {
          const contentType = req.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            errorContext.body = await req.clone().json();
          }
        } catch {
          // 忽略请求体解析错误
        }
      }

      // 解析查询参数
      errorContext.query = Object.fromEntries(req.nextUrl.searchParams.entries());

      // 执行处理器
      const response = await handler(req, { ...context, requestId, errorContext });
      
      // 记录成功请求（可选）
      if (process.env.NODE_ENV === 'development') {
        const duration = Date.now() - startTime;
        console.log(`✅ ${req.method} ${req.nextUrl.pathname} - ${duration}ms [${requestId}]`);
      }

      return response;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // 处理不同类型的错误
      let apiError: ApiError;

      if (error instanceof ApiErrorClass) {
        // 自定义API错误
        apiError = {
          code: error.code,
          message: error.message,
          details: error.details,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
          timestamp: new Date().toISOString(),
          requestId,
          path: errorContext.route,
          method: errorContext.method,
          statusCode: error.statusCode
        };
      } else if (error instanceof ZodError) {
        // Zod验证错误
        apiError = {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: {
            issues: error.issues.map(issue => ({
              path: issue.path.join('.'),
              message: issue.message,
              code: issue.code
            }))
          },
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
          timestamp: new Date().toISOString(),
          requestId,
          path: errorContext.route,
          method: errorContext.method,
          statusCode: 400
        };
      } else if (error instanceof Error) {
        // 标准错误
        const isOperationalError = error.message.includes('ECONNREFUSED') ||
                                  error.message.includes('timeout') ||
                                  error.message.includes('ENOTFOUND');

        apiError = {
          code: isOperationalError ? 'EXTERNAL_SERVICE_ERROR' : 'INTERNAL_SERVER_ERROR',
          message: isOperationalError ? error.message : 'An unexpected error occurred',
          details: process.env.NODE_ENV === 'development' ? { originalError: error.message } : undefined,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
          timestamp: new Date().toISOString(),
          requestId,
          path: errorContext.route,
          method: errorContext.method,
          statusCode: isOperationalError ? 502 : 500
        };
      } else {
        // 未知错误
        apiError = {
          code: 'UNKNOWN_ERROR',
          message: 'An unknown error occurred',
          details: process.env.NODE_ENV === 'development' ? { error: String(error) } : undefined,
          timestamp: new Date().toISOString(),
          requestId,
          path: errorContext.route,
          method: errorContext.method,
          statusCode: 500
        };
      }

      // 记录错误
      await ApiErrorLogger.logApiError(apiError, errorContext);

      // 构建错误响应
      const errorResponse: ApiResponse = {
        success: false,
        error: apiError,
        meta: {
          requestId,
          timestamp: apiError.timestamp,
          version: process.env.API_VERSION || '1.0.0',
          environment: process.env.NODE_ENV || 'development'
        }
      };

      console.error(`❌ ${req.method} ${req.nextUrl.pathname} - ${duration}ms [${requestId}] - ${apiError.code}: ${apiError.message}`);

      return NextResponse.json(errorResponse, { 
        status: apiError.statusCode,
        headers: {
          'X-Request-ID': requestId,
          'X-Error-Code': apiError.code
        }
      });
    }
  };
}

// 成功响应构建器
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  requestId?: string
): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      requestId: requestId || generateRequestId(),
      timestamp: new Date().toISOString(),
      version: process.env.API_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }
  };
}

// 错误响应构建器
export function createErrorResponse(
  error: ApiErrorClass,
  requestId?: string
): ApiResponse {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      requestId: requestId || generateRequestId(),
      path: '',
      method: '',
      statusCode: error.statusCode
    },
    meta: {
      requestId: requestId || generateRequestId(),
      timestamp: new Date().toISOString(),
      version: process.env.API_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }
  };
}

// 所有导出已在上面定义，无需重复导出