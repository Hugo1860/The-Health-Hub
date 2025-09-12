import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AlertEngine, AlertCondition, AlertAggregationConfig } from '../alert-engine';
import { SystemHealth, HealthStatus } from '../health-checker';

// Mock monitoring storage
jest.mock('../monitoring-storage', () => ({
  monitoringStorage: {
    getAlertRules: jest.fn(() => []),
    saveAlert: jest.fn(() => 'alert-123'),
    resolveAlert: jest.fn(),
    getAlerts: jest.fn(() => []),
    getMonitoringRecords: jest.fn(() => [])
  }
}));

describe('AlertEngine', () => {
  let alertEngine: AlertEngine;
  let mockHealthData: SystemHealth;

  beforeEach(() => {
    alertEngine = new AlertEngine();
    jest.clearAllMocks();
    
    // 创建模拟健康数据
    mockHealthData = {
      status: HealthStatus.HEALTHY,
      timestamp: new Date().toISOString(),
      uptime: 3600,
      version: '1.0.0',
      environment: 'test',
      services: {
        database: {
          status: HealthStatus.HEALTHY,
          responseTime: 100,
          metadata: {}
        },
        memory: {
          status: HealthStatus.HEALTHY,
          responseTime: 50,
          metadata: {}
        }
      },
      checks: {},
      overall: {
        status: HealthStatus.HEALTHY,
        score: 100
      }
    };
  });

  describe('告警条件评估', () => {
    test('应该能够评估数值比较条件', async () => {
      const { monitoringStorage } = require('../monitoring-storage');
      
      // 设置模拟规则
      monitoringStorage.getAlertRules.mockReturnValue([
        {
          id: 'rule-1',
          name: 'High Response Time',
          source: 'database',
          condition: JSON.stringify({
            metric: 'responseTime',
            operator: 'gt'
          }),
          threshold: 200,
          duration: 0,
          severity: 'warning',
          enabled: true,
          notifications: []
        }
      ]);

      // 设置健康数据，响应时间超过阈值
      mockHealthData.services.database.responseTime = 300;

      const alerts = await alertEngine.evaluateAlerts(mockHealthData);
      
      expect(alerts).toHaveLength(1);
      expect(alerts[0].level).toBe('warning');
      expect(alerts[0].title).toContain('High Response Time');
    });

    test('应该能够评估等值条件', async () => {
      const { monitoringStorage } = require('../monitoring-storage');
      
      monitoringStorage.getAlertRules.mockReturnValue([
        {
          id: 'rule-2',
          name: 'Service Down',
          source: 'database',
          condition: JSON.stringify({
            metric: 'status',
            operator: 'eq',
            value: 'unhealthy'
          }),
          threshold: 1,
          duration: 0,
          severity: 'critical',
          enabled: true,
          notifications: []
        }
      ]);

      // 设置服务状态为不健康
      mockHealthData.services.database.status = HealthStatus.UNHEALTHY;

      const alerts = await alertEngine.evaluateAlerts(mockHealthData);
      
      expect(alerts).toHaveLength(1);
      expect(alerts[0].level).toBe('critical');
    });

    test('应该能够评估趋势条件', async () => {
      const { monitoringStorage } = require('../monitoring-storage');
      
      monitoringStorage.getAlertRules.mockReturnValue([
        {
          id: 'rule-3',
          name: 'Response Time Trending Up',
          source: 'database',
          condition: JSON.stringify({
            metric: 'responseTime',
            operator: 'trend_up'
          }),
          threshold: 10,
          duration: 0,
          severity: 'warning',
          enabled: true,
          notifications: []
        }
      ]);

      const trends = {
        database: {
          direction: 'degrading' as const,
          confidence: 0.8,
          metrics: {
            responseTime: { current: 150, trend: 15, prediction: 165 },
            errorRate: { current: 2, trend: 0.1, prediction: 2.1 },
            availability: { current: 98, trend: -0.5, prediction: 97.5 }
          }
        }
      };

      const alerts = await alertEngine.evaluateAlerts(mockHealthData, trends);
      
      expect(alerts).toHaveLength(1);
      expect(alerts[0].message).toContain('trend');
    });

    test('应该忽略禁用的规则', async () => {
      const { monitoringStorage } = require('../monitoring-storage');
      
      monitoringStorage.getAlertRules.mockReturnValue([
        {
          id: 'rule-4',
          name: 'Disabled Rule',
          source: 'database',
          condition: JSON.stringify({
            metric: 'responseTime',
            operator: 'gt'
          }),
          threshold: 50, // 很低的阈值，应该触发
          duration: 0,
          severity: 'warning',
          enabled: false, // 禁用
          notifications: []
        }
      ]);

      mockHealthData.services.database.responseTime = 100;

      const alerts = await alertEngine.evaluateAlerts(mockHealthData);
      
      expect(alerts).toHaveLength(0);
    });
  });

  describe('告警聚合', () => {
    test('应该能够聚合多个告警', async () => {
      const { monitoringStorage } = require('../monitoring-storage');
      
      // 设置聚合配置
      alertEngine.updateAggregationConfig({
        enabled: true,
        maxAlerts: 2,
        timeWindow: 300000,
        groupBy: ['source'],
        strategy: 'severity'
      });

      // 设置多个规则
      monitoringStorage.getAlertRules.mockReturnValue([
        {
          id: 'rule-1',
          name: 'Rule 1',
          source: 'database',
          condition: JSON.stringify({ metric: 'responseTime', operator: 'gt' }),
          threshold: 50,
          duration: 0,
          severity: 'warning',
          enabled: true,
          notifications: []
        },
        {
          id: 'rule-2',
          name: 'Rule 2',
          source: 'database',
          condition: JSON.stringify({ metric: 'responseTime', operator: 'gt' }),
          threshold: 50,
          duration: 0,
          severity: 'error',
          enabled: true,
          notifications: []
        },
        {
          id: 'rule-3',
          name: 'Rule 3',
          source: 'database',
          condition: JSON.stringify({ metric: 'responseTime', operator: 'gt' }),
          threshold: 50,
          duration: 0,
          severity: 'critical',
          enabled: true,
          notifications: []
        }
      ]);

      mockHealthData.services.database.responseTime = 100;

      const alerts = await alertEngine.evaluateAlerts(mockHealthData);
      
      // 应该聚合为一个告警
      expect(alerts).toHaveLength(1);
      expect(alerts[0].title).toContain('Multiple Alerts');
      expect(alerts[0].level).toBe('critical'); // 最高严重级别
      expect(alerts[0].metadata.aggregated).toBe(true);
    });

    test('应该在告警数量不超过限制时不聚合', async () => {
      const { monitoringStorage } = require('../monitoring-storage');
      
      alertEngine.updateAggregationConfig({
        enabled: true,
        maxAlerts: 5,
        timeWindow: 300000,
        groupBy: ['source'],
        strategy: 'severity'
      });

      monitoringStorage.getAlertRules.mockReturnValue([
        {
          id: 'rule-1',
          name: 'Rule 1',
          source: 'database',
          condition: JSON.stringify({ metric: 'responseTime', operator: 'gt' }),
          threshold: 50,
          duration: 0,
          severity: 'warning',
          enabled: true,
          notifications: []
        }
      ]);

      mockHealthData.services.database.responseTime = 100;

      const alerts = await alertEngine.evaluateAlerts(mockHealthData);
      
      expect(alerts).toHaveLength(1);
      expect(alerts[0].metadata.aggregated).toBeUndefined();
    });
  });

  describe('告警静默', () => {
    test('应该能够静默匹配的告警', async () => {
      const { monitoringStorage } = require('../monitoring-storage');
      
      // 添加静默配置
      const silenceId = alertEngine.addSilenceConfig({
        source: 'database',
        level: 'warning',
        startTime: new Date(Date.now() - 60000), // 1分钟前开始
        endTime: new Date(Date.now() + 60000), // 1分钟后结束
        reason: 'Maintenance window',
        createdBy: 'admin',
        enabled: true
      });

      monitoringStorage.getAlertRules.mockReturnValue([
        {
          id: 'rule-1',
          name: 'Test Rule',
          source: 'database',
          condition: JSON.stringify({ metric: 'responseTime', operator: 'gt' }),
          threshold: 50,
          duration: 0,
          severity: 'warning',
          enabled: true,
          notifications: []
        }
      ]);

      mockHealthData.services.database.responseTime = 100;

      const alerts = await alertEngine.evaluateAlerts(mockHealthData);
      
      // 告警应该被静默
      expect(alerts).toHaveLength(0);
      
      // 清理
      alertEngine.removeSilenceConfig(silenceId);
    });

    test('应该能够使用正则表达式模式静默告警', async () => {
      const { monitoringStorage } = require('../monitoring-storage');
      
      const silenceId = alertEngine.addSilenceConfig({
        pattern: 'response.*time',
        startTime: new Date(Date.now() - 60000),
        endTime: new Date(Date.now() + 60000),
        reason: 'Pattern-based silence',
        createdBy: 'admin',
        enabled: true
      });

      monitoringStorage.getAlertRules.mockReturnValue([
        {
          id: 'rule-1',
          name: 'High Response Time Alert',
          source: 'database',
          condition: JSON.stringify({ metric: 'responseTime', operator: 'gt' }),
          threshold: 50,
          duration: 0,
          severity: 'warning',
          enabled: true,
          notifications: []
        }
      ]);

      mockHealthData.services.database.responseTime = 100;

      const alerts = await alertEngine.evaluateAlerts(mockHealthData);
      
      expect(alerts).toHaveLength(0);
      
      alertEngine.removeSilenceConfig(silenceId);
    });

    test('不应该静默不匹配的告警', async () => {
      const { monitoringStorage } = require('../monitoring-storage');
      
      const silenceId = alertEngine.addSilenceConfig({
        source: 'memory', // 不同的源
        startTime: new Date(Date.now() - 60000),
        endTime: new Date(Date.now() + 60000),
        reason: 'Different source',
        createdBy: 'admin',
        enabled: true
      });

      monitoringStorage.getAlertRules.mockReturnValue([
        {
          id: 'rule-1',
          name: 'Database Alert',
          source: 'database',
          condition: JSON.stringify({ metric: 'responseTime', operator: 'gt' }),
          threshold: 50,
          duration: 0,
          severity: 'warning',
          enabled: true,
          notifications: []
        }
      ]);

      mockHealthData.services.database.responseTime = 100;

      const alerts = await alertEngine.evaluateAlerts(mockHealthData);
      
      expect(alerts).toHaveLength(1);
      
      alertEngine.removeSilenceConfig(silenceId);
    });
  });

  describe('异常检测', () => {
    test('应该能够检测数值异常', async () => {
      const { monitoringStorage } = require('../monitoring-storage');
      
      // 模拟正常数据和一个异常值
      const normalValues = Array.from({ length: 50 }, (_, i) => ({
        id: `record-${i}`,
        timestamp: new Date(Date.now() - (50 - i) * 60000),
        source: 'database',
        status: 'healthy',
        metrics: { responseTime: 100 + Math.random() * 20 }, // 100-120ms
        metadata: {},
        responseTime: 100 + Math.random() * 20
      }));
      
      // 添加异常值
      normalValues.push({
        id: 'record-anomaly',
        timestamp: new Date(),
        source: 'database',
        status: 'healthy',
        metrics: { responseTime: 500 }, // 异常高值
        metadata: {},
        responseTime: 500
      });

      monitoringStorage.getMonitoringRecords.mockReturnValue(normalValues);

      const anomalyResult = await alertEngine.detectAnomalies('database', 'responseTime');
      
      expect(anomalyResult).toBeTruthy();
      expect(anomalyResult!.isAnomaly).toBe(true);
      expect(anomalyResult!.actualValue).toBe(500);
      expect(anomalyResult!.expectedValue).toBeCloseTo(110, 0); // 大约110ms
      expect(anomalyResult!.type).toBe('spike');
    });

    test('应该在数据不足时返回null', async () => {
      const { monitoringStorage } = require('../monitoring-storage');
      
      monitoringStorage.getMonitoringRecords.mockReturnValue([]);

      const anomalyResult = await alertEngine.detectAnomalies('database', 'responseTime');
      
      expect(anomalyResult).toBeNull();
    });

    test('应该能够检测趋势变化', async () => {
      const { monitoringStorage } = require('../monitoring-storage');
      
      // 创建有趋势变化的数据
      const trendData = [];
      
      // 前半部分：上升趋势
      for (let i = 0; i < 25; i++) {
        trendData.push({
          id: `record-${i}`,
          timestamp: new Date(Date.now() - (50 - i) * 60000),
          source: 'database',
          status: 'healthy',
          metrics: { responseTime: 100 + i * 2 },
          metadata: {},
          responseTime: 100 + i * 2
        });
      }
      
      // 后半部分：下降趋势
      for (let i = 25; i < 50; i++) {
        trendData.push({
          id: `record-${i}`,
          timestamp: new Date(Date.now() - (50 - i) * 60000),
          source: 'database',
          status: 'healthy',
          metrics: { responseTime: 200 - (i - 25) * 3 },
          metadata: {},
          responseTime: 200 - (i - 25) * 3
        });
      }

      monitoringStorage.getMonitoringRecords.mockReturnValue(trendData);

      const anomalyResult = await alertEngine.detectAnomalies('database', 'responseTime');
      
      expect(anomalyResult).toBeTruthy();
      // 趋势变化可能被检测为异常
    });
  });

  describe('告警规则管理', () => {
    test('应该能够添加告警规则', () => {
      const { monitoringStorage } = require('../monitoring-storage');
      monitoringStorage.saveAlertRule.mockReturnValue('rule-123');

      const ruleId = alertEngine.addAlertRule({
        name: 'Test Rule',
        source: 'database',
        condition: JSON.stringify({ metric: 'responseTime', operator: 'gt' }),
        threshold: 200,
        duration: 60000,
        severity: 'warning',
        enabled: true,
        notifications: ['email']
      });

      expect(ruleId).toBe('rule-123');
      expect(monitoringStorage.saveAlertRule).toHaveBeenCalledWith({
        name: 'Test Rule',
        source: 'database',
        condition: JSON.stringify({ metric: 'responseTime', operator: 'gt' }),
        threshold: 200,
        duration: 60000,
        severity: 'warning',
        enabled: true,
        notifications: ['email']
      });
    });

    test('应该能够获取活跃告警', () => {
      const { monitoringStorage } = require('../monitoring-storage');
      const mockAlerts = [
        {
          id: 'alert-1',
          level: 'warning',
          title: 'Test Alert',
          message: 'Test message',
          source: 'database',
          timestamp: new Date(),
          resolved: false,
          metadata: {}
        }
      ];
      
      monitoringStorage.getAlerts.mockReturnValue(mockAlerts);

      const activeAlerts = alertEngine.getActiveAlerts();
      
      expect(activeAlerts).toEqual(mockAlerts);
      expect(monitoringStorage.getAlerts).toHaveBeenCalledWith({ resolved: false });
    });
  });
});