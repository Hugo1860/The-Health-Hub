import { monitoringStorage, Alert, AlertRule } from './monitoring-storage';
import { SystemHealth } from './health-checker';
import { TrendAnalysis } from './enhanced-health-monitor';
import { notificationService } from './notification-service';

// 告警条件接口
export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'ne' | 'gte' | 'lte' | 'contains' | 'trend_up' | 'trend_down';
  value?: any;
  threshold?: number;
  duration?: number; // 持续时间（毫秒）
  aggregation?: 'avg' | 'max' | 'min' | 'sum' | 'count';
  timeWindow?: number; // 时间窗口（毫秒）
}

// 告警评估结果
export interface AlertEvaluationResult {
  ruleId: string;
  ruleName: string;
  triggered: boolean;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  value: any;
  threshold: number;
  metadata: Record<string, any>;
  timestamp: Date;
}

// 告警聚合配置
export interface AlertAggregationConfig {
  enabled: boolean;
  timeWindow: number; // 聚合时间窗口（毫秒）
  maxAlerts: number; // 最大告警数量
  groupBy: string[]; // 聚合字段
  strategy: 'count' | 'severity' | 'source';
}

// 告警静默配置
export interface AlertSilenceConfig {
  id: string;
  source?: string;
  level?: string;
  pattern?: string; // 正则表达式匹配告警消息
  startTime: Date;
  endTime: Date;
  reason: string;
  createdBy: string;
  enabled: boolean;
}

// 告警升级配置
export interface AlertEscalationConfig {
  id: string;
  ruleId: string;
  levels: Array<{
    level: 'warning' | 'error' | 'critical';
    delay: number; // 延迟时间（毫秒）
    notifications: string[];
  }>;
  enabled: boolean;
}

// 异常检测结果
export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  confidence: number; // 0-1
  expectedValue: number;
  actualValue: number;
  deviation: number;
  type: 'spike' | 'drop' | 'trend_change' | 'pattern_break';
}

// 智能告警引擎
export class AlertEngine {
  private aggregationConfig: AlertAggregationConfig;
  private silenceConfigs: Map<string, AlertSilenceConfig> = new Map();
  private escalationConfigs: Map<string, AlertEscalationConfig> = new Map();
  private alertHistory: Map<string, Alert[]> = new Map();
  private pendingEscalations: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.aggregationConfig = {
      enabled: true,
      timeWindow: 5 * 60 * 1000, // 5分钟
      maxAlerts: 10,
      groupBy: ['source', 'level'],
      strategy: 'severity'
    };

