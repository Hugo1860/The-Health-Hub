import { NextRequest, NextResponse } from 'next/server';
import { getRelatedResources, addRelatedResource } from '@/lib/related-resources';
import { ApiResponse, DatabaseErrorHandler } from '@/lib/api-response';
import { authMiddleware } from '@/lib/auth-middleware';

// GET - 获取相关资源列表 - 公开访问
export const GET = authMiddleware.public(
  async (request: NextRequest, context) => {
    try {
      const { searchParams } = new URL(request.url);
      const audioId = searchParams.get('audioId');
      
      const resources = getRelatedResources();
      
      if (audioId) {
        const filteredResources = resources.filter(resource => resource.audioId === audioId);
        return ApiResponse.success(filteredResources);
      }
      
      return ApiResponse.success(resources);
    } catch (error) {
      return DatabaseErrorHandler.handle(error, 'Error fetching related resources');
    }
  }
);

// POST - 创建相关资源 - 需要管理员权限
export const POST = authMiddleware.admin(
  async (request: NextRequest, context) => {
    try {
      const body = await request.json();
      const { audioId, title, url, type, description } = body;

      if (!audioId || !title || !url || !type) {
        return ApiResponse.badRequest('Missing required fields', {
          required: ['audioId', 'title', 'url', 'type']
        });
      }

      const newResource = addRelatedResource({
        audioId,
        title,
        url,
        type,
        description,
        createdBy: context.user!.id,
      });

      return ApiResponse.created(newResource, 'Related resource created successfully');
    } catch (error) {
      return DatabaseErrorHandler.handle(error, 'Error creating related resource');
    }
  }
);