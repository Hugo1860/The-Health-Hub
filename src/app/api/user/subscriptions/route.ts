/**
 * 用户订阅管理 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSecurity } from '@/lib/secureApiWrapper';
import SubscriptionService from '@/lib/subscriptionService';
import { z } from 'zod';

const createSubscriptionSchema = z.object({
  subscriptionType: z.enum(['category', 'speaker', 'user', 'playlist']),
  targetId: z.string().min(1),
  targetName: z.string().optional(),
  notificationEnabled: z.boolean().default(true),
  notificationFrequency: z.enum(['immediate', 'daily', 'weekly']).default('immediate')
});

const updateSubscriptionSchema = z.object({
  notificationEnabled: z.boolean().optional(),
  notificationFrequency: z.enum(['immediate', 'daily', 'weekly']).optional()
});

// 获取用户订阅列表
export const GET = withSecurity(async (request) => {
  try {
    const userId = request.headers.get('x-user-id') as string;
    const subscriptions = await SubscriptionService.getUserSubscriptions(userId);

    return NextResponse.json({
      success: true,
      data: subscriptions,
      total: subscriptions.length
    });
  } catch (error) {
    console.error('获取订阅列表失败:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: '获取订阅列表失败',
        details: error instanceof Error ? error.message : '未知错误'
      }
    }, { status: 500 });
  }
}, { requireAuth: true, enableRateLimit: true });

// 创建订阅
export const POST = withSecurity(async (request) => {
  try {
    const body = await request.json();
    const validation = createSubscriptionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: {
          message: '请求参数无效',
          details: validation.error.flatten()
        }
      }, { status: 400 });
    }

    const { subscriptionType, targetId, targetName, notificationEnabled, notificationFrequency } = validation.data;

    // 检查是否已订阅
    const userId = request.headers.get('x-user-id') as string;
    const isSubscribed = await SubscriptionService.isSubscribed(
      userId,
      subscriptionType,
      targetId
    );

    if (isSubscribed) {
      return NextResponse.json({
        success: false,
        error: { message: '已经订阅了该内容' }
      }, { status: 400 });
    }

    const subscription = await SubscriptionService.createSubscription(
      userId,
      subscriptionType,
      targetId,
      targetName,
      { notificationEnabled, notificationFrequency }
    );

    return NextResponse.json({
      success: true,
      data: subscription,
      message: '订阅成功'
    }, { status: 201 });
  } catch (error) {
    console.error('创建订阅失败:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: '创建订阅失败',
        details: error instanceof Error ? error.message : '未知错误'
      }
    }, { status: 500 });
  }
}, { requireAuth: true, requireCSRF: true, enableRateLimit: true, allowedMethods: ['POST'] });

// 更新订阅设置
export const PUT = withSecurity(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get('id');

    if (!subscriptionId) {
      return NextResponse.json({
        success: false,
        error: { message: '缺少订阅ID' }
      }, { status: 400 });
    }

    const body = await request.json();
    const validation = updateSubscriptionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: {
          message: '请求参数无效',
          details: validation.error.flatten()
        }
      }, { status: 400 });
    }

    const updatedSubscription = await SubscriptionService.updateSubscription(
      subscriptionId,
      validation.data
    );

    return NextResponse.json({
      success: true,
      data: updatedSubscription,
      message: '订阅设置更新成功'
    });
  } catch (error) {
    console.error('更新订阅失败:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: '更新订阅失败',
        details: error instanceof Error ? error.message : '未知错误'
      }
    }, { status: 500 });
  }
}, { requireAuth: true, requireCSRF: true, enableRateLimit: true, allowedMethods: ['PUT'] });

// 取消订阅
export const DELETE = withSecurity(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const subscriptionType = searchParams.get('type');
    const targetId = searchParams.get('targetId');

    if (!subscriptionType || !targetId) {
      return NextResponse.json({
        success: false,
        error: { message: '缺少必要参数' }
      }, { status: 400 });
    }

    const userId = request.headers.get('x-user-id') as string;
    const success = await SubscriptionService.unsubscribe(
      userId,
      subscriptionType,
      targetId
    );

    if (success) {
      return NextResponse.json({
        success: true,
        message: '取消订阅成功'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: { message: '订阅不存在或已取消' }
      }, { status: 404 });
    }
  } catch (error) {
    console.error('取消订阅失败:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: '取消订阅失败',
        details: error instanceof Error ? error.message : '未知错误'
      }
    }, { status: 500 });
  }
}, { requireAuth: true, requireCSRF: true, enableRateLimit: true, allowedMethods: ['DELETE'] });
