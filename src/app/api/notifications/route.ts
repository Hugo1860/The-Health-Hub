import { NextRequest } from 'next/server';
import { withSecurity } from '@/lib/secureApiWrapper';
import { AuthResponseBuilder } from '@/lib/auth-response-builder';
import { getUserNotifications, markAllNotificationsAsRead, getUnreadNotificationCount } from '@/lib/subscriptions';

// GET - 获取用户的通知列表
export const GET = withSecurity(
  async (request: NextRequest) => {
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
      
      const userId = request.headers.get('x-user-id') as string;
      let notifications = getUserNotifications(userId, limit);
      
      if (unreadOnly) {
        notifications = notifications.filter(notif => !notif.isRead);
      }
      
      const unreadCount = getUnreadNotificationCount(userId);
      
      return AuthResponseBuilder.success({
        notifications,
        unreadCount,
        total: notifications.length
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return AuthResponseBuilder.fromError(error);
    }
  }, { requireAuth: true, enableRateLimit: true, allowedMethods: ['GET'] }
)

// PUT - 标记所有通知为已读
export const PUT = withSecurity(
  async (request: NextRequest) => {
    try {
      const userId = request.headers.get('x-user-id') as string;
      const updatedCount = markAllNotificationsAsRead(userId);
      
      return AuthResponseBuilder.success({ 
        message: `已标记 ${updatedCount} 条通知为已读`,
        updatedCount 
      });
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      return AuthResponseBuilder.fromError(error);
    }
  }, { requireAuth: true, requireCSRF: true, enableRateLimit: true, rateLimitMax: 20, rateLimitWindow: 60000, allowedMethods: ['PUT'] }
)