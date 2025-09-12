// PostgreSQL API中间件 - 统一错误处理

import { NextRequest, NextResponse } from 'next/server';
import { handlePostgreSQLError, isPostgreSQLError, PostgreSQLErrorHandler } from './postgresql-error-handler';

// API处理函数类型
type ApiHandler = (req: NextRequest, context?: any) => Promise<Response>;

// PostgreSQL API中间件配置
interface PostgreSQLApiMiddlewareConfig {
  enableErrorLogging?: boolean;
  enableRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  enableMetrics?: boolean;
}

// 默认配置
const DEFAULT_CONFIG: PostgreSQLApiMiddlewareConfig = {
  enableErrorLogging: true,
  enableRetry: true,
  maxRetries: 3,
  retryDelay: 1000,
  enableMetrics: true
};

// PostgreSQL API中间件类
export class PostgreSQLApiMiddleware {
  private config: PostgreSQLApiMiddlewareConfig;

  constructor(config: Partial<PostgreSQLApiMiddlewareConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 包装API处理函数，添加PostgreSQL错误处理
   */
  wrap(handler: ApiHandler): ApiHandler {
    return async (req: NextRequest, context?: any) => {
      const requestId = this.generateRequestId();
      const startTime = Date.now();

      try {
        // 执行API处理函数
        const response = await this.executeWithRetry(
          () => handler(req, { ...context, requestId }),
          requestId
        );

        // 记录成功指标
        if (this.config.enableMetrics) {
          this.recordMetrics('success', Date.now() - startTime, requestId);
        }

        return response;

      } catch (error) {
        // 处理PostgreSQL错误
        if (isPostgreSQLError(error)) {
          const apiError = handlePostgreSQLError(error, undefined, undefined, requestId, {
            url: req.url,
            method: req.method,
            userAgent: req.headers.get('user-agent')
          });

          // 记录失败指标
          if (this.config.enableMetrics) {
            this.recordMetrics('error', Date.now() - startTime, requestId, apiError.error.type);
          }

          return NextResponse.json(apiError, {
            status: this.getHttpStatusFromError(apiError.error.type),
            headers: {
              'X-Request-ID': requestId,
              'X-Error-Type': apiError.error.type,
              'X-Error-Code': apiError.error.code
            }
          });
        }

        // 处理其他错误
        console.error(`[API Error] ${requestId}:`, error);
        
        if (this.config.enableMetrics) {
          this.recordMetrics('error', Date.now() - startTime, requestId, 'UNKNOWN');
        }

        return NextResponse.json({
          success: false,
          error: {
            type: 'INTERNAL_ERROR',
            code: 'UNKNOWN',
            message: '服务器内部错误',
            retryable: false,
            timestamp: new Date().toISOString(),
            requestId
          }
        }, {
          status: 500,
          headers: {
            'X-Request-ID': requestId
          }
        });
      }
    };
  }

  /**
   * 带重试的执行
   */
  private async executeWithRetry(
    operation: () => Promise<Response>,
    requestId: string
  ): Promise<Response> {
    if (!this.config.enableRetry) {
      return operation();
    }

    let lastError: any;
    
    for (let attempt = 0; attempt < (this.config.maxRetries || 3); attempt++) {
      try {
        if (attempt > 0) {
          const delay = (this.config.retryDelay || 1000) * Math.pow(2, attempt - 1);
          console.log(`[Retry] ${requestId}: Attempt ${attempt + 1} after ${delay}ms delay`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        return await operation();

      } catch (error) {
        lastError = error;

        // 检查是否可重试
        if (isPostgreSQLError(error)) {
          const pgError = PostgreSQLErrorHandler.parseError(error);
          if (!PostgreSQLErrorHandler.isRetryable(pgError)) {
            throw error;
          }
        } else {
          // 非PostgreSQL错误不重试
          throw error;
        }

        console.warn(`[Retry] ${requestId}: Attempt ${attempt + 1} failed, retrying...`, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    throw lastError;
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `pg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * 根据错误类型获取HTTP状态码
   */
  private getHttpStatusFromError(errorType: string): number {
    switch (errorType) {
      case 'CONNECTION':
        return 503; // Service Unavailable
      case 'PERMISSION':
        return 403; // Forbidden
      case 'CONSTRAINT':
        return 400; // Bad Request
      case 'QUERY':
        return 400; // Bad Request
      case 'TIMEOUT':
        return 408; // Request Timeout
      case 'TRANSACTION':
        return 409; // Conflict
      default:
        return 500; // Internal Server Error
    }
  }

  /**
   * 记录指标
   */
  private recordMetrics(
    status: 'success' | 'error',
    duration: number,
    requestId: string,
    errorType?: string
  ): void {
    const metrics = {
      timestamp: new Date().toISOString(),
      requestId,
      status,
      duration,
      errorType
    };

    console.log(`[Metrics] PostgreSQL API ${status}:`, metrics);

    // 这里可以集成到监控系统，如Prometheus、DataDog等
    // 例如：metricsCollector.record(metrics);
  }
}

// 全局中间件实例
export const postgresqlApiMiddleware = new PostgreSQLApiMiddleware();

// 便捷函数
export function withPostgreSQLErrorHandling(handler: ApiHandler): ApiHandler {
  return postgresqlApiMiddleware.wrap(handler);
}

// 创建带配置的中间件
export function createPostgreSQLApiMiddleware(config: Partial<PostgreSQLApiMiddlewareConfig>) {
  return new PostgreSQLApiMiddleware(config);
}

export default PostgreSQLApiMiddleware;