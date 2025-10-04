import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  NotificationService, 
  EmailNotificationSender, 
  WebhookNotificationSender, 
  SlackNotificationSender, 
  ConsoleNotificationSender,
  NotificationConfig 
} from '../notification-service';
import { Alert } from '../monitoring-storage';

// Mock fetch
global.fetch = jest.fn();

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockAlert: Alert;

  beforeEach(() => {
    notificationService = new NotificationService();
    jest.clearAllMocks();
    
    mockAlert = {
      id: 'test-alert-1',
      level: 'warning',
      title: 'Test Alert',
      message: 'This is a test alert message',
      source: 'test-source',
      timestamp: new Date('2023-01-01T10:00:00Z'),
      resolved: false,
      metadata: {
        test: true,
        value: 42
      }
    };
  });

  describe('配置管理', () => {
    test('应该能够添加通知配置', () => {
      const config: NotificationConfig = {
        id: 'test-config',
        name: 'Test Email Config',
        channel: 'email',
        enabled: true,
        config: {
          to: 'test@example.com',
          smtp: {
            host: 'smtp.example.com',
            port: 587
          }
        },
        retryConfig: {
          maxRetries: 3,
          retryDelay: 1000,
          backoffMultiplier: 2,
          maxDelay: 30000
        }
      };

      notificationService.addNotificationConfig(config);
      
      const retrievedConfig = notificationService.getNotificationConfig('test-config');
      expect(retrievedConfig).toEqual(config);
    });

    test('应该拒绝无效的配置', () => {
      const invalidConfig: NotificationConfig = {
        id: 'invalid-config',
        name: 'Invalid Config',
        channel: 'email',
        enabled: true,
        config: {}, // 缺少必需的邮件配置
        retryConfig: {
          maxRetries: 3,
          retryDelay: 1000,
          backoffMultiplier: 2,
          maxDelay: 30000
        }
      };

      expect(() => {
        notificationService.addNotificationConfig(invalidConfig);
      }).toThrow('Invalid configuration for channel: email');
    });

    test('应该能够移除通知配置', () => {
      const config: NotificationConfig = {
        id: 'removable-config',
        name: 'Removable Config',
        channel: 'console',
        enabled: true,
        config: {},
        retryConfig: {
          maxRetries: 0,
          retryDelay: 1000,
          backoffMultiplier: 1,
          maxDelay: 1000
        }
      };

      notificationService.addNotificationConfig(config);
      expect(notificationService.getNotificationConfig('removable-config')).toBeTruthy();
      
      notificationService.removeNotificationConfig('removable-config');
      expect(notificationService.getNotificationConfig('removable-config')).toBeUndefined();
    });

    test('应该能够获取所有配置', () => {
      const configs = notificationService.getAllNotificationConfigs();
      expect(Array.isArray(configs)).toBe(true);
      expect(configs.length).toBeGreaterThan(0); // 至少有默认的控制台配置
    });
  });

  describe('通知发送', () => {
    test('应该能够发送控制台通知', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const results = await notificationService.sendNotification(mockAlert);
      
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].channel).toBe('console');
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    test('应该能够发送到指定的配置', async () => {
      // 添加测试配置
      const testConfig: NotificationConfig = {
        id: 'test-webhook',
        name: 'Test Webhook',
        channel: 'webhook',
        enabled: true,
        config: {
          url: 'https://example.com/webhook'
        },
        retryConfig: {
          maxRetries: 1,
          retryDelay: 100,
          backoffMultiplier: 1,
          maxDelay: 100
        }
      };

      notificationService.addNotificationConfig(testConfig);

      // Mock成功的fetch响应
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK'
      } as Response);

      const results = await notificationService.sendNotification(mockAlert, ['test-webhook']);
      
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].channel).toBe('webhook');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });

    test('应该处理发送失败并重试', async () => {
      const testConfig: NotificationConfig = {
        id: 'failing-webhook',
        name: 'Failing Webhook',
        channel: 'webhook',
        enabled: true,
        config: {
          url: 'https://example.com/failing-webhook'
        },
        retryConfig: {
          maxRetries: 2,
          retryDelay: 10,
          backoffMultiplier: 1,
          maxDelay: 10
        }
      };

      notificationService.addNotificationConfig(testConfig);

      // Mock失败的fetch响应
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockRejectedValue(new Error('Network error'));

      const results = await notificationService.sendNotification(mockAlert, ['failing-webhook']);
      
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('Network error');
      expect(results[0].retryCount).toBe(2); // 应该重试了2次
      expect(mockFetch).toHaveBeenCalledTimes(3); // 初始尝试 + 2次重试
    });
  });

  describe('过滤功能', () => {
    test('应该根据源过滤通知', async () => {
      const filteredConfig: NotificationConfig = {
        id: 'filtered-config',
        name: 'Filtered Config',
        channel: 'console',
        enabled: true,
        config: {},
        retryConfig: {
          maxRetries: 0,
          retryDelay: 1000,
          backoffMultiplier: 1,
          maxDelay: 1000
        },
        filters: {
          sources: ['other-source'] // 不匹配测试告警的源
        }
      };

      notificationService.addNotificationConfig(filteredConfig);

      const results = await notificationService.sendNotification(mockAlert, ['filtered-config']);
      
      expect(results).toHaveLength(0); // 应该被过滤掉
    });

    test('应该根据级别过滤通知', async () => {
      const filteredConfig: NotificationConfig = {
        id: 'level-filtered-config',
        name: 'Level Filtered Config',
        channel: 'console',
        enabled: true,
        config: {},
        retryConfig: {
          maxRetries: 0,
          retryDelay: 1000,
          backoffMultiplier: 1,
          maxDelay: 1000
        },
        filters: {
          levels: ['critical'] // 只接受critical级别
        }
      };

      notificationService.addNotificationConfig(filteredConfig);

      const results = await notificationService.sendNotification(mockAlert, ['level-filtered-config']);
      
      expect(results).toHaveLength(0); // warning级别应该被过滤掉
    });

    test('应该根据模式过滤通知', async () => {
      const patternConfig: NotificationConfig = {
        id: 'pattern-config',
        name: 'Pattern Config',
        channel: 'console',
        enabled: true,
        config: {},
        retryConfig: {
          maxRetries: 0,
          retryDelay: 1000,
          backoffMultiplier: 1,
          maxDelay: 1000
        },
        filters: {
          patterns: ['database.*error'] // 不匹配测试告警
        }
      };

      notificationService.addNotificationConfig(patternConfig);

      const results = await notificationService.sendNotification(mockAlert, ['pattern-config']);
      
      expect(results).toHaveLength(0); // 应该被模式过滤掉
    });
  });

  describe('测试功能', () => {
    test('应该能够测试通知配置', async () => {
      const result = await notificationService.testNotificationConfig('console-default');
      
      expect(result.success).toBe(true);
      expect(result.channel).toBe('console');
      expect(result.configId).toBe('console-default');
    });

    test('测试不存在的配置应该抛出错误', async () => {
      await expect(
        notificationService.testNotificationConfig('non-existent')
      ).rejects.toThrow('Notification config not found: non-existent');
    });
  });

  describe('统计功能', () => {
    test('应该能够获取通知统计', async () => {
      // 发送一些通知以生成统计数据
      await notificationService.sendNotification(mockAlert);
      
      const stats = notificationService.getNotificationStats();
      
      expect(stats.totalSent).toBeGreaterThan(0);
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.byChannel).toBeDefined();
      expect(stats.byConfig).toBeDefined();
    });

    test('应该能够获取通知历史', async () => {
      await notificationService.sendNotification(mockAlert);
      
      const history = notificationService.getNotificationHistory(10);
      
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
      expect(history[0]).toHaveProperty('success');
      expect(history[0]).toHaveProperty('channel');
      expect(history[0]).toHaveProperty('timestamp');
    });
  });
});

