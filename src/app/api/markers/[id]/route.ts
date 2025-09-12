import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, DatabaseErrorHandler } from '@/lib/api-response';
import { authMiddleware } from '@/lib/auth-middleware';
// Markers functionality removed

// DELETE - 删除标记 - 需要用户认证
export const DELETE = authMiddleware.user(
  async (request: NextRequest, context, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;

      // Markers functionality has been removed
      return ApiResponse.internalError('标记功能暂时不可用');
    } catch (error) {
      return DatabaseErrorHandler.handle(error, 'Error deleting marker');
    }
  }
)