import { getDatabaseStatus, isConnected, getPoolStats } from './database';

// 健康检查状态枚举
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy'
}

// 检查结果状态枚举
export enum CheckStatus {
  PASS = 'pass',
  WARN = 'warn',
  FAIL = 'fail'
}

// 健康检查结果接口
export interface HealthCheckResult {
  status: CheckStatus;
  message: string;
  duration: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

// 服务健康状态接口
export interface ServiceHealth {
  status: HealthStatus;
  responseTime?: number;
  metadata?: Record<string, any>;
  error?: string;
}

// 系统健康状态接口
export interface SystemHealth {
  status: HealthStatus;
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: Record<string, ServiceHealth>;
  checks: Record<string, HealthCheckResult>;
  overall: {
    status: HealthStatus;
    score: number; // 0-100 健康分数
  };
}

// 健康检查器基类
export abstract class HealthChecker {
  abstract name: string;
  abstract timeout: number;

  abstract check(): Promise<HealthCheckResult>;

  protected createResult(
    status: CheckStatus,
    message: string,
    startTime: number,
    metadata?: Record<string, any>
  ): HealthCheckResult {
    return {
      status,
      message,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      metadata
    };
  }

  protected async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number = this.timeout
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Health check timeout after ${timeoutMs}ms`)), timeoutMs);
      })
    ]);
  }
}

// 数据库健康检查器
export class DatabaseHealthChecker extends HealthChecker {
  name = 'database';
  timeout = 5000;

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const [connected, status] = await this.withTimeout(
        Promise.all([
          Promise.resolve(isConnected()),
          getDatabaseStatus()
        ])
      );

      if (!connected) {
        return this.createResult(
          CheckStatus.FAIL,
          'PostgreSQL connection failed',
          startTime,
          { connectionAttempts: status.connectionAttempts, error: status.error }
        );
      }

      if (!status.healthy) {
        return this.createResult(
          CheckStatus.WARN,
          'PostgreSQL connection is unhealthy',
          startTime,
          { 
            connectionAttempts: status.connectionAttempts,
            lastHealthCheck: status.lastHealthCheck,
            tablesCount: status.tablesCount,
            poolStats: getPoolStats()
          }
        );
      }

      return this.createResult(
        CheckStatus.PASS,
        'PostgreSQL database is healthy',
        startTime,
        {
          type: 'PostgreSQL',
          tablesCount: status.tablesCount,
          connectionAttempts: status.connectionAttempts,
          responseTime: status.performance?.responseTime,
          poolStats: getPoolStats()
        }
      );

    } catch (error) {
      return this.createResult(
        CheckStatus.FAIL,
        `PostgreSQL database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        startTime,
        { error: error instanceof Error ? error.stack : String(error) }
      );
    }
  }
}

// 内存健康检查器
export class MemoryHealthChecker extends HealthChecker {
  name = 'memory';
  timeout = 1000;

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const memoryUsage = process.memoryUsage();
      const memoryTotal = memoryUsage.heapTotal + memoryUsage.external;
      const memoryUsed = memoryUsage.heapUsed;
      const memoryPercentage = (memoryUsed / memoryTotal) * 100;

      const metadata = {
        used: memoryUsed,
        total: memoryTotal,
        percentage: Math.round(memoryPercentage * 100) / 100,
        heap: {
          used: memoryUsage.heapUsed,
          total: memoryUsage.heapTotal
        },
        external: memoryUsage.external,
        rss: memoryUsage.rss
      };

      if (memoryPercentage > 90) {
        return this.createResult(
          CheckStatus.FAIL,
          `Memory usage is critical: ${memoryPercentage.toFixed(2)}%`,
          startTime,
          metadata
        );
      }

      if (memoryPercentage > 75) {
        return this.createResult(
          CheckStatus.WARN,
          `Memory usage is high: ${memoryPercentage.toFixed(2)}%`,
          startTime,
          metadata
        );
      }

      return this.createResult(
        CheckStatus.PASS,
        `Memory usage is normal: ${memoryPercentage.toFixed(2)}%`,
        startTime,
        metadata
      );

    } catch (error) {
      return this.createResult(
        CheckStatus.FAIL,
        `Memory check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        startTime,
        { error: error instanceof Error ? error.stack : String(error) }
      );
    }
  }
}
// 环境变量健康检查器
export class EnvironmentHealthChecker extends HealthChecker {
  name = 'environment';
  timeout = 500;

  private requiredEnvVars = ['NODE_ENV'];
  private optionalEnvVars = ['API_VERSION', 'DATABASE_URL'];

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const missingRequired = this.requiredEnvVars.filter(varName => !process.env[varName]);
      const missingOptional = this.optionalEnvVars.filter(varName => !process.env[varName]);

      const metadata = {
        nodeEnv: process.env.NODE_ENV,
        apiVersion: process.env.API_VERSION,
        missingRequired,
        missingOptional,
        totalEnvVars: Object.keys(process.env).length
      };

      if (missingRequired.length > 0) {
        return this.createResult(
          CheckStatus.FAIL,
          `Missing required environment variables: ${missingRequired.join(', ')}`,
          startTime,
          metadata
        );
      }

      if (missingOptional.length > 0) {
        return this.createResult(
          CheckStatus.WARN,
          `Missing optional environment variables: ${missingOptional.join(', ')}`,
          startTime,
          metadata
        );
      }

      return this.createResult(
        CheckStatus.PASS,
        'All environment variables are properly configured',
        startTime,
        metadata
      );

    } catch (error) {
      return this.createResult(
        CheckStatus.FAIL,
        `Environment check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        startTime,
        { error: error instanceof Error ? error.stack : String(error) }
      );
    }
  }
}

