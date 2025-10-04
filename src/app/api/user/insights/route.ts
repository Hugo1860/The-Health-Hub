/**
 * 用户学习洞察和分析 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSecurity } from '@/lib/secureApiWrapper';
import LearningProgressService from '@/lib/learningProgressService';
import UserBehaviorService from '@/lib/userBehaviorService';

// 获取学习洞察
export const GET = withSecurity(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'learning';
    const days = Math.min(parseInt(searchParams.get('days') || '30'), 365);
    const userId = request.headers.get('x-user-id') as string;

    switch (type) {
      case 'learning':
        const learningInsights = await LearningProgressService.getLearningInsights(userId);
        return NextResponse.json({
          success: true,
          data: learningInsights
        });

      case 'behavior':
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const behaviorReport = await UserBehaviorService.generateUserBehaviorReport(userId, days);

        return NextResponse.json({
          success: true,
          data: behaviorReport
        });

      case 'recommendations':
        const recommendations = await UserBehaviorService.generatePersonalizedRecommendations(userId);

        return NextResponse.json({
          success: true,
          data: recommendations
        });

      default:
        return NextResponse.json({
          success: false,
          error: { message: '不支持的洞察类型' }
        }, { status: 400 });
    }
  } catch (error) {
    console.error('获取用户洞察失败:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: '获取用户洞察失败',
        details: error instanceof Error ? error.message : '未知错误'
      }
    }, { status: 500 });
  }
}, { requireAuth: true, enableRateLimit: true });