    this.initializeDefaultConfigurations();
  }

  // 初始化默认配置
  private initializeDefaultConfigurations(): void {
    // 可以在这里添加默认的静默和升级配置
    console.log('Alert engine initialized with default configurations');
  }

  // 评估告警条件
  async evaluateAlerts(healthData: SystemHealth, trends?: Record<string, TrendAnalysis>): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const rules = monitoringStorage.getAlertRules();

    for (const rule of rules) {
      if (!rule.enabled) continue;

      try {
        const result = await this.evaluateRule(rule, healthData, trends);
        if (result.triggered) {
          const alert = await this.createAlert(rule, result);
          if (alert && !this.isAlertSilenced(alert)) {
            alerts.push(alert);
          }
        }
      } catch (error) {
        console.error(`Error evaluating alert rule ${rule.name}:`, error);
      }
    }

    // 应用聚合策略
    const aggregatedAlerts = this.aggregateAlerts(alerts);

    // 保存告警并设置升级
    for (const alert of aggregatedAlerts) {
      const alertId = monitoringStorage.saveAlert(alert);
      this.scheduleEscalation(alertId, alert);
      
      // 发送通知
      await this.sendAlert(alert);
    }

    return aggregatedAlerts;
  }

  // 评估单个规则
  private async evaluateRule(
    rule: AlertRule, 
    healthData: SystemHealth, 
    trends?: Record<string, TrendAnalysis>
  ): Promise<AlertEvaluationResult> {
    const condition = JSON.parse(rule.condition) as AlertCondition;
    const timestamp = new Date();

    // 获取监控数据
    const monitoringData = monitoringStorage.getMonitoringRecords({
      source: rule.source,
      startTime: new Date(timestamp.getTime() - (condition.timeWindow || 60000)),
      endTime: timestamp
    });

    let value: any;
    let triggered = false;
    let message = '';

    // 根据条件类型评估
    switch (condition.operator) {
      case 'gt':
      case 'gte':
      case 'lt':
      case 'lte':
        value = this.extractMetricValue(condition.metric, healthData, monitoringData, condition.aggregation);
        triggered = this.evaluateNumericCondition(value, condition.operator, rule.threshold);
        message = `${condition.metric} is ${value} (threshold: ${rule.threshold})`;
        break;

      case 'eq':
      case 'ne':
        value = this.extractMetricValue(condition.metric, healthData, monitoringData);
        triggered = condition.operator === 'eq' ? value === condition.value : value !== condition.value;
        message = `${condition.metric} is ${value} (expected: ${condition.value})`;
        break;

      case 'contains':
        value = this.extractMetricValue(condition.metric, healthData, monitoringData);
        triggered = String(value).includes(String(condition.value));
        message = `${condition.metric} contains "${condition.value}"`;
        break;

      case 'trend_up':
      case 'trend_down':
        if (trends && trends[rule.source]) {
          const trend = trends[rule.source];
          const metricTrend = this.getTrendMetric(condition.metric, trend);
          triggered = condition.operator === 'trend_up' ? 
            metricTrend > rule.threshold : metricTrend < -rule.threshold;
          value = metricTrend;
          message = `${condition.metric} trend is ${metricTrend.toFixed(2)} (threshold: ${rule.threshold})`;
        }
        break;
    }

    // 检查持续时间条件
    if (triggered && rule.duration > 0) {
      triggered = await this.checkDurationCondition(rule, condition, timestamp);
      if (!triggered) {
        message += ' (duration condition not met)';
      }
    }

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      triggered,
      severity: rule.severity,
      message,
      value,
      threshold: rule.threshold,
      metadata: {
        condition,
        source: rule.source,
        evaluationTime: timestamp.toISOString(),
        monitoringDataCount: monitoringData.length
      },
      timestamp
    };
  }

  // 提取指标值
  private extractMetricValue(
    metric: string, 
    healthData: SystemHealth, 
    monitoringData: any[], 
    aggregation?: string
  ): any {
    // 从健康数据中提取
    if (healthData.services[metric]) {
      return healthData.services[metric].responseTime || healthData.services[metric].status;
    }

    // 从监控数据中提取
    if (monitoringData.length > 0) {
      const values = monitoringData
        .map(record => record.metrics[metric] || record[metric])
        .filter(val => val !== undefined && val !== null);

      if (values.length === 0) return null;

      switch (aggregation) {
        case 'avg':
          return values.reduce((sum, val) => sum + Number(val), 0) / values.length;
        case 'max':
          return Math.max(...values.map(Number));
        case 'min':
          return Math.min(...values.map(Number));
        case 'sum':
          return values.reduce((sum, val) => sum + Number(val), 0);
        case 'count':
          return values.length;
        default:
          return values[values.length - 1]; // 最新值
      }
    }

    return null;
  }

  // 获取趋势指标
  private getTrendMetric(metric: string, trend: TrendAnalysis): number {
    switch (metric) {
      case 'responseTime':
        return trend.metrics.responseTime.trend;
      case 'errorRate':
        return trend.metrics.errorRate.trend;
      case 'availability':
        return trend.metrics.availability.trend;
      default:
        return 0;
    }
  }

  // 评估数值条件
  private evaluateNumericCondition(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case 'gt':
        return value > threshold;
      case 'gte':
        return value >= threshold;
      case 'lt':
        return value < threshold;
      case 'lte':
        return value <= threshold;
      default:
        return false;
    }
  }

  // 检查持续时间条件
  private async checkDurationCondition(
    rule: AlertRule, 
    condition: AlertCondition, 
    currentTime: Date
  ): Promise<boolean> {
    const startTime = new Date(currentTime.getTime() - rule.duration);
    
    // 获取该时间段内的告警
    const recentAlerts = monitoringStorage.getAlerts({
      source: rule.source,
      startTime,
      endTime: currentTime
    });

    // 检查是否在整个持续时间内都满足条件
    const relevantAlerts = recentAlerts.filter(alert => 
      alert.metadata.ruleId === rule.id && !alert.resolved
    );

    return relevantAlerts.length > 0;
  }

  // 创建告警
  private async createAlert(rule: AlertRule, result: AlertEvaluationResult): Promise<Alert> {
    return {
      level: result.severity,
      title: `${rule.name} Alert`,
      message: result.message,
      source: rule.source,
      timestamp: result.timestamp,
      resolved: false,
      metadata: {
        ...result.metadata,
        ruleId: rule.id,
        ruleName: rule.name,
        value: result.value,
        threshold: result.threshold
      }
    };
  }

  // 检查告警是否被静默
  private isAlertSilenced(alert: Alert): boolean {
    const now = new Date();

    for (const silence of this.silenceConfigs.values()) {
      if (!silence.enabled || now < silence.startTime || now > silence.endTime) {
        continue;
      }

      // 检查源匹配
      if (silence.source && silence.source !== alert.source) {
        continue;
      }

      // 检查级别匹配
      if (silence.level && silence.level !== alert.level) {
        continue;
      }

      // 检查模式匹配
      if (silence.pattern) {
        const regex = new RegExp(silence.pattern, 'i');
        if (!regex.test(alert.message) && !regex.test(alert.title)) {
          continue;
        }
      }

      console.log(`Alert silenced by rule ${silence.id}: ${alert.title}`);
      return true;
    }

    return false;
  }

  // 聚合告警
  private aggregateAlerts(alerts: Alert[]): Alert[] {
    if (!this.aggregationConfig.enabled || alerts.length <= this.aggregationConfig.maxAlerts) {
      return alerts;
    }

    // 按配置的字段分组
    const groups = new Map<string, Alert[]>();
    
    for (const alert of alerts) {
      const groupKey = this.aggregationConfig.groupBy
        .map(field => alert[field as keyof Alert] || 'unknown')
        .join('|');
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(alert);
    }

    const aggregatedAlerts: Alert[] = [];

    for (const [groupKey, groupAlerts] of groups.entries()) {
      if (groupAlerts.length === 1) {
        aggregatedAlerts.push(groupAlerts[0]);
      } else {
        // 创建聚合告警
        const aggregatedAlert = this.createAggregatedAlert(groupAlerts, groupKey);
        aggregatedAlerts.push(aggregatedAlert);
      }
    }

    return aggregatedAlerts;
  }

  // 创建聚合告警
  private createAggregatedAlert(alerts: Alert[], groupKey: string): Alert {
    const highestSeverity = this.getHighestSeverity(alerts.map(a => a.level));
    const sources = [...new Set(alerts.map(a => a.source))];
    
    return {
      level: highestSeverity,
      title: `Multiple Alerts (${alerts.length})`,
      message: `${alerts.length} alerts triggered for ${sources.join(', ')}`,
      source: sources.length === 1 ? sources[0] : 'multiple',
      timestamp: new Date(),
      resolved: false,
      metadata: {
        aggregated: true,
        groupKey,
        alertCount: alerts.length,
        sources,
        originalAlerts: alerts.map(a => ({
          title: a.title,
          message: a.message,
          level: a.level,
          source: a.source
        }))
      }
    };
  }

  // 获取最高严重级别
  private getHighestSeverity(levels: string[]): 'info' | 'warning' | 'error' | 'critical' {
    const severityOrder = { info: 1, warning: 2, error: 3, critical: 4 };
    
    let highest = 'info';
    let highestValue = 0;
    
    for (const level of levels) {
      const value = severityOrder[level as keyof typeof severityOrder] || 0;
      if (value > highestValue) {
        highest = level;
        highestValue = value;
      }
    }
    
    return highest as 'info' | 'warning' | 'error' | 'critical';
  }

  // 安排告警升级
  private scheduleEscalation(alertId: string, alert: Alert): void {
    const escalation = this.escalationConfigs.get(alert.metadata.ruleId);
    if (!escalation || !escalation.enabled) return;

    // 找到当前级别的升级配置
    const currentLevelIndex = escalation.levels.findIndex(l => l.level === alert.level);
    if (currentLevelIndex === -1 || currentLevelIndex === escalation.levels.length - 1) {
      return; // 没有找到或已经是最高级别
    }

    const nextLevel = escalation.levels[currentLevelIndex + 1];
    
    const timeout = setTimeout(async () => {
      // 检查告警是否仍然未解决
      const currentAlerts = monitoringStorage.getAlerts({ resolved: false });
      const stillActive = currentAlerts.some(a => a.id === alertId);
      
      if (stillActive) {
        // 创建升级告警
        const escalatedAlert: Omit<Alert, 'id'> = {
          level: nextLevel.level,
          title: `ESCALATED: ${alert.title}`,
          message: `Alert escalated to ${nextLevel.level}: ${alert.message}`,
          source: alert.source,
          timestamp: new Date(),
          resolved: false,
          metadata: {
            ...alert.metadata,
            escalated: true,
            originalAlertId: alertId,
            escalationLevel: nextLevel.level
          }
        };

        const escalatedAlertId = monitoringStorage.saveAlert(escalatedAlert);
        
        // 继续升级链
        this.scheduleEscalation(escalatedAlertId, escalatedAlert as Alert);
      }
      
      this.pendingEscalations.delete(alertId);
    }, nextLevel.delay);

    this.pendingEscalations.set(alertId, timeout);
  }

  // 异常检测
  async detectAnomalies(source: string, metric: string, timeWindow: number = 24 * 60 * 60 * 1000): Promise<AnomalyDetectionResult | null> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - timeWindow);
    
    const records = monitoringStorage.getMonitoringRecords({
      source,
      startTime,
      endTime,
      limit: 1000
    });

    if (records.length < 10) {
      return null; // 数据不足
    }

    const values = records
      .map(r => r.metrics[metric] || r[metric as keyof typeof r])
      .filter(v => typeof v === 'number')
      .map(Number);

    if (values.length < 10) {
      return null;
    }

    // 计算统计指标
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    const currentValue = values[values.length - 1];
    const deviation = Math.abs(currentValue - mean);
    const zScore = stdDev > 0 ? deviation / stdDev : 0;

    // 异常检测阈值
    const anomalyThreshold = 2.5; // Z-score阈值
    const isAnomaly = zScore > anomalyThreshold;

    // 确定异常类型
    let type: AnomalyDetectionResult['type'] = 'spike';
    if (currentValue < mean - 2 * stdDev) {
      type = 'drop';
    } else if (this.detectTrendChange(values)) {
      type = 'trend_change';
    } else if (this.detectPatternBreak(values)) {
      type = 'pattern_break';
    }

    return {
      isAnomaly,
      confidence: Math.min(1, zScore / 3), // 置信度
      expectedValue: mean,
      actualValue: currentValue,
      deviation,
      type
    };
  }

  // 检测趋势变化
  private detectTrendChange(values: number[]): boolean {
    if (values.length < 20) return false;

    const midPoint = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, midPoint);
    const secondHalf = values.slice(midPoint);

    const firstTrend = this.calculateTrend(firstHalf);
    const secondTrend = this.calculateTrend(secondHalf);

    // 检测趋势方向的显著变化
    return Math.abs(firstTrend - secondTrend) > 0.5 && 
           Math.sign(firstTrend) !== Math.sign(secondTrend);
  }

  // 检测模式破坏
  private detectPatternBreak(values: number[]): boolean {
    // 简单的周期性检测
    if (values.length < 50) return false;

    // 检测是否存在周期性模式
    const periods = [7, 24, 12]; // 可能的周期长度
    
    for (const period of periods) {
      if (values.length < period * 3) continue;
      
      const correlation = this.calculateAutocorrelation(values, period);
      if (correlation > 0.7) {
        // 存在周期性，检查最近的值是否破坏了模式
        const recentValues = values.slice(-period);
        const expectedPattern = values.slice(-period * 2, -period);
        
        const patternDeviation = this.calculatePatternDeviation(recentValues, expectedPattern);
        return patternDeviation > 2; // 模式偏差阈值
      }
    }

    return false;
  }

  // 计算趋势
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + i * val, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return isNaN(slope) ? 0 : slope;
  }

  // 计算自相关
  private calculateAutocorrelation(values: number[], lag: number): number {
    if (values.length <= lag) return 0;

    const n = values.length - lag;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (values[i] - mean) * (values[i + lag] - mean);
    }

    for (let i = 0; i < values.length; i++) {
      denominator += Math.pow(values[i] - mean, 2);
    }

    return denominator > 0 ? numerator / denominator : 0;
  }

  // 计算模式偏差
  private calculatePatternDeviation(recent: number[], expected: number[]): number {
    if (recent.length !== expected.length) return Infinity;

    const recentMean = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const expectedMean = expected.reduce((sum, val) => sum + val, 0) / expected.length;

    let deviation = 0;
    for (let i = 0; i < recent.length; i++) {
      const normalizedRecent = recent[i] - recentMean;
      const normalizedExpected = expected[i] - expectedMean;
      deviation += Math.pow(normalizedRecent - normalizedExpected, 2);
    }

    return Math.sqrt(deviation / recent.length);
  }

  // 管理告警规则
  addAlertRule(rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): string {
    return monitoringStorage.saveAlertRule(rule);
  }

  removeAlertRule(ruleId: string): void {
    // 这里需要实现删除规则的功能
    // 当前存储接口没有提供删除方法
    console.log(`Remove alert rule: ${ruleId}`);
  }

  // 管理静默配置
  addSilenceConfig(config: Omit<AlertSilenceConfig, 'id'>): string {
    const id = `silence-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const silenceConfig: AlertSilenceConfig = { id, ...config };
    this.silenceConfigs.set(id, silenceConfig);
    return id;
  }

  removeSilenceConfig(id: string): void {
    this.silenceConfigs.delete(id);
  }

  getSilenceConfigs(): AlertSilenceConfig[] {
    return Array.from(this.silenceConfigs.values());
  }

  // 管理升级配置
  addEscalationConfig(config: Omit<AlertEscalationConfig, 'id'>): string {
    const id = `escalation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const escalationConfig: AlertEscalationConfig = { id, ...config };
    this.escalationConfigs.set(id, escalationConfig);
    return id;
  }

  removeEscalationConfig(id: string): void {
    this.escalationConfigs.delete(id);
    
    // 取消相关的待处理升级
    for (const [alertId, timeout] of this.pendingEscalations.entries()) {
      clearTimeout(timeout);
      this.pendingEscalations.delete(alertId);
    }
  }

  getEscalationConfigs(): AlertEscalationConfig[] {
    return Array.from(this.escalationConfigs.values());
  }

  // 获取告警历史
  getAlertHistory(timeRange: { start: Date; end: Date }, source?: string): Alert[] {
    return monitoringStorage.getAlerts({
      source,
      startTime: timeRange.start,
      endTime: timeRange.end,
      limit: 1000
    });
  }

  // 解决告警
  resolveAlert(alertId: string): void {
    monitoringStorage.resolveAlert(alertId);
    
    // 取消相关的升级
    const timeout = this.pendingEscalations.get(alertId);
    if (timeout) {
      clearTimeout(timeout);
      this.pendingEscalations.delete(alertId);
    }
  }

  // 获取活跃告警
  getActiveAlerts(): Alert[] {
    return monitoringStorage.getAlerts({ resolved: false });
  }

  // 更新聚合配置
  updateAggregationConfig(config: Partial<AlertAggregationConfig>): void {
    this.aggregationConfig = { ...this.aggregationConfig, ...config };
  }

  getAggregationConfig(): AlertAggregationConfig {
    return { ...this.aggregationConfig };
  }

  // 发送告警通知
  async sendAlert(alert: Alert, configIds?: string[]): Promise<void> {
    try {
      const results = await notificationService.sendNotification(alert, configIds);
      const successCount = results.filter(r => r.success).length;
      
      console.log(`Alert sent via ${successCount}/${results.length} channels:`, alert.title);
      
      // 记录发送失败的渠道
      const failures = results.filter(r => !r.success);
      if (failures.length > 0) {
        console.warn('Failed to send alert via some channels:', failures.map(f => `${f.channel}: ${f.error}`));
      }
    } catch (error) {
      console.error('Failed to send alert:', error);
    }
  }
}

// 全局告警引擎实例
export const alertEngine = new AlertEngine();