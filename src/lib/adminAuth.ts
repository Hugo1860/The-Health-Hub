import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { securityLogger } from './securityLogger';

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

// 管理员权限验证
export const verifyAdminPermission = async (req: NextRequest): Promise<{
  isValid: boolean;
  user?: any;
  error?: string;
}> => {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      // 记录未授权访问
      await securityLogger.logUnauthorizedAccess(
        getClientIP(req),
        req.url || '',
        'No valid session for admin access',
        req.headers.get('user-agent') || undefined
      );
      
      return {
        isValid: false,
        error: '未登录或会话已过期',
      };
    }

    const user = session.user as any;
    
    if (user.role !== 'admin') {
      // 记录权限不足访问
      await securityLogger.logUnauthorizedAccess(
        getClientIP(req),
        req.url || '',
        'Insufficient privileges (not admin)',
        req.headers.get('user-agent') || undefined,
        user.id
      );
      
      return {
        isValid: false,
        error: '权限不足，需要管理员权限',
      };
    }

    // 检查用户状态
    if (user.status && user.status !== 'active') {
      await securityLogger.logUnauthorizedAccess(
        getClientIP(req),
        req.url || '',
        `User account is ${user.status}`,
        req.headers.get('user-agent') || undefined,
        user.id
      );
      
      return {
        isValid: false,
        error: '账户状态异常，无法访问管理功能',
      };
    }

    return {
      isValid: true,
      user,
    };
  } catch (error) {
    console.error('Admin permission verification error:', error);
    
    await securityLogger.logEvent({
      type: 'SUSPICIOUS_ACTIVITY',
      severity: 'HIGH',
      ip: getClientIP(req),
      userAgent: req.headers.get('user-agent') || undefined,
      endpoint: req.url || '',
      details: {
        activity: 'Admin permission verification failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      action: 'ACCESS_DENIED',
    });
    
    return {
      isValid: false,
      error: '权限验证失败',
    };
  }
};

// 管理员权限中间件
export const withAdminAuth = (handler: Function) => {
  return async (req: NextRequest, ...args: any[]) => {
    const verification = await verifyAdminPermission(req);
    
    if (!verification.isValid) {
      return NextResponse.json(
        { 
          error: { 
            code: 'ADMIN_ACCESS_DENIED', 
            message: verification.error || '管理员权限验证失败' 
          } 
        },
        { status: 403 }
      );
    }

    // 将用户信息添加到请求中
    (req as any).adminUser = verification.user;
    
    return handler(req, ...args);
  };
};

// 检查是否为超级管理员（可以管理其他管理员）
export const isSuperAdmin = (user: any): boolean => {
  // 这里可以根据需要实现超级管理员逻辑
  // 例如：检查特定的用户ID、特殊的角色标记等
  return user?.role === 'admin' && user?.isSuperAdmin === true;
};

// 验证管理员操作权限
export const verifyAdminOperation = async (
  req: NextRequest,
  operation: 'CREATE_USER' | 'UPDATE_USER' | 'DELETE_USER' | 'MANAGE_ROLES' | 'VIEW_LOGS' | 'SYSTEM_SETTINGS' | 'BACKUP_DATA',
  targetUserId?: string
): Promise<{
  isAllowed: boolean;
  error?: string;
}> => {
  const verification = await verifyAdminPermission(req);
  
  if (!verification.isValid) {
    return {
      isAllowed: false,
      error: verification.error,
    };
  }

  const currentUser = verification.user;

  // 防止管理员操作自己的账户（某些操作）
  if (targetUserId && targetUserId === currentUser.id) {
    const restrictedOperations = ['DELETE_USER', 'MANAGE_ROLES'];
    if (restrictedOperations.includes(operation)) {
      await securityLogger.logSuspiciousActivity(
        getClientIP(req),
        req.url || '',
        'Admin attempted to perform restricted operation on own account',
        { operation, targetUserId },
        req.headers.get('user-agent') || undefined,
        currentUser.id
      );
      
      return {
        isAllowed: false,
        error: '不能对自己的账户执行此操作',
      };
    }
  }

  // 记录管理员操作
  await securityLogger.logEvent({
    type: 'SUSPICIOUS_ACTIVITY',
    severity: 'LOW',
    ip: getClientIP(req),
    userAgent: req.headers.get('user-agent') || undefined,
    userId: currentUser.id,
    endpoint: req.url || '',
    details: {
      activity: 'Admin operation performed',
      operation,
      targetUserId,
      adminUser: currentUser.username,
    },
    action: 'OPERATION_LOGGED',
  });

  return {
    isAllowed: true,
  };
};

// 管理员操作日志记录
export const logAdminOperation = async (
  req: NextRequest,
  operation: string,
  details: Record<string, any>,
  success: boolean = true
) => {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  
  await securityLogger.logEvent({
    type: 'SUSPICIOUS_ACTIVITY',
    severity: success ? 'LOW' : 'MEDIUM',
    ip: getClientIP(req),
    userAgent: req.headers.get('user-agent') || undefined,
    userId: user?.id,
    endpoint: req.url || '',
    details: {
      activity: `Admin operation: ${operation}`,
      success,
      adminUser: user?.username,
      ...details,
    },
    action: success ? 'OPERATION_COMPLETED' : 'OPERATION_FAILED',
  });
};

// 检查管理员会话有效性
export const validateAdminSession = async (req: NextRequest): Promise<boolean> => {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return false;
    }

    const user = session.user as any;
    
    // 检查会话是否过期
    const sessionAge = Date.now() - new Date(session.expires || 0).getTime();
    const maxSessionAge = 24 * 60 * 60 * 1000; // 24小时
    
    if (sessionAge > maxSessionAge) {
      await securityLogger.logEvent({
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'MEDIUM',
        ip: getClientIP(req),
        userAgent: req.headers.get('user-agent') || undefined,
        userId: user.id,
        endpoint: req.url || '',
        details: {
          activity: 'Expired admin session detected',
          sessionAge,
          maxSessionAge,
        },
        action: 'SESSION_EXPIRED',
      });
      
      return false;
    }

    return user.role === 'admin' && user.status === 'active';
  } catch (error) {
    console.error('Admin session validation error:', error);
    return false;
  }
};

// 管理员访问控制列表
export const ADMIN_PERMISSIONS = {
  // 用户管理
  USER_MANAGEMENT: {
    VIEW_USERS: 'admin',
    CREATE_USER: 'admin',
    UPDATE_USER: 'admin',
    DELETE_USER: 'admin',
    MANAGE_ROLES: 'admin',
  },
  
  // 内容管理
  CONTENT_MANAGEMENT: {
    UPLOAD_AUDIO: 'admin',
    EDIT_AUDIO: 'admin',
    DELETE_AUDIO: 'admin',
    MANAGE_CATEGORIES: 'admin',
  },
  
  // 系统管理
  SYSTEM_MANAGEMENT: {
    VIEW_LOGS: 'admin',
    SYSTEM_SETTINGS: 'admin',
    BACKUP_DATA: 'admin',
    MAINTENANCE_MODE: 'admin',
  },
  
  // 分析和报告
  ANALYTICS: {
    VIEW_ANALYTICS: 'admin',
    EXPORT_DATA: 'admin',
    USER_REPORTS: 'admin',
  },
};

// 检查特定权限
export const hasPermission = (user: any, permission: string): boolean => {
  if (!user || user.role !== 'admin') {
    return false;
  }
  
  // 这里可以实现更细粒度的权限控制
  // 目前所有管理员都有所有权限
  return true;
};