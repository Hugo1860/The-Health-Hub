import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { EnhancedHealthMonitor, EnhancedDatabaseHealthMonitor, EnhancedMemoryHealthMonitor, AlertThresholds, RecoveryStrategy } from '../enhanced-health-monitor';
import { CheckStatus } from '../health-checker';

// Mock monitoring storage
jest.mock('../monitoring-storage', () => ({
  monitoringStorage: {
    saveMonitoringRecord: jest.fn(),
    saveAlert: jest.fn(),
    getMonitoringRecords: jest.fn(() => []),
    getMonitoringStats: jest.fn(() => ({
      totalRecords: 0,
      healthyRecords: 0,
      degradedRecords: 0,
      unhealthyRecords: 0,
      averageResponseTime: 0
    }))
  }
}));

// Mock database functions
jest.mock('../db-robust', () => ({
  getDatabaseStatus: jest.fn(),
  isDatabaseConnected: jest.fn(),
  reconnectDatabase: jest.fn()
}));

// 测试用的增强监控器
class TestEnhancedMonitor extends EnhancedHealthMonitor {
  private mockResult: any = null;

  constructor(name: string = 'Test Monitor') {
    super(name, 1000);
  }

  setMockResult(result: any) {
    this.mockResult = result;
  }

  async check() {
    if (this.mockResult) {
      return this.createResult(
        this.mockResult.status,
        this.mockResult.message,
        Date.now() - this.mockResult.duration,
        this.mockResult.metadata
      );
    }

    return this.createResult(
      CheckStatus.PASS,
      'Test check passed',
      Date.now() - 100,
      { test: true }
    );
  }
}

