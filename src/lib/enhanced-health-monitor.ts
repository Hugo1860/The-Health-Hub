import { HealthChecker, HealthCheckResult, CheckStatus, HealthStatus } from './health-checker';
import { monitoringStorage, MonitoringRecord } from './monitoring-storage';
import { getDatabaseStatus, isDatabaseConnected, reconnectDatabase } from './db-robust';

// 告警阈值配置
export interface AlertThresholds {
  responseTime: {
    warning: number;
    critical: number;
  };
  errorRate: {
    warning: number; // 百分比
    critical: number;
  };
  consecutiveFailures: {
    warning: number;
    critical: number;
  };
  availability: {
    warning: number; // 百分比
    critical: number;
  };
}

// 监控历史记录
export interface MonitoringHistoryRecord {
  timestamp: Date;
  status: CheckStatus;
  responseTime: number;
  error?: string;
  metadata?: Record<string, any>;
}

// 趋势分析结果
export interface TrendAnalysis {
  direction: 'improving' | 'stable' | 'degrading';
  confidence: number; // 0-1
  metrics: {
    responseTime: {
      current: number;
      trend: number; // 正数表示增加，负数表示减少
      prediction: number; // 预测下一次的值
    };
    errorRate: {
      current: number;
      trend: number;
      prediction: number;
    };
    availability: {
      current: number;
      trend: number;
      prediction: number;
    };
  };
}

// 自动恢复策略
export interface RecoveryStrategy {
  enabled: boolean;
  maxAttempts: number;
  backoffMultiplier: number;
  initialDelay: number;
  maxDelay: number;
  actions: RecoveryAction[];
}

export interface RecoveryAction {
  type: 'reconnect' | 'restart' | 'cleanup' | 'custom';
  description: string;
  execute: () => Promise<boolean>;
}

// 增强健康监控器基类
export abstract class EnhancedHealthMonitor extends HealthChecker {
  protected isMonitoring = false;
  protected monitoringInterval?: NodeJS.Timeout;
  protected history: MonitoringHistoryRecord[] = [];
  protected consecutiveFailures = 0;
  protected lastSuccessTime?: Date;
  protected alertThresholds: AlertThresholds;
  protected recoveryStrategy: RecoveryStrategy;
  protected recoveryInProgress = false;

  constructor(
    name: string,
    timeout: number = 5000,
    alertThresholds?: Partial<AlertThresholds>,
    recoveryStrategy?: Partial<RecoveryStrategy>
  ) {
    super();
    this.name = name;
    this.timeout = timeout;
    
    // 设置默认告警阈值
    this.alertThresholds = {
      responseTime: {
        warning: 5000,
        critical: 10000
      },
      errorRate: {
        warning: 10,
        critical: 25
      },
      consecutiveFailures: {
        warning: 3,
        critical: 5
      },
      availability: {
        warning: 95,
        critical: 90
      },
      ...alertThresholds
    };

    // 设置默认恢复策略
    this.recoveryStrategy = {
      enabled: true,
      maxAttempts: 3,
      backoffMultiplier: 2,
      initialDelay: 1000,
      maxDelay: 30000,
      actions: [],
      ...recoveryStrategy
    };
  }

  // 启动连续监控
  startContinuousMonitoring(interval: number): void {
    if (this.isMonitoring) {
      console.log(`Monitor ${this.name} is already running`);
      return;
    }

    this.isMonitoring = true;
    
    // 立即执行一次检查
    this.performEnhancedCheck();

    // 设置定时检查
    this.monitoringInterval = setInterval(() => {
      this.performEnhancedCheck();
    }, interval);

    console.log(`Started continuous monitoring for ${this.name} (interval: ${interval}ms)`);
  }

