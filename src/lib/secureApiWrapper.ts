import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { checkRateLimit } from './validation';
import { validateCSRFToken } from './csrf';
import { securityLogger } from './securityLogger';
// Note: Importing from a 'client' hook file on the server is not ideal,
// but we follow the current project structure. A refactor could move this to a shared lib.
import { ANTD_ADMIN_PERMISSIONS, ROLE_PERMISSIONS, PermissionValue } from '@/hooks/useAntdAdminAuth';

interface SecurityOptions {
  requireAuth?: boolean;
  requiredPermissions?: PermissionValue[];
  enableRateLimit?: boolean;
  rateLimitMax?: number;
  rateLimitWindow?: number;
  requireCSRF?: boolean;
  allowedMethods?: string[];
}

// 获取客户端IP地址
const getClientIP = (req: NextRequest): string => {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
};

// 安全的API路由包装器
export const withSecurity = (
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: SecurityOptions = {}
) => {
  const {
    requireAuth = false,
    requiredPermissions = [],
    enableRateLimit = true,
    rateLimitMax = 100,
    rateLimitWindow = 60000,
    requireCSRF = false,
    allowedMethods = ['GET', 'POST', 'PUT', 'DELETE'],
  } = options;

  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // 检查HTTP方法
      if (!allowedMethods.includes(req.method || '')) {
        return NextResponse.json(
          { error: { code: 'METHOD_NOT_ALLOWED', message: '不允许的HTTP方法' } },
          { status: 405 }
        );
      }

      // 获取客户端IP
      const clientIP = getClientIP(req);

      // 身份验证检查
      let session = null;
      if (requireAuth || requiredPermissions.length > 0) {
        session = await getServerSession(authOptions);
      }

      // 速率限制检查
      if (enableRateLimit) {
        const rateLimitKey = `rate_limit:${clientIP}`;
        if (!checkRateLimit(rateLimitKey, rateLimitMax, rateLimitWindow)) {
          // 记录速率限制违规
          await securityLogger.logRateLimitExceeded(
            clientIP,
            req.url || '',
            req.headers.get('user-agent') || undefined,
            session?.user?.id
          );
          
          return NextResponse.json(
            { error: { code: 'RATE_LIMIT_EXCEEDED', message: '请求过于频繁，请稍后再试' } },
            { status: 429 }
          );
        }
      }
      
      if (requireAuth || requiredPermissions.length > 0) {
        
        if (!session?.user) {
          // 记录未授权访问
          await securityLogger.logUnauthorizedAccess(
            clientIP,
            req.url || '',
            'No valid session',
            req.headers.get('user-agent') || undefined
          );
          
          return NextResponse.json(
            { error: { code: 'UNAUTHORIZED', message: '未授权访问' } },
            { status: 401 }
          );
        }
      }

      // 权限检查
      if (requiredPermissions.length > 0) {
        const userRole = session?.user?.role;
        if (!userRole || !ROLE_PERMISSIONS[userRole]) {
            await securityLogger.logUnauthorizedAccess(clientIP, req.url || '', 'User has no role or role is invalid', req.headers.get('user-agent') || undefined, session?.user?.id);
            return NextResponse.json({ error: { code: 'FORBIDDEN', message: '权限不足' } }, { status: 403 });
        }

        const userPermissions = ROLE_PERMISSIONS[userRole];
        const hasAllPermissions = requiredPermissions.every(p => userPermissions.includes(p));

        if (!hasAllPermissions) {
            await securityLogger.logUnauthorizedAccess(clientIP, req.url || '', `Missing permissions. Required: ${requiredPermissions.join(', ')}`, req.headers.get('user-agent') || undefined, session?.user?.id);
            return NextResponse.json({ error: { code: 'FORBIDDEN', message: '权限不足' } }, { status: 403 });
        }
      }

      // CSRF保护检查
      if (requireCSRF && ['POST', 'PUT', 'DELETE'].includes(req.method || '')) {
        if (!session?.user?.id) {
          await securityLogger.logUnauthorizedAccess(
            clientIP,
            req.url || '',
            'No session for CSRF validation',
            req.headers.get('user-agent') || undefined
          );
          
          return NextResponse.json(
            { error: { code: 'UNAUTHORIZED', message: '未授权访问' } },
            { status: 401 }
          );
        }

        const csrfToken = req.headers.get('x-csrf-token');
        if (!csrfToken || !validateCSRFToken(session.user.id, csrfToken)) {
          // 记录CSRF违规
          await securityLogger.logCSRFViolation(
            clientIP,
            req.url || '',
            req.headers.get('user-agent') || undefined,
            session.user.id
          );
          
          return NextResponse.json(
            { error: { code: 'CSRF_TOKEN_INVALID', message: '无效的CSRF令牌' } },
            { status: 403 }
          );
        }
      }

      // 添加安全头
      const response = await handler(req);
      
      // 设置安全响应头
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
      
      // 如果是JSON响应，设置Content-Type
      if (response.headers.get('content-type')?.includes('application/json')) {
        response.headers.set('Content-Type', 'application/json; charset=utf-8');
      }

      return response;
    } catch (error) {
      console.error('Security wrapper error:', error);
      
      // 记录安全事件
      const clientIP = getClientIP(req);
      console.warn(`Security event from IP ${clientIP}:`, {
        method: req.method,
        url: req.url,
        userAgent: req.headers.get('user-agent'),
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } },
        { status: 500 }
      );
    }
  };
};

// 输入验证包装器
export const withInputValidation = <T>(
  handler: (req: NextRequest, validatedData: T) => Promise<NextResponse>,
  schema: any // Zod schema
) => {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      let data;
      
      if (req.method === 'GET') {
        // 从URL参数获取数据
        const url = new URL(req.url);
        data = Object.fromEntries(url.searchParams.entries());
      } else {
        // 从请求体获取数据
        const contentType = req.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
          data = await req.json();
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          const formData = await req.formData();
          data = Object.fromEntries(formData.entries());
        } else {
          return NextResponse.json(
            { error: { code: 'INVALID_CONTENT_TYPE', message: '不支持的内容类型' } },
            { status: 400 }
          );
        }
      }

      // 验证数据
      const validationResult = schema.safeParse(data);
      
      if (!validationResult.success) {
        const errors = validationResult.error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        // 记录输入验证失败
        const clientIP = getClientIP(req);
        await securityLogger.logInvalidInput(
          clientIP,
          req.url || '',
          errors,
          req.headers.get('user-agent') || undefined
        );
        
        return NextResponse.json(
          { 
            error: { 
              code: 'VALIDATION_ERROR', 
              message: '输入数据验证失败',
              details: errors 
            } 
          },
          { status: 400 }
        );
      }

      return handler(req, validationResult.data);
    } catch (error) {
      console.error('Input validation error:', error);
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } },
        { status: 500 }
      );
    }
  };
};

// 组合多个包装器
export const withSecurityAndValidation = <T>(
  handler: (req: NextRequest, validatedData: T) => Promise<NextResponse>,
  schema: any,
  securityOptions: SecurityOptions = {}
) => {
  return withSecurity(
    withInputValidation(handler, schema),
    securityOptions
  );
};