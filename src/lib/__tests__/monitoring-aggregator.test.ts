import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MonitoringAggregator, ApiHealthMonitor, DirectHealthMonitor, HealthMonitor } from '../monitoring-aggregator';
import { HealthStatus } from '../health-checker';

// Mock fetch
global.fetch = jest.fn();

// Mock monitoring storage
jest.mock('../monitoring-storage', () => ({
  monitoringStorage: {
    saveMonitoringRecord: jest.fn(),
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

describe('MonitoringAggregator', () => {
  let aggregator: MonitoringAggregator;

  beforeEach(() => {
    aggregator = new MonitoringAggregator();
    jest.clearAllMocks();
  });

  afterEach(() => {
    aggregator.stopMonitoring();
  });

  describe('监控器注册和管理', () => {
    test('应该能够注册监控器', () => {
      const monitor = new ApiHealthMonitor('Test API', 'test_api', '/api/test', 30000);
      
      aggregator.registerMonitor(monitor);
      
      const monitors = aggregator.getMonitors();
      expect(monitors).toHaveLength(4); // 3个默认 + 1个新增
      expect(monitors.find(m => m.source === 'test_api')).toBeTruthy();
    });

    test('应该能够注销监控器', () => {
      const monitor = new ApiHealthMonitor('Test API', 'test_api', '/api/test', 30000);
      
      aggregator.registerMonitor(monitor);
      expect(aggregator.getMonitors()).toHaveLength(4);
      
      aggregator.unregisterMonitor('test_api');
      expect(aggregator.getMonitors()).toHaveLength(3);
      expect(aggregator.getMonitors().find(m => m.source === 'test_api')).toBeFalsy();
    });

    test('应该能够启用/禁用监控器', () => {
      const monitor = new ApiHealthMonitor('Test API', 'test_api', '/api/test', 30000);
      aggregator.registerMonitor(monitor);
      
      expect(monitor.enabled).toBe(true);
      
      aggregator.setMonitorEnabled('test_api', false);
      expect(monitor.enabled).toBe(false);
      
      aggregator.setMonitorEnabled('test_api', true);
      expect(monitor.enabled).toBe(true);
    });

    test('应该能够更新监控器间隔', () => {
      const monitor = new ApiHealthMonitor('Test API', 'test_api', '/api/test', 30000);
      aggregator.registerMonitor(monitor);
      
      expect(monitor.interval).toBe(30000);
      
      aggregator.setMonitorInterval('test_api', 60000);
      expect(monitor.interval).toBe(60000);
    });
  });

  describe('监控状态管理', () => {
    test('应该能够启动和停止监控', () => {
      const status1 = aggregator.getMonitoringStatus();
      expect(status1.isRunning).toBe(false);
      
      aggregator.startMonitoring();
      const status2 = aggregator.getMonitoringStatus();
      expect(status2.isRunning).toBe(true);
      
      aggregator.stopMonitoring();
      const status3 = aggregator.getMonitoringStatus();
      expect(status3.isRunning).toBe(false);
    });

    test('应该返回正确的监控状态', () => {
      const monitor = new ApiHealthMonitor('Test API', 'test_api', '/api/test', 30000);
      aggregator.registerMonitor(monitor);
      
      const status = aggregator.getMonitoringStatus();
      expect(status.totalMonitors).toBe(4);
      expect(status.activeMonitors).toBe(4); // 所有监控器默认启用
    });
  });

  describe('健康检查聚合', () => {
    test('应该能够聚合健康检查结果', async () => {
      // Mock监控记录
      const { monitoringStorage } = require('../monitoring-storage');
      monitoringStorage.getMonitoringRecords.mockReturnValue([
        {
          id: '1',
          timestamp: new Date(),
          source: 'database_api',
          status: 'healthy',
          responseTime: 100,
          metrics: {},
          metadata: {}
        },
        {
          id: '2',
          timestamp: new Date(),
          source: 'comprehensive_api',
          status: 'degraded',
          responseTime: 200,
          metrics: {},
          metadata: {}
        }
      ]);

      const aggregatedStatus = await aggregator.aggregateHealthChecks();
      
      expect(aggregatedStatus.overall.status).toBe(HealthStatus.DEGRADED);
      expect(aggregatedStatus.summary.totalSources).toBe(2);
      expect(aggregatedStatus.summary.healthySources).toBe(1);
      expect(aggregatedStatus.summary.degradedSources).toBe(1);
      expect(aggregatedStatus.summary.unhealthySources).toBe(0);
    });

    test('应该正确计算健康分数', async () => {
      const { monitoringStorage } = require('../monitoring-storage');
      
      // 全部健康
      monitoringStorage.getMonitoringRecords.mockReturnValue([
        { id: '1', source: 'test1', status: 'healthy', responseTime: 100, timestamp: new Date(), metrics: {}, metadata: {} },
        { id: '2', source: 'test2', status: 'healthy', responseTime: 100, timestamp: new Date(), metrics: {}, metadata: {} }
      ]);

      let status = await aggregator.aggregateHealthChecks();
      expect(status.overall.score).toBe(100);

      // 有降级服务
      monitoringStorage.getMonitoringRecords.mockReturnValue([
        { id: '1', source: 'test1', status: 'healthy', responseTime: 100, timestamp: new Date(), metrics: {}, metadata: {} },
        { id: '2', source: 'test2', status: 'degraded', responseTime: 200, timestamp: new Date(), metrics: {}, metadata: {} }
      ]);

      status = await aggregator.aggregateHealthChecks();
      expect(status.overall.score).toBe(75); // 100 - 25 (1个降级服务)

      // 有不健康服务
      monitoringStorage.getMonitoringRecords.mockReturnValue([
        { id: '1', source: 'test1', status: 'healthy', responseTime: 100, timestamp: new Date(), metrics: {}, metadata: {} },
        { id: '2', source: 'test2', status: 'unhealthy', responseTime: 500, timestamp: new Date(), metrics: {}, metadata: {} }
      ]);

      status = await aggregator.aggregateHealthChecks();
      expect(status.overall.score).toBe(50); // 100 - 50 (1个不健康服务)
    });
  });

  describe('手动触发检查', () => {
    test('应该能够触发单个监控器检查', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: { status: 'healthy' } })
      } as Response);

      await aggregator.triggerCheck('database_api');
      
      expect(mockFetch).toHaveBeenCalledWith('/api/health/database', expect.any(Object));
    });

    test('应该能够触发所有监控器检查', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: { status: 'healthy' } })
      } as Response);

      await aggregator.triggerCheck();
      
      // 应该调用所有默认监控器的端点
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });
});

