/**
 * 管理员日志记录器
 * 用于记录用户登录、操作动作等
 */

import db from '@/lib/db';

export interface LogData {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  responseTime?: number;
  metadata?: Record<string, any>;
}

export class AdminLogger {
  /**
   * 记录日志
   */
  static async log(data: LogData): Promise<void> {
    try {
      const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const stmt = db.prepare(`
        INSERT INTO admin_logs (
          id, level, message, source, user_id, ip_address, 
          user_agent, method, url, status_code, response_time, 
          metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      await stmt.run(
        logId,
        data.level,
        data.message,
        data.source,
        data.userId || null,
        data.ipAddress || null,
        data.userAgent || null,
        data.method || null,
        data.url || null,
        data.statusCode || null,
        data.responseTime || null,
        data.metadata ? JSON.stringify(data.metadata) : null,
        new Date().toISOString()
      );

      // 在开发环境下也输出到控制台
      if (process.env.NODE_ENV === 'development') {
        console.log(`[AdminLogger] ${data.level.toUpperCase()}: ${data.message}`, {
          source: data.source,
          userId: data.userId,
          metadata: data.metadata,
        });
      }

    } catch (error) {
      console.error('Failed to write admin log:', error);
      // 不抛出错误，避免影响主要业务逻辑
    }
  }

  /**
   * 记录用户登录
   */
  static async logLogin(
    userId: string, 
    email: string, 
    success: boolean, 
    ipAddress?: string, 
    userAgent?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      level: success ? 'info' : 'warn',
      message: success ? `用户登录成功: ${email}` : `用户登录失败: ${email}`,
      source: 'auth',
      userId: success ? userId : undefined,
      ipAddress,
      userAgent,
      metadata: {
        email,
        success,
        ...metadata,
      },
    });
  }

  /**
   * 记录用户登出
   */
  static async logLogout(
    userId: string, 
    email: string, 
    ipAddress?: string, 
    userAgent?: string
  ): Promise<void> {
    await this.log({
      level: 'info',
      message: `用户登出: ${email}`,
      source: 'auth',
      userId,
      ipAddress,
      userAgent,
      metadata: {
        email,
        action: 'logout',
      },
    });
  }

  /**
   * 记录管理员操作
   */
  static async logAdminAction(
    userId: string,
    action: string,
    description: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      level: 'info',
      message: `管理员操作: ${description}`,
      source: 'admin',
      userId,
      ipAddress,
      userAgent,
      metadata: {
        action,
        ...metadata,
      },
    });
  }

  /**
   * 记录API请求
   */
  static async logApiRequest(
    method: string,
    url: string,
    statusCode: number,
    responseTime: number,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const level = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'debug';
    
    await this.log({
      level,
      message: `API请求: ${method} ${url} - ${statusCode}`,
      source: 'api',
      userId,
      ipAddress,
      userAgent,
      method,
      url,
      statusCode,
      responseTime,
      metadata,
    });
  }

  /**
   * 记录安全事件
   */
  static async logSecurityEvent(
    event: string,
    description: string,
    level: 'info' | 'warn' | 'error' = 'warn',
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      level,
      message: `安全事件: ${description}`,
      source: 'security',
      userId,
      ipAddress,
      userAgent,
      metadata: {
        event,
        ...metadata,
      },
    });
  }

  /**
   * 记录系统错误
   */
  static async logError(
    error: Error,
    context: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      level: 'error',
      message: `系统错误: ${error.message}`,
      source: 'system',
      userId,
      ipAddress,
      userAgent,
      metadata: {
        context,
        stack: error.stack,
        ...metadata,
      },
    });
  }

  /**
   * 记录文件操作
   */
  static async logFileOperation(
    operation: 'upload' | 'delete' | 'download',
    filename: string,
    success: boolean,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      level: success ? 'info' : 'error',
      message: `文件${operation === 'upload' ? '上传' : operation === 'delete' ? '删除' : '下载'}${success ? '成功' : '失败'}: ${filename}`,
      source: 'file',
      userId,
      ipAddress,
      userAgent,
      metadata: {
        operation,
        filename,
        success,
        ...metadata,
      },
    });
  }

  /**
   * 记录数据库操作
   */
  static async logDatabaseOperation(
    operation: string,
    table: string,
    success: boolean,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      level: success ? 'debug' : 'error',
      message: `数据库操作${success ? '成功' : '失败'}: ${operation} on ${table}`,
      source: 'database',
      userId,
      metadata: {
        operation,
        table,
        success,
        ...metadata,
      },
    });
  }
}

export default AdminLogger;