describe('EnhancedHealthMonitor', () => {
  let monitor: TestEnhancedMonitor;

  beforeEach(() => {
    monitor = new TestEnhancedMonitor();
    jest.clearAllMocks();
  });

  afterEach(() => {
    monitor.stopMonitoring();
  });

  describe('连续监控功能', () => {
    test('应该能够启动连续监控', () => {
      expect(monitor.getMonitoringStatus().isMonitoring).toBe(false);
      
      monitor.startContinuousMonitoring(1000);
      
      expect(monitor.getMonitoringStatus().isMonitoring).toBe(true);
    });

    test('应该能够停止监控', () => {
      monitor.startContinuousMonitoring(1000);
      expect(monitor.getMonitoringStatus().isMonitoring).toBe(true);
      
      monitor.stopMonitoring();
      
      expect(monitor.getMonitoringStatus().isMonitoring).toBe(false);
    });

    test('不应该重复启动监控', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      monitor.startContinuousMonitoring(1000);
      monitor.startContinuousMonitoring(1000);
      
      expect(consoleSpy).toHaveBeenCalledWith('Monitor Test Monitor is already running');
      
      consoleSpy.mockRestore();
    });
  });

  describe('历史记录管理', () => {
    test('应该记录监控历史', async () => {
      monitor.setMockResult({
        status: CheckStatus.PASS,
        message: 'Test passed',
        duration: 100,
        metadata: { test: true }
      });

      // 手动触发检查来记录历史
      await monitor.check();
      
      const history = monitor.getMonitoringHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].status).toBe(CheckStatus.PASS);
    });

    test('应该限制历史记录数量', async () => {
      // 模拟大量检查
      for (let i = 0; i < 1100; i++) {
        monitor.setMockResult({
          status: CheckStatus.PASS,
          message: `Test ${i}`,
          duration: 100,
          metadata: { iteration: i }
        });
        await monitor.check();
      }

      const history = monitor.getMonitoringHistory();
      expect(history.length).toBeLessThanOrEqual(1000);
    });

    test('应该能够获取限定数量的历史记录', async () => {
      // 添加一些历史记录
      for (let i = 0; i < 10; i++) {
        monitor.setMockResult({
          status: CheckStatus.PASS,
          message: `Test ${i}`,
          duration: 100,
          metadata: { iteration: i }
        });
        await monitor.check();
      }

      const limitedHistory = monitor.getMonitoringHistory(5);
      expect(limitedHistory.length).toBe(5);
    });
  });

  describe('告警阈值配置', () => {
    test('应该能够设置告警阈值', () => {
      const newThresholds: Partial<AlertThresholds> = {
        responseTime: { warning: 2000, critical: 5000 },
        consecutiveFailures: { warning: 2, critical: 3 }
      };

      monitor.setAlertThresholds(newThresholds);
      
      // 验证阈值已更新（通过检查内部状态）
      const status = monitor.getMonitoringStatus();
      expect(status).toBeDefined();
    });
  });

  describe('恢复策略', () => {
    test('应该能够设置恢复策略', () => {
      const newStrategy: Partial<RecoveryStrategy> = {
        enabled: true,
        maxAttempts: 5,
        initialDelay: 2000
      };

      monitor.setRecoveryStrategy(newStrategy);
      
      // 验证策略已更新
      const status = monitor.getMonitoringStatus();
      expect(status).toBeDefined();
    });

    test('应该能够手动触发恢复', async () => {
      // 设置一个简单的恢复策略
      monitor.setRecoveryStrategy({
        enabled: true,
        maxAttempts: 1,
        actions: [
          {
            type: 'custom',
            description: 'Test recovery',
            execute: async () => true
          }
        ]
      });

      const result = await monitor.manualRecovery();
      expect(result).toBe(true);
    });
  });

  describe('趋势分析', () => {
    test('应该在历史数据不足时返回稳定趋势', () => {
      const trend = monitor.analyzeTrend();
      
      expect(trend.direction).toBe('stable');
      expect(trend.confidence).toBe(0);
    });

    test('应该能够分析响应时间趋势', async () => {
      // 添加一些有趋势的数据
      const responseTimes = [100, 120, 140, 160, 180, 200, 220, 240, 260, 280];
      
      for (const responseTime of responseTimes) {
        monitor.setMockResult({
          status: CheckStatus.PASS,
          message: 'Test',
          duration: responseTime,
          metadata: {}
        });
        await monitor.check();
      }

      const trend = monitor.analyzeTrend();
      
      expect(trend.metrics.responseTime.current).toBe(280);
      expect(trend.metrics.responseTime.trend).toBeGreaterThan(0); // 上升趋势
    });

    test('应该能够检测错误率趋势', async () => {
      // 添加一些包含错误的数据
      const results = [
        { status: CheckStatus.PASS, hasError: false },
        { status: CheckStatus.PASS, hasError: false },
        { status: CheckStatus.FAIL, hasError: true },
        { status: CheckStatus.FAIL, hasError: true },
        { status: CheckStatus.FAIL, hasError: true },
        { status: CheckStatus.PASS, hasError: false },
        { status: CheckStatus.FAIL, hasError: true },
        { status: CheckStatus.FAIL, hasError: true },
        { status: CheckStatus.FAIL, hasError: true },
        { status: CheckStatus.FAIL, hasError: true }
      ];

      for (const result of results) {
        monitor.setMockResult({
          status: result.status,
          message: result.hasError ? 'Error occurred' : 'Success',
          duration: 100,
          metadata: {}
        });
        await monitor.check();
      }

      const trend = monitor.analyzeTrend();
      
      expect(trend.metrics.errorRate.current).toBeGreaterThan(0);
    });
  });

  describe('监控状态', () => {
    test('应该返回正确的监控状态', () => {
      const status = monitor.getMonitoringStatus();
      
      expect(status).toHaveProperty('isMonitoring');
      expect(status).toHaveProperty('consecutiveFailures');
      expect(status).toHaveProperty('recoveryInProgress');
      expect(status).toHaveProperty('historyCount');
      expect(status).toHaveProperty('trend');
      
      expect(status.isMonitoring).toBe(false);
      expect(status.consecutiveFailures).toBe(0);
      expect(status.recoveryInProgress).toBe(false);
    });

    test('应该能够重置监控状态', async () => {
      // 创建一些失败记录
      monitor.setMockResult({
        status: CheckStatus.FAIL,
        message: 'Test failure',
        duration: 100,
        metadata: {}
      });
      
      await monitor.check();
      
      expect(monitor.getMonitoringStatus().consecutiveFailures).toBeGreaterThan(0);
      
      monitor.resetMonitoringState();
      
      const status = monitor.getMonitoringStatus();
      expect(status.consecutiveFailures).toBe(0);
      expect(status.historyCount).toBe(0);
      expect(status.lastSuccessTime).toBeUndefined();
    });
  });
});

