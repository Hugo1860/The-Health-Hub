import { NextRequest } from 'next/server';
import { authMiddleware } from '@/lib/auth-middleware';
import { AuthResponseBuilder } from '@/lib/auth-response-builder';
import { getUserSubscriptions, createSubscription } from '@/lib/subscriptions';

// GET - 获取用户的订阅列表
export const GET = authMiddleware.user(
  async (request: NextRequest, context) => {
    try {
      const subscriptions = getUserSubscriptions(context.user!.id);
      
      return AuthResponseBuilder.success({
        subscriptions,
        total: subscriptions.length
      });
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      return AuthResponseBuilder.fromError(error);
    }
  }
)

// POST - 创建新订阅
export const POST = authMiddleware.userWithRateLimit(
  async (request: NextRequest, context) => {
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

      const newSubscription = createSubscription({
        userId: context.user!.id,
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
  },
  10, // 每分钟最多10个订阅请求
  60000
)