/**
 * 用户操作日志记录工具
 * 用于记录用户的登录、注册、播放等操作
 */

import { getDatabase } from './database';

export type UserAction = 
  | 'login'
  | 'logout'
  | 'register'
  | 'view'
  | 'play'
  | 'favorite'
  | 'comment'
  | 'share'
  | 'download';

export interface UserActionLogData {
  userId?: string | number;
  action: UserAction;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

/**
 * 记录用户操作日志
 */
export async function logUserAction(data: UserActionLogData): Promise<void> {
  try {
    const db = getDatabase();

    // 检查表是否存在，如果不存在则创建
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS user_action_logs (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255),
          action VARCHAR(50) NOT NULL,
          description TEXT,
          ip_address VARCHAR(45),
          user_agent TEXT,
          metadata JSON,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_action (action),
          INDEX idx_timestamp (timestamp)
        )
      `);
    } catch (createError) {
      console.log('user_action_logs表可能已存在或创建失败:', createError);
    }

    // 插入日志
    const logId = `action_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    await db.query(
      `INSERT INTO user_action_logs 
        (id, user_id, action, description, ip_address, user_agent, metadata, timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        logId,
        data.userId?.toString() || null,
        data.action,
        data.description,
        data.ipAddress || null,
        data.userAgent || null,
        data.metadata ? JSON.stringify(data.metadata) : null,
      ]
    );

    console.log(`✅ 用户操作日志已记录: ${data.action} - ${data.description}`);
  } catch (error) {
    // 日志记录失败不应该影响主业务流程
    console.error('记录用户操作日志失败:', error);
  }
}

/**
 * 从请求中提取IP地址
 */
export function extractIpFromRequest(request: Request): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return realIp || undefined;
}

/**
 * 从请求中提取User-Agent
 */
export function extractUserAgentFromRequest(request: Request): string | undefined {
  return request.headers.get('user-agent') || undefined;
}

