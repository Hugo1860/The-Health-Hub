// 错误日志收集 API

import { NextRequest, NextResponse } from 'next/server';

interface LogEntry {
  type: 'error' | 'metric' | 'action';
  data: any;
  sessionId: string;
  timestamp: string;
}

// 简单的内存存储（生产环境应该使用数据库）
const logs: LogEntry[] = [];
const MAX_LOGS = 10000;

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

    // 添加到日志存储
    logs.push(logEntry);

    // 保持日志数量在限制内
    if (logs.length > MAX_LOGS) {
      logs.splice(0, logs.length - MAX_LOGS);
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

    return NextResponse.json({ success: true, id: `log_${Date.now()}` });
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

    let filteredLogs = logs;

    // 按会话 ID 过滤
    if (sessionId) {
      filteredLogs = filteredLogs.filter(log => log.sessionId === sessionId);
    }

    // 按类型过滤
    if (type) {
      filteredLogs = filteredLogs.filter(log => log.type === type);
    }

    // 限制数量并按时间倒序
    const result = filteredLogs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      data: result,
      total: filteredLogs.length,
      returned: result.length
    });
  } catch (error) {
    console.error('Logging API GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 清理旧日志的端点
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const olderThan = url.searchParams.get('olderThan');
    
    if (olderThan) {
      const cutoffDate = new Date(olderThan);
      const initialLength = logs.length;
      
      // 删除指定日期之前的日志
      for (let i = logs.length - 1; i >= 0; i--) {
        if (new Date(logs[i].timestamp) < cutoffDate) {
          logs.splice(i, 1);
        }
      }
      
      const deletedCount = initialLength - logs.length;
      
      return NextResponse.json({
        success: true,
        message: `Deleted ${deletedCount} log entries`,
        remaining: logs.length
      });
    } else {
      // 清空所有日志
      const deletedCount = logs.length;
      logs.length = 0;
      
      return NextResponse.json({
        success: true,
        message: `Deleted all ${deletedCount} log entries`
      });
    }
  } catch (error) {
    console.error('Logging API DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}