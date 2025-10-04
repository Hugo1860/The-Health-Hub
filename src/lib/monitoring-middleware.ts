/**
 * 监控中间件
 * 自动记录API请求性能指标和日志
 */

import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from './performance-monitor';
import { defaultLogger } from './structured-logger';

interface RequestContext {
  requestId: string;
  startTime: number;
  method: string;
  url: string;
  userAgent?: string;
  ip?: string;
  userId?: string;
}

/**
 * API监控中间件包装器
 */
export function withMonitoring<T extends any[]>(
  handler: (req: NextRequest, ...args: T) => Promise<NextResponse>,
  options: {
    operationName?: string;
    logRequestBody?: boolean;
    logResponseBody?: boolean;
    trackPerformance?: boolean;
  } = {}
) {
  return async (req: NextRequest, ...args: T): Promise<NextResponse> => {
    const startTime = Date.now();
    const requestId = generateRequestId();
    
    // 提取请求信息
    const context: RequestContext = {
      requestId,
      startTime,
      method: req.method,
      url: req.url,
      userAgent: req.headers.get('user-agent') || undefined,
      ip: getClientIP(req),
      userId: extractUserId(req)
    };

    // 记录请求开始
    defaultLogger.info(
      `API Request Started: ${context.method} ${getPathFromUrl(context.url)}`,
      {
        requestId: context.requestId,
        method: context.method,
        url: getPathFromUrl(context.url),
        userAgent: context.userAgent,
        ip: context.ip,
        userId: context.userId,
        ...(options.logRequestBody && await getRequestBody(req))
      },
      {
        requestId: context.requestId,
        method: context.method,
        url: context.url,
        ip: context.ip,
        userAgent: context.userAgent,
        userId: context.userId,
        tags: ['api-request']
      }
    );

    let response: NextResponse;
    let error: Error | null = null;

    try {
      // 执行原始处理器
      response = await handler(req, ...args);
    } catch (err) {
      error = err as Error;
      
      // 创建错误响应
      response = NextResponse.json({
        success: false,
        error: {
          message: error.message,
          requestId: context.requestId,
          timestamp: new Date().toISOString()
        }
      }, { status: 500 });
    }

    const duration = Date.now() - startTime;
    const statusCode = response.status;

    // 记录性能指标
    if (options.trackPerformance !== false) {
      performanceMonitor.recordApiMetrics({
        endpoint: getPathFromUrl(context.url),
        method: context.method,
        responseTime: duration,
        statusCode,
        requestSize: await getRequestSize(req),
        responseSize: getResponseSize(response),
        userAgent: context.userAgent,
        ip: context.ip,
        userId: context.userId
      });
    }

    // 记录请求完成日志
    const logLevel = error ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    const logMessage = `API Request ${error ? 'Failed' : 'Completed'}: ${context.method} ${getPathFromUrl(context.url)}`;
    
    const logContext = {
      requestId: context.requestId,
      method: context.method,
      url: getPathFromUrl(context.url),
      statusCode,
      duration,
      userAgent: context.userAgent,
      ip: context.ip,
      userId: context.userId,
      ...(options.logResponseBody && await getResponseBody(response)),
      ...(error && { error: { name: error.name, message: error.message, stack: error.stack } })
    };

    const requestContext = {
      requestId: context.requestId,
      method: context.method,
      url: context.url,
      statusCode,
      duration,
      ip: context.ip,
      userAgent: context.userAgent,
      userId: context.userId,
      tags: ['api-response']
    };

    if (error) {
      defaultLogger.error(logMessage, error, logContext, requestContext);
    } else if (logLevel === 'warn') {
      defaultLogger.warn(logMessage, logContext, requestContext);
    } else {
      defaultLogger.info(logMessage, logContext, requestContext);
    }

    // 添加响应头
    response.headers.set('X-Request-ID', context.requestId);
    response.headers.set('X-Response-Time', `${duration}ms`);

    return response;
  };
}

/**
 * 数据库操作监控装饰器
 */
