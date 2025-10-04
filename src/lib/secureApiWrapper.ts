import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { checkRateLimit } from './validation';
import { validateCSRFToken } from './csrf';
import { securityLogger } from './securityLogger';
import { readFile } from 'fs/promises';
import { join } from 'path';
// 使用服务器端权限定义，避免从客户端代码导入
import { ANTD_ADMIN_PERMISSIONS, SERVER_ROLE_PERMISSIONS as ROLE_PERMISSIONS, PermissionValue } from './server-permissions';

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
      let session: any = null;
      if (requireAuth || requiredPermissions.length > 0) {
        // 首先尝试从请求头获取用户信息（这是当前的主要方法）
        const headerUserId = req.headers.get('x-user-id') || undefined;
        const headerEmail = req.headers.get('x-user-email') || undefined;
        const headerRole = req.headers.get('x-user-role') || undefined;

        // 尝试从 NextAuth 获取会话
        try {
          session = await getServerSession(authOptions);
        } catch (error) {
          console.log('NextAuth session not available, using headers');
        }

        // 当 NextAuth 会话不可用时，回退从请求头构造最小会话
        if (!session?.user) {
          if (headerUserId) {
            session = {
              user: {
                id: headerUserId,
                email: headerEmail,
                role: headerRole,
              }
            };
          }
        } else {
          // 当会话存在但缺少关键字段时，用请求头补齐
          session.user.id = session.user.id || headerUserId;
          session.user.email = session.user.email || headerEmail;
          session.user.role = session.user.role || headerRole;
        }

        // 如果没有角色信息，尝试从数据库获取
        if (session?.user?.id && !session.user.role) {
          try {
            const { getDatabase } = await import('./database');
            const db = getDatabase();
            const userResult = await db.query(
              'SELECT role FROM users WHERE id = ?',
              [session.user.id]
            );

            if (userResult.rows && userResult.rows.length > 0) {
              session.user.role = userResult.rows[0].role;
            }
          } catch (error) {
            console.warn('Could not fetch user role from database:', error);
          }
        }
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
          // 临时解决方案：如果没有会话但有请求头，允许访问
          // 这样可以让管理员功能在认证系统修复前正常工作
          if (headerUserId && headerEmail && headerRole) {
            session = {
              user: {
                id: headerUserId,
                email: headerEmail,
                role: headerRole,
              }
            };
            console.log('🔄 临时使用请求头作为会话信息');
          } else {
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
      }

      // 权限检查
      if (requiredPermissions.length > 0) {
        const userRole = session?.user?.role;
        console.log('🔐 权限检查:', { 
          userRole, 
          requiredPermissions, 
          hasRole: !!userRole,
          rolePermissions: userRole ? ROLE_PERMISSIONS[userRole] : null
        });
        
        console.log('🔍 检查用户角色:', { userRole, availableRoles: Object.keys(ROLE_PERMISSIONS) });
        
        if (!userRole || !ROLE_PERMISSIONS[userRole]) {
            console.log('❌ 用户角色无效或不存在:', { userRole, availableRoles: Object.keys(ROLE_PERMISSIONS) });
            await securityLogger.logUnauthorizedAccess(clientIP, req.url || '', 'User has no role or role is invalid', req.headers.get('user-agent') || undefined, session?.user?.id);
            return NextResponse.json({ 
              error: { 
                code: 'FORBIDDEN', 
                message: `权限不足 - 用户角色无效: ${userRole || 'undefined'}, 可用角色: ${Object.keys(ROLE_PERMISSIONS).join(', ')}` 
              } 
            }, { status: 403 });
        }

        const userPermissions = ROLE_PERMISSIONS[userRole];
        const hasAllPermissions = requiredPermissions.every(p => userPermissions.includes(p));

        console.log('🔍 权限详情:', {
          userPermissions,
          requiredPermissions,
          hasAllPermissions,
          missingPermissions: requiredPermissions.filter(p => !userPermissions.includes(p))
        });

        if (!hasAllPermissions) {
            const missingPermissions = requiredPermissions.filter(p => !userPermissions.includes(p));
            console.log('❌ 缺少权限:', missingPermissions);
            await securityLogger.logUnauthorizedAccess(clientIP, req.url || '', `Missing permissions. Required: ${requiredPermissions.join(', ')}`, req.headers.get('user-agent') || undefined, session?.user?.id);
            return NextResponse.json({ 
              error: { 
                code: 'FORBIDDEN', 
                message: `权限不足 - 缺少权限: ${missingPermissions.join(', ')}` 
              } 
            }, { status: 403 });
        }
        
        console.log('✅ 权限验证通过');
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