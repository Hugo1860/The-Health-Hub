import { monitoringStorage, MonitoringRecord } from './monitoring-storage';
import { performSystemHealthCheck, SystemHealth, HealthChecker, HealthStatus } from './health-checker';
import { getDatabaseStatus, isDatabaseConnected } from './db-robust';

// 聚合健康状态接口
export interface AggregatedHealthStatus {
  overall: {
    status: HealthStatus;
    score: number; // 0-100 健康分数
    lastUpdate: Date;
  };
  sources: Record<string, {
    status: HealthStatus;
    responseTime: number;
    lastCheck: Date;
    metrics: Record<string, number>;
    metadata: Record<string, any>;
    error?: string;
  }>;
  summary: {
    totalSources: number;
    healthySources: number;
    degradedSources: number;
    unhealthySources: number;
    averageResponseTime: number;
  };
  trends: {
    last24h: {
      totalChecks: number;
      successRate: number;
      averageResponseTime: number;
    };
    last7d: {
      totalChecks: number;
      successRate: number;
      averageResponseTime: number;
    };
  };
}

// 监控检查器接口
export interface HealthMonitor {
  name: string;
  source: string;
  enabled: boolean;
  interval: number;
  lastCheck?: Date;
  
  // 执行健康检查
  check(): Promise<{
    status: HealthStatus;
    responseTime: number;
    metrics: Record<string, number>;
    metadata: Record<string, any>;
    error?: string;
  }>;
}

// API健康检查监控器
export class ApiHealthMonitor implements HealthMonitor {
  name: string;
  source: string;
  enabled: boolean;
  interval: number;
  lastCheck?: Date;
  private endpoint: string;

  constructor(name: string, source: string, endpoint: string, interval: number = 30000) {
    this.name = name;
    this.source = source;
    this.endpoint = endpoint;
    this.interval = interval;
    this.enabled = true;
  }

