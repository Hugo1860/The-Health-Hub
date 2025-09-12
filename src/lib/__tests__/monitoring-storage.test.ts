import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { MonitoringStorage } from '../monitoring-storage';
import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, unlinkSync } from 'fs';

describe('MonitoringStorage', () => {
  let storage: MonitoringStorage;
  let testDb: Database.Database;
  const testDbPath = join(__dirname, 'test-monitoring.db');

  beforeEach(() => {
    // 创建测试数据库
    testDb = new Database(testDbPath);
    storage = new MonitoringStorage(testDb);
  });

  afterEach(() => {
    // 清理测试数据库
    if (testDb) {
      testDb.close();
    }
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  describe('监控记录管理', () => {
    test('应该能够保存监控记录', () => {
      const record = {
        timestamp: new Date(),
        source: 'database',
        status: 'healthy' as const,
        metrics: { responseTime: 100, connections: 5 },
        metadata: { version: '1.0.0' },
        responseTime: 100
      };

      const recordId = storage.saveMonitoringRecord(record);
      expect(recordId).toBeTruthy();
      expect(recordId).toMatch(/^monitoring-\d+-[a-z0-9]+$/);
    });

    test('应该能够获取监控记录', () => {
      // 保存测试记录
      const record1 = {
        timestamp: new Date('2023-01-01T10:00:00Z'),
        source: 'database',
        status: 'healthy' as const,
        metrics: { responseTime: 100 },
        metadata: {},
        responseTime: 100
      };

      const record2 = {
        timestamp: new Date('2023-01-01T11:00:00Z'),
        source: 'memory',
        status: 'degraded' as const,
        metrics: { usage: 85 },
        metadata: {},
        responseTime: 50
      };

      storage.saveMonitoringRecord(record1);
      storage.saveMonitoringRecord(record2);

      // 获取所有记录
      const allRecords = storage.getMonitoringRecords();
      expect(allRecords).toHaveLength(2);

      // 按源过滤
      const dbRecords = storage.getMonitoringRecords({ source: 'database' });
      expect(dbRecords).toHaveLength(1);
      expect(dbRecords[0].source).toBe('database');

      // 按状态过滤
      const healthyRecords = storage.getMonitoringRecords({ status: 'healthy' });
      expect(healthyRecords).toHaveLength(1);
      expect(healthyRecords[0].status).toBe('healthy');
    });

    test('应该能够按时间范围过滤记录', () => {
      const baseTime = new Date('2023-01-01T10:00:00Z');
      
      // 保存不同时间的记录
      for (let i = 0; i < 5; i++) {
        const timestamp = new Date(baseTime.getTime() + i * 60 * 60 * 1000); // 每小时一个
        storage.saveMonitoringRecord({
          timestamp,
          source: 'test',
          status: 'healthy',
          metrics: { value: i },
          metadata: {},
          responseTime: 100
        });
      }

      // 获取特定时间范围的记录
      const startTime = new Date('2023-01-01T11:00:00Z');
      const endTime = new Date('2023-01-01T13:00:00Z');
      
      const filteredRecords = storage.getMonitoringRecords({
        startTime,
        endTime
      });

      expect(filteredRecords).toHaveLength(3); // 11:00, 12:00, 13:00
    });
  });

  describe('告警管理', () => {
    test('应该能够保存告警', () => {
      const alert = {
        level: 'warning' as const,
        title: 'High Memory Usage',
        message: 'Memory usage is above 85%',
        source: 'memory',
        timestamp: new Date(),
        resolved: false,
        metadata: { threshold: 85, current: 90 }
      };

      const alertId = storage.saveAlert(alert);
      expect(alertId).toBeTruthy();
      expect(alertId).toMatch(/^alert-\d+-[a-z0-9]+$/);
    });

    test('应该能够解决告警', () => {
      const alert = {
        level: 'error' as const,
        title: 'Database Connection Failed',
        message: 'Unable to connect to database',
        source: 'database',
        timestamp: new Date(),
        resolved: false,
        metadata: {}
      };

      const alertId = storage.saveAlert(alert);
      
      // 解决告警
      storage.resolveAlert(alertId);
      
      // 验证告警已解决
      const alerts = storage.getAlerts({ resolved: true });
      expect(alerts).toHaveLength(1);
      expect(alerts[0].resolved).toBe(true);
      expect(alerts[0].resolvedAt).toBeTruthy();
    });

    test('应该能够按级别过滤告警', () => {
      const alerts = [
        {
          level: 'info' as const,
          title: 'Info Alert',
          message: 'Info message',
          source: 'test',
          timestamp: new Date(),
          resolved: false,
          metadata: {}
        },
        {
          level: 'critical' as const,
          title: 'Critical Alert',
          message: 'Critical message',
          source: 'test',
          timestamp: new Date(),
          resolved: false,
          metadata: {}
        }
      ];

      alerts.forEach(alert => storage.saveAlert(alert));

      const criticalAlerts = storage.getAlerts({ level: 'critical' });
      expect(criticalAlerts).toHaveLength(1);
      expect(criticalAlerts[0].level).toBe('critical');
    });
  });

  describe('告警规则管理', () => {
    test('应该能够保存告警规则', () => {
      const rule = {
        name: 'Memory Usage Rule',
        source: 'memory',
        condition: JSON.stringify({ metric: 'usage', operator: 'gt' }),
        threshold: 85,
        duration: 300000,
        severity: 'warning' as const,
        enabled: true,
        notifications: ['email']
      };

      const ruleId = storage.saveAlertRule(rule);
      expect(ruleId).toBeTruthy();
      expect(ruleId).toMatch(/^rule-\d+-[a-z0-9]+$/);
    });

    test('应该能够获取告警规则', () => {
      const rule1 = {
        name: 'Database Rule',
        source: 'database',
        condition: JSON.stringify({ metric: 'responseTime', operator: 'gt' }),
        threshold: 5000,
        duration: 60000,
        severity: 'error' as const,
        enabled: true,
        notifications: ['email', 'webhook']
      };

      const rule2 = {
        name: 'Memory Rule',
        source: 'memory',
        condition: JSON.stringify({ metric: 'usage', operator: 'gt' }),
        threshold: 90,
        duration: 300000,
        severity: 'critical' as const,
        enabled: false,
        notifications: ['webhook']
      };

      storage.saveAlertRule(rule1);
      storage.saveAlertRule(rule2);

      // 获取所有规则
      const allRules = storage.getAlertRules();
      expect(allRules).toHaveLength(2);

      // 按源过滤
      const dbRules = storage.getAlertRules('database');
      expect(dbRules).toHaveLength(1);
      expect(dbRules[0].source).toBe('database');
    });
  });

  describe('监控配置管理', () => {
    test('应该能够保存监控配置', () => {
      const config = {
        source: 'database',
        interval: 30000,
        enabled: true,
        thresholds: { responseTime: 5000, connections: 100 },
        retentionDays: 30
      };

      const configId = storage.saveMonitoringConfig(config);
      expect(configId).toBeTruthy();
    });

    test('应该能够获取监控配置', () => {
      const config = {
        source: 'memory',
        interval: 60000,
        enabled: true,
        thresholds: { usage: 85, critical: 95 },
        retentionDays: 7
      };

      storage.saveMonitoringConfig(config);

      const retrievedConfig = storage.getMonitoringConfig('memory');
      expect(retrievedConfig).toBeTruthy();
      expect(retrievedConfig!.source).toBe('memory');
      expect(retrievedConfig!.interval).toBe(60000);
      expect(retrievedConfig!.thresholds).toEqual({ usage: 85, critical: 95 });
    });

    test('应该能够更新现有配置', () => {
      const config = {
        source: 'test',
        interval: 30000,
        enabled: true,
        thresholds: { value: 100 },
        retentionDays: 30
      };

      // 保存初始配置
      storage.saveMonitoringConfig(config);

      // 更新配置
      const updatedConfig = {
        ...config,
        interval: 60000,
        enabled: false
      };
      
      storage.saveMonitoringConfig(updatedConfig);

      // 验证更新
      const retrievedConfig = storage.getMonitoringConfig('test');
      expect(retrievedConfig!.interval).toBe(60000);
      expect(retrievedConfig!.enabled).toBe(false);
    });
  });

  describe('统计功能', () => {
    test('应该能够获取监控统计', () => {
      // 保存测试数据
      const records = [
        { status: 'healthy', responseTime: 100 },
        { status: 'healthy', responseTime: 150 },
        { status: 'degraded', responseTime: 200 },
        { status: 'unhealthy', responseTime: 500 }
      ];

      records.forEach((record, index) => {
        storage.saveMonitoringRecord({
          timestamp: new Date(),
          source: 'test',
          status: record.status as any,
          metrics: {},
          metadata: {},
          responseTime: record.responseTime
        });
      });

      // 保存测试告警
      storage.saveAlert({
        level: 'warning',
        title: 'Test Alert 1',
        message: 'Test message',
        source: 'test',
        timestamp: new Date(),
        resolved: false,
        metadata: {}
      });

      storage.saveAlert({
        level: 'error',
        title: 'Test Alert 2',
        message: 'Test message',
        source: 'test',
        timestamp: new Date(),
        resolved: true,
        metadata: {}
      });

      const stats = storage.getMonitoringStats('test');
      
      expect(stats.totalRecords).toBe(4);
      expect(stats.healthyRecords).toBe(2);
      expect(stats.degradedRecords).toBe(1);
      expect(stats.unhealthyRecords).toBe(1);
      expect(stats.totalAlerts).toBe(2);
      expect(stats.unresolvedAlerts).toBe(1);
      expect(stats.averageResponseTime).toBe(237.5); // (100+150+200+500)/4
    });
  });

  describe('数据清理', () => {
    test('应该能够清理过期数据', () => {
      // 设置测试配置
      storage.saveMonitoringConfig({
        source: 'test',
        interval: 30000,
        enabled: true,
        thresholds: {},
        retentionDays: 1 // 1天保留期
      });

      // 保存旧数据
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 2); // 2天前

      storage.saveMonitoringRecord({
        timestamp: oldDate,
        source: 'test',
        status: 'healthy',
        metrics: {},
        metadata: {},
        responseTime: 100
      });

      // 保存新数据
      storage.saveMonitoringRecord({
        timestamp: new Date(),
        source: 'test',
        status: 'healthy',
        metrics: {},
        metadata: {},
        responseTime: 100
      });

      // 执行清理前应该有2条记录
      let records = storage.getMonitoringRecords({ source: 'test' });
      expect(records).toHaveLength(2);

      // 执行清理
      storage.cleanupExpiredData();

      // 清理后应该只有1条记录（新的）
      records = storage.getMonitoringRecords({ source: 'test' });
      expect(records).toHaveLength(1);
      expect(records[0].timestamp.getTime()).toBeGreaterThan(oldDate.getTime());
    });
  });
});