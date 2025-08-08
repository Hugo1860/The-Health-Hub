import { NextRequest, NextResponse } from 'next/server';
import { withSecurity } from '@/lib/secureApiWrapper';
import { verifyAdminOperation, logAdminOperation } from '@/lib/adminAuth';
import { getSystemStatus } from '@/lib/systemMaintenance';

// 获取系统状态
export const GET = withSecurity(
  async (request: NextRequest) => {
    try {
      // 验证管理员权限
      const permissionCheck = await verifyAdminOperation(request, 'SYSTEM_SETTINGS');
      if (!permissionCheck.isAllowed) {
        return NextResponse.json(
          { error: { code: 'PERMISSION_DENIED', message: permissionCheck.error || '权限不足' } },
          { status: 403 }
        );
      }

      // 获取系统状态，添加超时保护
      const systemStatusPromise = getSystemStatus();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('获取系统状态超时')), 10000); // 10秒超时
      });

      const systemStatus = await Promise.race([systemStatusPromise, timeoutPromise]) as any;

      // 记录管理员操作（异步，不阻塞响应）
      logAdminOperation(request, 'VIEW_SYSTEM_STATUS', {
        systemHealth: systemStatus.systemHealth,
        uptime: systemStatus.uptime,
        memoryUsage: systemStatus.memoryUsage?.heapUsed || 0,
      }).catch(error => {
        console.error('Failed to log admin operation:', error);
      });

      return NextResponse.json({
        status: systemStatus,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Get system status error:', error);
      
      // 返回更详细的错误信息
      const errorMessage = error instanceof Error ? error.message : '获取系统状态失败';
      
      return NextResponse.json(
        { 
          error: { 
            code: 'FETCH_ERROR', 
            message: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error : undefined
          } 
        },
        { status: 500 }
      );
    }
  },
  {
    requireAuth: true,
    requireAdmin: true,
    enableRateLimit: true,
    rateLimitMax: 30,
    rateLimitWindow: 60000,
    allowedMethods: ['GET'],
  }
);