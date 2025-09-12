import { Alert } from './monitoring-storage';

// 通知渠道类型
export type NotificationChannel = 'email' | 'webhook' | 'slack' | 'discord' | 'sms' | 'console';

// 通知配置接口
export interface NotificationConfig {
  id: string;
  name: string;
  channel: NotificationChannel;
  enabled: boolean;
  config: Record<string, any>;
  template?: string;
  retryConfig: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
    maxDelay: number;
  };
  filters?: {
    sources?: string[];
    levels?: string[];
    patterns?: string[];
  };
  rateLimit?: {
    maxPerMinute: number;
    maxPerHour: number;
  };
}

// 通知结果
export interface NotificationResult {
  success: boolean;
  channel: NotificationChannel;
  configId: string;
  message?: string;
  error?: string;
  timestamp: Date;
  retryCount: number;
  responseTime: number;
}

// 通知模板变量
export interface NotificationTemplateVars {
  alert: Alert;
  timestamp: string;
  severity: string;
  source: string;
  title: string;
  message: string;
  metadata: Record<string, any>;
  environment: string;
  hostname: string;
}

// 通知发送器接口
export interface NotificationSender {
  channel: NotificationChannel;
  send(config: NotificationConfig, alert: Alert, templateVars: NotificationTemplateVars): Promise<NotificationResult>;
  validateConfig(config: Record<string, any>): boolean;
}

// 邮件通知发送器
export class EmailNotificationSender implements NotificationSender {
  channel: NotificationChannel = 'email';

  async send(config: NotificationConfig, alert: Alert, templateVars: NotificationTemplateVars): Promise<NotificationResult> {
    const startTime = Date.now();
    
    try {
      const emailConfig = config.config;
      
      // 验证邮件配置
      if (!this.validateConfig(emailConfig)) {
        throw new Error('Invalid email configuration');
      }

      // 渲染邮件内容
      const subject = this.renderTemplate(config.template || this.getDefaultSubjectTemplate(), templateVars);
      const body = this.renderTemplate(this.getDefaultBodyTemplate(), templateVars);

      // 发送邮件（这里使用模拟实现）
      await this.sendEmail({
        to: emailConfig.to,
        cc: emailConfig.cc,
        subject,
        body,
        smtp: emailConfig.smtp
      });

      return {
        success: true,
        channel: this.channel,
        configId: config.id,
        message: `Email sent to ${emailConfig.to}`,
        timestamp: new Date(),
        retryCount: 0,
        responseTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        channel: this.channel,
        configId: config.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        retryCount: 0,
        responseTime: Date.now() - startTime
      };
    }
  }

  validateConfig(config: Record<string, any>): boolean {
    return !!(config.to && config.smtp && config.smtp.host && config.smtp.port);
  }

