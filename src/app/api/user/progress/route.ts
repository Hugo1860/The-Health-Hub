/**
 * 用户学习进度 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSecurity, withSecurityAndValidation } from '@/lib/secureApiWrapper';
import LearningProgressService from '@/lib/learningProgressService';
import { z } from 'zod';

const updateProgressSchema = z.object({
  audioId: z.string().min(1, '音频ID不能为空'),
  currentPosition: z.number().min(0, '播放位置不能为负数'),
  audioDuration: z.number().min(0).optional(),
  sessionTime: z.number().min(0).optional()
});

const addNoteSchema = z.object({
  audioId: z.string().min(1, '音频ID不能为空'),
  notes: z.string().min(1, '笔记内容不能为空').max(2000, '笔记不能超过2000个字符')
});

const rateAudioSchema = z.object({
  audioId: z.string().min(1, '音频ID不能为空'),
  rating: z.number().int().min(1, '评分最低1星').max(5, '评分最高5星')
});

// 获取学习进度
export const GET = withSecurity(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const audioId = searchParams.get('audioId');
    const status = searchParams.get('status') as any;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') as any || 'last_played';

    if (audioId) {
      // 获取特定音频的进度
      const userId = request.headers.get('x-user-id') as string;
      const progress = await LearningProgressService.getProgress(userId, audioId);
      
      if (!progress) {
        return NextResponse.json({
          success: false,
          error: { message: '未找到学习进度' }
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: progress
      });
    } else {
      // 获取用户所有进度
      const userId = request.headers.get('x-user-id') as string;
      const result = await LearningProgressService.getUserProgress(userId, { status, limit, offset, sortBy });

      return NextResponse.json({
        success: true,
        data: result.progress,
        meta: {
          total: result.total,
          limit,
          offset
        }
      });
    }
  } catch (error) {
    console.error('获取学习进度失败:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: '获取学习进度失败',
        details: error instanceof Error ? error.message : '未知错误'
      }
    }, { status: 500 });
  }
}, { requireAuth: true, enableRateLimit: true });

// 更新学习进度
export const POST = withSecurity(async (request) => {
  try {
    const body = await request.json();
    const validation = updateProgressSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: {
          message: '请求参数无效',
          details: validation.error.flatten()
        }
      }, { status: 400 });
    }

    const userId = request.headers.get('x-user-id') as string;
    const progress = await LearningProgressService.updateProgress(
      userId,
      validation.data.audioId,
      {
        currentPosition: validation.data.currentPosition,
        audioDuration: validation.data.audioDuration,
        sessionTime: validation.data.sessionTime
      }
    );

    // 检查并更新成就
    const newAchievements = await LearningProgressService.checkAndUpdateAchievements(userId);

    return NextResponse.json({
      success: true,
      data: progress,
      newAchievements,
      message: '学习进度已更新'
    });
  } catch (error) {
    console.error('更新学习进度失败:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: '更新学习进度失败',
        details: error instanceof Error ? error.message : '未知错误'
      }
    }, { status: 500 });
  }
}, { requireAuth: true, requireCSRF: true, enableRateLimit: true, allowedMethods: ['POST'] });
