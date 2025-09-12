/**
 * 性能监控中间件
 * 自动记录API请求的性能指标
 */

import { NextRequest, NextResponse } from 'next/server';
import PerformanceOptimizer from './performance-optimizer';

export interface PerformanceMiddlewareOptions {
  enabled?: boolean;
  excludePaths?: string[];
  slowRequestThreshold?: number; // 毫秒
}

export function withPerformanceMonitoring(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  options: PerformanceMiddlewareOptions = {}
) {
  const {
    enabled = process.env.NODE_ENV === 'production',
    excludePaths = ['/api/health', '/api/performance'],
    slowRequestThreshold = 5000
  } = options;

  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    if (!enabled) {
      return handler(req, context);
    }

    const startTime = Date.now();
    const url = new URL(req.url);
    const pathname = url.pathname;

    // 跳过排除的路径
    if (excludePaths.some(path => pathname.startsWith(path))) {
      return handler(req, context);
    }

    let response: NextResponse;
    let error: Error | undefined;

    try {
      response = await handler(req, context);
    } catch (err) {
      error = err instanceof Error ? err : new Error('Unknown error');
      throw err;
    } finally {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // 记录性能指标
      try {
        const performanceOptimizer = PerformanceOptimizer.getInstance();
        
        performanceOptimizer.recordApiMetrics({
          timestamp: new Date().toISOString(),
          endpoint: pathname,
          method: req.method,
          responseTime,
          statusCode: response?.status || (error ? 500 : 200),
          userAgent: req.headers.get('user-agent') || undefined,
          ip: getClientIP(req),
          error: error?.message
        });

        // 记录慢请求
        if (responseTime > slowRequestThreshold) {
          console.warn(`Slow request detected: ${req.method} ${pathname} - ${responseTime}ms`);
        }
      } catch (metricsError) {
        console.error('Failed to record performance metrics:', metricsError);
      }
    }

    return response!;
  };
}

/**
 * 获取客户端IP地址
 */
function getClientIP(req: NextRequest): string | undefined {
  // 尝试从各种头部获取真实IP
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // 从连接信息获取（在某些环境中可能不可用）
  try {
    return req.ip;
  } catch {
    return undefined;
  }
}

/**
 * 数据库查询性能监控装饰器
 */
export function withQueryPerformanceMonitoring<T extends (...args: any[]) => Promise<any>>(
  queryFunction: T,
  queryName?: string
): T {
  return (async (...args: any[]) => {
    const startTime = Date.now();
    let error: Error | undefined;
    let result: any;

    try {
      result = await queryFunction(...args);
      return result;
    } catch (err) {
      error = err instanceof Error ? err : new Error('Unknown error');
      throw err;
    } finally {
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      try {
        const performanceOptimizer = PerformanceOptimizer.getInstance();
        
        performanceOptimizer.recordQueryMetrics({
          query: queryName || 'Unknown query',
          executionTime,
          rowsAffected: Array.isArray(result) ? result.length : (result?.changes || 0),
          timestamp: new Date().toISOString(),
          error: error?.message
        });
      } catch (metricsError) {
        console.error('Failed to record query metrics:', metricsError);
      }
    }
  }) as T;
}

export default withPerformanceMonitoring;