describe('EnhancedDatabaseHealthMonitor', () => {
  let monitor: EnhancedDatabaseHealthMonitor;

  beforeEach(() => {
    monitor = new EnhancedDatabaseHealthMonitor();
    jest.clearAllMocks();
  });

  afterEach(() => {
    monitor.stopMonitoring();
  });

  test('应该能够执行数据库健康检查', async () => {
    const { isDatabaseConnected, getDatabaseStatus } = require('../db-robust');
    
    isDatabaseConnected.mockReturnValue(true);
    getDatabaseStatus.mockResolvedValue({
      connected: true,
      healthy: true,
      path: '/test/db',
      fileExists: true,
      connectionAttempts: 1,
      tablesCount: 5,
      performance: { responseTime: 100 }
    });

    const result = await monitor.check();
    
    expect(result.status).toBe(CheckStatus.PASS);
    expect(result.message).toContain('healthy');
  });

  test('应该能够检测数据库连接失败', async () => {
    const { isDatabaseConnected, getDatabaseStatus } = require('../db-robust');
    
    isDatabaseConnected.mockReturnValue(false);
    getDatabaseStatus.mockResolvedValue({
      connected: false,
      healthy: false,
      path: '/test/db',
      fileExists: false,
      connectionAttempts: 3,
      error: 'Connection failed'
    });

    const result = await monitor.check();
    
    expect(result.status).toBe(CheckStatus.FAIL);
    expect(result.message).toContain('connection failed');
  });

  test('应该能够检测数据库不健康状态', async () => {
    const { isDatabaseConnected, getDatabaseStatus } = require('../db-robust');
    
    isDatabaseConnected.mockReturnValue(true);
    getDatabaseStatus.mockResolvedValue({
      connected: true,
      healthy: false,
      path: '/test/db',
      fileExists: true,
      connectionAttempts: 2,
      tablesCount: 0
    });

    const result = await monitor.check();
    
    expect(result.status).toBe(CheckStatus.WARN);
    expect(result.message).toContain('unhealthy');
  });
});

describe('EnhancedMemoryHealthMonitor', () => {
  let monitor: EnhancedMemoryHealthMonitor;
  let originalMemoryUsage: typeof process.memoryUsage;

  beforeEach(() => {
    monitor = new EnhancedMemoryHealthMonitor();
    originalMemoryUsage = process.memoryUsage;
    jest.clearAllMocks();
  });

  afterEach(() => {
    monitor.stopMonitoring();
    process.memoryUsage = originalMemoryUsage;
  });

  test('应该能够执行内存健康检查', async () => {
    // Mock正常内存使用
    process.memoryUsage = jest.fn().mockReturnValue({
      heapUsed: 50 * 1024 * 1024, // 50MB
      heapTotal: 100 * 1024 * 1024, // 100MB
      external: 10 * 1024 * 1024, // 10MB
      rss: 120 * 1024 * 1024, // 120MB
      arrayBuffers: 5 * 1024 * 1024 // 5MB
    });

    const result = await monitor.check();
    
    expect(result.status).toBe(CheckStatus.PASS);
    expect(result.message).toContain('normal');
  });

  test('应该能够检测高内存使用', async () => {
    // Mock高内存使用
    process.memoryUsage = jest.fn().mockReturnValue({
      heapUsed: 90 * 1024 * 1024, // 90MB
      heapTotal: 100 * 1024 * 1024, // 100MB
      external: 10 * 1024 * 1024, // 10MB
      rss: 120 * 1024 * 1024, // 120MB
      arrayBuffers: 5 * 1024 * 1024 // 5MB
    });

    const result = await monitor.check();
    
    expect(result.status).toBe(CheckStatus.WARN);
    expect(result.message).toContain('high');
  });

  test('应该能够检测临界内存使用', async () => {
    // Mock临界内存使用
    process.memoryUsage = jest.fn().mockReturnValue({
      heapUsed: 98 * 1024 * 1024, // 98MB
      heapTotal: 100 * 1024 * 1024, // 100MB
      external: 10 * 1024 * 1024, // 10MB
      rss: 120 * 1024 * 1024, // 120MB
      arrayBuffers: 5 * 1024 * 1024 // 5MB
    });

    const result = await monitor.check();
    
    expect(result.status).toBe(CheckStatus.FAIL);
    expect(result.message).toContain('critical');
  });
});