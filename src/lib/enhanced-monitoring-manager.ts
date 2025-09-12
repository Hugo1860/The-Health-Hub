import { EnhancedHealthMonitor, enhancedDatabaseMonitor, enhancedMemoryMonitor, TrendAnalysis, AlertThresholds, RecoveryStrategy } from './enhanced-health-monitor';
import { monitoringStorage } from './monitoring-storage';

// 监控器配置
export interface MonitorConfig {
  enabled: boolean;
  interval: number;
  alertThresholds?: Partial<AlertThresholds>;
  recoveryStrategy?: Partial<RecoveryStrategy>;
}

// 监控管理器状态
export interface MonitoringManagerStatus {
  totalMonitors: number;
  activeMonitors: number;
  monitoringEnabled: boolean;
  monitors: Array<{
    name: string;
    enabled: boolean;
    isMonitoring: boolean;
    consecutiveFailures: number;
    lastSuccessTime?: Date;
    trend: TrendAnalysis;
  }>;
  globalStats: {
    totalChecks: number;
    successRate: number;
    averageResponseTime: number;
    activeAlerts: number;
  };
}

// 增强监控管理器
export class EnhancedMonitoringManager {
  private monitors: Map<string, EnhancedHealthMonitor> = new Map();
  private configs: Map<string, MonitorConfig> = new Map();
  private globalEnabled = false;

  constructor() {
    this.initializeDefaultMonitors();
  }

  // 初始化默认监控器
  private initializeDefaultMonitors(): void {
    // 注册默认监控器
    this.registerMonitor('database', enhancedDatabaseMonitor, {
      enabled: true,
      interval: 30000, // 30秒
      alertThresholds: {
        responseTime: { warning: 3000, critical: 8000 },
        consecutiveFailures: { warning: 2, critical: 4 }
      }
    });

    this.registerMonitor('memory', enhancedMemoryMonitor, {
      enabled: true,
      interval: 60000, // 1分钟
      alertThresholds: {
        responseTime: { warning: 1000, critical: 3000 },
        consecutiveFailures: { warning: 5, critical: 10 }
      }
    });

    console.log('Enhanced monitoring manager initialized with default monitors');
  }

  // 注册监控器
  registerMonitor(name: string, monitor: EnhancedHealthMonitor, config: MonitorConfig): void {
    this.monitors.set(name, monitor);
    this.configs.set(name, config);

    // 应用配置
    if (config.alertThresholds) {
      monitor.setAlertThresholds(config.alertThresholds);
    }

    if (config.recoveryStrategy) {
      monitor.setRecoveryStrategy(config.recoveryStrategy);
    }

    // 如果全局监控已启用且监控器已启用，则启动监控
    if (this.globalEnabled && config.enabled) {
      monitor.startContinuousMonitoring(config.interval);
    }

    console.log(`Registered enhanced monitor: ${name}`);
  }

  // 注销监控器
  unregisterMonitor(name: string): void {
    const monitor = this.monitors.get(name);
    if (monitor) {
      monitor.stopMonitoring();
      this.monitors.delete(name);
      this.configs.delete(name);
      console.log(`Unregistered enhanced monitor: ${name}`);
    }
  }

  // 启动所有监控
  startAllMonitoring(): void {
    if (this.globalEnabled) {
      console.log('Enhanced monitoring is already running');
      return;
    }

    this.globalEnabled = true;

    for (const [name, monitor] of this.monitors.entries()) {
      const config = this.configs.get(name);
      if (config?.enabled) {
        monitor.startContinuousMonitoring(config.interval);
      }
    }

    console.log(`Started enhanced monitoring for ${this.monitors.size} monitors`);
  }

  // 停止所有监控
  stopAllMonitoring(): void {
    if (!this.globalEnabled) {
      console.log('Enhanced monitoring is not running');
      return;
    }

    this.globalEnabled = false;

    for (const monitor of this.monitors.values()) {
      monitor.stopMonitoring();
    }

    console.log('Stopped all enhanced monitoring');
  }

