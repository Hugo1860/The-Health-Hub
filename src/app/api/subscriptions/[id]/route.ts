import { NextRequest, NextResponse } from 'next/server';
import { cancelSubscription } from '@/lib/subscriptions';
import { ApiResponse, DatabaseErrorHandler } from '@/lib/api-response';
import { withSecurity } from '@/lib/secureApiWrapper';

// DELETE - 取消订阅 - 需要用户认证
export const DELETE = withSecurity(
  async (request: NextRequest) => {
    try {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop() as string;
      const userId = request.headers.get('x-user-id') as string;
      const success = cancelSubscription(id, userId);
      
      if (!success) {
        return ApiResponse.notFound('订阅不存在或已取消');
      }

      return ApiResponse.success(null, '订阅已取消');
    } catch (error) {
      return DatabaseErrorHandler.handle(error, 'Error canceling subscription');
    }
  }, { requireAuth: true, requireCSRF: true, enableRateLimit: true, allowedMethods: ['DELETE'] }
);