  // 停止监控
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    console.log(`Stopped monitoring for ${this.name}`);
  }

  // 执行增强检查
  private async performEnhancedCheck(): Promise<void> {
    try {
      const result = await this.check();
      
      // 记录历史
      this.recordHistory(result);
      
      // 保存到存储
      await this.saveMonitoringRecord(result);
      
      // 分析趋势
      const trend = this.analyzeTrend();
      
      // 检查告警条件
      await this.checkAlertConditions(result, trend);
      
      // 处理成功/失败状态
      if (result.status === CheckStatus.PASS) {
        this.handleSuccess();
      } else {
        await this.handleFailure(result);
      }

    } catch (error) {
      console.error(`Error during enhanced check for ${this.name}:`, error);
      
      const errorResult: HealthCheckResult = {
        status: CheckStatus.FAIL,
        message: `Check execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: 0,
        timestamp: new Date().toISOString(),
        metadata: { executionError: true }
      };

      this.recordHistory(errorResult);
      await this.handleFailure(errorResult);
    }
  }

  // 记录历史
  private recordHistory(result: HealthCheckResult): void {
    const record: MonitoringHistoryRecord = {
      timestamp: new Date(),
      status: result.status,
      responseTime: result.duration,
      error: result.status === CheckStatus.FAIL ? result.message : undefined,
      metadata: result.metadata
    };

    this.history.push(record);

    // 保持历史记录在合理范围内（最近1000条）
    if (this.history.length > 1000) {
      this.history = this.history.slice(-1000);
    }
  }

  // 保存监控记录
  private async saveMonitoringRecord(result: HealthCheckResult): Promise<void> {
    const record: Omit<MonitoringRecord, 'id'> = {
      timestamp: new Date(),
      source: this.name.toLowerCase().replace(/\s+/g, '_'),
      status: result.status === CheckStatus.PASS ? 'healthy' :
              result.status === CheckStatus.WARN ? 'degraded' : 'unhealthy',
      metrics: {
        duration: result.duration,
        consecutiveFailures: this.consecutiveFailures,
        ...this.extractMetrics(result)
      },
      metadata: {
        ...result.metadata,
        monitorType: 'enhanced',
        lastSuccessTime: this.lastSuccessTime?.toISOString()
      },
      responseTime: result.duration,
      error: result.status === CheckStatus.FAIL ? result.message : undefined
    };

    monitoringStorage.saveMonitoringRecord(record);
  }

  // 提取指标
  protected extractMetrics(result: HealthCheckResult): Record<string, number> {
    const metrics: Record<string, number> = {};
    
    if (result.metadata) {
      // 从元数据中提取数值指标
      Object.entries(result.metadata).forEach(([key, value]) => {
        if (typeof value === 'number') {
          metrics[key] = value;
        }
      });
    }

    return metrics;
  }

  // 趋势分析
  analyzeTrend(): TrendAnalysis {
    if (this.history.length < 10) {
      return {
        direction: 'stable',
        confidence: 0,
        metrics: {
          responseTime: { current: 0, trend: 0, prediction: 0 },
          errorRate: { current: 0, trend: 0, prediction: 0 },
          availability: { current: 100, trend: 0, prediction: 100 }
        }
      };
    }

    const recentHistory = this.history.slice(-50); // 最近50次检查
    const responseTimes = recentHistory.map(h => h.responseTime);
    const errors = recentHistory.filter(h => h.error).length;
    const successes = recentHistory.filter(h => h.status === CheckStatus.PASS).length;

    // 计算当前指标
    const currentResponseTime = responseTimes[responseTimes.length - 1];
    const currentErrorRate = (errors / recentHistory.length) * 100;
    const currentAvailability = (successes / recentHistory.length) * 100;

    // 计算趋势（简单线性回归）
    const responseTimeTrend = this.calculateTrend(responseTimes);
    const errorRateTrend = this.calculateTrend(recentHistory.map((_, i) => 
      recentHistory.slice(0, i + 1).filter(h => h.error).length / (i + 1) * 100
    ));
    const availabilityTrend = this.calculateTrend(recentHistory.map((_, i) => 
      recentHistory.slice(0, i + 1).filter(h => h.status === CheckStatus.PASS).length / (i + 1) * 100
    ));

    // 预测下一次的值
    const responseTimePrediction = currentResponseTime + responseTimeTrend;
    const errorRatePrediction = Math.max(0, Math.min(100, currentErrorRate + errorRateTrend));
    const availabilityPrediction = Math.max(0, Math.min(100, currentAvailability + availabilityTrend));

    // 确定整体趋势方向
    let direction: 'improving' | 'stable' | 'degrading' = 'stable';
    let confidence = 0;

    const trendScore = (
      (responseTimeTrend < 0 ? 1 : responseTimeTrend > 0 ? -1 : 0) +
      (errorRateTrend < 0 ? 1 : errorRateTrend > 0 ? -1 : 0) +
      (availabilityTrend > 0 ? 1 : availabilityTrend < 0 ? -1 : 0)
    );

    if (trendScore > 0) {
      direction = 'improving';
      confidence = Math.min(1, Math.abs(trendScore) / 3);
    } else if (trendScore < 0) {
      direction = 'degrading';
      confidence = Math.min(1, Math.abs(trendScore) / 3);
    }

    return {
      direction,
      confidence,
      metrics: {
        responseTime: {
          current: currentResponseTime,
          trend: responseTimeTrend,
          prediction: responseTimePrediction
        },
        errorRate: {
          current: currentErrorRate,
          trend: errorRateTrend,
          prediction: errorRatePrediction
        },
        availability: {
          current: currentAvailability,
          trend: availabilityTrend,
          prediction: availabilityPrediction
        }
      }
    };
  }

  // 计算趋势（简单线性回归斜率）
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const sumX = (n * (n - 1)) / 2; // 0 + 1 + 2 + ... + (n-1)
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + i * val, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6; // 0² + 1² + 2² + ... + (n-1)²

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return isNaN(slope) ? 0 : slope;
  }

  // 检查告警条件
  private async checkAlertConditions(result: HealthCheckResult, trend: TrendAnalysis): Promise<void> {
    const alerts: Array<{ level: 'warning' | 'critical'; message: string; metadata: any }> = [];

    // 检查响应时间
    if (result.duration > this.alertThresholds.responseTime.critical) {
      alerts.push({
        level: 'critical',
        message: `Response time ${result.duration}ms exceeds critical threshold ${this.alertThresholds.responseTime.critical}ms`,
        metadata: { metric: 'responseTime', value: result.duration, threshold: this.alertThresholds.responseTime.critical }
      });
    } else if (result.duration > this.alertThresholds.responseTime.warning) {
      alerts.push({
        level: 'warning',
        message: `Response time ${result.duration}ms exceeds warning threshold ${this.alertThresholds.responseTime.warning}ms`,
        metadata: { metric: 'responseTime', value: result.duration, threshold: this.alertThresholds.responseTime.warning }
      });
    }

    // 检查连续失败次数
    if (this.consecutiveFailures >= this.alertThresholds.consecutiveFailures.critical) {
      alerts.push({
        level: 'critical',
        message: `${this.consecutiveFailures} consecutive failures detected`,
        metadata: { metric: 'consecutiveFailures', value: this.consecutiveFailures, threshold: this.alertThresholds.consecutiveFailures.critical }
      });
    } else if (this.consecutiveFailures >= this.alertThresholds.consecutiveFailures.warning) {
      alerts.push({
        level: 'warning',
        message: `${this.consecutiveFailures} consecutive failures detected`,
        metadata: { metric: 'consecutiveFailures', value: this.consecutiveFailures, threshold: this.alertThresholds.consecutiveFailures.warning }
      });
    }

    // 检查错误率
    if (trend.metrics.errorRate.current > this.alertThresholds.errorRate.critical) {
      alerts.push({
        level: 'critical',
        message: `Error rate ${trend.metrics.errorRate.current.toFixed(1)}% exceeds critical threshold ${this.alertThresholds.errorRate.critical}%`,
        metadata: { metric: 'errorRate', value: trend.metrics.errorRate.current, threshold: this.alertThresholds.errorRate.critical }
      });
    } else if (trend.metrics.errorRate.current > this.alertThresholds.errorRate.warning) {
      alerts.push({
        level: 'warning',
        message: `Error rate ${trend.metrics.errorRate.current.toFixed(1)}% exceeds warning threshold ${this.alertThresholds.errorRate.warning}%`,
        metadata: { metric: 'errorRate', value: trend.metrics.errorRate.current, threshold: this.alertThresholds.errorRate.warning }
      });
    }

    // 检查可用性
    if (trend.metrics.availability.current < this.alertThresholds.availability.critical) {
      alerts.push({
        level: 'critical',
        message: `Availability ${trend.metrics.availability.current.toFixed(1)}% below critical threshold ${this.alertThresholds.availability.critical}%`,
        metadata: { metric: 'availability', value: trend.metrics.availability.current, threshold: this.alertThresholds.availability.critical }
      });
    } else if (trend.metrics.availability.current < this.alertThresholds.availability.warning) {
      alerts.push({
        level: 'warning',
        message: `Availability ${trend.metrics.availability.current.toFixed(1)}% below warning threshold ${this.alertThresholds.availability.warning}%`,
        metadata: { metric: 'availability', value: trend.metrics.availability.current, threshold: this.alertThresholds.availability.warning }
      });
    }

    // 保存告警
    for (const alert of alerts) {
      monitoringStorage.saveAlert({
        level: alert.level,
        title: `${this.name} ${alert.level.toUpperCase()} Alert`,
        message: alert.message,
        source: this.name.toLowerCase().replace(/\s+/g, '_'),
        timestamp: new Date(),
        resolved: false,
        metadata: {
          ...alert.metadata,
          trend: trend,
          monitorName: this.name
        }
      });
    }
  }

  // 处理成功
  private handleSuccess(): void {
    if (this.consecutiveFailures > 0) {
      console.log(`Monitor ${this.name} recovered after ${this.consecutiveFailures} failures`);
      this.consecutiveFailures = 0;
    }
    
    this.lastSuccessTime = new Date();
  }

  // 处理失败
  private async handleFailure(result: HealthCheckResult): Promise<void> {
    this.consecutiveFailures++;
    
    console.warn(`Monitor ${this.name} failed (${this.consecutiveFailures} consecutive failures): ${result.message}`);

    // 尝试自动恢复
    if (this.recoveryStrategy.enabled && !this.recoveryInProgress) {
      await this.attemptRecovery();
    }
  }

  // 尝试自动恢复
  private async attemptRecovery(): Promise<void> {
    if (this.recoveryInProgress) {
      return;
    }

    this.recoveryInProgress = true;
    
    try {
      console.log(`Attempting recovery for monitor ${this.name}...`);
      
      let delay = this.recoveryStrategy.initialDelay;
      
      for (let attempt = 1; attempt <= this.recoveryStrategy.maxAttempts; attempt++) {
        console.log(`Recovery attempt ${attempt}/${this.recoveryStrategy.maxAttempts} for ${this.name}`);
        
        // 执行恢复操作
        let recovered = false;
        
        for (const action of this.recoveryStrategy.actions) {
          try {
            console.log(`Executing recovery action: ${action.description}`);
            const success = await action.execute();
            
            if (success) {
              recovered = true;
              break;
            }
          } catch (error) {
            console.error(`Recovery action failed: ${action.description}`, error);
          }
        }

        if (recovered) {
          console.log(`Recovery successful for monitor ${this.name}`);
          this.consecutiveFailures = 0;
          break;
        }

        // 等待后重试
        if (attempt < this.recoveryStrategy.maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay = Math.min(delay * this.recoveryStrategy.backoffMultiplier, this.recoveryStrategy.maxDelay);
        }
      }

    } catch (error) {
      console.error(`Recovery process failed for monitor ${this.name}:`, error);
    } finally {
      this.recoveryInProgress = false;
    }
  }

  // 获取监控历史
  getMonitoringHistory(limit?: number): MonitoringHistoryRecord[] {
    if (limit) {
      return this.history.slice(-limit);
    }
    return [...this.history];
  }

  // 设置告警阈值
  setAlertThresholds(thresholds: Partial<AlertThresholds>): void {
    this.alertThresholds = {
      ...this.alertThresholds,
      ...thresholds
    };
    
    console.log(`Updated alert thresholds for monitor ${this.name}`);
  }

  // 设置恢复策略
  setRecoveryStrategy(strategy: Partial<RecoveryStrategy>): void {
    this.recoveryStrategy = {
      ...this.recoveryStrategy,
      ...strategy
    };
    
    console.log(`Updated recovery strategy for monitor ${this.name}`);
  }

  // 获取监控状态
  getMonitoringStatus(): {
    isMonitoring: boolean;
    consecutiveFailures: number;
    lastSuccessTime?: Date;
    recoveryInProgress: boolean;
    historyCount: number;
    trend: TrendAnalysis;
  } {
    return {
      isMonitoring: this.isMonitoring,
      consecutiveFailures: this.consecutiveFailures,
      lastSuccessTime: this.lastSuccessTime,
      recoveryInProgress: this.recoveryInProgress,
      historyCount: this.history.length,
      trend: this.analyzeTrend()
    };
  }

  // 手动触发恢复
  async manualRecovery(): Promise<boolean> {
    if (this.recoveryInProgress) {
      throw new Error('Recovery is already in progress');
    }

    await this.attemptRecovery();
    return this.consecutiveFailures === 0;
  }

  // 重置监控状态
  resetMonitoringState(): void {
    this.consecutiveFailures = 0;
    this.lastSuccessTime = undefined;
    this.history = [];
    this.recoveryInProgress = false;
    
    console.log(`Reset monitoring state for ${this.name}`);
  }
}

// 增强数据库健康监控器
export class EnhancedDatabaseHealthMonitor extends EnhancedHealthMonitor {
  constructor() {
    super(
      'Enhanced Database Monitor',
      5000,
      {
        responseTime: { warning: 3000, critical: 8000 },
        errorRate: { warning: 5, critical: 15 },
        consecutiveFailures: { warning: 2, critical: 4 },
        availability: { warning: 98, critical: 95 }
      },
      {
        enabled: true,
        maxAttempts: 3,
        backoffMultiplier: 2,
        initialDelay: 2000,
        maxDelay: 30000,
        actions: [
          {
            type: 'reconnect',
            description: 'Reconnect to database',
            execute: async () => {
              try {
                const db = await reconnectDatabase();
                return !!db;
              } catch (error) {
                console.error('Database reconnection failed:', error);
                return false;
              }
            }
          },
          {
            type: 'cleanup',
            description: 'Clean up database connections',
            execute: async () => {
              try {
                // 这里可以添加清理连接池的逻辑
                console.log('Cleaning up database connections...');
                return true;
              } catch (error) {
                console.error('Database cleanup failed:', error);
                return false;
              }
            }
          }
        ]
      }
    );
  }

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const [isConnected, status] = await this.withTimeout(
        Promise.all([
          Promise.resolve(isDatabaseConnected()),
          getDatabaseStatus()
        ])
      );

      const duration = Date.now() - startTime;

      if (!isConnected) {
        return this.createResult(
          CheckStatus.FAIL,
          'Database connection failed',
          startTime,
          { 
            connectionAttempts: status.connectionAttempts, 
            error: status.error,
            dbPath: status.path,
            fileExists: status.fileExists
          }
        );
      }

      if (!status.healthy) {
        return this.createResult(
          CheckStatus.WARN,
          'Database connection is unhealthy',
          startTime,
          { 
            connectionAttempts: status.connectionAttempts,
            lastHealthCheck: status.lastHealthCheck,
            tablesCount: status.tablesCount,
            responseTime: status.performance?.responseTime
          }
        );
      }

      return this.createResult(
        CheckStatus.PASS,
        'Database is healthy and responsive',
        startTime,
        {
          tablesCount: status.tablesCount,
          connectionAttempts: status.connectionAttempts,
          responseTime: status.performance?.responseTime,
          memoryUsage: status.performance?.memoryUsage
        }
      );

    } catch (error) {
      return this.createResult(
        CheckStatus.FAIL,
        `Enhanced database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        startTime,
        { error: error instanceof Error ? error.stack : String(error) }
      );
    }
  }
}

