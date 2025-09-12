import { NextRequest } from 'next/server';
import { authMiddleware } from '@/lib/auth-middleware';
import { AuthResponseBuilder } from '@/lib/auth-response-builder';
import { getUserNotifications, markAllNotificationsAsRead, getUnreadNotificationCount } from '@/lib/subscriptions';

// GET - 获取用户的通知列表
export const GET = authMiddleware.user(
  async (request: NextRequest, context) => {
    try {
      const { searchParams } = new URL(request.url);
      const limitParam = searchParams.get('limit');
      const unreadOnly = searchParams.get('unreadOnly') === 'true';
      
      // 验证limit参数
      let limit: number | undefined;
      if (limitParam) {
        const parsedLimit = parseInt(limitParam);
        if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
          return AuthResponseBuilder.validationError(
            'limit参数必须是1-100之间的数字',
            { limit: ['limit参数必须是1-100之间的数字'] }
          );
        }
        limit = parsedLimit;
      }
      
      let notifications = getUserNotifications(
        context.user!.id, 
        limit
      );
      
      if (unreadOnly) {
        notifications = notifications.filter(notif => !notif.isRead);
      }
      
      const unreadCount = getUnreadNotificationCount(context.user!.id);
      
      return AuthResponseBuilder.success({
        notifications,
        unreadCount,
        total: notifications.length
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return AuthResponseBuilder.fromError(error);
    }
  }
)

// PUT - 标记所有通知为已读
export const PUT = authMiddleware.userWithRateLimit(
  async (request: NextRequest, context) => {
    try {
      const updatedCount = markAllNotificationsAsRead(context.user!.id);
      
      return AuthResponseBuilder.success({ 
        message: `已标记 ${updatedCount} 条通知为已读`,
        updatedCount 
      });
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      return AuthResponseBuilder.fromError(error);
    }
  },
  20, // 每分钟最多20个标记请求
  60000
)