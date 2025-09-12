import { NextRequest, NextResponse } from 'next/server';
import { cancelSubscription } from '@/lib/subscriptions';
import { ApiResponse, DatabaseErrorHandler } from '@/lib/api-response';
import { authMiddleware } from '@/lib/auth-middleware';

// DELETE - 取消订阅 - 需要用户认证
export const DELETE = authMiddleware.user(
  async (request: NextRequest, context, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      const success = cancelSubscription(id, context.user!.id!);
      
      if (!success) {
        return ApiResponse.notFound('订阅不存在或已取消');
      }

      return ApiResponse.success(null, '订阅已取消');
    } catch (error) {
      return DatabaseErrorHandler.handle(error, 'Error canceling subscription');
    }
  }
);