  // 启用/禁用特定监控器
  setMonitorEnabled(name: string, enabled: boolean): void {
    const monitor = this.monitors.get(name);
    const config = this.configs.get(name);

    if (!monitor || !config) {
      throw new Error(`Monitor not found: ${name}`);
    }

    config.enabled = enabled;

    if (this.globalEnabled) {
      if (enabled) {
        monitor.startContinuousMonitoring(config.interval);
      } else {
        monitor.stopMonitoring();
      }
    }

    console.log(`Monitor ${name} ${enabled ? 'enabled' : 'disabled'}`);
  }

  // 更新监控器配置
  updateMonitorConfig(name: string, updates: Partial<MonitorConfig>): void {
    const monitor = this.monitors.get(name);
    const config = this.configs.get(name);

    if (!monitor || !config) {
      throw new Error(`Monitor not found: ${name}`);
    }

    // 更新配置
    Object.assign(config, updates);

    // 应用新配置
    if (updates.alertThresholds) {
      monitor.setAlertThresholds(updates.alertThresholds);
    }

    if (updates.recoveryStrategy) {
      monitor.setRecoveryStrategy(updates.recoveryStrategy);
    }

    // 如果间隔改变且监控器正在运行，重启监控
    if (updates.interval && monitor.getMonitoringStatus().isMonitoring) {
      monitor.stopMonitoring();
      monitor.startContinuousMonitoring(config.interval);
    }

    console.log(`Updated configuration for monitor: ${name}`);
  }

  // 手动触发检查
  async triggerCheck(name?: string): Promise<void> {
    if (name) {
      const monitor = this.monitors.get(name);
      if (!monitor) {
        throw new Error(`Monitor not found: ${name}`);
      }
      
      // 对于增强监控器，我们需要手动执行检查
      const result = await monitor.check();
      console.log(`Manual check completed for ${name}:`, result.status);
    } else {
      // 触发所有监控器检查
      const promises = Array.from(this.monitors.entries()).map(async ([monitorName, monitor]) => {
        try {
          const result = await monitor.check();
          console.log(`Manual check completed for ${monitorName}:`, result.status);
        } catch (error) {
          console.error(`Manual check failed for ${monitorName}:`, error);
        }
      });

      await Promise.all(promises);
    }
  }

  // 手动触发恢复
  async triggerRecovery(name: string): Promise<boolean> {
    const monitor = this.monitors.get(name);
    if (!monitor) {
      throw new Error(`Monitor not found: ${name}`);
    }

    return monitor.manualRecovery();
  }

  // 重置监控器状态
  resetMonitorState(name: string): void {
    const monitor = this.monitors.get(name);
    if (!monitor) {
      throw new Error(`Monitor not found: ${name}`);
    }

    monitor.resetMonitoringState();
    console.log(`Reset state for monitor: ${name}`);
  }

  // 获取监控器状态
  getMonitorStatus(name: string): any {
    const monitor = this.monitors.get(name);
    const config = this.configs.get(name);

    if (!monitor || !config) {
      throw new Error(`Monitor not found: ${name}`);
    }

    return {
      name,
      config,
      status: monitor.getMonitoringStatus(),
      history: monitor.getMonitoringHistory(50) // 最近50条记录
    };
  }

  // 获取所有监控器状态
  getAllMonitorStatus(): MonitoringManagerStatus {
    const monitors = Array.from(this.monitors.entries()).map(([name, monitor]) => {
      const status = monitor.getMonitoringStatus();
      return {
        name,
        enabled: this.configs.get(name)?.enabled || false,
        isMonitoring: status.isMonitoring,
        consecutiveFailures: status.consecutiveFailures,
        lastSuccessTime: status.lastSuccessTime,
        trend: status.trend
      };
    });

    const activeMonitors = monitors.filter(m => m.enabled && m.isMonitoring).length;

    // 计算全局统计
    const globalStats = this.calculateGlobalStats();

    return {
      totalMonitors: this.monitors.size,
      activeMonitors,
      monitoringEnabled: this.globalEnabled,
      monitors,
      globalStats
    };
  }

  // 计算全局统计
  private calculateGlobalStats(): MonitoringManagerStatus['globalStats'] {
    // 获取所有监控器的统计数据
    const allStats = monitoringStorage.getMonitoringStats();
    
    // 获取活跃告警数量
    const activeAlerts = monitoringStorage.getAlerts({ resolved: false }).length;

    return {
      totalChecks: allStats.totalRecords,
      successRate: allStats.totalRecords > 0 ? (allStats.healthyRecords / allStats.totalRecords) * 100 : 0,
      averageResponseTime: allStats.averageResponseTime,
      activeAlerts
    };
  }

