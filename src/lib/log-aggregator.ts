/**
 * 日志聚合和分析工具
 * 提供日志数据的聚合、分析和报告功能
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { defaultLogger, LogLevel, type LogEntry } from './structured-logger';

interface LogAnalysis {
  summary: {
    totalLogs: number;
    timeRange: {
      start: string;
      end: string;
    };
    logLevels: Record<string, number>;
    topServices: Array<{ service: string; count: number }>;
    topErrors: Array<{ error: string; count: number }>;
  };
  performance: {
    slowestOperations: Array<{
      operation: string;
      averageDuration: number;
      count: number;
    }>;
    apiEndpoints: Array<{
      endpoint: string;
      averageResponseTime: number;
      requestCount: number;
      errorRate: number;
    }>;
  };
  errors: {
    errorPatterns: Array<{
      pattern: string;
      count: number;
      examples: string[];
    }>;
    criticalErrors: LogEntry[];
  };
  trends: {
    hourlyDistribution: Record<string, number>;
    errorTrends: Array<{
      hour: string;
      errorCount: number;
      totalCount: number;
    }>;
  };
}

class LogAggregator {
  private logDirectory: string;

  constructor(logDirectory: string = './logs') {
    this.logDirectory = logDirectory;
  }

  /**
   * 分析指定时间范围内的日志
   */
  async analyzeLogs(
    startTime?: Date,
    endTime?: Date,
    maxLogs: number = 10000
  ): Promise<LogAnalysis> {
    const logs = await this.readLogs(startTime, endTime, maxLogs);
    
    return {
      summary: this.analyzeSummary(logs),
      performance: this.analyzePerformance(logs),
      errors: this.analyzeErrors(logs),
      trends: this.analyzeTrends(logs)
    };
  }

  private async readLogs(
    startTime?: Date,
    endTime?: Date,
    maxLogs: number = 10000
  ): Promise<LogEntry[]> {
    const logs: LogEntry[] = [];
    
    try {
      const files = readdirSync(this.logDirectory)
        .filter(file => file.endsWith('.log'))
        .sort()
        .reverse(); // 最新的文件优先

      for (const file of files) {
        if (logs.length >= maxLogs) break;

        const filePath = join(this.logDirectory, file);
        const content = readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (logs.length >= maxLogs) break;

          try {
            const logEntry: LogEntry = JSON.parse(line);
            const logTime = new Date(logEntry.timestamp);

            // 时间过滤
            if (startTime && logTime < startTime) continue;
            if (endTime && logTime > endTime) continue;

            logs.push(logEntry);
          } catch (error) {
            // 跳过无法解析的行
            continue;
          }
        }
      }
    } catch (error) {
      defaultLogger.error('Failed to read log files', error as Error);
    }

    return logs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  private analyzeSummary(logs: LogEntry[]) {
    const logLevels: Record<string, number> = {};
    const services: Record<string, number> = {};
    const errors: Record<string, number> = {};
    
    let startTime = logs[0]?.timestamp;
    let endTime = logs[0]?.timestamp;

    for (const log of logs) {
      // 统计日志级别
      const levelName = LogLevel[log.level] || 'UNKNOWN';
      logLevels[levelName] = (logLevels[levelName] || 0) + 1;

      // 统计服务
      if (log.service) {
        services[log.service] = (services[log.service] || 0) + 1;
      }

      // 统计错误
      if (log.error) {
        const errorKey = log.error.name || log.error.message || 'Unknown Error';
        errors[errorKey] = (errors[errorKey] || 0) + 1;
      }

      // 更新时间范围
      if (log.timestamp < startTime) startTime = log.timestamp;
      if (log.timestamp > endTime) endTime = log.timestamp;
    }

    return {
      totalLogs: logs.length,
      timeRange: { start: startTime, end: endTime },
      logLevels,
      topServices: Object.entries(services)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([service, count]) => ({ service, count })),
      topErrors: Object.entries(errors)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([error, count]) => ({ error, count }))
    };
  }

  private analyzePerformance(logs: LogEntry[]) {
    const operations: Record<string, { totalDuration: number; count: number }> = {};
    const apiEndpoints: Record<string, { 
      totalTime: number; 
      count: number; 
      errors: number; 
    }> = {};

    for (const log of logs) {
      // 分析操作性能
      if (log.duration && log.tags?.includes('performance')) {
        const operation = log.message.replace('Performance: ', '');
        if (!operations[operation]) {
          operations[operation] = { totalDuration: 0, count: 0 };
        }
        operations[operation].totalDuration += log.duration;
        operations[operation].count += 1;
      }

      // 分析API端点性能
      if (log.tags?.includes('api-response') && log.duration && log.url) {
        const endpoint = `${log.method} ${log.url}`;
        if (!apiEndpoints[endpoint]) {
          apiEndpoints[endpoint] = { totalTime: 0, count: 0, errors: 0 };
        }
        apiEndpoints[endpoint].totalTime += log.duration;
        apiEndpoints[endpoint].count += 1;
        if (log.statusCode && log.statusCode >= 400) {
          apiEndpoints[endpoint].errors += 1;
        }
      }
    }

    return {
      slowestOperations: Object.entries(operations)
        .map(([operation, stats]) => ({
          operation,
          averageDuration: stats.totalDuration / stats.count,
          count: stats.count
        }))
        .sort((a, b) => b.averageDuration - a.averageDuration)
        .slice(0, 10),
      
      apiEndpoints: Object.entries(apiEndpoints)
        .map(([endpoint, stats]) => ({
          endpoint,
          averageResponseTime: stats.totalTime / stats.count,
          requestCount: stats.count,
          errorRate: (stats.errors / stats.count) * 100
        }))
        .sort((a, b) => b.averageResponseTime - a.averageResponseTime)
        .slice(0, 10)
    };
  }

  private analyzeErrors(logs: LogEntry[]) {
    const errorLogs = logs.filter(log => log.level >= LogLevel.ERROR);
    const patterns: Record<string, { count: number; examples: string[] }> = {};
    const criticalErrors: LogEntry[] = [];

    for (const log of errorLogs) {
      // 收集关键错误
      if (log.level === LogLevel.FATAL || 
          log.tags?.includes('security') ||
          log.tags?.includes('critical')) {
        criticalErrors.push(log);
      }

      // 分析错误模式
      const errorMessage = log.error?.message || log.message;
      const pattern = this.extractErrorPattern(errorMessage);
      
      if (!patterns[pattern]) {
        patterns[pattern] = { count: 0, examples: [] };
      }
      patterns[pattern].count += 1;
      if (patterns[pattern].examples.length < 3) {
        patterns[pattern].examples.push(errorMessage);
      }
    }

    return {
      errorPatterns: Object.entries(patterns)
        .map(([pattern, data]) => ({
          pattern,
          count: data.count,
          examples: data.examples
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      
      criticalErrors: criticalErrors.slice(0, 20)
    };
  }

  private analyzeTrends(logs: LogEntry[]) {
    const hourlyDistribution: Record<string, number> = {};
    const errorTrends: Record<string, { errors: number; total: number }> = {};

    for (const log of logs) {
      const hour = new Date(log.timestamp).getHours().toString().padStart(2, '0');
      
      // 小时分布
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
      
      // 错误趋势
      if (!errorTrends[hour]) {
        errorTrends[hour] = { errors: 0, total: 0 };
      }
      errorTrends[hour].total += 1;
      if (log.level >= LogLevel.ERROR) {
        errorTrends[hour].errors += 1;
      }
    }

    return {
      hourlyDistribution,
      errorTrends: Object.entries(errorTrends)
        .map(([hour, stats]) => ({
          hour,
          errorCount: stats.errors,
          totalCount: stats.total
        }))
        .sort((a, b) => parseInt(a.hour) - parseInt(b.hour))
    };
  }

  private extractErrorPattern(message: string): string {
    // 简化错误消息以识别模式
    return message
      .replace(/\d+/g, 'N') // 替换数字
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'UUID') // 替换UUID
      .replace(/\b\w+@\w+\.\w+\b/g, 'EMAIL') // 替换邮箱
      .replace(/\/\w+/g, '/PATH') // 替换路径
      .substring(0, 100); // 限制长度
  }

  /**
   * 生成日志报告
   */
  async generateReport(
    startTime?: Date,
    endTime?: Date,
    format: 'json' | 'text' = 'json'
  ): Promise<string> {
    const analysis = await this.analyzeLogs(startTime, endTime);
    
    if (format === 'json') {
      return JSON.stringify(analysis, null, 2);
    }

    // 生成文本报告
    const report = [
      '# 日志分析报告',
      `生成时间: ${new Date().toLocaleString()}`,
      `分析时间范围: ${analysis.summary.timeRange.start} - ${analysis.summary.timeRange.end}`,
      `总日志数: ${analysis.summary.totalLogs}`,
      '',
      '## 日志级别分布',
      ...Object.entries(analysis.summary.logLevels)
        .map(([level, count]) => `${level}: ${count}`),
      '',
      '## 最慢操作 (前10)',
      ...analysis.performance.slowestOperations
        .map(op => `${op.operation}: ${op.averageDuration.toFixed(2)}ms (${op.count}次)`),
      '',
      '## 错误模式 (前10)',
      ...analysis.errors.errorPatterns
        .map(pattern => `${pattern.pattern}: ${pattern.count}次`),
      '',
      '## 关键错误',
      ...analysis.errors.criticalErrors
        .map(error => `[${error.timestamp}] ${error.message}`)
        .slice(0, 10)
    ];

    return report.join('\n');
  }
}

export { LogAggregator };
export type { LogAnalysis };