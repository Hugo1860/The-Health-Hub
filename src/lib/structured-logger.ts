/**
 * 结构化日志记录系统
 * 提供统一的日志格式和多种输出目标
 */

import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  levelName: string;
  message: string;
  context?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  requestId?: string;
  userId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  url?: string;
  method?: string;
  duration?: number;
  statusCode?: number;
  tags?: string[];
  environment: string;
  service: string;
  version: string;
}

export interface LoggerConfig {
  level: LogLevel;
  service: string;
  version: string;
  environment: string;
  outputs: LogOutput[];
  enableConsole: boolean;
  enableFile: boolean;
  fileConfig?: {
    directory: string;
    filename: string;
    maxSize: number; // MB
    maxFiles: number;
    rotateDaily: boolean;
  };
  enableRemote: boolean;
  remoteConfig?: {
    endpoint: string;
    apiKey?: string;
    batchSize: number;
    flushInterval: number; // ms
  };
}

export enum LogOutput {
  CONSOLE = 'console',
  FILE = 'file',
  REMOTE = 'remote'
}

class StructuredLogger {
  private config: LoggerConfig;
  private logBuffer: LogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      service: 'audio-platform',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      outputs: [LogOutput.CONSOLE],
      enableConsole: true,
      enableFile: false,
      enableRemote: false,
      fileConfig: {
        directory: './logs',
        filename: 'app.log',
        maxSize: 100, // 100MB
        maxFiles: 10,
        rotateDaily: true
      },
      remoteConfig: {
        endpoint: '',
        batchSize: 100,
        flushInterval: 5000 // 5 seconds
      },
      ...config
    };

    this.initializeOutputs();
    this.startFlushTimer();
  }

  debug(message: string, context?: Record<string, any>, requestContext?: Partial<LogEntry>): void {
    this.log(LogLevel.DEBUG, message, context, requestContext);
  }

  info(message: string, context?: Record<string, any>, requestContext?: Partial<LogEntry>): void {
    this.log(LogLevel.INFO, message, context, requestContext);
  }

  warn(message: string, context?: Record<string, any>, requestContext?: Partial<LogEntry>): void {
    this.log(LogLevel.WARN, message, context, requestContext);
  }

  error(message: string, error?: Error, context?: Record<string, any>, requestContext?: Partial<LogEntry>): void {
    const errorInfo = error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : undefined;

    this.log(LogLevel.ERROR, message, context, { ...requestContext, error: errorInfo });
  }

  fatal(message: string, error?: Error, context?: Record<string, any>, requestContext?: Partial<LogEntry>): void {
    const errorInfo = error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : undefined;

    this.log(LogLevel.FATAL, message, context, { ...requestContext, error: errorInfo });
  }

  // 性能监控专用方法
  performance(operation: string, duration: number, context?: Record<string, any>, requestContext?: Partial<LogEntry>): void {
    this.log(LogLevel.INFO, `Performance: ${operation}`, 
      { ...context, duration, operation }, 
      { ...requestContext, tags: ['performance'] }
    );
  }

  // API请求日志
  apiRequest(method: string, url: string, statusCode: number, duration: number, requestContext?: Partial<LogEntry>): void {
    const level = statusCode >= 500 ? LogLevel.ERROR : statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    
    this.log(level, `API Request: ${method} ${url}`, 
      { statusCode, duration },
      { ...requestContext, method, url, statusCode, duration, tags: ['api'] }
    );
  }

  // 数据库操作日志
  database(operation: string, query: string, duration: number, context?: Record<string, any>, requestContext?: Partial<LogEntry>): void {
    this.log(LogLevel.DEBUG, `Database: ${operation}`, 
      { ...context, query: query.substring(0, 200), duration, operation },
      { ...requestContext, tags: ['database'] }
    );
  }

  // 安全事件日志
  security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: Record<string, any>, requestContext?: Partial<LogEntry>): void {
    const level = severity === 'critical' ? LogLevel.FATAL : 
                  severity === 'high' ? LogLevel.ERROR :
                  severity === 'medium' ? LogLevel.WARN : LogLevel.INFO;

    this.log(level, `Security: ${event}`, 
      { ...context, severity, event },
      { ...requestContext, tags: ['security'] }
    );
  }

  // 业务事件日志
  business(event: string, context?: Record<string, any>, requestContext?: Partial<LogEntry>): void {
    this.log(LogLevel.INFO, `Business: ${event}`, 
      { ...context, event },
      { ...requestContext, tags: ['business'] }
    );
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, requestContext?: Partial<LogEntry>): void {
    if (level < this.config.level) {
      return; // 日志级别过低，不记录
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      levelName: LogLevel[level],
      message,
      context,
      environment: this.config.environment,
      service: this.config.service,
      version: this.config.version,
      ...requestContext
    };

    this.processLogEntry(entry);
  }

  private processLogEntry(entry: LogEntry): void {
    // 控制台输出
    if (this.config.enableConsole) {
      this.outputToConsole(entry);
    }

    // 文件输出
    if (this.config.enableFile) {
      this.outputToFile(entry);
    }

    // 远程输出（缓冲）
    if (this.config.enableRemote) {
      this.bufferForRemote(entry);
    }
  }

  private outputToConsole(entry: LogEntry): void {
    const color = this.getConsoleColor(entry.level);
    const emoji = this.getLogEmoji(entry.level);
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    
    const baseMessage = `${emoji} [${timestamp}] ${entry.levelName}: ${entry.message}`;
    
    if (entry.context || entry.error) {
      const details = {
        ...(entry.context && { context: entry.context }),
        ...(entry.error && { error: entry.error }),
        ...(entry.requestId && { requestId: entry.requestId }),
        ...(entry.duration && { duration: `${entry.duration}ms` }),
        ...(entry.statusCode && { status: entry.statusCode })
      };
      
      console.log(`${color}${baseMessage}${'\x1b[0m'}`, details);
    } else {
      console.log(`${color}${baseMessage}${'\x1b[0m'}`);
    }
  }

  private outputToFile(entry: LogEntry): void {
    if (!this.config.fileConfig) return;

    const logLine = JSON.stringify(entry) + '\n';
    const logPath = join(this.config.fileConfig.directory, this.getLogFileName());

    try {
      appendFileSync(logPath, logLine, 'utf8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private bufferForRemote(entry: LogEntry): void {
    this.logBuffer.push(entry);

    if (this.logBuffer.length >= (this.config.remoteConfig?.batchSize || 100)) {
      this.flushRemoteLogs();
    }
  }

  private async flushRemoteLogs(): Promise<void> {
    if (this.logBuffer.length === 0 || !this.config.remoteConfig?.endpoint) {
      return;
    }

    const logsToSend = [...this.logBuffer];
    this.logBuffer = [];

    try {
      const response = await fetch(this.config.remoteConfig.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.remoteConfig.apiKey && {
            'Authorization': `Bearer ${this.config.remoteConfig.apiKey}`
          })
        },
        body: JSON.stringify({ logs: logsToSend })
      });

      if (!response.ok) {
        throw new Error(`Remote logging failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send logs to remote endpoint:', error);
      // 将失败的日志重新加入缓冲区（但限制重试次数）
      this.logBuffer.unshift(...logsToSend.slice(0, 50)); // 只保留最近50条
    }
  }

  private initializeOutputs(): void {
    if (this.config.enableFile && this.config.fileConfig) {
      const logDir = this.config.fileConfig.directory;
      if (!existsSync(logDir)) {
        mkdirSync(logDir, { recursive: true });
      }
    }
  }

  private startFlushTimer(): void {
    if (this.config.enableRemote && this.config.remoteConfig) {
      this.flushTimer = setInterval(() => {
        this.flushRemoteLogs();
      }, this.config.remoteConfig.flushInterval);
    }
  }

  private getLogFileName(): string {
    if (!this.config.fileConfig) return 'app.log';

    const { filename, rotateDaily } = this.config.fileConfig;
    
    if (rotateDaily) {
      const date = new Date().toISOString().split('T')[0];
      const baseName = filename.replace('.log', '');
      return `${baseName}-${date}.log`;
    }
    
    return filename;
  }

  private getConsoleColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return '\x1b[36m'; // Cyan
      case LogLevel.INFO: return '\x1b[32m';  // Green
      case LogLevel.WARN: return '\x1b[33m';  // Yellow
      case LogLevel.ERROR: return '\x1b[31m'; // Red
      case LogLevel.FATAL: return '\x1b[35m'; // Magenta
      default: return '\x1b[0m';              // Reset
    }
  }

  private getLogEmoji(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return '🔍';
      case LogLevel.INFO: return '📝';
      case LogLevel.WARN: return '⚠️';
      case LogLevel.ERROR: return '❌';
      case LogLevel.FATAL: return '💀';
      default: return '📋';
    }
  }

  // 获取日志统计信息
  getStats(): {
    bufferedLogs: number;
    config: LoggerConfig;
    uptime: number;
  } {
    return {
      bufferedLogs: this.logBuffer.length,
      config: this.config,
      uptime: process.uptime()
    };
  }

  // 清理资源
  async cleanup(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // 刷新剩余的远程日志
    if (this.config.enableRemote) {
      await this.flushRemoteLogs();
    }
  }
}

// 创建默认日志实例
const defaultLogger = new StructuredLogger({
  level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
  enableConsole: true,
  enableFile: process.env.NODE_ENV === 'production',
  enableRemote: !!process.env.REMOTE_LOG_ENDPOINT,
  remoteConfig: {
    endpoint: process.env.REMOTE_LOG_ENDPOINT || '',
    apiKey: process.env.REMOTE_LOG_API_KEY
  }
});

export { StructuredLogger, defaultLogger };
export default defaultLogger;