  // 获取监控器历史
  getMonitorHistory(name: string, limit?: number): any[] {
    const monitor = this.monitors.get(name);
    if (!monitor) {
      throw new Error(`Monitor not found: ${name}`);
    }

    return monitor.getMonitoringHistory(limit);
  }

  // 获取趋势分析
  getTrendAnalysis(name: string): TrendAnalysis {
    const monitor = this.monitors.get(name);
    if (!monitor) {
      throw new Error(`Monitor not found: ${name}`);
    }

    return monitor.analyzeTrend();
  }

  // 获取所有监控器的趋势分析
  getAllTrendAnalysis(): Record<string, TrendAnalysis> {
    const trends: Record<string, TrendAnalysis> = {};
    
    for (const [name, monitor] of this.monitors.entries()) {
      trends[name] = monitor.analyzeTrend();
    }

    return trends;
  }

  // 导出监控配置
  exportConfiguration(): Record<string, MonitorConfig> {
    const config: Record<string, MonitorConfig> = {};
    
    for (const [name, monitorConfig] of this.configs.entries()) {
      config[name] = { ...monitorConfig };
    }

    return config;
  }

  // 导入监控配置
  importConfiguration(config: Record<string, MonitorConfig>): void {
    for (const [name, monitorConfig] of Object.entries(config)) {
      if (this.monitors.has(name)) {
        this.updateMonitorConfig(name, monitorConfig);
      }
    }

    console.log('Imported monitoring configuration');
  }

  // 健康检查
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
    message: string;
  }> {
    const status = this.getAllMonitorStatus();
    const failedMonitors = status.monitors.filter(m => m.consecutiveFailures > 0);
    const degradedMonitors = status.monitors.filter(m => 
      m.trend.direction === 'degrading' && m.trend.confidence > 0.5
    );

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    let message: string;

    if (failedMonitors.length > 0) {
      overallStatus = 'unhealthy';
      message = `${failedMonitors.length} monitors are failing`;
    } else if (degradedMonitors.length > 0) {
      overallStatus = 'degraded';
      message = `${degradedMonitors.length} monitors are degrading`;
    } else {
      overallStatus = 'healthy';
      message = 'All monitors are healthy';
    }

    return {
      status: overallStatus,
      details: {
        totalMonitors: status.totalMonitors,
        activeMonitors: status.activeMonitors,
        failedMonitors: failedMonitors.length,
        degradedMonitors: degradedMonitors.length,
        globalStats: status.globalStats
      },
      message
    };
  }
}

// 全局增强监控管理器实例
export const enhancedMonitoringManager = new EnhancedMonitoringManager();

// 导出便捷函数
export const enhancedMonitoring = {
  // 启动监控
  start() {
    enhancedMonitoringManager.startAllMonitoring();
  },

  // 停止监控
  stop() {
    enhancedMonitoringManager.stopAllMonitoring();
  },

  // 获取状态
  getStatus() {
    return enhancedMonitoringManager.getAllMonitorStatus();
  },

  // 获取特定监控器状态
  getMonitorStatus(name: string) {
    return enhancedMonitoringManager.getMonitorStatus(name);
  },

  // 手动触发检查
  async triggerCheck(name?: string) {
    return enhancedMonitoringManager.triggerCheck(name);
  },

  // 手动触发恢复
  async triggerRecovery(name: string) {
    return enhancedMonitoringManager.triggerRecovery(name);
  },

  // 启用/禁用监控器
  setEnabled(name: string, enabled: boolean) {
    enhancedMonitoringManager.setMonitorEnabled(name, enabled);
  },

  // 更新配置
  updateConfig(name: string, config: Partial<MonitorConfig>) {
    enhancedMonitoringManager.updateMonitorConfig(name, config);
  },

  // 获取趋势分析
  getTrends() {
    return enhancedMonitoringManager.getAllTrendAnalysis();
  },

  // 健康检查
  async healthCheck() {
    return enhancedMonitoringManager.healthCheck();
  }
};