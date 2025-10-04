import { NextRequest, NextResponse } from 'next/server';
import { withSecurity } from '@/lib/secureApiWrapper';
import { ANTD_ADMIN_PERMISSIONS } from '@/hooks/useAntdAdminAuth';

// 超简化的统计API，不依赖数据库
export const GET = withSecurity(
  async (request: NextRequest) => {
    try {
      console.log('Simple stats API called');
      
      // 返回模拟的统计数据
      const dashboardStats = {
        totalAudios: 10,
        totalUsers: 5,
        totalPlays: 150,
        totalComments: 25,
        monthlyGrowth: {
          audios: 3,
          users: 1,
          plays: 45,
          comments: 8
        },
        categoryDistribution: [
          { category: '心血管', count: 4, percentage: 40 },
          { category: '神经科', count: 3, percentage: 30 },
          { category: '内科学', count: 2, percentage: 20 },
          { category: '其他', count: 1, percentage: 10 }
        ],
        recentStats: {
          todayAudios: 1,
          todayUsers: 0,
          todayPlays: 12,
          weekAudios: 5,
          weekUsers: 2,
          weekPlays: 78
        }
      };
      
      console.log('Returning mock stats data');
      
      return NextResponse.json({
        success: true,
        data: dashboardStats,
        message: '统计数据获取成功（模拟数据）'
      });
      
    } catch (error) {
      console.error('Simple stats API error:', error);
      
      return NextResponse.json({
        success: false,
        error: {
          message: '获取统计数据失败',
          details: error instanceof Error ? error.message : '未知错误'
        }
      }, { status: 500 });
    }
  }, { requireAuth: true, requiredPermissions: [ANTD_ADMIN_PERMISSIONS.VIEW_ANALYTICS], enableRateLimit: true }
);