  async check() {
    const startTime = Date.now();
    this.lastCheck = new Date();

    try {
      const response = await fetch(this.endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // 设置超时
        signal: AbortSignal.timeout(10000) // 10秒超时
      });

      const responseTime = Date.now() - startTime;
      
      if (!response.ok) {
        return {
          status: HealthStatus.UNHEALTHY,
          responseTime,
          metrics: { httpStatus: response.status },
          metadata: { endpoint: this.endpoint, statusText: response.statusText },
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const data = await response.json();
      
      // 解析API响应中的健康状态
      let status = HealthStatus.HEALTHY;
      let metrics: Record<string, number> = { httpStatus: response.status, responseTime };
      let metadata: Record<string, any> = { endpoint: this.endpoint };

      if (data.success && data.data) {
        // 处理不同API端点的响应格式
        if (data.data.status) {
          switch (data.data.status) {
            case 'healthy':
              status = HealthStatus.HEALTHY;
              break;
            case 'degraded':
              status = HealthStatus.DEGRADED;
              break;
            case 'unhealthy':
              status = HealthStatus.UNHEALTHY;
              break;
          }
        }

        // 提取指标
        if (data.data.services) {
          Object.entries(data.data.services).forEach(([key, service]: [string, any]) => {
            if (service.responseTime) {
              metrics[`${key}_response_time`] = service.responseTime;
            }
          });
        }

        if (data.data.performance) {
          if (data.data.performance.responseTime) {
            metrics.api_response_time = data.data.performance.responseTime;
          }
          if (data.data.performance.databaseResponseTime) {
            metrics.database_response_time = data.data.performance.databaseResponseTime;
          }
        }

        // 提取元数据
        metadata = {
          ...metadata,
          ...data.data,
          // 移除大型对象以避免存储问题
          services: undefined,
          checks: undefined
        };
      }

      return {
        status,
        responseTime,
        metrics,
        metadata,
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        status: HealthStatus.UNHEALTHY,
        responseTime,
        metrics: { responseTime },
        metadata: { endpoint: this.endpoint },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// 直接健康检查监控器（使用现有的HealthChecker）
export class DirectHealthMonitor implements HealthMonitor {
  name: string;
  source: string;
  enabled: boolean;
  interval: number;
  lastCheck?: Date;
  private checker: HealthChecker;

  constructor(name: string, source: string, checker: HealthChecker, interval: number = 60000) {
    this.name = name;
    this.source = source;
    this.checker = checker;
    this.interval = interval;
    this.enabled = true;
  }

  async check() {
    const startTime = Date.now();
    this.lastCheck = new Date();

    try {
      const result = await this.checker.check();
      const responseTime = Date.now() - startTime;

      let status: HealthStatus;
      switch (result.status) {
        case 'pass':
          status = HealthStatus.HEALTHY;
          break;
        case 'warn':
          status = HealthStatus.DEGRADED;
          break;
        case 'fail':
          status = HealthStatus.UNHEALTHY;
          break;
        default:
          status = HealthStatus.UNHEALTHY;
      }

      return {
        status,
        responseTime,
        metrics: {
          duration: result.duration,
          responseTime
        },
        metadata: result.metadata || {},
        error: result.status === 'fail' ? result.message : undefined
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        status: HealthStatus.UNHEALTHY,
        responseTime,
        metrics: { responseTime },
        metadata: {},
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// 监控聚合器
export class MonitoringAggregator {
  private monitors: Map<string, HealthMonitor> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  constructor() {
    this.initializeDefaultMonitors();
  }

  // 初始化默认监控器
  private initializeDefaultMonitors(): void {
    // API监控器
    this.registerMonitor(new ApiHealthMonitor(
      'Database Health API',
      'database_api',
      '/api/health/database',
      30000
    ));

    this.registerMonitor(new ApiHealthMonitor(
      'Comprehensive Health API',
      'comprehensive_api',
      '/api/health/comprehensive',
      60000
    ));

    this.registerMonitor(new ApiHealthMonitor(
      'Basic Health API',
      'basic_api',
      '/api/health',
      30000
    ));

    console.log('Default health monitors initialized');
  }

  // 注册监控器
  registerMonitor(monitor: HealthMonitor): void {
    this.monitors.set(monitor.source, monitor);
    
    // 如果聚合器正在运行，立即启动这个监控器
    if (this.isRunning && monitor.enabled) {
      this.startMonitor(monitor);
    }

    console.log(`Registered monitor: ${monitor.name} (${monitor.source})`);
  }

  // 注销监控器
  unregisterMonitor(source: string): void {
    this.stopMonitor(source);
    this.monitors.delete(source);
    console.log(`Unregistered monitor: ${source}`);
  }

  // 启动单个监控器
  private startMonitor(monitor: HealthMonitor): void {
    if (!monitor.enabled) return;

    // 清除现有的定时器
    this.stopMonitor(monitor.source);

    // 立即执行一次检查
    this.executeMonitorCheck(monitor);

    // 设置定时检查
    const interval = setInterval(() => {
      this.executeMonitorCheck(monitor);
    }, monitor.interval);

    this.intervals.set(monitor.source, interval);
    console.log(`Started monitor: ${monitor.name} (interval: ${monitor.interval}ms)`);
  }

  // 停止单个监控器
  private stopMonitor(source: string): void {
    const interval = this.intervals.get(source);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(source);
      console.log(`Stopped monitor: ${source}`);
    }
  }

  // 执行监控检查
  private async executeMonitorCheck(monitor: HealthMonitor): Promise<void> {
    try {
      const result = await monitor.check();
      
      // 保存监控记录
      const record: Omit<MonitoringRecord, 'id'> = {
        timestamp: new Date(),
        source: monitor.source,
        status: result.status === HealthStatus.HEALTHY ? 'healthy' :
                result.status === HealthStatus.DEGRADED ? 'degraded' : 'unhealthy',
        metrics: result.metrics,
        metadata: {
          ...result.metadata,
          monitorName: monitor.name,
          monitorType: monitor.constructor.name
        },
        responseTime: result.responseTime,
        error: result.error
      };

      monitoringStorage.saveMonitoringRecord(record);

      // 记录日志（仅在状态不健康时）
      if (result.status !== HealthStatus.HEALTHY) {
        console.warn(`Monitor ${monitor.name} status: ${result.status}`, {
          responseTime: result.responseTime,
          error: result.error
        });
      }

    } catch (error) {
      console.error(`Error executing monitor check for ${monitor.name}:`, error);
      
      // 保存错误记录
      const errorRecord: Omit<MonitoringRecord, 'id'> = {
        timestamp: new Date(),
        source: monitor.source,
        status: 'unhealthy',
        metrics: {},
        metadata: { monitorName: monitor.name, executionError: true },
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Unknown execution error'
      };

      monitoringStorage.saveMonitoringRecord(errorRecord);
    }
  }

  // 启动所有监控器
  startMonitoring(): void {
    if (this.isRunning) {
      console.log('Monitoring is already running');
      return;
    }

    this.isRunning = true;
    
    for (const monitor of this.monitors.values()) {
      if (monitor.enabled) {
        this.startMonitor(monitor);
      }
    }

    console.log(`Started monitoring with ${this.monitors.size} monitors`);
  }

  // 停止所有监控器
  stopMonitoring(): void {
    if (!this.isRunning) {
      console.log('Monitoring is not running');
      return;
    }

    this.isRunning = false;

    for (const source of this.monitors.keys()) {
      this.stopMonitor(source);
    }

    console.log('Stopped all monitoring');
  }

  // 聚合健康检查结果
  async aggregateHealthChecks(): Promise<AggregatedHealthStatus> {
    const now = new Date();
    const sources: Record<string, any> = {};
    let totalResponseTime = 0;
    let sourceCount = 0;

    // 获取每个源的最新状态
    for (const monitor of this.monitors.values()) {
      const recentRecords = monitoringStorage.getMonitoringRecords({
        source: monitor.source,
        limit: 1
      });

      if (recentRecords.length > 0) {
        const record = recentRecords[0];
        sources[monitor.source] = {
          status: record.status === 'healthy' ? HealthStatus.HEALTHY :
                  record.status === 'degraded' ? HealthStatus.DEGRADED : HealthStatus.UNHEALTHY,
          responseTime: record.responseTime,
          lastCheck: record.timestamp,
          metrics: record.metrics,
          metadata: record.metadata,
          error: record.error
        };

        totalResponseTime += record.responseTime;
        sourceCount++;
      } else {
        // 没有记录的源标记为未知状态
        sources[monitor.source] = {
          status: HealthStatus.UNHEALTHY,
          responseTime: 0,
          lastCheck: new Date(0),
          metrics: {},
          metadata: {},
          error: 'No monitoring data available'
        };
      }
    }

    // 计算整体状态
    const sourceStatuses = Object.values(sources).map(s => s.status);
    const healthySources = sourceStatuses.filter(s => s === HealthStatus.HEALTHY).length;
    const degradedSources = sourceStatuses.filter(s => s === HealthStatus.DEGRADED).length;
    const unhealthySources = sourceStatuses.filter(s => s === HealthStatus.UNHEALTHY).length;

    let overallStatus: HealthStatus;
    let healthScore: number;

    if (unhealthySources > 0) {
      overallStatus = HealthStatus.UNHEALTHY;
      healthScore = Math.max(0, 100 - (unhealthySources * 50) - (degradedSources * 25));
    } else if (degradedSources > 0) {
      overallStatus = HealthStatus.DEGRADED;
      healthScore = Math.max(50, 100 - (degradedSources * 25));
    } else {
      overallStatus = HealthStatus.HEALTHY;
      healthScore = 100;
    }

    // 获取趋势数据
    const trends = await this.calculateTrends();

    return {
      overall: {
        status: overallStatus,
        score: healthScore,
        lastUpdate: now
      },
      sources,
      summary: {
        totalSources: sourceCount,
        healthySources,
        degradedSources,
        unhealthySources,
        averageResponseTime: sourceCount > 0 ? totalResponseTime / sourceCount : 0
      },
      trends
    };
  }

  // 计算趋势数据
  private async calculateTrends(): Promise<AggregatedHealthStatus['trends']> {
    const now = new Date();
    
    // 最近24小时
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const records24h = monitoringStorage.getMonitoringRecords({
      startTime: last24h,
      limit: 10000
    });

    // 最近7天
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const records7d = monitoringStorage.getMonitoringRecords({
      startTime: last7d,
      limit: 50000
    });

    const calculate = (records: MonitoringRecord[]) => {
      if (records.length === 0) {
        return { totalChecks: 0, successRate: 0, averageResponseTime: 0 };
      }

      const successfulChecks = records.filter(r => r.status === 'healthy').length;
      const totalResponseTime = records.reduce((sum, r) => sum + r.responseTime, 0);

      return {
        totalChecks: records.length,
        successRate: (successfulChecks / records.length) * 100,
        averageResponseTime: totalResponseTime / records.length
      };
    };

    return {
      last24h: calculate(records24h),
      last7d: calculate(records7d)
    };
  }

  // 获取监控器列表
  getMonitors(): HealthMonitor[] {
    return Array.from(this.monitors.values());
  }

  // 获取监控器状态
  getMonitoringStatus(): {
    isRunning: boolean;
    totalMonitors: number;
    activeMonitors: number;
    lastAggregation?: Date;
  } {
    const activeMonitors = Array.from(this.monitors.values()).filter(m => m.enabled).length;
    
    return {
      isRunning: this.isRunning,
      totalMonitors: this.monitors.size,
      activeMonitors,
      lastAggregation: new Date() // 实际应该跟踪最后一次聚合时间
    };
  }

  // 启用/禁用监控器
  setMonitorEnabled(source: string, enabled: boolean): void {
    const monitor = this.monitors.get(source);
    if (!monitor) {
      throw new Error(`Monitor not found: ${source}`);
    }

    monitor.enabled = enabled;

    if (this.isRunning) {
      if (enabled) {
        this.startMonitor(monitor);
      } else {
        this.stopMonitor(source);
      }
    }

    console.log(`Monitor ${source} ${enabled ? 'enabled' : 'disabled'}`);
  }

  // 更新监控器间隔
  setMonitorInterval(source: string, interval: number): void {
    const monitor = this.monitors.get(source);
    if (!monitor) {
      throw new Error(`Monitor not found: ${source}`);
    }

    monitor.interval = interval;

    // 如果监控器正在运行，重启以应用新间隔
    if (this.isRunning && monitor.enabled) {
      this.startMonitor(monitor);
    }

    console.log(`Monitor ${source} interval updated to ${interval}ms`);
  }

  // 手动触发检查
  async triggerCheck(source?: string): Promise<void> {
    if (source) {
      const monitor = this.monitors.get(source);
      if (!monitor) {
        throw new Error(`Monitor not found: ${source}`);
      }
      await this.executeMonitorCheck(monitor);
    } else {
      // 触发所有监控器检查
      const promises = Array.from(this.monitors.values()).map(monitor => 
        this.executeMonitorCheck(monitor)
      );
      await Promise.all(promises);
    }
  }

  // 获取历史数据
  getHistoricalData(timeRange: { start: Date; end: Date }, source?: string): MonitoringRecord[] {
    return monitoringStorage.getMonitoringRecords({
      source,
      startTime: timeRange.start,
      endTime: timeRange.end,
      limit: 10000
    });
  }
}

// 全局监控聚合器实例
export const monitoringAggregator = new MonitoringAggregator();

// 导出便捷函数
export const monitoring = {
  // 启动监控
  start() {
    monitoringAggregator.startMonitoring();
  },

  // 停止监控
  stop() {
    monitoringAggregator.stopMonitoring();
  },

  // 获取聚合状态
  async getStatus() {
    return monitoringAggregator.aggregateHealthChecks();
  },

  // 获取监控器状态
  getMonitoringStatus() {
    return monitoringAggregator.getMonitoringStatus();
  },

  // 手动触发检查
  async triggerCheck(source?: string) {
    return monitoringAggregator.triggerCheck(source);
  },

  // 注册自定义监控器
  registerMonitor(monitor: HealthMonitor) {
    monitoringAggregator.registerMonitor(monitor);
  }
};