export function withDatabaseMonitoring<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  operationName: string,
  options: {
    logQuery?: boolean;
    trackPerformance?: boolean;
  } = {}
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    const requestId = generateRequestId();

    // 尝试提取查询信息
    const query = extractQueryFromArgs(args);

    defaultLogger.database(
      operationName,
      query || 'Unknown query',
      0,
      {
        requestId,
        operationName,
        ...(options.logQuery && { query })
      }
    );

    try {
      const result = await operation(...args);
      const duration = Date.now() - startTime;

      // 记录性能指标
      if (options.trackPerformance !== false) {
        performanceMonitor.recordDatabaseMetrics({
          operation: operationName,
          query: query || 'Unknown query',
          duration,
          rowsAffected: extractRowsAffected(result),
          connectionId: requestId
        });
      }

      defaultLogger.database(
        operationName,
        query || 'Unknown query',
        duration,
        {
          requestId,
          operationName,
          duration,
          success: true,
          rowsAffected: extractRowsAffected(result)
        }
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      defaultLogger.error(
        `Database operation failed: ${operationName}`,
        error as Error,
        {
          requestId,
          operationName,
          duration,
          query: query || 'Unknown query'
        },
        {
          tags: ['database-error']
        }
      );

      throw error;
    }
  };
}

/**
 * 业务操作监控装饰器
 */
export function withBusinessMonitoring<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  eventName: string,
  options: {
    logArgs?: boolean;
    logResult?: boolean;
    trackPerformance?: boolean;
  } = {}
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    const requestId = generateRequestId();

    defaultLogger.business(
      `${eventName} started`,
      {
        requestId,
        eventName,
        ...(options.logArgs && { args: JSON.stringify(args).substring(0, 500) })
      },
      {
        requestId,
        tags: ['business-event']
      }
    );

    try {
      const result = await operation(...args);
      const duration = Date.now() - startTime;

      // 记录性能指标
      if (options.trackPerformance !== false) {
        performanceMonitor.recordMetric(
          `business_operation_${eventName}`,
          duration,
          'ms',
          { operation: eventName, status: 'success' }
        );
      }

      defaultLogger.business(
        `${eventName} completed`,
        {
          requestId,
          eventName,
          duration,
          success: true,
          ...(options.logResult && { result: JSON.stringify(result).substring(0, 500) })
        },
        {
          requestId,
          tags: ['business-event']
        }
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      // 记录性能指标
      if (options.trackPerformance !== false) {
        performanceMonitor.recordMetric(
          `business_operation_${eventName}`,
          duration,
          'ms',
          { operation: eventName, status: 'error' }
        );
      }

      defaultLogger.error(
        `Business operation failed: ${eventName}`,
        error as Error,
        {
          requestId,
          eventName,
          duration,
          ...(options.logArgs && { args: JSON.stringify(args).substring(0, 500) })
        },
        {
          requestId,
          tags: ['business-error']
        }
      );

      throw error;
    }
  };
}

// 辅助函数

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getClientIP(req: NextRequest): string | undefined {
  return req.headers.get('x-forwarded-for')?.split(',')[0] ||
         req.headers.get('x-real-ip') ||
         req.headers.get('x-client-ip') ||
         undefined;
}

function extractUserId(req: NextRequest): string | undefined {
  // 这里可以根据实际的认证机制来提取用户ID
  // 例如从JWT token、session或cookie中提取
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    try {
      // 简化的JWT解析示例
      const token = authHeader.substring(7);
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId || payload.sub;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function getPathFromUrl(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

async function getRequestBody(req: NextRequest): Promise<{ requestBody?: any }> {
  try {
    const body = await req.clone().text();
    if (body) {
      return { requestBody: JSON.parse(body) };
    }
  } catch {
    // 忽略解析错误
  }
  return {};
}

async function getRequestSize(req: NextRequest): Promise<number> {
  try {
    const body = await req.clone().text();
    return new TextEncoder().encode(body).length;
  } catch {
    return 0;
  }
}

function getResponseSize(response: NextResponse): number {
  const contentLength = response.headers.get('content-length');
  if (contentLength) {
    return parseInt(contentLength, 10);
  }
  return 0;
}

async function getResponseBody(response: NextResponse): Promise<{ responseBody?: any }> {
  try {
    const body = await response.clone().text();
    if (body) {
      return { responseBody: JSON.parse(body) };
    }
  } catch {
    // 忽略解析错误
  }
  return {};
}

function extractQueryFromArgs(args: any[]): string | undefined {
  // 尝试从参数中提取SQL查询
  for (const arg of args) {
    if (typeof arg === 'string' && (
      arg.toLowerCase().includes('select') ||
      arg.toLowerCase().includes('insert') ||
      arg.toLowerCase().includes('update') ||
      arg.toLowerCase().includes('delete')
    )) {
      return arg;
    }
  }
  return undefined;
}

function extractRowsAffected(result: any): number | undefined {
  if (result && typeof result === 'object') {
    if (Array.isArray(result)) {
      return result.length;
    }
    if (typeof result.changes === 'number') {
      return result.changes;
    }
    if (typeof result.rowCount === 'number') {
      return result.rowCount;
    }
  }
  return undefined;
}

// 导出已在函数声明时完成，无需重复导出