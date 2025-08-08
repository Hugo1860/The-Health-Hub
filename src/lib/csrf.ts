import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import crypto from 'crypto';

// CSRF令牌存储（生产环境应使用Redis或数据库）
const csrfTokens = new Map<string, { token: string; expires: number }>();

// 生成CSRF令牌
export const generateCSRFToken = (sessionId: string): string => {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + 3600000; // 1小时过期
  
  csrfTokens.set(sessionId, { token, expires });
  
  // 清理过期令牌
  setTimeout(() => {
    const record = csrfTokens.get(sessionId);
    if (record && Date.now() > record.expires) {
      csrfTokens.delete(sessionId);
    }
  }, 3600000);
  
  return token;
};

// 验证CSRF令牌
export const validateCSRFToken = (sessionId: string, token: string): boolean => {
  const record = csrfTokens.get(sessionId);
  
  if (!record) {
    return false;
  }
  
  if (Date.now() > record.expires) {
    csrfTokens.delete(sessionId);
    return false;
  }
  
  return record.token === token;
};

// CSRF保护中间件
export const withCSRFProtection = (handler: Function) => {
  return async (req: NextRequest) => {
    // 只对POST、PUT、DELETE请求进行CSRF检查
    if (!['POST', 'PUT', 'DELETE'].includes(req.method || '')) {
      return handler(req);
    }

    try {
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: { code: 'UNAUTHORIZED', message: '未授权访问' } },
          { status: 401 }
        );
      }

      const csrfToken = req.headers.get('x-csrf-token');
      
      if (!csrfToken) {
        return NextResponse.json(
          { error: { code: 'CSRF_TOKEN_MISSING', message: '缺少CSRF令牌' } },
          { status: 403 }
        );
      }

      if (!validateCSRFToken(session.user.id, csrfToken)) {
        return NextResponse.json(
          { error: { code: 'CSRF_TOKEN_INVALID', message: '无效的CSRF令牌' } },
          { status: 403 }
        );
      }

      return handler(req);
    } catch (error) {
      console.error('CSRF protection error:', error);
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } },
        { status: 500 }
      );
    }
  };
};

// 获取CSRF令牌的API端点
export const getCSRFTokenHandler = async (req: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '未授权访问' } },
        { status: 401 }
      );
    }

    const token = generateCSRFToken(session.user.id);
    
    return NextResponse.json({ csrfToken: token });
  } catch (error) {
    console.error('Get CSRF token error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } },
      { status: 500 }
    );
  }
};

// 清理过期令牌的定时任务
setInterval(() => {
  const now = Date.now();
  csrfTokens.forEach((record, sessionId) => {
    if (now > record.expires) {
      csrfTokens.delete(sessionId);
    }
  });
}, 300000); // 每5分钟清理一次