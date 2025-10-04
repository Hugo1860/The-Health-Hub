import { NextRequest } from 'next/server';
import { withSecurity } from '@/lib/secureApiWrapper';
import { AuthResponseBuilder } from '@/lib/auth-response-builder';
import { markNotificationAsRead, deleteNotification } from '@/lib/subscriptions';

// PUT - 标记单个通知为已读
export const PUT = withSecurity(
  async (request: NextRequest) => {
    try {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop() as string;
      
      if (!id) {
        return AuthResponseBuilder.validationError(
          '通知ID是必填项',
          { id: ['通知ID是必填项'] }
        );
      }

      const userId = request.headers.get('x-user-id') as string;
      const success = markNotificationAsRead(id, userId);
      
      if (!success) {
        return AuthResponseBuilder.customError(
          '通知不存在或无权访问',
          'NOTIFICATION_NOT_FOUND',
          404
        );
      }

      return AuthResponseBuilder.success({ 
        message: '通知已标记为已读' 
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return AuthResponseBuilder.fromError(error instanceof Error ? error : String(error));
    }
  }, { requireAuth: true, requireCSRF: true, enableRateLimit: true, allowedMethods: ['PUT'] }
)

// DELETE - 删除通知
export const DELETE = withSecurity(
  async (request: NextRequest) => {
    try {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop() as string;
      
      if (!id) {
        return AuthResponseBuilder.validationError(
          '通知ID是必填项',
          { id: ['通知ID是必填项'] }
        );
      }

      const userId = request.headers.get('x-user-id') as string;
      const success = deleteNotification(id, userId);
      
      if (!success) {
        return AuthResponseBuilder.customError(
          '通知不存在或无权删除',
          'NOTIFICATION_NOT_FOUND',
          404
        );
      }

      return AuthResponseBuilder.success({ 
        message: '通知已删除' 
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      return AuthResponseBuilder.fromError(error instanceof Error ? error : String(error));
    }
  }, { requireAuth: true, requireCSRF: true, enableRateLimit: true, allowedMethods: ['DELETE'] }
)