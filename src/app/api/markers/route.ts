import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, DatabaseErrorHandler } from '@/lib/api-response';
import { withSecurity } from '@/lib/secureApiWrapper';
// Markers functionality removed

// GET - 获取音频的标记列表 - 公开访问
export const GET = withSecurity(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const audioId = searchParams.get('audioId');
      
      if (!audioId) {
        return ApiResponse.badRequest('缺少音频ID', {
          field: 'audioId',
          message: 'Audio ID is required'
        });
      }

      // Markers functionality has been removed
      return ApiResponse.success([]);
    } catch (error) {
      return DatabaseErrorHandler.handle(error, 'Error fetching markers');
    }
  }, { requireAuth: false, enableRateLimit: true, allowedMethods: ['GET'] }
)

// POST - 创建新标记 - 需要用户认证
export const POST = withSecurity(
  async (request: NextRequest) => {
    try {
      const { audioId, title, time, description, type } = await request.json();
      
      if (!audioId || !title || time === undefined || !type) {
        return ApiResponse.badRequest('请填写完整信息', {
          required: ['audioId', 'title', 'time', 'type']
        });
      }

      // 验证时间格式
      if (typeof time !== 'number' || time < 0) {
        return ApiResponse.badRequest('时间格式错误', {
          field: 'time',
          message: 'Time must be a positive number'
        });
      }

      // 验证标记类型
      const validTypes = ['chapter', 'highlight', 'note'];
      if (!validTypes.includes(type)) {
        return ApiResponse.badRequest('无效的标记类型', {
          field: 'type',
          validTypes
        });
      }

      // Markers functionality has been removed
      return ApiResponse.internalError('标记功能暂时不可用');
    } catch (error) {
      return DatabaseErrorHandler.handle(error, 'Error creating marker');
    }
  }, { requireAuth: true, requireCSRF: true, enableRateLimit: true, rateLimitMax: 30, rateLimitWindow: 60000, allowedMethods: ['POST'] }
)