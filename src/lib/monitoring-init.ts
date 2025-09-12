import { monitoringStorage, initializeDefaultMonitoringConfigs } from './monitoring-storage';
import { monitoringCleanupManager } from './monitoring-cleanup';

// 监控系统初始化
export class MonitoringInitializer {
  private initialized = false;

  // 初始化监控系统
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('Monitoring system already initialized');
      return;
    }

    try {
      console.log('Initializing monitoring system...');

      // 1. 初始化存储表结构
      await this.initializeStorage();

      // 2. 设置默认配置
      await this.setupDefaultConfigurations();

      // 3. 启动清理计划
      await this.startCleanupSchedule();

      // 4. 验证初始化
      await this.validateInitialization();

      this.initialized = true;
      console.log('Monitoring system initialized successfully');
    } catch (error) {
      console.error('Failed to initialize monitoring system:', error);
      throw error;
    }
  }

  // 初始化存储
  private async initializeStorage(): Promise<void> {
    try {
      // 存储初始化在构造函数中自动完成
      console.log('Monitoring storage initialized');
    } catch (error) {
      console.error('Failed to initialize monitoring storage:', error);
      throw error;
    }
  }

  // 设置默认配置
  private async setupDefaultConfigurations(): Promise<void> {
    try {
      // 初始化默认监控配置
      initializeDefaultMonitoringConfigs();

      // 创建默认告警规则
      await this.createDefaultAlertRules();

      console.log('Default monitoring configurations set up');
    } catch (error) {
      console.error('Failed to setup default configurations:', error);
      throw error;
    }
  }

  // 创建默认告警规则
  private async createDefaultAlertRules(): Promise<void> {
    const defaultRules = [
      {
        name: 'Database Response Time Alert',
        source: 'database',
        condition: JSON.stringify({
          metric: 'responseTime',
          operator: 'gt'
        }),
        threshold: 5000, // 5秒
        duration: 60000, // 1分钟
        severity: 'warning' as const,
        enabled: true,
        notifications: ['email', 'webhook']
      },
      {
        name: 'Memory Usage Warning',
        source: 'memory',
        condition: JSON.stringify({
          metric: 'usagePercentage',
          operator: 'gt'
        }),
        threshold: 85, // 85%
        duration: 300000, // 5分钟
        severity: 'warning' as const,
        enabled: true,
        notifications: ['email']
      },
      {
        name: 'Critical Memory Usage',
        source: 'memory',
        condition: JSON.stringify({
          metric: 'usagePercentage',
          operator: 'gt'
        }),
        threshold: 95, // 95%
        duration: 60000, // 1分钟
        severity: 'critical' as const,
        enabled: true,
        notifications: ['email', 'webhook']
      },
      {
        name: 'Database Connection Failure',
        source: 'database',
        condition: JSON.stringify({
          metric: 'status',
          operator: 'eq',
          value: 'unhealthy'
        }),
        threshold: 1,
        duration: 0, // 立即触发
        severity: 'error' as const,
        enabled: true,
        notifications: ['email', 'webhook']
      },
      {
        name: 'Environment Check Failure',
        source: 'environment',
        condition: JSON.stringify({
          metric: 'status',
          operator: 'eq',
          value: 'unhealthy'
        }),
        threshold: 1,
        duration: 0,
        severity: 'warning' as const,
        enabled: true,
        notifications: ['email']
      }
    ];

    // 检查是否已存在规则，避免重复创建
    const existingRules = monitoringStorage.getAlertRules();
    const existingRuleNames = new Set(existingRules.map(rule => rule.name));

    for (const rule of defaultRules) {
      if (!existingRuleNames.has(rule.name)) {
        monitoringStorage.saveAlertRule(rule);
        console.log(`Created default alert rule: ${rule.name}`);
      }
    }
  }

  // 启动清理计划
  private async startCleanupSchedule(): Promise<void> {
    try {
      monitoringCleanupManager.startCleanupSchedule();
      console.log('Monitoring cleanup schedule started');
    } catch (error) {
      console.error('Failed to start cleanup schedule:', error);
      // 不抛出错误，清理计划失败不应该阻止系统启动
    }
  }

  // 验证初始化
  private async validateInitialization(): Promise<void> {
    try {
      // 验证存储功能
      const testRecord = {
        timestamp: new Date(),
        source: 'test',
        status: 'healthy' as const,
        metrics: { test: 1 },
        metadata: { validation: true },
        responseTime: 100
      };

      const recordId = monitoringStorage.saveMonitoringRecord(testRecord);
      
      // 读取记录验证
      const records = monitoringStorage.getMonitoringRecords({
        source: 'test',
        limit: 1
      });

      if (records.length === 0) {
        throw new Error('Failed to save/retrieve test monitoring record');
      }

      // 清理测试记录
      // 注意：这里应该有删除单个记录的方法，但当前接口没有提供

      // 验证配置
      const configs = monitoringStorage.getAllMonitoringConfigs();
      if (configs.length === 0) {
        throw new Error('No monitoring configurations found');
      }

      // 验证告警规则
      const rules = monitoringStorage.getAlertRules();
      if (rules.length === 0) {
        throw new Error('No alert rules found');
      }

      console.log('Monitoring system validation passed');
    } catch (error) {
      console.error('Monitoring system validation failed:', error);
      throw error;
    }
  }

  // 获取初始化状态
  getInitializationStatus(): {
    initialized: boolean;
    storageReady: boolean;
    configsCount: number;
    rulesCount: number;
    cleanupScheduled: boolean;
  } {
    try {
      const configs = monitoringStorage.getAllMonitoringConfigs();
      const rules = monitoringStorage.getAlertRules();
      const cleanupStatus = monitoringCleanupManager.getCleanupStatus();

      return {
        initialized: this.initialized,
        storageReady: true,
        configsCount: configs.length,
        rulesCount: rules.length,
        cleanupScheduled: cleanupStatus.isScheduled
      };
    } catch (error) {
      return {
        initialized: false,
        storageReady: false,
        configsCount: 0,
        rulesCount: 0,
        cleanupScheduled: false
      };
    }
  }

  // 重置监控系统（用于测试或重新初始化）
  async reset(): Promise<void> {
    try {
      console.log('Resetting monitoring system...');

      // 停止清理计划
      monitoringCleanupManager.stopCleanupSchedule();

      // 清理所有数据（注意：这会删除所有监控数据）
      // 这里应该实现清理所有表的方法

      this.initialized = false;
      console.log('Monitoring system reset completed');
    } catch (error) {
      console.error('Failed to reset monitoring system:', error);
      throw error;
    }
  }

  // 健康检查
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      storage: boolean;
      configs: boolean;
      rules: boolean;
      cleanup: boolean;
    };
    message: string;
  }> {
    const details = {
      storage: false,
      configs: false,
      rules: false,
      cleanup: false
    };

    try {
      // 检查存储
      const stats = monitoringStorage.getMonitoringStats();
      details.storage = true;

      // 检查配置
      const configs = monitoringStorage.getAllMonitoringConfigs();
      details.configs = configs.length > 0;

      // 检查规则
      const rules = monitoringStorage.getAlertRules();
      details.rules = rules.length > 0;

      // 检查清理计划
      const cleanupStatus = monitoringCleanupManager.getCleanupStatus();
      details.cleanup = cleanupStatus.isScheduled;

      const healthyCount = Object.values(details).filter(Boolean).length;
      const totalChecks = Object.keys(details).length;

      let status: 'healthy' | 'degraded' | 'unhealthy';
      let message: string;

      if (healthyCount === totalChecks) {
        status = 'healthy';
        message = 'All monitoring components are functioning properly';
      } else if (healthyCount >= totalChecks / 2) {
        status = 'degraded';
        message = `${healthyCount}/${totalChecks} monitoring components are healthy`;
      } else {
        status = 'unhealthy';
        message = `Only ${healthyCount}/${totalChecks} monitoring components are healthy`;
      }

      return {
        status,
        details,
        message
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details,
        message: `Monitoring system health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

// 全局监控初始化器实例
export const monitoringInitializer = new MonitoringInitializer();

// 导出便捷函数
export const monitoringInit = {
  // 初始化监控系统
  async initialize() {
    return monitoringInitializer.initialize();
  },

  // 获取初始化状态
  getStatus() {
    return monitoringInitializer.getInitializationStatus();
  },

  // 健康检查
  async healthCheck() {
    return monitoringInitializer.healthCheck();
  },

  // 重置系统
  async reset() {
    return monitoringInitializer.reset();
  }
};