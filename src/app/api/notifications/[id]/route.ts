import { NextRequest } from 'next/server';
import { authMiddleware } from '@/lib/auth-middleware';
import { AuthResponseBuilder } from '@/lib/auth-response-builder';
import { markNotificationAsRead, deleteNotification } from '@/lib/subscriptions';

// PUT - 标记单个通知为已读
export const PUT = authMiddleware.user(
  async (
    request: NextRequest,
    context,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const { id } = await params;
      
      if (!id) {
        return AuthResponseBuilder.validationError(
          '通知ID是必填项',
          { id: ['通知ID是必填项'] }
        );
      }

      const success = markNotificationAsRead(id, context.user!.id);
      
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
      return AuthResponseBuilder.fromError(error);
    }
  }
)

// DELETE - 删除通知
export const DELETE = authMiddleware.user(
  async (
    request: NextRequest,
    context,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const { id } = await params;
      
      if (!id) {
        return AuthResponseBuilder.validationError(
          '通知ID是必填项',
          { id: ['通知ID是必填项'] }
        );
      }

      const success = deleteNotification(id, context.user!.id);
      
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
      return AuthResponseBuilder.fromError(error);
    }
  }
)