/**
 * 性能监控和优化器
 * 提供API响应时间监控、数据库查询优化、缓存管理等功能
 */

import db from './db';

export interface PerformanceMetrics {
  timestamp: string;
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  userAgent?: string;
  ip?: string;
  error?: string;
}

export interface DatabaseQueryMetrics {
  query: string;
  executionTime: number;
  rowsAffected: number;
  timestamp: string;
  error?: string;
}

export interface SystemMetrics {
  timestamp: string;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: number;
  activeConnections: number;
  requestsPerMinute: number;
}

export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private metricsBuffer: PerformanceMetrics[] = [];
  private queryMetricsBuffer: DatabaseQueryMetrics[] = [];
  private readonly BUFFER_SIZE = 1000;
  private readonly FLUSH_INTERVAL = 60000; // 1 minute

  constructor() {
    // 定期刷新指标到数据库
    setInterval(() => {
      this.flushMetrics();
    }, this.FLUSH_INTERVAL);
  }

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  /**
   * 记录API性能指标
   */
  recordApiMetrics(metrics: PerformanceMetrics): void {
    this.metricsBuffer.push(metrics);
    
    // 如果缓冲区满了，立即刷新
    if (this.metricsBuffer.length >= this.BUFFER_SIZE) {
      this.flushMetrics();
    }

    // 记录慢请求
    if (metrics.responseTime > 5000) { // 5秒以上
      console.warn('Slow API request detected:', {
        endpoint: metrics.endpoint,
        method: metrics.method,
        responseTime: metrics.responseTime,
        timestamp: metrics.timestamp
      });
    }
  }

  /**
   * 记录数据库查询指标
   */
  recordQueryMetrics(metrics: DatabaseQueryMetrics): void {
    this.queryMetricsBuffer.push(metrics);

    // 记录慢查询
    if (metrics.executionTime > 1000) { // 1秒以上
      console.warn('Slow database query detected:', {
        query: metrics.query.substring(0, 100) + '...',
        executionTime: metrics.executionTime,
        timestamp: metrics.timestamp
      });
    }
  }

  /**
   * 刷新指标到数据库
   */
  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0 && this.queryMetricsBuffer.length === 0) {
      return;
    }

    try {
      // 保存API指标
      if (this.metricsBuffer.length > 0) {
        await this.saveApiMetrics([...this.metricsBuffer]);
        this.metricsBuffer = [];
      }

      // 保存查询指标
      if (this.queryMetricsBuffer.length > 0) {
        await this.saveQueryMetrics([...this.queryMetricsBuffer]);
        this.queryMetricsBuffer = [];
      }
    } catch (error) {
      console.error('Failed to flush performance metrics:', error);
    }
  }

  /**
   * 保存API指标到数据库
   */
  private async saveApiMetrics(metrics: PerformanceMetrics[]): Promise<void> {
    try {
      const stmt = db.prepare(`
        INSERT INTO api_metrics (
          endpoint, method, response_time, status_code, 
          user_agent, ip, error, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const metric of metrics) {
        await stmt.run(
          metric.endpoint,
          metric.method,
          metric.responseTime,
          metric.statusCode,
          metric.userAgent || null,
          metric.ip || null,
          metric.error || null,
          metric.timestamp
        );
      }
    } catch (error) {
      console.error('Failed to save API metrics:', error);
    }
  }

  /**
   * 保存查询指标到数据库
   */
  private async saveQueryMetrics(metrics: DatabaseQueryMetrics[]): Promise<void> {
    try {
      const stmt = db.prepare(`
        INSERT INTO query_performance (
          query_sql, execution_time, rows_affected, timestamp
        ) VALUES (?, ?, ?, ?)
      `);

      for (const metric of metrics) {
        await stmt.run(
          metric.query,
          metric.executionTime,
          metric.rowsAffected,
          metric.timestamp
        );
      }
    } catch (error) {
      console.error('Failed to save query metrics:', error);
    }
  }

  /**
   * 获取API性能统计
   */
  async getApiPerformanceStats(hours: number = 24): Promise<{
    averageResponseTime: number;
    slowestEndpoints: Array<{ endpoint: string; avgTime: number; count: number }>;
    errorRate: number;
    requestsPerHour: number;
    statusCodeDistribution: Record<string, number>;
  }> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      // 平均响应时间
      const avgStmt = db.prepare(`
        SELECT AVG(response_time) as avg_time
        FROM api_metrics
        WHERE timestamp >= ?
      `);
      const avgResult = await avgStmt.get(since);
      const averageResponseTime = avgResult?.avg_time || 0;

      // 最慢的端点
      const slowStmt = db.prepare(`
        SELECT endpoint, AVG(response_time) as avg_time, COUNT(*) as count
        FROM api_metrics
        WHERE timestamp >= ?
        GROUP BY endpoint
        ORDER BY avg_time DESC
        LIMIT 10
      `);
      const slowestEndpoints = await slowStmt.all(since);

      // 错误率
      const errorStmt = db.prepare(`
        SELECT 
          COUNT(CASE WHEN status_code >= 400 THEN 1 END) as errors,
          COUNT(*) as total
        FROM api_metrics
        WHERE timestamp >= ?
      `);
      const errorResult = await errorStmt.get(since);
      const errorRate = errorResult?.total > 0 ? (errorResult.errors / errorResult.total) * 100 : 0;

      // 每小时请求数
      const requestsStmt = db.prepare(`
        SELECT COUNT(*) as total
        FROM api_metrics
        WHERE timestamp >= ?
      `);
      const requestsResult = await requestsStmt.get(since);
      const requestsPerHour = (requestsResult?.total || 0) / hours;

      // 状态码分布
      const statusStmt = db.prepare(`
        SELECT status_code, COUNT(*) as count
        FROM api_metrics
        WHERE timestamp >= ?
        GROUP BY status_code
      `);
      const statusResults = await statusStmt.all(since);
      const statusCodeDistribution: Record<string, number> = {};
      statusResults.forEach((row: any) => {
        statusCodeDistribution[row.status_code] = row.count;
      });

      return {
        averageResponseTime,
        slowestEndpoints: slowestEndpoints || [],
        errorRate,
        requestsPerHour,
        statusCodeDistribution
      };
    } catch (error) {
      console.error('Failed to get API performance stats:', error);
      return {
        averageResponseTime: 0,
        slowestEndpoints: [],
        errorRate: 0,
        requestsPerHour: 0,
        statusCodeDistribution: {}
      };
    }
  }

  /**
   * 获取数据库性能统计
   */
  async getDatabasePerformanceStats(hours: number = 24): Promise<{
    averageQueryTime: number;
    slowestQueries: Array<{ query: string; avgTime: number; count: number }>;
    queriesPerHour: number;
    totalQueries: number;
  }> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      // 平均查询时间
      const avgStmt = db.prepare(`
        SELECT AVG(execution_time) as avg_time
        FROM query_performance
        WHERE timestamp >= ?
      `);
      const avgResult = await avgStmt.get(since);
      const averageQueryTime = avgResult?.avg_time || 0;

      // 最慢的查询
      const slowStmt = db.prepare(`
        SELECT 
          SUBSTRING(query_sql, 1, 100) as query,
          AVG(execution_time) as avg_time,
          COUNT(*) as count
        FROM query_performance
        WHERE timestamp >= ?
        GROUP BY SUBSTRING(query_sql, 1, 100)
        ORDER BY avg_time DESC
        LIMIT 10
      `);
      const slowestQueries = await slowStmt.all(since);

      // 查询统计
      const countStmt = db.prepare(`
        SELECT COUNT(*) as total
        FROM query_performance
        WHERE timestamp >= ?
      `);
      const countResult = await countStmt.get(since);
      const totalQueries = countResult?.total || 0;
      const queriesPerHour = totalQueries / hours;

      return {
        averageQueryTime,
        slowestQueries: slowestQueries || [],
        queriesPerHour,
        totalQueries
      };
    } catch (error) {
      console.error('Failed to get database performance stats:', error);
      return {
        averageQueryTime: 0,
        slowestQueries: [],
        queriesPerHour: 0,
        totalQueries: 0
      };
    }
  }

  /**
   * 获取系统资源使用情况
   */
  getSystemMetrics(): SystemMetrics {
    const memoryUsage = process.memoryUsage();
    
    return {
      timestamp: new Date().toISOString(),
      memoryUsage,
      cpuUsage: process.cpuUsage().user / 1000000, // 转换为秒
      activeConnections: 0, // 可以从连接池获取
      requestsPerMinute: 0 // 可以从指标缓冲区计算
    };
  }

  /**
   * 清理旧的性能数据
   */
  async cleanupOldMetrics(daysToKeep: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();

      // 清理API指标
      const apiStmt = db.prepare('DELETE FROM api_metrics WHERE timestamp < ?');
      const apiResult = await apiStmt.run(cutoffDate);

      // 清理查询指标
      const queryStmt = db.prepare('DELETE FROM query_performance WHERE timestamp < ?');
      const queryResult = await queryStmt.run(cutoffDate);

      console.log(`Cleaned up old metrics: ${apiResult.changes} API metrics, ${queryResult.changes} query metrics`);
    } catch (error) {
      console.error('Failed to cleanup old metrics:', error);
    }
  }
}

export default PerformanceOptimizer;