// 主健康检查管理器
export class HealthCheckManager {
  private checkers: HealthChecker[] = [];

  constructor() {
    // 注册默认的健康检查器
    this.registerChecker(new DatabaseHealthChecker());
    this.registerChecker(new MemoryHealthChecker());
    this.registerChecker(new EnvironmentHealthChecker());
  }

  registerChecker(checker: HealthChecker): void {
    this.checkers.push(checker);
  }

  private mapCheckStatusToHealthStatus(status: CheckStatus): HealthStatus {
    switch (status) {
      case CheckStatus.PASS:
        return HealthStatus.HEALTHY;
      case CheckStatus.WARN:
        return HealthStatus.DEGRADED;
      case CheckStatus.FAIL:
        return HealthStatus.UNHEALTHY;
      default:
        return HealthStatus.UNHEALTHY;
    }
  }

  private calculateHealthScore(checks: Record<string, HealthCheckResult>): number {
    const checkResults = Object.values(checks);
    if (checkResults.length === 0) return 0;

    const scores = checkResults.map(check => {
      switch (check.status) {
        case CheckStatus.PASS:
          return 100;
        case CheckStatus.WARN:
          return 50;
        case CheckStatus.FAIL:
          return 0;
        default:
          return 0;
      }
    });

    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }

  private determineOverallStatus(services: Record<string, ServiceHealth>): HealthStatus {
    const statuses = Object.values(services).map(service => service.status);
    
    if (statuses.includes(HealthStatus.UNHEALTHY)) {
      return HealthStatus.UNHEALTHY;
    }
    
    if (statuses.includes(HealthStatus.DEGRADED)) {
      return HealthStatus.DEGRADED;
    }
    
    return HealthStatus.HEALTHY;
  }

  async runAllChecks(): Promise<SystemHealth> {
    const startTime = Date.now();
    const checks: Record<string, HealthCheckResult> = {};
    const services: Record<string, ServiceHealth> = {};

    // 并行执行所有健康检查
    const checkPromises = this.checkers.map(async (checker) => {
      try {
        const result = await checker.check();
        checks[checker.name] = result;

        // 将检查结果转换为服务健康状态
        services[checker.name] = {
          status: this.mapCheckStatusToHealthStatus(result.status),
          responseTime: result.duration,
          metadata: result.metadata,
          error: result.status === CheckStatus.FAIL ? result.message : undefined
        };
      } catch (error) {
        checks[checker.name] = {
          status: CheckStatus.FAIL,
          message: `Check execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          metadata: { error: error instanceof Error ? error.stack : String(error) }
        };

        services[checker.name] = {
          status: HealthStatus.UNHEALTHY,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    await Promise.all(checkPromises);

    // 计算整体健康状态和分数
    const overallStatus = this.determineOverallStatus(services);
    const healthScore = this.calculateHealthScore(checks);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.API_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services,
      checks,
      overall: {
        status: overallStatus,
        score: healthScore
      }
    };
  }

  async runSpecificCheck(checkerName: string): Promise<HealthCheckResult | null> {
    const checker = this.checkers.find(c => c.name === checkerName);
    if (!checker) {
      return null;
    }

    try {
      return await checker.check();
    } catch (error) {
      return {
        status: CheckStatus.FAIL,
        message: `Check execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: 0,
        timestamp: new Date().toISOString(),
        metadata: { error: error instanceof Error ? error.stack : String(error) }
      };
    }
  }

  getRegisteredCheckers(): string[] {
    return this.checkers.map(checker => checker.name);
  }
}

// 全局健康检查管理器实例
export const globalHealthCheckManager = new HealthCheckManager();

// 便捷函数
export async function performSystemHealthCheck(): Promise<SystemHealth> {
  return globalHealthCheckManager.runAllChecks();
}

export async function performSpecificHealthCheck(checkerName: string): Promise<HealthCheckResult | null> {
  return globalHealthCheckManager.runSpecificCheck(checkerName);
}

export function registerHealthChecker(checker: HealthChecker): void {
  globalHealthCheckManager.registerChecker(checker);
}

export function getAvailableHealthCheckers(): string[] {
  return globalHealthCheckManager.getRegisteredCheckers();
}