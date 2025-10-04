import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, DatabaseErrorHandler } from '@/lib/api-response';
import { withSecurity } from '@/lib/secureApiWrapper';
// Markers functionality removed

// DELETE - 删除标记 - 需要用户认证
export const DELETE = withSecurity(
  async (request: NextRequest) => {
    try {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop() as string;

      // Markers functionality has been removed
      return ApiResponse.internalError('标记功能暂时不可用');
    } catch (error) {
      return DatabaseErrorHandler.handle(error, 'Error deleting marker');
    }
  }, { requireAuth: true, requireCSRF: true, enableRateLimit: true, allowedMethods: ['DELETE'] }
)