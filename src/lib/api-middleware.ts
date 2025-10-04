import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, ApiResponse, generateRequestId } from './api-error-handler';
import { ValidationConfig, RequestValidator, ValidationResult } from './api-validation';

// 中间件配置接口
export interface MiddlewareConfig {
  validation?: ValidationConfig;
  auth?: boolean;
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
  cors?: {
    origin?: string | string[];
    methods?: string[];
    headers?: string[];
    credentials?: boolean;
  };
  logging?: boolean;
  timeout?: number;
}

// 请求上下文接口
export interface RequestContext {
  requestId: string;
  startTime: number;
  user?: any;
  validated?: ValidationResult;
  ip: string;
  userAgent: string;
}

// 中间件处理器类型
export type MiddlewareHandler<T = any> = (
  req: NextRequest,
  context: RequestContext,
  params?: any
) => Promise<NextResponse<ApiResponse<T>>>;

// 速率限制存储（简单内存实现，生产环境应使用Redis）
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// CORS中间件
function applyCors(
  response: NextResponse,
  config: MiddlewareConfig['cors']
): NextResponse {
  if (!config) return response;

  const { origin = '*', methods = ['GET', 'POST', 'PUT', 'DELETE'], headers = ['*'], credentials = false } = config;

  // 设置CORS头
  if (Array.isArray(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin.join(', '));
  } else {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  response.headers.set('Access-Control-Allow-Methods', methods.join(', '));
  response.headers.set('Access-Control-Allow-Headers', headers.join(', '));
  
  if (credentials) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return response;
}

// 速率限制中间件
function checkRateLimit(
  req: NextRequest,
  config: MiddlewareConfig['rateLimit'],
  ip: string
): void {
  if (!config) return;

  const { requests, windowMs } = config;
  const now = Date.now();
  const key = `${ip}:${req.nextUrl.pathname}`;
  
  const current = rateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    // 新窗口或过期，重置计数
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return;
  }
  
  if (current.count >= requests) {
    throw new Error(`Rate limit exceeded. Max ${requests} requests per ${windowMs}ms`);
  }
  
  // 增加计数
  current.count++;
  rateLimitStore.set(key, current);
}

// 简单认证中间件（示例）
async function checkAuth(req: NextRequest): Promise<any> {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader) {
    throw new Error('Authorization header required');
  }
  
  // 这里应该实现实际的认证逻辑
  // 例如验证JWT token、API key等
  
  // 示例：简单的Bearer token检查
  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('Invalid authorization format');
  }
  
  const token = authHeader.substring(7);
  
  // 在实际应用中，这里应该验证token并返回用户信息
  if (token === 'invalid') {
    throw new Error('Invalid token');
  }
  
  return { id: 'user123', name: 'Test User' }; // 示例用户
}

// 超时中间件
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs);
    })
  ]);
}

// 主要的API中间件组合器
export function withApiMiddleware<T = any>(
  handler: MiddlewareHandler<T>,
  config: MiddlewareConfig = {}
) {
  return withErrorHandling(async (req: NextRequest, routeContext?: any) => {
    const requestId = generateRequestId();
    const startTime = Date.now();
    
    // 获取客户端信息
    const ip = req.headers.get('x-forwarded-for') || 
               req.headers.get('x-real-ip') || 
               'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    
    // 构建请求上下文
    const context: RequestContext = {
      requestId,
      startTime,
      ip,
      userAgent
    };

    try {
      // 1. 速率限制检查
      if (config.rateLimit) {
        checkRateLimit(req, config.rateLimit, ip);
      }

      // 2. 认证检查
      if (config.auth) {
        context.user = await checkAuth(req);
      }

      // 3. 请求验证
      if (config.validation) {
        context.validated = await RequestValidator.validateRequest(
          req,
          config.validation,
          routeContext?.params
        );
      }

      // 4. 执行主处理器（可能带超时）
      let response: NextResponse<ApiResponse<T>>;
      
      if (config.timeout) {
        response = await withTimeout(
          handler(req, context, routeContext?.params),
          config.timeout
        );
      } else {
        response = await handler(req, context, routeContext?.params);
      }

      // 5. 应用CORS
      if (config.cors) {
        response = applyCors(response, config.cors);
      }

      // 6. 添加通用响应头
      response.headers.set('X-Request-ID', requestId);
      response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);

      // 7. 记录请求日志
      if (config.logging !== false) {
        const duration = Date.now() - startTime;
        console.log(`📝 ${req.method} ${req.nextUrl.pathname} - ${duration}ms [${requestId}] - ${response.status}`);
      }

      return response;

    } catch (error) {
      // 错误会被 withErrorHandling 捕获和处理
      throw error;
    }
  });
}

// 预配置的中间件组合
export const apiMiddleware = {
  // 基础API中间件（只有错误处理和日志）
  basic: <T = any>(handler: MiddlewareHandler<T>) =>
    withApiMiddleware(handler, { logging: true }),

  // 带验证的API中间件
  withValidation: <T = any>(
    handler: MiddlewareHandler<T>,
    validation: ValidationConfig
  ) =>
    withApiMiddleware(handler, { validation, logging: true }),

  // 带认证的API中间件
  withAuth: <T = any>(handler: MiddlewareHandler<T>) =>
    withApiMiddleware(handler, { auth: true, logging: true }),

  // 带认证和验证的API中间件
  withAuthAndValidation: <T = any>(
    handler: MiddlewareHandler<T>,
    validation: ValidationConfig
  ) =>
    withApiMiddleware(handler, { auth: true, validation, logging: true }),

  // 公共API中间件（带CORS和速率限制）
  public: <T = any>(handler: MiddlewareHandler<T>) =>
    withApiMiddleware(handler, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        headers: ['Content-Type', 'Authorization']
      },
      rateLimit: {
        requests: 100,
        windowMs: 60000 // 1分钟
      },
      logging: true
    }),

  // 管理员API中间件（带认证、验证和严格的速率限制）
  admin: <T = any>(
    handler: MiddlewareHandler<T>,
    validation?: ValidationConfig
  ) =>
    withApiMiddleware(handler, {
      auth: true,
      validation,
      rateLimit: {
        requests: 50,
        windowMs: 60000 // 1分钟
      },
      timeout: 30000, // 30秒超时
      logging: true
    })
};

// 工具函数：创建成功响应
export function createApiResponse<T>(
  data: T,
  message?: string,
  requestId?: string
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      requestId: requestId || generateRequestId(),
      timestamp: new Date().toISOString(),
      version: process.env.API_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }
  };

  return NextResponse.json(response);
}

// 工具函数：创建分页响应
export function createPaginatedResponse<T>(
  data: T[],
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  },
  requestId?: string
): NextResponse<ApiResponse<{ items: T[]; pagination: typeof pagination }>> {
  const response: ApiResponse<{ items: T[]; pagination: typeof pagination }> = {
    success: true,
    data: {
      items: data,
      pagination
    },
    meta: {
      requestId: requestId || generateRequestId(),
      timestamp: new Date().toISOString(),
      version: process.env.API_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }
  };

  return NextResponse.json(response);
}

// 所有导出已在上面定义，无需重复导出