  private async sendEmail(emailData: any): Promise<void> {
    // 实际实现中，这里会使用 nodemailer 或其他邮件服务
    console.log('Sending email:', {
      to: emailData.to,
      subject: emailData.subject,
      body: emailData.body.substring(0, 100) + '...'
    });
    
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private getDefaultSubjectTemplate(): string {
    return '[{{severity}}] {{title}} - {{source}}';
  }

  private getDefaultBodyTemplate(): string {
    return `
Alert Details:
- Title: {{title}}
- Source: {{source}}
- Severity: {{severity}}
- Message: {{message}}
- Timestamp: {{timestamp}}
- Environment: {{environment}}

Metadata:
{{#each metadata}}
- {{@key}}: {{this}}
{{/each}}

This is an automated alert from the monitoring system.
    `.trim();
  }

  private renderTemplate(template: string, vars: NotificationTemplateVars): string {
    let rendered = template;
    
    // 简单的模板渲染（实际项目中可能使用 Handlebars 或其他模板引擎）
    Object.entries(vars).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, String(value));
    });

    // 处理 metadata 循环
    if (vars.metadata && Object.keys(vars.metadata).length > 0) {
      const metadataStr = Object.entries(vars.metadata)
        .map(([key, value]) => `- ${key}: ${value}`)
        .join('\n');
      rendered = rendered.replace(/{{#each metadata}}[\s\S]*?{{\/each}}/g, metadataStr);
    } else {
      rendered = rendered.replace(/{{#each metadata}}[\s\S]*?{{\/each}}/g, '- No additional metadata');
    }

    return rendered;
  }
}

// Webhook通知发送器
export class WebhookNotificationSender implements NotificationSender {
  channel: NotificationChannel = 'webhook';

  async send(config: NotificationConfig, alert: Alert, templateVars: NotificationTemplateVars): Promise<NotificationResult> {
    const startTime = Date.now();
    
    try {
      const webhookConfig = config.config;
      
      if (!this.validateConfig(webhookConfig)) {
        throw new Error('Invalid webhook configuration');
      }

      // 准备 webhook 负载
      const payload = {
        alert: {
          id: alert.id,
          level: alert.level,
          title: alert.title,
          message: alert.message,
          source: alert.source,
          timestamp: alert.timestamp.toISOString(),
          resolved: alert.resolved,
          metadata: alert.metadata
        },
        notification: {
          configId: config.id,
          configName: config.name,
          timestamp: new Date().toISOString(),
          environment: templateVars.environment
        }
      };

      // 发送 webhook
      const response = await fetch(webhookConfig.url, {
        method: webhookConfig.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Monitoring-System/1.0',
          ...webhookConfig.headers
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(webhookConfig.timeout || 10000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        success: true,
        channel: this.channel,
        configId: config.id,
        message: `Webhook sent to ${webhookConfig.url}`,
        timestamp: new Date(),
        retryCount: 0,
        responseTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        channel: this.channel,
        configId: config.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        retryCount: 0,
        responseTime: Date.now() - startTime
      };
    }
  }

  validateConfig(config: Record<string, any>): boolean {
    return !!(config.url && this.isValidUrl(config.url));
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

// Slack通知发送器
export class SlackNotificationSender implements NotificationSender {
  channel: NotificationChannel = 'slack';

  async send(config: NotificationConfig, alert: Alert, templateVars: NotificationTemplateVars): Promise<NotificationResult> {
    const startTime = Date.now();
    
    try {
      const slackConfig = config.config;
      
      if (!this.validateConfig(slackConfig)) {
        throw new Error('Invalid Slack configuration');
      }

      // 构建 Slack 消息
      const slackMessage = {
        channel: slackConfig.channel,
        username: slackConfig.username || 'Monitoring Bot',
        icon_emoji: this.getSeverityEmoji(alert.level),
        attachments: [
          {
            color: this.getSeverityColor(alert.level),
            title: alert.title,
            text: alert.message,
            fields: [
              {
                title: 'Source',
                value: alert.source,
                short: true
              },
              {
                title: 'Severity',
                value: alert.level.toUpperCase(),
                short: true
              },
              {
                title: 'Timestamp',
                value: alert.timestamp.toISOString(),
                short: true
              },
              {
                title: 'Environment',
                value: templateVars.environment,
                short: true
              }
            ],
            footer: 'Monitoring System',
            ts: Math.floor(alert.timestamp.getTime() / 1000)
          }
        ]
      };

      // 发送到 Slack
      const response = await fetch(slackConfig.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(slackMessage),
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status}`);
      }

      return {
        success: true,
        channel: this.channel,
        configId: config.id,
        message: `Slack message sent to ${slackConfig.channel}`,
        timestamp: new Date(),
        retryCount: 0,
        responseTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        channel: this.channel,
        configId: config.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        retryCount: 0,
        responseTime: Date.now() - startTime
      };
    }
  }

  validateConfig(config: Record<string, any>): boolean {
    return !!(config.webhookUrl && config.channel);
  }

  private getSeverityEmoji(level: string): string {
    const emojiMap: Record<string, string> = {
      info: ':information_source:',
      warning: ':warning:',
      error: ':x:',
      critical: ':rotating_light:'
    };
    return emojiMap[level] || ':question:';
  }

  private getSeverityColor(level: string): string {
    const colorMap: Record<string, string> = {
      info: '#36a64f',
      warning: '#ff9500',
      error: '#ff0000',
      critical: '#8b0000'
    };
    return colorMap[level] || '#cccccc';
  }
}

// 控制台通知发送器（用于开发和调试）
export class ConsoleNotificationSender implements NotificationSender {
  channel: NotificationChannel = 'console';

  async send(config: NotificationConfig, alert: Alert, templateVars: NotificationTemplateVars): Promise<NotificationResult> {
    const startTime = Date.now();
    
    try {
      const logLevel = this.getLogLevel(alert.level);
      const message = `[${alert.level.toUpperCase()}] ${alert.title}: ${alert.message} (Source: ${alert.source})`;
      
      console[logLevel](message, {
        alert: {
          id: alert.id,
          timestamp: alert.timestamp.toISOString(),
          metadata: alert.metadata
        },
        environment: templateVars.environment
      });

      return {
        success: true,
        channel: this.channel,
        configId: config.id,
        message: 'Alert logged to console',
        timestamp: new Date(),
        retryCount: 0,
        responseTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        channel: this.channel,
        configId: config.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        retryCount: 0,
        responseTime: Date.now() - startTime
      };
    }
  }

  validateConfig(config: Record<string, any>): boolean {
    return true; // 控制台通知不需要特殊配置
  }

  private getLogLevel(alertLevel: string): 'log' | 'warn' | 'error' {
    switch (alertLevel) {
      case 'info':
        return 'log';
      case 'warning':
        return 'warn';
      case 'error':
      case 'critical':
        return 'error';
      default:
        return 'log';
    }
  }
}

// 通知服务主类
export class NotificationService {
  private senders: Map<NotificationChannel, NotificationSender> = new Map();
  private configs: Map<string, NotificationConfig> = new Map();
  private rateLimiters: Map<string, { count: number; resetTime: number }> = new Map();
  private notificationHistory: NotificationResult[] = [];

  constructor() {
    this.initializeSenders();
    this.initializeDefaultConfigs();
  }

  // 初始化发送器
  private initializeSenders(): void {
    this.senders.set('email', new EmailNotificationSender());
    this.senders.set('webhook', new WebhookNotificationSender());
    this.senders.set('slack', new SlackNotificationSender());
    this.senders.set('console', new ConsoleNotificationSender());
  }

  // 初始化默认配置
  private initializeDefaultConfigs(): void {
    // 控制台通知配置（默认启用）
    this.addNotificationConfig({
      id: 'console-default',
      name: 'Console Notifications',
      channel: 'console',
      enabled: true,
      config: {},
      retryConfig: {
        maxRetries: 0,
        retryDelay: 1000,
        backoffMultiplier: 1,
        maxDelay: 1000
      }
    });
  }

  // 添加通知配置
  addNotificationConfig(config: NotificationConfig): void {
    // 验证配置
    const sender = this.senders.get(config.channel);
    if (!sender) {
      throw new Error(`Unsupported notification channel: ${config.channel}`);
    }

    if (!sender.validateConfig(config.config)) {
      throw new Error(`Invalid configuration for channel: ${config.channel}`);
    }

    this.configs.set(config.id, config);
    console.log(`Added notification config: ${config.name} (${config.channel})`);
  }

  // 移除通知配置
  removeNotificationConfig(configId: string): void {
    this.configs.delete(configId);
    console.log(`Removed notification config: ${configId}`);
  }

  // 获取通知配置
  getNotificationConfig(configId: string): NotificationConfig | undefined {
    return this.configs.get(configId);
  }

  // 获取所有通知配置
  getAllNotificationConfigs(): NotificationConfig[] {
    return Array.from(this.configs.values());
  }

  // 发送通知
  async sendNotification(alert: Alert, configIds?: string[]): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];
    
    // 确定要使用的配置
    const targetConfigs = configIds 
      ? configIds.map(id => this.configs.get(id)).filter(Boolean) as NotificationConfig[]
      : Array.from(this.configs.values()).filter(config => config.enabled);

    // 准备模板变量
    const templateVars: NotificationTemplateVars = {
      alert,
      timestamp: alert.timestamp.toISOString(),
      severity: alert.level.toUpperCase(),
      source: alert.source,
      title: alert.title,
      message: alert.message,
      metadata: alert.metadata,
      environment: process.env.NODE_ENV || 'development',
      hostname: process.env.HOSTNAME || 'localhost'
    };

    // 并行发送通知
    const sendPromises = targetConfigs.map(async (config) => {
      // 检查过滤条件
      if (!this.shouldSendNotification(alert, config)) {
        return null;
      }

      // 检查速率限制
      if (!this.checkRateLimit(config)) {
        return {
          success: false,
          channel: config.channel,
          configId: config.id,
          error: 'Rate limit exceeded',
          timestamp: new Date(),
          retryCount: 0,
          responseTime: 0
        };
      }

      // 发送通知（带重试）
      return this.sendWithRetry(config, alert, templateVars);
    });

    const sendResults = await Promise.all(sendPromises);
    
    // 过滤掉 null 结果并添加到结果数组
    for (const result of sendResults) {
      if (result) {
        results.push(result);
        this.notificationHistory.push(result);
      }
    }

    // 清理历史记录（保留最近1000条）
    if (this.notificationHistory.length > 1000) {
      this.notificationHistory = this.notificationHistory.slice(-1000);
    }

    return results;
  }

  // 检查是否应该发送通知
  private shouldSendNotification(alert: Alert, config: NotificationConfig): boolean {
    if (!config.enabled) {
      return false;
    }

    const filters = config.filters;
    if (!filters) {
      return true;
    }

    // 检查源过滤
    if (filters.sources && filters.sources.length > 0) {
      if (!filters.sources.includes(alert.source)) {
        return false;
      }
    }

    // 检查级别过滤
    if (filters.levels && filters.levels.length > 0) {
      if (!filters.levels.includes(alert.level)) {
        return false;
      }
    }

    // 检查模式过滤
    if (filters.patterns && filters.patterns.length > 0) {
      const matchesPattern = filters.patterns.some(pattern => {
        try {
          const regex = new RegExp(pattern, 'i');
          return regex.test(alert.title) || regex.test(alert.message);
        } catch {
          return false;
        }
      });
      
      if (!matchesPattern) {
        return false;
      }
    }

    return true;
  }

  // 检查速率限制
  private checkRateLimit(config: NotificationConfig): boolean {
    if (!config.rateLimit) {
      return true;
    }

    const now = Date.now();
    const limiter = this.rateLimiters.get(config.id);

    if (!limiter || now > limiter.resetTime) {
      // 重置计数器
      this.rateLimiters.set(config.id, {
        count: 1,
        resetTime: now + 60000 // 1分钟后重置
      });
      return true;
    }

    // 检查每分钟限制
    if (config.rateLimit.maxPerMinute && limiter.count >= config.rateLimit.maxPerMinute) {
      return false;
    }

    // 增加计数
    limiter.count++;
    return true;
  }

  // 带重试的发送
  private async sendWithRetry(
    config: NotificationConfig, 
    alert: Alert, 
    templateVars: NotificationTemplateVars
  ): Promise<NotificationResult> {
    const sender = this.senders.get(config.channel);
    if (!sender) {
      return {
        success: false,
        channel: config.channel,
        configId: config.id,
        error: `No sender available for channel: ${config.channel}`,
        timestamp: new Date(),
        retryCount: 0,
        responseTime: 0
      };
    }

    let lastResult: NotificationResult;
    let retryCount = 0;
    let delay = config.retryConfig.retryDelay;

    do {
      lastResult = await sender.send(config, alert, templateVars);
      lastResult.retryCount = retryCount;

      if (lastResult.success) {
        return lastResult;
      }

      retryCount++;
      
      if (retryCount <= config.retryConfig.maxRetries) {
        console.log(`Retrying notification ${config.id} (attempt ${retryCount}/${config.retryConfig.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * config.retryConfig.backoffMultiplier, config.retryConfig.maxDelay);
      }

    } while (retryCount <= config.retryConfig.maxRetries);

    return lastResult;
  }

  // 测试通知配置
  async testNotificationConfig(configId: string): Promise<NotificationResult> {
    const config = this.configs.get(configId);
    if (!config) {
      throw new Error(`Notification config not found: ${configId}`);
    }

    // 创建测试告警
    const testAlert: Alert = {
      id: 'test-alert',
      level: 'info',
      title: 'Test Notification',
      message: 'This is a test notification to verify the configuration.',
      source: 'notification-service',
      timestamp: new Date(),
      resolved: false,
      metadata: {
        test: true,
        configId
      }
    };

    const templateVars: NotificationTemplateVars = {
      alert: testAlert,
      timestamp: testAlert.timestamp.toISOString(),
      severity: 'INFO',
      source: testAlert.source,
      title: testAlert.title,
      message: testAlert.message,
      metadata: testAlert.metadata,
      environment: process.env.NODE_ENV || 'development',
      hostname: process.env.HOSTNAME || 'localhost'
    };

    const sender = this.senders.get(config.channel);
    if (!sender) {
      throw new Error(`No sender available for channel: ${config.channel}`);
    }

    return sender.send(config, testAlert, templateVars);
  }

  // 获取通知历史
  getNotificationHistory(limit?: number): NotificationResult[] {
    if (limit) {
      return this.notificationHistory.slice(-limit);
    }
    return [...this.notificationHistory];
  }

  // 获取通知统计
  getNotificationStats(): {
    totalSent: number;
    successRate: number;
    byChannel: Record<NotificationChannel, { sent: number; success: number }>;
    byConfig: Record<string, { sent: number; success: number }>;
  } {
    const stats = {
      totalSent: this.notificationHistory.length,
      successRate: 0,
      byChannel: {} as Record<NotificationChannel, { sent: number; success: number }>,
      byConfig: {} as Record<string, { sent: number; success: number }>
    };

    if (this.notificationHistory.length === 0) {
      return stats;
    }

    let successCount = 0;

    for (const result of this.notificationHistory) {
      if (result.success) {
        successCount++;
      }

      // 按渠道统计
      if (!stats.byChannel[result.channel]) {
        stats.byChannel[result.channel] = { sent: 0, success: 0 };
      }
      stats.byChannel[result.channel].sent++;
      if (result.success) {
        stats.byChannel[result.channel].success++;
      }

      // 按配置统计
      if (!stats.byConfig[result.configId]) {
        stats.byConfig[result.configId] = { sent: 0, success: 0 };
      }
      stats.byConfig[result.configId].sent++;
      if (result.success) {
        stats.byConfig[result.configId].success++;
      }
    }

    stats.successRate = (successCount / this.notificationHistory.length) * 100;

    return stats;
  }
}

// 全局通知服务实例
export const notificationService = new NotificationService();