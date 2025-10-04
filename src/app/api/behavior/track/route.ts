/**
 * 用户行为追踪 API
 */

import { NextRequest, NextResponse } from 'next/server';
import UserBehaviorService from '@/lib/userBehaviorService';
import { z } from 'zod';

const trackEventSchema = z.object({
  eventType: z.enum(['page_view', 'audio_play', 'audio_pause', 'audio_seek', 'search', 'filter', 'like', 'share', 'comment', 'playlist_create', 'follow']),
  eventData: z.record(z.any()),
  sessionId: z.string().min(1),
  userId: z.string().optional(),
  pageUrl: z.string().optional(),
  referrer: z.string().optional(),
  deviceType: z.enum(['desktop', 'mobile', 'tablet']).default('desktop')
});

// 追踪用户行为事件
export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const validation = trackEventSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: {
          message: '请求参数无效',
          details: validation.error.flatten()
        }
      }, { status: 400 });
    }

    const {
      eventType,
      eventData,
      sessionId,
      userId,
      pageUrl,
      referrer,
      deviceType
    } = validation.data;

    // 获取客户端信息
    const userAgent = request.headers.get('user-agent') || undefined;
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    await UserBehaviorService.trackEvent(
      eventType,
      eventData,
      {
        userId,
        sessionId,
        pageUrl,
        referrer,
        userAgent,
        ipAddress,
        deviceType
      }
    );

    return NextResponse.json({
      success: true,
      message: '事件记录成功'
    });
  } catch (error) {
    console.error('追踪用户行为失败:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: '追踪失败',
        details: error instanceof Error ? error.message : '未知错误'
      }
    }, { status: 500 });
  }
};
