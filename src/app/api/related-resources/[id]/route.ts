import { NextRequest, NextResponse } from 'next/server';
import { updateRelatedResource, deleteRelatedResource, getRelatedResources } from '@/lib/related-resources';
import { ApiResponse, DatabaseErrorHandler } from '@/lib/api-response';
import { authMiddleware } from '@/lib/auth-middleware';

// PUT - 更新相关资源 - 需要管理员权限
export const PUT = authMiddleware.admin(
  async (request: NextRequest, context: any) => {
    try {
      const params = await context.params;
      const { id } = params;
      const body = await request.json();
      const { title, url, type, description } = body;

      const updatedResource = updateRelatedResource(id, {
        title,
        url,
        type,
        description,
      });

      if (!updatedResource) {
        return ApiResponse.notFound('Related resource not found');
      }

      return ApiResponse.success(updatedResource);
    } catch (error) {
      return DatabaseErrorHandler.handle(error, 'Error updating related resource');
    }
  }
);

// DELETE - 删除相关资源 - 需要管理员权限
export const DELETE = authMiddleware.admin(
  async (request: NextRequest, context: any) => {
    try {
      const params = await context.params;
      const { id } = params;
      const success = deleteRelatedResource(id);

      if (!success) {
        return ApiResponse.notFound('Related resource not found');
      }

      return ApiResponse.success(null, 'Related resource deleted successfully');
    } catch (error) {
      return DatabaseErrorHandler.handle(error, 'Error deleting related resource');
    }
  }
);