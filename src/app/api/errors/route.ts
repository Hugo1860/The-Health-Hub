import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

interface ErrorLog {
  id: string;
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  userAgent?: string;
  url?: string;
  userId?: string;
  level: 'error' | 'warning' | 'info';
  resolved: boolean;
}

const LOGS_DIR = path.join(process.cwd(), 'logs');
const ERROR_LOG_FILE = path.join(LOGS_DIR, 'errors.json');

// 确保日志目录存在
async function ensureLogsDir() {
  if (!existsSync(LOGS_DIR)) {
    await mkdir(LOGS_DIR, { recursive: true });
  }
}

// 读取现有错误日志
async function readErrorLogs(): Promise<ErrorLog[]> {
  try {
    if (!existsSync(ERROR_LOG_FILE)) {
      return [];
    }
    const data = await readFile(ERROR_LOG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to read error logs:', error);
    return [];
  }
}

// 写入错误日志
async function writeErrorLogs(logs: ErrorLog[]) {
  try {
    await ensureLogsDir();
    await writeFile(ERROR_LOG_FILE, JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error('Failed to write error logs:', error);
  }
}

// 生成唯一ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 确定错误级别
function determineErrorLevel(message: string): 'error' | 'warning' | 'info' {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('warning') || lowerMessage.includes('deprecated')) {
    return 'warning';
  }
  
  if (lowerMessage.includes('info') || lowerMessage.includes('debug')) {
    return 'info';
  }
  
  return 'error';
}

// POST - 记录新错误
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      message,
      stack,
      componentStack,
      timestamp,
      userAgent,
      url,
      userId
    } = body;

    // 验证必需字段
    if (!message) {
      return NextResponse.json(
        { error: { code: 'MISSING_MESSAGE', message: 'Error message is required' } },
        { status: 400 }
      );
    }

    // 创建错误日志条目
    const errorLog: ErrorLog = {
      id: generateId(),
      message,
      stack,
      componentStack,
      timestamp: timestamp || new Date().toISOString(),
      userAgent,
      url,
      userId,
      level: determineErrorLevel(message),
      resolved: false,
    };

    // 读取现有日志
    const logs = await readErrorLogs();
    
    // 添加新日志（保持最新的1000条记录）
    logs.unshift(errorLog);
    if (logs.length > 1000) {
      logs.splice(1000);
    }

    // 写入日志文件
    await writeErrorLogs(logs);

    // 在开发环境中输出到控制台
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', {
        id: errorLog.id,
        message: errorLog.message,
        timestamp: errorLog.timestamp,
        url: errorLog.url,
      });
    }

    return NextResponse.json({ 
      success: true, 
      id: errorLog.id 
    });

  } catch (error) {
    console.error('Failed to log error:', error);
    return NextResponse.json(
      { error: { code: 'LOG_FAILED', message: 'Failed to log error' } },
      { status: 500 }
    );
  }
}

// GET - 获取错误日志（仅管理员）
export async function GET(request: NextRequest) {
  try {
    // TODO: 添加管理员权限验证
    // const session = await getServerSession(authOptions);
    // if (!session?.user || session.user.role !== 'admin') {
    //   return NextResponse.json(
    //     { error: { code: 'UNAUTHORIZED', message: 'Admin access required' } },
    //     { status: 401 }
    //   );
    // }

    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level') as 'error' | 'warning' | 'info' | null;
    const resolved = searchParams.get('resolved');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let logs = await readErrorLogs();

    // 过滤日志
    if (level) {
      logs = logs.filter(log => log.level === level);
    }

    if (resolved !== null) {
      const isResolved = resolved === 'true';
      logs = logs.filter(log => log.resolved === isResolved);
    }

    // 分页
    const paginatedLogs = logs.slice(offset, offset + limit);

    return NextResponse.json({
      logs: paginatedLogs,
      total: logs.length,
      hasMore: offset + limit < logs.length,
    });

  } catch (error) {
    console.error('Failed to get error logs:', error);
    return NextResponse.json(
      { error: { code: 'FETCH_FAILED', message: 'Failed to fetch error logs' } },
      { status: 500 }
    );
  }
}

// PATCH - 更新错误状态（标记为已解决）
export async function PATCH(request: NextRequest) {
  try {
    // TODO: 添加管理员权限验证

    const body = await request.json();
    const { id, resolved } = body;

    if (!id) {
      return NextResponse.json(
        { error: { code: 'MISSING_ID', message: 'Error ID is required' } },
        { status: 400 }
      );
    }

    const logs = await readErrorLogs();
    const logIndex = logs.findIndex(log => log.id === id);

    if (logIndex === -1) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Error log not found' } },
        { status: 404 }
      );
    }

    // 更新状态
    logs[logIndex].resolved = resolved !== undefined ? resolved : true;

    await writeErrorLogs(logs);

    return NextResponse.json({ 
      success: true, 
      log: logs[logIndex] 
    });

  } catch (error) {
    console.error('Failed to update error log:', error);
    return NextResponse.json(
      { error: { code: 'UPDATE_FAILED', message: 'Failed to update error log' } },
      { status: 500 }
    );
  }
}