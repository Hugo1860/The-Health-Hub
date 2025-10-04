// PostgreSQL连接池健康检查和监控API

import { NextRequest, NextResponse } from 'next/server';
import { getPoolStats, getDatabaseStatus } from '@/lib/database';
import { apiMiddleware } from '@/lib/api-middleware';

// 连接池健康状态接口
interface ConnectionPoolHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  pool: {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
    ended: boolean;
    utilization: number; // 使用率百分比
    efficiency: number; // 效率评分 0-100
  };
  database: {
    connected: boolean;
    healthy: boolean;
    responseTime: number;
  };
  metrics: {
    averageResponseTime: number;
    peakConnections: number;
    connectionErrors: number;
    queryCount: number;
    lastResetTime: string;
  };
  recommendations: string[];
  timestamp: string;
}

// 连接池监控数据（简化版，实际项目中应该使用Redis或数据库存储）
let poolMetrics = {
  queryCount: 0,
  connectionErrors: 0,
  responseTimes: [] as number[],
  peakConnections: 0,
  lastResetTime: new Date().toISOString()
};

// 重置监控数据
function resetMetrics() {
  poolMetrics = {
    queryCount: 0,
    connectionErrors: 0,
    responseTimes: [],
    peakConnections: 0,
    lastResetTime: new Date().toISOString()
  };
}

// 更新监控数据
function updatePoolMetrics(responseTime?: number, error?: boolean) {
  if (responseTime) {
    poolMetrics.responseTimes.push(responseTime);
    // 只保留最近1000次查询的响应时间
    if (poolMetrics.responseTimes.length > 1000) {
      poolMetrics.responseTimes = poolMetrics.responseTimes.slice(-1000);
    }
    poolMetrics.queryCount++;
  }
  
  if (error) {
    poolMetrics.connectionErrors++;
  }
}

// 获取连接池健康状态
async function getConnectionPoolHealth(): Promise<ConnectionPoolHealth> {
  const startTime = Date.now();
  
  try {
    // 获取连接池统计信息
    const poolStats = getPoolStats();
    const dbStatus = await getDatabaseStatus();
    const responseTime = Date.now() - startTime;
    
    // 更新峰值连接数
    if (poolStats.totalCount > poolMetrics.peakConnections) {
      poolMetrics.peakConnections = poolStats.totalCount;
    }
    
    // 计算使用率
    const maxConnections = dbStatus.config.max || 20;
    const utilization = Math.round((poolStats.totalCount / maxConnections) * 100);
    
    // 计算效率评分
    const efficiency = calculateEfficiency(poolStats, utilization, poolMetrics);
    
    // 确定健康状态
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (poolStats.ended) {
      status = 'unhealthy';
    } else if (utilization > 90 || efficiency < 50) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }
    
    // 生成建议
    const recommendations = generateRecommendations(poolStats, utilization, efficiency, poolMetrics);
    
    // 计算平均响应时间
    const averageResponseTime = poolMetrics.responseTimes.length > 0
      ? Math.round(poolMetrics.responseTimes.reduce((a, b) => a + b, 0) / poolMetrics.responseTimes.length)
      : 0;
    
    return {
      status,
      pool: {
        totalCount: poolStats.totalCount,
        idleCount: poolStats.idleCount,
        waitingCount: poolStats.waitingCount,
        ended: poolStats.ended,
        utilization,
        efficiency
      },
      database: {
        connected: dbStatus.connected,
        healthy: dbStatus.healthy,
        responseTime
      },
      metrics: {
        averageResponseTime,
        peakConnections: poolMetrics.peakConnections,
        connectionErrors: poolMetrics.connectionErrors,
        queryCount: poolMetrics.queryCount,
        lastResetTime: poolMetrics.lastResetTime
      },
      recommendations,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('获取连接池健康状态失败:', error);
    throw error;
  }
}

// 计算效率评分
function calculateEfficiency(
  poolStats: any, 
  utilization: number, 
  metrics: typeof poolMetrics
): number {
  let score = 100;
  
  // 连接池使用率评分
  if (utilization > 95) {
    score -= 30; // 使用率过高
  } else if (utilization > 80) {
    score -= 15;
  } else if (utilization < 10) {
    score -= 10; // 使用率过低可能表示配置过大
  }
  
  // 等待连接数评分
  if (poolStats.waitingCount > 5) {
    score -= 25;
  } else if (poolStats.waitingCount > 0) {
    score -= 10;
  }
  
  // 错误率评分
  const errorRate = metrics.queryCount > 0 ? (metrics.connectionErrors / metrics.queryCount) * 100 : 0;
  if (errorRate > 5) {
    score -= 20;
  } else if (errorRate > 1) {
    score -= 10;
  }
  
  // 响应时间评分
  const avgResponseTime = metrics.responseTimes.length > 0
    ? metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length
    : 0;
  
  if (avgResponseTime > 1000) {
    score -= 15;
  } else if (avgResponseTime > 500) {
    score -= 8;
  }
  
  return Math.max(0, Math.min(100, score));
}

// 生成优化建议
function generateRecommendations(
  poolStats: any,
  utilization: number,
  efficiency: number,
  metrics: typeof poolMetrics
): string[] {
  const recommendations: string[] = [];
  
  if (poolStats.ended) {
    recommendations.push('连接池已关闭，需要重新初始化');
  }
  
  if (utilization > 90) {
    recommendations.push('连接池使用率过高，建议增加最大连接数');
  }
  
  if (poolStats.waitingCount > 0) {
    recommendations.push(`有 ${poolStats.waitingCount} 个请求在等待连接，考虑优化查询或增加连接数`);
  }
  
  if (utilization < 10 && poolStats.totalCount > 5) {
    recommendations.push('连接池使用率较低，可以考虑减少最大连接数以节省资源');
  }
  
  const errorRate = metrics.queryCount > 0 ? (metrics.connectionErrors / metrics.queryCount) * 100 : 0;
  if (errorRate > 1) {
    recommendations.push(`连接错误率较高 (${errorRate.toFixed(2)}%)，检查数据库连接配置`);
  }
  
  const avgResponseTime = metrics.responseTimes.length > 0
    ? metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length
    : 0;
  
  if (avgResponseTime > 500) {
    recommendations.push(`平均响应时间较长 (${avgResponseTime.toFixed(0)}ms)，考虑优化查询或检查网络延迟`);
  }
  
  if (efficiency < 70) {
    recommendations.push('连接池效率较低，建议检查配置和查询优化');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('连接池运行状态良好');
  }
  
  return recommendations;
}

// GET - 获取连接池健康状态
export const GET = async (req: NextRequest) => {
  try {
    const health = await getConnectionPoolHealth();
    
    const httpStatus = health.status === 'healthy' ? 200 :
                      health.status === 'degraded' ? 200 : 503;
    
    return NextResponse.json({
      success: true,
      data: health,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    }, { status: httpStatus });
    
  } catch (error) {
    console.error('连接池健康检查失败:', error);
    throw error;
  }
};

// POST - 重置监控指标
export const POST = async (req: NextRequest) => {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action;
    
    if (action === 'reset-metrics') {
      resetMetrics();
      
      return NextResponse.json({
        success: true,
        message: '监控指标已重置',
        data: {
          resetTime: poolMetrics.lastResetTime
        }
      });
    }
    
    return NextResponse.json({
      success: false,
      error: {
        message: '不支持的操作',
        supportedActions: ['reset-metrics']
      }
    }, { status: 400 });
    
  } catch (error) {
    console.error('连接池操作失败:', error);
    throw error;
  }
};

// 注意：updatePoolMetrics 函数已移动到单独的工具模块中