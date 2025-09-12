'use client';

// 错误日志和监控系统

export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  error?: Error;
  context?: Record<string, any>;
  stack?: string;
  userAgent?: string;
  url?: string;
  userId?: string;
  sessionId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceMetric {
  id: string;
  timestamp: string;
  name: string;
  value: number;
  unit: string;
  context?: Record<string, any>;
}

export interface UserAction {
  id: string;
  timestamp: string;
  action: string;
  component: string;
  data?: Record<string, any>;
  userId?: string;
  sessionId?: string;
}

class ErrorLogger {
  private logs: ErrorLogEntry[] = [];
  private metrics: PerformanceMetric[] = [];
  private actions: UserAction[] = [];
  private maxLogs = 1000;
  private sessionId: string;
  private isEnabled = true;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupGlobalErrorHandlers();
    this.setupPerformanceMonitoring();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupGlobalErrorHandlers(): void {
    if (typeof window === 'undefined') return;

    // 捕获未处理的错误
    window.addEventListener('error', (event) => {
      this.logError({
        message: event.message,
        error: event.error,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          type: 'javascript_error'
        }
      });
    });

    // 捕获未处理的 Promise 拒绝
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        message: 'Unhandled Promise Rejection',
        error: event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        context: {
          type: 'unhandled_promise_rejection'
        }
      });
    });

    // 捕获资源加载错误
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.logError({
          message: 'Resource loading error',
          context: {
            type: 'resource_error',
            tagName: (event.target as any)?.tagName,
            src: (event.target as any)?.src || (event.target as any)?.href
          }
        });
      }
    }, true);
  }

  private setupPerformanceMonitoring(): void {
    if (typeof window === 'undefined' || !window.performance) return;

    // 监控页面加载性能
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          this.logMetric('page_load_time', navigation.loadEventEnd - navigation.fetchStart, 'ms');
          this.logMetric('dom_content_loaded', navigation.domContentLoadedEventEnd - navigation.fetchStart, 'ms');
          this.logMetric('first_paint', navigation.responseEnd - navigation.fetchStart, 'ms');
        }
      }, 0);
    });

    // 监控长任务
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) { // 长任务阈值
              this.logMetric('long_task', entry.duration, 'ms', {
                name: entry.name,
                startTime: entry.startTime
              });
            }
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        console.warn('Long task monitoring not supported');
      }
    }
  }

  public logError(params: {
    message: string;
    error?: Error;
    context?: Record<string, any>;
    component?: string;
    action?: string;
    level?: 'error' | 'warn';
  }): void {
    if (!this.isEnabled) return;

    const entry: ErrorLogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      level: params.level || 'error',
      message: params.message,
      error: params.error,
      context: params.context,
      stack: params.error?.stack,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      sessionId: this.sessionId,
      component: params.component,
      action: params.action,
      metadata: {
        timestamp_ms: Date.now(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };

    this.logs.push(entry);
    this.trimLogs();

    // 控制台输出
    console.error(`[ErrorLogger] ${entry.message}`, {
      id: entry.id,
      error: params.error,
      context: params.context
    });

    // 发送到服务器（在生产环境中）
    if (process.env.NODE_ENV === 'production') {
      this.sendToServer('error', entry);
    }
  }

  public logWarning(message: string, context?: Record<string, any>, component?: string): void {
    this.logError({
      message,
      context,
      component,
      level: 'warn'
    });
  }

  public logInfo(message: string, context?: Record<string, any>, component?: string): void {
    if (!this.isEnabled) return;

    const entry: ErrorLogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      sessionId: this.sessionId,
      component,
      metadata: {
        timestamp_ms: Date.now()
      }
    };

    this.logs.push(entry);
    this.trimLogs();

    console.info(`[ErrorLogger] ${message}`, context);
  }

  public logMetric(name: string, value: number, unit: string, context?: Record<string, any>): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      name,
      value,
      unit,
      context
    };

    this.metrics.push(metric);
    this.trimMetrics();

    console.debug(`[Performance] ${name}: ${value}${unit}`, context);

    // 发送到服务器
    if (process.env.NODE_ENV === 'production') {
      this.sendToServer('metric', metric);
    }
  }

  public logUserAction(action: string, component: string, data?: Record<string, any>): void {
    if (!this.isEnabled) return;

    const userAction: UserAction = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      action,
      component,
      data,
      sessionId: this.sessionId
    };

    this.actions.push(userAction);
    this.trimActions();

    console.debug(`[UserAction] ${component}.${action}`, data);

    // 发送到服务器
    if (process.env.NODE_ENV === 'production') {
      this.sendToServer('action', userAction);
    }
  }

  public logApiCall(params: {
    url: string;
    method: string;
    status: number;
    duration: number;
    error?: Error;
    requestData?: any;
    responseData?: any;
  }): void {
    const level = params.status >= 400 ? 'error' : 'info';
    const message = `API ${params.method} ${params.url} - ${params.status} (${params.duration}ms)`;

    if (level === 'error') {
      this.logError({
        message,
        error: params.error,
        context: {
          type: 'api_error',
          url: params.url,
          method: params.method,
          status: params.status,
          duration: params.duration,
          requestData: params.requestData,
          responseData: params.responseData
        },
        component: 'api'
      });
    } else {
      this.logInfo(message, {
        type: 'api_success',
        url: params.url,
        method: params.method,
        status: params.status,
        duration: params.duration
      }, 'api');
    }

    // 记录性能指标
    this.logMetric('api_response_time', params.duration, 'ms', {
      url: params.url,
      method: params.method,
      status: params.status
    });
  }

  private trimLogs(): void {
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  private trimMetrics(): void {
    if (this.metrics.length > this.maxLogs) {
      this.metrics = this.metrics.slice(-this.maxLogs);
    }
  }

  private trimActions(): void {
    if (this.actions.length > this.maxLogs) {
      this.actions = this.actions.slice(-this.maxLogs);
    }
  }

  private async sendToServer(type: 'error' | 'metric' | 'action', data: any): Promise<void> {
    try {
      // 批量发送，避免过多请求
      const batch = {
        type,
        data,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString()
      };

      // 这里可以实现批量发送逻辑
      // await fetch('/api/logging', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(batch)
      // });
    } catch (error) {
      console.warn('Failed to send log to server:', error);
    }
  }

  public getLogs(level?: 'error' | 'warn' | 'info' | 'debug'): ErrorLogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  public getUserActions(): UserAction[] {
    return [...this.actions];
  }

  public clearLogs(): void {
    this.logs = [];
    this.metrics = [];
    this.actions = [];
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  // 导出日志数据
  public exportLogs(): {
    logs: ErrorLogEntry[];
    metrics: PerformanceMetric[];
    actions: UserAction[];
    session: {
      id: string;
      startTime: string;
      userAgent?: string;
      url?: string;
    };
  } {
    return {
      logs: this.getLogs(),
      metrics: this.getMetrics(),
      actions: this.getUserActions(),
      session: {
        id: this.sessionId,
        startTime: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined
      }
    };
  }
}

// 创建全局实例
export const errorLogger = new ErrorLogger();

// 便捷函数
export const logError = (message: string, error?: Error, context?: Record<string, any>, component?: string) => {
  errorLogger.logError({ message, error, context, component });
};

export const logWarning = (message: string, context?: Record<string, any>, component?: string) => {
  errorLogger.logWarning(message, context, component);
};

export const logInfo = (message: string, context?: Record<string, any>, component?: string) => {
  errorLogger.logInfo(message, context, component);
};

export const logMetric = (name: string, value: number, unit: string, context?: Record<string, any>) => {
  errorLogger.logMetric(name, value, unit, context);
};

export const logUserAction = (action: string, component: string, data?: Record<string, any>) => {
  errorLogger.logUserAction(action, component, data);
};

export const logApiCall = (params: Parameters<typeof errorLogger.logApiCall>[0]) => {
  errorLogger.logApiCall(params);
};

// React Hook for error logging
export const useErrorLogger = () => {
  return {
    logError,
    logWarning,
    logInfo,
    logMetric,
    logUserAction,
    logApiCall,
    getLogs: () => errorLogger.getLogs(),
    getMetrics: () => errorLogger.getMetrics(),
    getUserActions: () => errorLogger.getUserActions(),
    exportLogs: () => errorLogger.exportLogs(),
    clearLogs: () => errorLogger.clearLogs()
  };
};