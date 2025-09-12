// 错误日志收集 API

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { DatabaseErrorHandler } from '@/lib/api-response';

interface LogEntry {
  id?: string;
  type: 'error' | 'metric' | 'action';
  data: any;
  sessionId: string;
  timestamp: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    
    // 验证请求数据
    if (!body.type || !body.data || !body.sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields: type, data, sessionId' },
        { status: 400 }
      );
    }

    const logEntry: LogEntry = {
      type: body.type,
      data: body.data,
      sessionId: body.sessionId,
      timestamp: body.timestamp || new Date().toISOString()
    };

    // 保存到PostgreSQL数据库
    try {
      const stmt = db.prepare(`
        INSERT INTO logs (id, type, data, session_id, timestamp, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await stmt.run(
        logId,
        logEntry.type,
        JSON.stringify(logEntry.data),
        logEntry.sessionId,
        logEntry.timestamp,
        new Date().toISOString()
      );
      
      logEntry.id = logId;
    } catch (dbError) {
      console.error('Failed to save log to database:', dbError);
      // 继续执行，不因数据库错误影响日志记录
    }

    // 在控制台输出（开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Logging API] ${logEntry.type}:`, logEntry.data);
    }

    // 对于严重错误，可以发送通知
    if (logEntry.type === 'error' && logEntry.data.level === 'error') {
      console.error('[Critical Error]', logEntry.data);
      // 这里可以集成邮件通知、Slack 通知等
    }

    return NextResponse.json({ success: true, id: logEntry.id || `log_${Date.now()}` });
  } catch (error) {
    console.error('Logging API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    const type = url.searchParams.get('type') as 'error' | 'metric' | 'action' | null;
    const limit = parseInt(url.searchParams.get('limit') || '100');

    // 构建PostgreSQL查询
    let query = 'SELECT id, type, data, session_id, timestamp, created_at FROM logs';
    const params: any[] = [];
    const conditions: string[] = [];

    // 按会话 ID 过滤
    if (sessionId) {
      conditions.push('session_id = ?');
      params.push(sessionId);
    }

    // 按类型过滤
    if (type) {
      conditions.push('type = ?');
      params.push(type);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const stmt = db.prepare(query);
    const logs = await stmt.all(...params);

    // 解析JSON数据
    const result = logs.map((log: any) => ({
      id: log.id,
      type: log.type,
      data: typeof log.data === 'string' ? JSON.parse(log.data) : log.data,
      sessionId: log.session_id,
      timestamp: log.timestamp,
      createdAt: log.created_at
    }));

    // 获取总数
    let countQuery = 'SELECT COUNT(*) as total FROM logs';
    const countParams: any[] = [];
    
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
      // 移除limit参数
      countParams.push(...params.slice(0, -1));
    }

    const countStmt = db.prepare(countQuery);
    const countResult = await countStmt.get(...countParams);
    const total = countResult?.total || 0;

    return NextResponse.json({
      success: true,
      data: result,
      total: total,
      returned: result.length
    });
  } catch (error) {
    console.error('Logging API GET error:', error);
    return DatabaseErrorHandler.handle(error as Error, 'Get logs error');
  }
}

// 清理旧日志的端点
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const olderThan = url.searchParams.get('olderThan');
    
    if (olderThan) {
      const cutoffDate = new Date(olderThan);
      
      // 获取删除前的数量
      const countStmt = db.prepare('SELECT COUNT(*) as total FROM logs WHERE created_at < ?');
      const countResult = await countStmt.get(cutoffDate.toISOString());
      const deletedCount = countResult?.total || 0;
      
      // 删除指定日期之前的日志
      const deleteStmt = db.prepare('DELETE FROM logs WHERE created_at < ?');
      await deleteStmt.run(cutoffDate.toISOString());
      
      // 获取剩余数量
      const remainingStmt = db.prepare('SELECT COUNT(*) as total FROM logs');
      const remainingResult = await remainingStmt.get();
      const remaining = remainingResult?.total || 0;
      
      return NextResponse.json({
        success: true,
        message: `Deleted ${deletedCount} log entries`,
        remaining: remaining
      });
    } else {
      // 获取删除前的数量
      const countStmt = db.prepare('SELECT COUNT(*) as total FROM logs');
      const countResult = await countStmt.get();
      const deletedCount = countResult?.total || 0;
      
      // 清空所有日志
      const deleteStmt = db.prepare('DELETE FROM logs');
      await deleteStmt.run();
      
      return NextResponse.json({
        success: true,
        message: `Deleted all ${deletedCount} log entries`
      });
    }
  } catch (error) {
    console.error('Logging API DELETE error:', error);
    return DatabaseErrorHandler.handle(error as Error, 'Delete logs error');
  }
}