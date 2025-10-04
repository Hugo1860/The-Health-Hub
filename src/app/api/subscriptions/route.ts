import { NextRequest } from 'next/server';
import { withSecurity } from '@/lib/secureApiWrapper';
import { AuthResponseBuilder } from '@/lib/auth-response-builder';
import { getUserSubscriptions, createSubscription } from '@/lib/subscriptions';

// GET - 获取用户的订阅列表
export const GET = withSecurity(
  async (request: NextRequest) => {
    try {
      const userId = request.headers.get('x-user-id') as string;
      const subscriptions = getUserSubscriptions(userId);
      
      return AuthResponseBuilder.success({
        subscriptions,
        total: subscriptions.length
      });
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      return AuthResponseBuilder.fromError(error);
    }
  }, { requireAuth: true, enableRateLimit: true, allowedMethods: ['GET'] }
)

// POST - 创建新订阅
export const POST = withSecurity(
  async (request: NextRequest) => {
    try {
      const { type, value, notificationMethod } = await request.json();
      
      // 验证输入
      const errors: Record<string, string[]> = {};
      
      if (!type) {
        errors.type = ['订阅类型是必填项'];
      } else {
        const validTypes = ['all', 'subject', 'tag', 'speaker'];
        if (!validTypes.includes(type)) {
          errors.type = ['无效的订阅类型，支持的类型：' + validTypes.join(', ')];
        }
      }
      
      if (!notificationMethod) {
        errors.notificationMethod = ['通知方式是必填项'];
      } else {
        const validMethods = ['email', 'inApp', 'both'];
        if (!validMethods.includes(notificationMethod)) {
          errors.notificationMethod = ['无效的通知方式，支持的方式：' + validMethods.join(', ')];
        }
      }
      
      // 如果不是订阅全部，需要提供具体值
      if (type && type !== 'all' && !value) {
        errors.value = ['请提供订阅的具体内容'];
      }
      
      if (Object.keys(errors).length > 0) {
        return AuthResponseBuilder.validationError(
          '输入验证失败',
          errors
        );
      }

      const userId = request.headers.get('x-user-id') as string;
      const newSubscription = createSubscription({
        userId,
        type,
        value: type === 'all' ? undefined : value,
        notificationMethod,
        isActive: true
      });

      return AuthResponseBuilder.created({
        message: '订阅创建成功',
        subscription: newSubscription
      });
    } catch (error) {
      console.error('Error creating subscription:', error);
      
      if (error instanceof Error && error.message === '订阅已存在') {
        return AuthResponseBuilder.customError(
          '订阅已存在',
          'SUBSCRIPTION_EXISTS',
          409
        );
      }
      
      return AuthResponseBuilder.fromError(error);
    }
  }, { requireAuth: true, requireCSRF: true, enableRateLimit: true, rateLimitMax: 10, rateLimitWindow: 60000, allowedMethods: ['POST'] }
)