// 增强内存健康监控器
export class EnhancedMemoryHealthMonitor extends EnhancedHealthMonitor {
  constructor() {
    super(
      'Enhanced Memory Monitor',
      2000,
      {
        responseTime: { warning: 1000, critical: 3000 },
        errorRate: { warning: 1, critical: 5 },
        consecutiveFailures: { warning: 5, critical: 10 },
        availability: { warning: 99, critical: 97 }
      },
      {
        enabled: true,
        maxAttempts: 2,
        backoffMultiplier: 1.5,
        initialDelay: 1000,
        maxDelay: 10000,
        actions: [
          {
            type: 'cleanup',
            description: 'Force garbage collection',
            execute: async () => {
              try {
                if (global.gc) {
                  global.gc();
                  console.log('Forced garbage collection');
                  return true;
                }
                return false;
              } catch (error) {
                console.error('Garbage collection failed:', error);
                return false;
              }
            }
          }
        ]
      }
    );
  }

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const memoryUsage = process.memoryUsage();
      const memoryTotal = memoryUsage.heapTotal + memoryUsage.external;
      const memoryUsed = memoryUsage.heapUsed;
      const memoryPercentage = (memoryUsed / memoryTotal) * 100;

      const metadata = {
        used: memoryUsed,
        total: memoryTotal,
        percentage: Math.round(memoryPercentage * 100) / 100,
        heap: {
          used: memoryUsage.heapUsed,
          total: memoryUsage.heapTotal
        },
        external: memoryUsage.external,
        rss: memoryUsage.rss,
        arrayBuffers: memoryUsage.arrayBuffers
      };

      if (memoryPercentage > 95) {
        return this.createResult(
          CheckStatus.FAIL,
          `Memory usage is critical: ${memoryPercentage.toFixed(2)}%`,
          startTime,
          metadata
        );
      }

      if (memoryPercentage > 85) {
        return this.createResult(
          CheckStatus.WARN,
          `Memory usage is high: ${memoryPercentage.toFixed(2)}%`,
          startTime,
          metadata
        );
      }

      return this.createResult(
        CheckStatus.PASS,
        `Memory usage is normal: ${memoryPercentage.toFixed(2)}%`,
        startTime,
        metadata
      );

    } catch (error) {
      return this.createResult(
        CheckStatus.FAIL,
        `Enhanced memory check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        startTime,
        { error: error instanceof Error ? error.stack : String(error) }
      );
    }
  }
}

// 导出增强监控器实例
export const enhancedDatabaseMonitor = new EnhancedDatabaseHealthMonitor();
export const enhancedMemoryMonitor = new EnhancedMemoryHealthMonitor();