describe('ApiHealthMonitor', () => {
  let monitor: ApiHealthMonitor;

  beforeEach(() => {
    monitor = new ApiHealthMonitor('Test API', 'test_api', '/api/test', 30000);
    jest.clearAllMocks();
  });

  test('应该能够执行成功的健康检查', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          status: 'healthy',
          services: {
            database: { responseTime: 50 }
          },
          performance: {
            responseTime: 100,
            databaseResponseTime: 50
          }
        }
      })
    } as Response);

    const result = await monitor.check();
    
    expect(result.status).toBe(HealthStatus.HEALTHY);
    expect(result.responseTime).toBeGreaterThan(0);
    expect(result.metrics.httpStatus).toBe(200);
    expect(result.metrics.database_response_time).toBe(50);
    expect(result.error).toBeUndefined();
  });

  test('应该能够处理HTTP错误', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({})
    } as Response);

    const result = await monitor.check();
    
    expect(result.status).toBe(HealthStatus.UNHEALTHY);
    expect(result.metrics.httpStatus).toBe(500);
    expect(result.error).toBe('HTTP 500: Internal Server Error');
  });

  test('应该能够处理网络错误', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await monitor.check();
    
    expect(result.status).toBe(HealthStatus.UNHEALTHY);
    expect(result.error).toBe('Network error');
  });

  test('应该能够处理超时', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockRejectedValueOnce(new Error('The operation was aborted'));

    const result = await monitor.check();
    
    expect(result.status).toBe(HealthStatus.UNHEALTHY);
    expect(result.error).toBe('The operation was aborted');
  });
});

describe('DirectHealthMonitor', () => {
  let monitor: DirectHealthMonitor;
  let mockChecker: any;

  beforeEach(() => {
    mockChecker = {
      name: 'test-checker',
      timeout: 5000,
      check: jest.fn()
    };
    monitor = new DirectHealthMonitor('Test Direct', 'test_direct', mockChecker, 60000);
  });

  test('应该能够执行成功的健康检查', async () => {
    mockChecker.check.mockResolvedValueOnce({
      status: 'pass',
      message: 'All good',
      duration: 100,
      timestamp: new Date().toISOString(),
      metadata: { test: true }
    });

    const result = await monitor.check();
    
    expect(result.status).toBe(HealthStatus.HEALTHY);
    expect(result.metrics.duration).toBe(100);
    expect(result.metadata.test).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('应该能够处理警告状态', async () => {
    mockChecker.check.mockResolvedValueOnce({
      status: 'warn',
      message: 'Warning message',
      duration: 200,
      timestamp: new Date().toISOString()
    });

    const result = await monitor.check();
    
    expect(result.status).toBe(HealthStatus.DEGRADED);
    expect(result.error).toBeUndefined();
  });

  test('应该能够处理失败状态', async () => {
    mockChecker.check.mockResolvedValueOnce({
      status: 'fail',
      message: 'Check failed',
      duration: 50,
      timestamp: new Date().toISOString()
    });

    const result = await monitor.check();
    
    expect(result.status).toBe(HealthStatus.UNHEALTHY);
    expect(result.error).toBe('Check failed');
  });

  test('应该能够处理检查器异常', async () => {
    mockChecker.check.mockRejectedValueOnce(new Error('Checker error'));

    const result = await monitor.check();
    
    expect(result.status).toBe(HealthStatus.UNHEALTHY);
    expect(result.error).toBe('Checker error');
  });
});