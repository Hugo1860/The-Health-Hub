import { getDatabaseStatus, isConnected, reconnectDatabase } from '@/lib/database';
import { apiMiddleware, createApiResponse } from '@/lib/api-middleware';
import { ApiErrors } from '@/lib/api-error-handler';
import { NextResponse } from 'next/server';

// 数据库健康检查响应接口
interface DatabaseHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  database: {
    connected: boolean;
    healthy: boolean;
    type: string;
    host?: string;
    port?: number;
    database?: string;
    connectionAttempts: number;
    lastHealthCheck: number;
    tablesCount?: number;
    tableInfo?: any;
    error?: string;
    poolStats?: {
      totalCount: number;
      idleCount: number;
      waitingCount: number;
      ended: boolean;
    };
    config: {
      retryAttempts: number;
      connectionTimeout: number;
      healthCheckInterval: number;
    };
  };
  performance: {
    responseTime: number;
    databaseResponseTime?: number;
    memoryUsage?: NodeJS.MemoryUsage;
  };
  environment: {
    nodeVersion: string;
    platform: string;
    arch: string;
    cwd: string;
    nodeEnv?: string;
    uptime: number;
  };
}

export const GET = apiMiddleware.public(async (req, context) => {
  const startTime = Date.now();
  
  try {
    const status = await getDatabaseStatus();
    const connected = isConnected();
    const responseTime = Date.now() - startTime;
    
    // 获取连接池统计信息
    const { getPoolStats } = await import('@/lib/database');
    const poolStats = getPoolStats();
    
    // 确定整体健康状态
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (status.connected && status.healthy) {
      overallStatus = 'healthy';
    } else if (status.connected && !status.healthy) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'unhealthy';
    }
    
    const responseData: DatabaseHealthResponse = {
      status: overallStatus,
      database: {
        connected: status.connected,
        healthy: status.healthy,
        type: 'MySQL',
        host: status.config.host,
        port: status.config.port,
        database: status.config.database,
        connectionAttempts: status.connectionAttempts,
        lastHealthCheck: status.lastHealthCheck,
        tablesCount: status.tablesCount,
        tableInfo: status.tableInfo,
        error: status.error,
        poolStats,
        config: {
          retryAttempts: status.config.retryAttempts,
          connectionTimeout: status.config.connectionTimeoutMillis,
          healthCheckInterval: status.config.healthCheckInterval,
        }
      },
      performance: {
        responseTime,
        databaseResponseTime: status.performance?.responseTime,
        memoryUsage: status.performance?.memoryUsage,
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cwd: process.cwd(),
        nodeEnv: process.env.NODE_ENV,
        uptime: process.uptime(),
      }
    };
    
    // 根据健康状态返回适当的响应
    const response = createApiResponse(responseData, undefined, context.requestId);
    
    // 设置适当的HTTP状态码
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;
    
    return NextResponse.json({
      success: true,
      data: responseData,
      meta: {
        requestId: context.requestId,
        timestamp: new Date().toISOString(),
        version: process.env.API_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      }
    }, { status: httpStatus });
    
  } catch (error) {
    // 数据库健康检查失败
    throw ApiErrors.DATABASE_ERROR(
      'Database health check failed',
      { 
        originalError: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      }
    );
  }
});

// 数据库重连响应接口
interface DatabaseReconnectResponse {
  message: string;
  reconnection: {
    successful: boolean;
    attempts: number;
    responseTime: number;
  };
  database: {
    connected: boolean;
    healthy: boolean;
    type: string;
    tablesCount?: number;
    tableInfo?: any;
    error?: string;
    poolStats?: any;
  };
}

export const POST = apiMiddleware.public(async (req, context) => {
  const startTime = Date.now();
  
  try {
    // 强制重新连接数据库
    await reconnectDatabase();
    const connected = isConnected();
    const status = await getDatabaseStatus();
    const responseTime = Date.now() - startTime;
    
    // 获取连接池统计信息
    const { getPoolStats } = await import('@/lib/database');
    const poolStats = getPoolStats();
    
    const responseData: DatabaseReconnectResponse = {
      message: connected ? 'MySQL database reconnected successfully' : 'MySQL database reconnection failed',
      reconnection: {
        successful: connected,
        attempts: status.connectionAttempts,
        responseTime,
      },
      database: {
        connected: status.connected,
        healthy: status.healthy,
        type: 'MySQL',
        tablesCount: status.tablesCount,
        tableInfo: status.tableInfo,
        error: status.error,
        poolStats,
      },
    };
    
    const response = createApiResponse(responseData, undefined, context.requestId);
    
    const httpStatus = connected ? 200 : 503;
    
    return NextResponse.json({
      success: true,
      data: responseData,
      meta: {
        requestId: context.requestId,
        timestamp: new Date().toISOString(),
        version: process.env.API_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      }
    }, { status: httpStatus });
    
  } catch (error) {
    // 数据库重连失败
    throw ApiErrors.DATABASE_ERROR(
      'MySQL database reconnection failed',
      { 
        originalError: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      }
    );
  }
});