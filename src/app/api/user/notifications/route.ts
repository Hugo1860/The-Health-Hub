/**
 * 用户通知管理 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSecurity, withSecurityAndValidation } from '@/lib/secureApiWrapper';
import SubscriptionService from '@/lib/subscriptionService';
import { z } from 'zod';

// 获取用户通知
export const GET = withSecurity(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const userId = request.headers.get('x-user-id') as string;
    const result = await SubscriptionService.getUserNotifications(userId, { unreadOnly, limit, offset });

    return NextResponse.json({
      success: true,
      data: result.notifications,
      meta: {
        total: result.total,
        unreadCount: result.unreadCount,
        limit,
        offset
      }
    });
  } catch (error) {
    console.error('获取通知列表失败:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: '获取通知列表失败',
        details: error instanceof Error ? error.message : '未知错误'
      }
    }, { status: 500 });
  }
}, { requireAuth: true, enableRateLimit: true });

// 标记通知为已读
const markSchema = z.object({ id: z.string().optional(), markAll: z.string().optional() });
export const PUT = withSecurityAndValidation(async (request: NextRequest, query: z.infer<typeof markSchema>) => {
  try {
    const userId = request.headers.get('x-user-id') as string;
    const notificationId = query.id;
    const markAll = query.markAll === 'true';

    if (markAll) {
      const count = await SubscriptionService.markAllNotificationsAsRead(userId);
      return NextResponse.json({ success: true, message: `已标记${count}条通知为已读` });
    }
    if (notificationId) {
      await SubscriptionService.markNotificationAsRead(notificationId);
      return NextResponse.json({ success: true, message: '通知已标记为已读' });
    }
    return NextResponse.json({ success: false, error: { message: '缺少通知ID或markAll参数' } }, { status: 400 });
  } catch (error) {
    console.error('标记通知失败:', error);
    return NextResponse.json({ success: false, error: { message: '标记通知失败', details: error instanceof Error ? error.message : '未知错误' } }, { status: 500 });
  }
}, markSchema, { requireAuth: true, requireCSRF: true });
