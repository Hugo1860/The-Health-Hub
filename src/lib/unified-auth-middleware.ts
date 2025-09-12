/**
 * 统一认证中间件
 * 解决不同API端点认证方式不一致的问题
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { getDatabase } from './database';

// 认证上下文接口
export interface AuthContext {
  isAuthenticated: boolean;
  isAdmin: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    status: string;
  };
  clientIP: string;
  userAgent: string;
  requestId: string;
}

// 认证结果接口
export interface AuthResult {
  success: boolean;
  context?: AuthContext;
  error?: string;
  errorCode?: string;
}

// 生成请求ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 获取客户端IP
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const remoteAddr = request.headers.get('x-remote-addr');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (remoteAddr) {
    return remoteAddr;
  }
  
  return 'unknown';
}

// 统一认证验证函数
export async function validateAuth(request: NextRequest): Promise<AuthResult> {
  const requestId = generateRequestId();
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    console.log(`[${requestId}] 开始认证验证`);

    // 1. 获取NextAuth会话
    const session = await getServerSession(authOptions);
    console.log(`[${requestId}] NextAuth会话状态:`, session ? '存在' : '不存在');

    if (!session?.user) {
      console.log(`[${requestId}] 未找到有效会话`);
      return {
        success: false,
        error: '未找到有效会话',
        errorCode: 'NO_SESSION'
      };
    }

    const sessionUser = session.user as any;
    console.log(`[${requestId}] 会话用户信息:`, {
      id: sessionUser.id,
      email: sessionUser.email,
      role: sessionUser.role,
      status: sessionUser.status
    });

    // 2. 验证用户状态
    if (sessionUser.status === 'banned') {
      console.log(`[${requestId}] 用户账户已被禁用`);
      return {
        success: false,
        error: '账户已被禁用',
        errorCode: 'ACCOUNT_BANNED'
      };
    }

    if (sessionUser.status === 'inactive') {
      console.log(`[${requestId}] 用户账户未激活`);
      return {
        success: false,
        error: '账户未激活',
        errorCode: 'ACCOUNT_INACTIVE'
      };
    }

    // 3. 从数据库验证用户信息（确保数据一致性）
    let dbUser;
    try {
      const db = getDatabase();
      const result = await db.query(
        'SELECT id, email, username, role, status FROM users WHERE id = $1 OR email = $2',
        [sessionUser.id, sessionUser.email]
      );
      
      dbUser = result.rows[0];
      console.log(`[${requestId}] 数据库用户信息:`, dbUser);
    } catch (dbError) {
      console.error(`[${requestId}] 数据库查询失败:`, dbError);
      // 如果数据库查询失败，使用会话中的信息
      dbUser = {
        id: sessionUser.id,
        email: sessionUser.email,
        username: sessionUser.name,
        role: sessionUser.role,
        status: sessionUser.status
      };
    }

    if (!dbUser) {
      console.log(`[${requestId}] 数据库中未找到用户`);
      return {
        success: false,
        error: '用户不存在',
        errorCode: 'USER_NOT_FOUND'
      };
    }

    // 4. 构建认证上下文
    const context: AuthContext = {
      isAuthenticated: true,
      isAdmin: dbUser.role === 'admin',
      user: {
        id: dbUser.id.toString(),
        email: dbUser.email,
        name: dbUser.username || dbUser.email,
        role: dbUser.role || 'user',
        status: dbUser.status || 'active'
      },
      clientIP,
      userAgent,
      requestId
    };

    console.log(`[${requestId}] 认证成功:`, {
      isAdmin: context.isAdmin,
      userId: context.user.id,
      userRole: context.user.role
    });

    return {
      success: true,
      context
    };

  } catch (error) {
    console.error(`[${requestId}] 认证验证失败:`, error);
    return {
      success: false,
      error: '认证验证失败',
      errorCode: 'AUTH_ERROR'
    };
  }
}

// 管理员认证验证函数
export async function validateAdminAuth(request: NextRequest): Promise<AuthResult> {
  const authResult = await validateAuth(request);
  
  if (!authResult.success) {
    return authResult;
  }

  const context = authResult.context!;
  
  if (!context.isAdmin) {
    console.log(`[${context.requestId}] 用户不是管理员:`, context.user?.role);
    return {
      success: false,
      error: '需要管理员权限',
      errorCode: 'INSUFFICIENT_PERMISSIONS'
    };
  }

  return authResult;
}

// 统一响应构建器
export class UnifiedResponseBuilder {
  static success(data: any, message?: string) {
    return NextResponse.json({
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    });
  }

  static error(message: string, code: string, status: number = 400) {
    return NextResponse.json({
      success: false,
      error: {
        code,
        message
      },
      timestamp: new Date().toISOString()
    }, { status });
  }

  static unauthorized(message: string = '需要登录访问') {
    return this.error(message, 'UNAUTHORIZED', 401);
  }

  static forbidden(message: string = '权限不足') {
    return this.error(message, 'FORBIDDEN', 403);
  }

  static notFound(message: string = '资源不存在') {
    return this.error(message, 'NOT_FOUND', 404);
  }

  static serverError(message: string = '服务器内部错误') {
    return this.error(message, 'INTERNAL_ERROR', 500);
  }
}

// 认证中间件装饰器
export function withAuth(handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    const authResult = await validateAuth(request);
    
    if (!authResult.success) {
      return UnifiedResponseBuilder.unauthorized(authResult.error);
    }

    return handler(request, authResult.context!);
  };
}

// 管理员认证中间件装饰器
export function withAdminAuth(handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    const authResult = await validateAdminAuth(request);
    
    if (!authResult.success) {
      if (authResult.errorCode === 'UNAUTHORIZED' || authResult.errorCode === 'NO_SESSION') {
        return UnifiedResponseBuilder.unauthorized(authResult.error);
      }
      return UnifiedResponseBuilder.forbidden(authResult.error);
    }

    return handler(request, authResult.context!);
  };
}

// 公开访问中间件装饰器（不需要认证）
export function withPublicAccess(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    return handler(request);
  };
}
