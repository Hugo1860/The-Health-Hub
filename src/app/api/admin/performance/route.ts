import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/auth-middleware';
import { ApiErrors } from '@/lib/api-error-handler';
import PerformanceOptimizer from '@/lib/performance-optimizer';

export const GET = authMiddleware.admin(async (req, context) => {
  try {
    const url = new URL(req.url);
    const hours = Math.min(parseInt(url.searchParams.get('hours') || '24'), 168); // 最大7天
    const type = url.searchParams.get('type') || 'all'; // all, api, database, system

    const performanceOptimizer = PerformanceOptimizer.getInstance();
    const result: any = {
      timeRange: `${hours} hours`,
      timestamp: new Date().toISOString()
    };

    if (type === 'all' || type === 'api') {
      result.api = await performanceOptimizer.getApiPerformanceStats(hours);
    }

    if (type === 'all' || type === 'database') {
      result.database = await performanceOptimizer.getDatabasePerformanceStats(hours);
    }

    if (type === 'all' || type === 'system') {
      result.system = performanceOptimizer.getSystemMetrics();
    }

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        requestId: context.requestId,
        timestamp: new Date().toISOString(),
        hours,
        type
      }
    });

  } catch (error) {
    console.error('Performance API error:', error);
    throw ApiErrors.INTERNAL_SERVER_ERROR(
      'Failed to get performance metrics',
      { originalError: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
});

// 清理旧的性能数据
export const DELETE = authMiddleware.admin(async (req, context) => {
  try {
    const url = new URL(req.url);
    const daysToKeep = Math.max(parseInt(url.searchParams.get('daysToKeep') || '30'), 7); // 最少保留7天

    const performanceOptimizer = PerformanceOptimizer.getInstance();
    await performanceOptimizer.cleanupOldMetrics(daysToKeep);

    return NextResponse.json({
      success: true,
      data: {
        message: `Cleaned up performance metrics older than ${daysToKeep} days`,
        daysToKeep
      },
      meta: {
        requestId: context.requestId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Performance cleanup API error:', error);
    throw ApiErrors.INTERNAL_SERVER_ERROR(
      'Failed to cleanup performance metrics',
      { originalError: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
});