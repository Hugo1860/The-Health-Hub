/**
 * 性能监控系统
 * 监控API端点性能、数据库查询性能和系统资源使用情况
 */

import { defaultLogger } from './structured-logger';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  tags: Record<string, string>;
  context?: Record<string, any>;
}

interface ApiMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  requestSize: number;
  responseSize: number;
  timestamp: string;
  userAgent?: string;
  ip?: string;
  userId?: string;
}

interface DatabaseMetrics {
  operation: string;
  query: string;
  duration: number;
  rowsAffected?: number;
  timestamp: string;
  connectionId?: string;
}

interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  diskUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  uptime: number;
  timestamp: string;
}

interface PerformanceStats {
  api: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    slowestEndpoints: Array<{
      endpoint: string;
      averageTime: number;
      requestCount: number;
    }>;
  };
  database: {
    totalQueries: number;
    averageQueryTime: number;
    slowestQueries: Array<{
      query: string;
      averageTime: number;
      count: number;
    }>;
  };
  system: {
    currentCpuUsage: number;
    currentMemoryUsage: number;
    averageCpuUsage: number;
    averageMemoryUsage: number;
  };
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private apiMetrics: ApiMetrics[] = [];
  private dbMetrics: DatabaseMetrics[] = [];
  private systemMetrics: SystemMetrics[] = [];
  private maxMetricsHistory = 10000;
  private monitoringInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startSystemMonitoring();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * 记录API性能指标
   */
  recordApiMetrics(metrics: Omit<ApiMetrics, 'timestamp'>): void {
    const apiMetric: ApiMetrics = {
      ...metrics,
      timestamp: new Date().toISOString()
    };

    this.apiMetrics.push(apiMetric);
    this.trimMetrics();

    // 记录到结构化日志
    defaultLogger.performance(
      `API ${metrics.method} ${metrics.endpoint}`,
      metrics.responseTime,
      {
        statusCode: metrics.statusCode,
        requestSize: metrics.requestSize,
        responseSize: metrics.responseSize
      },
      {
        method: metrics.method,
        url: metrics.endpoint,
        statusCode: metrics.statusCode,
        ip: metrics.ip,
        userAgent: metrics.userAgent,
        userId: metrics.userId
      }
    );

    // 记录慢请求
    if (metrics.responseTime > 5000) { // 超过5秒
      defaultLogger.warn(
        `Slow API request detected: ${metrics.method} ${metrics.endpoint}`,
        {
          responseTime: metrics.responseTime,
          statusCode: metrics.statusCode
        },
        {
          method: metrics.method,
          url: metrics.endpoint,
          tags: ['slow-request']
        }
      );
    }
  }

  /**
   * 记录数据库性能指标
   */
  recordDatabaseMetrics(metrics: Omit<DatabaseMetrics, 'timestamp'>): void {
    const dbMetric: DatabaseMetrics = {
      ...metrics,
      timestamp: new Date().toISOString()
    };

    this.dbMetrics.push(dbMetric);
    this.trimMetrics();

    // 记录到结构化日志
    defaultLogger.database(
      metrics.operation,
      metrics.query,
      metrics.duration,
      {
        rowsAffected: metrics.rowsAffected,
        connectionId: metrics.connectionId
      }
    );

    // 记录慢查询
    if (metrics.duration > 1000) { // 超过1秒
      defaultLogger.warn(
        `Slow database query detected: ${metrics.operation}`,
        {
          query: metrics.query.substring(0, 200),
          duration: metrics.duration,
          rowsAffected: metrics.rowsAffected
        },
        {
          tags: ['slow-query']
        }
      );
    }
  }

  /**
   * 记录自定义性能指标
   */
  recordMetric(name: string, value: number, unit: string, tags: Record<string, string> = {}, context?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date().toISOString(),
      tags,
      context
    };

    this.metrics.push(metric);
    this.trimMetrics();

    defaultLogger.performance(name, value, { unit, ...context, ...tags });
  }

  /**
   * 开始性能计时
   */
  startTimer(name: string): () => void {
    const startTime = Date.now();
    
    return () => {
      const duration = Date.now() - startTime;
      this.recordMetric(name, duration, 'ms', { type: 'timer' });
      return duration;
    };
  }

  /**
   * 装饰器：自动监控函数性能
   */
  monitor<T extends (...args: any[]) => any>(
    name: string,
    fn: T,
    options: { logArgs?: boolean; logResult?: boolean } = {}
  ): T {
    return ((...args: any[]) => {
      const timer = this.startTimer(name);
      const startTime = Date.now();

      try {
        const result = fn(...args);

        // 处理Promise
        if (result && typeof result.then === 'function') {
          return result
            .then((res: any) => {
              const duration = timer();
              
              defaultLogger.performance(
                `Function ${name} completed`,
                duration,
                {
                  ...(options.logArgs && { args: JSON.stringify(args).substring(0, 200) }),
                  ...(options.logResult && { result: JSON.stringify(res).substring(0, 200) })
                }
              );
              
              return res;
            })
            .catch((error: any) => {
              const duration = timer();
              
              defaultLogger.error(
                `Function ${name} failed`,
                error,
                {
                  duration,
                  ...(options.logArgs && { args: JSON.stringify(args).substring(0, 200) })
                }
              );
              
              throw error;
            });
        }

        // 同步函数
        const duration = timer();
        
        defaultLogger.performance(
          `Function ${name} completed`,
          duration,
          {
            ...(options.logArgs && { args: JSON.stringify(args).substring(0, 200) }),
            ...(options.logResult && { result: JSON.stringify(result).substring(0, 200) })
          }
        );

        return result;
      } catch (error) {
        const duration = timer();
        
        defaultLogger.error(
          `Function ${name} failed`,
          error as Error,
          {
            duration,
            ...(options.logArgs && { args: JSON.stringify(args).substring(0, 200) })
          }
        );
        
        throw error;
      }
    }) as T;
  }

  /**
   * 获取性能统计信息
   */
  getStats(): PerformanceStats {
    const now = Date.now();
    const oneHourAgo = now - 3600000; // 1小时前

    // API统计
    const recentApiMetrics = this.apiMetrics.filter(m => 
      new Date(m.timestamp).getTime() > oneHourAgo
    );

    const apiStats = this.calculateApiStats(recentApiMetrics);

    // 数据库统计
    const recentDbMetrics = this.dbMetrics.filter(m => 
      new Date(m.timestamp).getTime() > oneHourAgo
    );

    const dbStats = this.calculateDbStats(recentDbMetrics);

    // 系统统计
    const recentSystemMetrics = this.systemMetrics.filter(m => 
      new Date(m.timestamp).getTime() > oneHourAgo
    );

    const systemStats = this.calculateSystemStats(recentSystemMetrics);

    return {
      api: apiStats,
      database: dbStats,
      system: systemStats
    };
  }

  /**
   * 获取实时系统指标
   */
  getCurrentSystemMetrics(): SystemMetrics {
    const memUsage = process.memoryUsage();
    
    return {
      cpuUsage: process.cpuUsage().user / 1000000, // 转换为秒
      memoryUsage: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
      },
      diskUsage: {
        used: 0, // 需要额外的库来获取磁盘使用情况
        total: 0,
        percentage: 0
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 导出Prometheus格式的指标
   */
  exportPrometheusMetrics(): string {
    const stats = this.getStats();
    const currentSystem = this.getCurrentSystemMetrics();
    
    const metrics = [
      `# HELP api_requests_total Total number of API requests`,
      `# TYPE api_requests_total counter`,
      `api_requests_total ${stats.api.totalRequests}`,
      ``,
      `# HELP api_request_duration_average Average API request duration in milliseconds`,
      `# TYPE api_request_duration_average gauge`,
      `api_request_duration_average ${stats.api.averageResponseTime}`,
      ``,
      `# HELP api_error_rate API error rate percentage`,
      `# TYPE api_error_rate gauge`,
      `api_error_rate ${stats.api.errorRate}`,
      ``,
      `# HELP database_queries_total Total number of database queries`,
      `# TYPE database_queries_total counter`,
      `database_queries_total ${stats.database.totalQueries}`,
      ``,
      `# HELP database_query_duration_average Average database query duration in milliseconds`,
      `# TYPE database_query_duration_average gauge`,
      `database_query_duration_average ${stats.database.averageQueryTime}`,
      ``,
      `# HELP system_cpu_usage Current CPU usage percentage`,
      `# TYPE system_cpu_usage gauge`,
      `system_cpu_usage ${currentSystem.cpuUsage}`,
      ``,
      `# HELP system_memory_usage Current memory usage percentage`,
      `# TYPE system_memory_usage gauge`,
      `system_memory_usage ${currentSystem.memoryUsage.percentage}`,
      ``,
      `# HELP system_uptime System uptime in seconds`,
      `# TYPE system_uptime gauge`,
      `system_uptime ${currentSystem.uptime}`
    ];

    return metrics.join('\n');
  }

  private calculateApiStats(metrics: ApiMetrics[]) {
    if (metrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        slowestEndpoints: []
      };
    }

    const totalRequests = metrics.length;
    const averageResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests;
    const errorCount = metrics.filter(m => m.statusCode >= 400).length;
    const errorRate = (errorCount / totalRequests) * 100;

    // 计算最慢的端点
    const endpointStats = new Map<string, { totalTime: number; count: number }>();
    
    metrics.forEach(m => {
      const key = `${m.method} ${m.endpoint}`;
      const existing = endpointStats.get(key) || { totalTime: 0, count: 0 };
      endpointStats.set(key, {
        totalTime: existing.totalTime + m.responseTime,
        count: existing.count + 1
      });
    });

    const slowestEndpoints = Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        averageTime: stats.totalTime / stats.count,
        requestCount: stats.count
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 10);

    return {
      totalRequests,
      averageResponseTime,
      errorRate,
      slowestEndpoints
    };
  }

  private calculateDbStats(metrics: DatabaseMetrics[]) {
    if (metrics.length === 0) {
      return {
        totalQueries: 0,
        averageQueryTime: 0,
        slowestQueries: []
      };
    }

    const totalQueries = metrics.length;
    const averageQueryTime = metrics.reduce((sum, m) => sum + m.duration, 0) / totalQueries;

    // 计算最慢的查询
    const queryStats = new Map<string, { totalTime: number; count: number }>();
    
    metrics.forEach(m => {
      const queryKey = m.query.substring(0, 100); // 截取前100个字符作为key
      const existing = queryStats.get(queryKey) || { totalTime: 0, count: 0 };
      queryStats.set(queryKey, {
        totalTime: existing.totalTime + m.duration,
        count: existing.count + 1
      });
    });

    const slowestQueries = Array.from(queryStats.entries())
      .map(([query, stats]) => ({
        query,
        averageTime: stats.totalTime / stats.count,
        count: stats.count
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 10);

    return {
      totalQueries,
      averageQueryTime,
      slowestQueries
    };
  }

  private calculateSystemStats(metrics: SystemMetrics[]) {
    if (metrics.length === 0) {
      const current = this.getCurrentSystemMetrics();
      return {
        currentCpuUsage: current.cpuUsage,
        currentMemoryUsage: current.memoryUsage.percentage,
        averageCpuUsage: current.cpuUsage,
        averageMemoryUsage: current.memoryUsage.percentage
      };
    }

    const current = this.getCurrentSystemMetrics();
    const averageCpuUsage = metrics.reduce((sum, m) => sum + m.cpuUsage, 0) / metrics.length;
    const averageMemoryUsage = metrics.reduce((sum, m) => sum + m.memoryUsage.percentage, 0) / metrics.length;

    return {
      currentCpuUsage: current.cpuUsage,
      currentMemoryUsage: current.memoryUsage.percentage,
      averageCpuUsage,
      averageMemoryUsage
    };
  }

  private startSystemMonitoring(): void {
    // 每30秒收集一次系统指标
    this.monitoringInterval = setInterval(() => {
      const systemMetric = this.getCurrentSystemMetrics();
      this.systemMetrics.push(systemMetric);
      this.trimMetrics();

      // 记录系统指标到日志
      defaultLogger.info('System metrics collected', {
        cpuUsage: systemMetric.cpuUsage,
        memoryUsage: systemMetric.memoryUsage,
        uptime: systemMetric.uptime
      }, {
        tags: ['system-metrics']
      });
    }, 30000);
  }

  private trimMetrics(): void {
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }
    if (this.apiMetrics.length > this.maxMetricsHistory) {
      this.apiMetrics = this.apiMetrics.slice(-this.maxMetricsHistory);
    }
    if (this.dbMetrics.length > this.maxMetricsHistory) {
      this.dbMetrics = this.dbMetrics.slice(-this.maxMetricsHistory);
    }
    if (this.systemMetrics.length > this.maxMetricsHistory) {
      this.systemMetrics = this.systemMetrics.slice(-this.maxMetricsHistory);
    }
  }

  /**
   * 停止监控
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}

// 创建单例实例
const performanceMonitor = PerformanceMonitor.getInstance();

export { PerformanceMonitor, performanceMonitor };
export type { PerformanceMetric, ApiMetrics, DatabaseMetrics, SystemMetrics, PerformanceStats };