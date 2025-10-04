import { apiMiddleware, createApiResponse } from '@/lib/api-middleware';
import { ApiErrors } from '@/lib/api-error-handler';
import { performSystemHealthCheck, SystemHealth } from '@/lib/health-checker';
import { NextResponse } from 'next/server';

export const GET = apiMiddleware.public(async (req, context) => {
  const startTime = Date.now();
  
  try {
    // 执行全面的系统健康检查
    const healthStatus = await performSystemHealthCheck();
    
    // 根据健康状态设置HTTP状态码
    const httpStatus = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 200 : 503;
    
    return NextResponse.json({
      success: true,
      data: healthStatus,
      meta: {
        requestId: context.requestId,
        timestamp: new Date().toISOString(),
        version: process.env.API_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      }
    }, { status: httpStatus });
    
  } catch (error) {
    throw ApiErrors.INTERNAL_SERVER_ERROR(
      'Comprehensive health check failed',
      { 
        originalError: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      }
    );
  }
});