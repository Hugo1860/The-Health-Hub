import { NextRequest, NextResponse } from 'next/server';
import { updateRelatedResource, deleteRelatedResource, getRelatedResources } from '@/lib/related-resources';
import { ApiResponse, DatabaseErrorHandler } from '@/lib/api-response';
import { withSecurity } from '@/lib/secureApiWrapper';
import { ANTD_ADMIN_PERMISSIONS } from '@/hooks/useAntdAdminAuth';

// PUT - 更新相关资源 - 需要管理员权限
export const PUT = withSecurity(
  async (request: NextRequest, ) => {
    try {
      const requestUrl = new URL(request.url);
      const id = requestUrl.pathname.split('/').pop() as string;
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
  }, { requireAuth: true, requiredPermissions: [ANTD_ADMIN_PERMISSIONS.MANAGE_RESOURCES], requireCSRF: true, enableRateLimit: true, allowedMethods: ['PUT'] }
);

// DELETE - 删除相关资源 - 需要管理员权限
export const DELETE = withSecurity(
  async (request: NextRequest) => {
    try {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop() as string;
      const success = deleteRelatedResource(id);

      if (!success) {
        return ApiResponse.notFound('Related resource not found');
      }

      return ApiResponse.success(null, 'Related resource deleted successfully');
    } catch (error) {
      return DatabaseErrorHandler.handle(error, 'Error deleting related resource');
    }
  }, { requireAuth: true, requiredPermissions: [ANTD_ADMIN_PERMISSIONS.MANAGE_RESOURCES], requireCSRF: true, enableRateLimit: true, allowedMethods: ['DELETE'] }
);