describe('EmailNotificationSender', () => {
  let sender: EmailNotificationSender;
  let mockConfig: NotificationConfig;
  let mockAlert: Alert;

  beforeEach(() => {
    sender = new EmailNotificationSender();
    
    mockConfig = {
      id: 'email-config',
      name: 'Email Config',
      channel: 'email',
      enabled: true,
      config: {
        to: 'test@example.com',
        smtp: {
          host: 'smtp.example.com',
          port: 587
        }
      },
      retryConfig: {
        maxRetries: 0,
        retryDelay: 1000,
        backoffMultiplier: 1,
        maxDelay: 1000
      }
    };

    mockAlert = {
      id: 'test-alert',
      level: 'error',
      title: 'Test Email Alert',
      message: 'This is a test email alert',
      source: 'email-test',
      timestamp: new Date(),
      resolved: false,
      metadata: {}
    };
  });

  test('应该验证有效的邮件配置', () => {
    expect(sender.validateConfig(mockConfig.config)).toBe(true);
  });

  test('应该拒绝无效的邮件配置', () => {
    expect(sender.validateConfig({})).toBe(false);
    expect(sender.validateConfig({ to: 'test@example.com' })).toBe(false);
  });

  test('应该能够发送邮件通知', async () => {
    const templateVars = {
      alert: mockAlert,
      timestamp: mockAlert.timestamp.toISOString(),
      severity: 'ERROR',
      source: mockAlert.source,
      title: mockAlert.title,
      message: mockAlert.message,
      metadata: mockAlert.metadata,
      environment: 'test',
      hostname: 'localhost'
    };

    const result = await sender.send(mockConfig, mockAlert, templateVars);
    
    expect(result.success).toBe(true);
    expect(result.channel).toBe('email');
    expect(result.message).toContain('Email sent to test@example.com');
  });
});

describe('WebhookNotificationSender', () => {
  let sender: WebhookNotificationSender;

  beforeEach(() => {
    sender = new WebhookNotificationSender();
    jest.clearAllMocks();
  });

  test('应该验证有效的webhook配置', () => {
    expect(sender.validateConfig({ url: 'https://example.com/webhook' })).toBe(true);
  });

  test('应该拒绝无效的webhook配置', () => {
    expect(sender.validateConfig({})).toBe(false);
    expect(sender.validateConfig({ url: 'invalid-url' })).toBe(false);
  });

  test('应该能够发送webhook通知', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK'
    } as Response);

    const config: NotificationConfig = {
      id: 'webhook-config',
      name: 'Webhook Config',
      channel: 'webhook',
      enabled: true,
      config: {
        url: 'https://example.com/webhook'
      },
      retryConfig: {
        maxRetries: 0,
        retryDelay: 1000,
        backoffMultiplier: 1,
        maxDelay: 1000
      }
    };

    const alert: Alert = {
      id: 'webhook-alert',
      level: 'info',
      title: 'Webhook Test',
      message: 'Test webhook message',
      source: 'webhook-test',
      timestamp: new Date(),
      resolved: false,
      metadata: {}
    };

    const templateVars = {
      alert,
      timestamp: alert.timestamp.toISOString(),
      severity: 'INFO',
      source: alert.source,
      title: alert.title,
      message: alert.message,
      metadata: alert.metadata,
      environment: 'test',
      hostname: 'localhost'
    };

    const result = await sender.send(config, alert, templateVars);
    
    expect(result.success).toBe(true);
    expect(result.channel).toBe('webhook');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/webhook',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        body: expect.stringContaining('webhook-alert')
      })
    );
  });
});