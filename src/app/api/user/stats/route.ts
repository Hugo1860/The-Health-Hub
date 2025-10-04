/**
 * 用户统计API
 * 获取用户的学习统计数据
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { ApiResponse, DatabaseErrorHandler } from '@/lib/api-response';
import { withSecurity } from '@/lib/secureApiWrapper';

// 获取用户统计数据 - 需要用户认证
export const GET = withSecurity(
  async (request: NextRequest) => {
    try {
      // 获取用户ID
      const email = request.headers.get('x-user-email') as string | undefined;
      const userQuery = db.prepare('SELECT id, createdAt FROM users WHERE email = ?');
      const user = email ? userQuery.get(email) as { id: number; createdAt: string } | undefined : undefined;
      
      if (!user) {
        return ApiResponse.notFound('用户不存在');
      }

      // 获取收藏数量
      const favoritesCountQuery = db.prepare('SELECT COUNT(*) as count FROM favorites WHERE userId = ?');
      const { count: totalFavorites } = favoritesCountQuery.get(user.id) as { count: number };

      // 获取播放历史数量（去重）
      const historyCountQuery = db.prepare('SELECT COUNT(DISTINCT audioId) as count FROM play_history WHERE userId = ?');
      const { count: totalListened } = historyCountQuery.get(user.id) as { count: number };

      // 计算总学习时长（基于播放历史中的duration字段）
      const listeningTimeQuery = db.prepare(`
        SELECT SUM(duration) as totalTime 
        FROM (
          SELECT DISTINCT audioId, MAX(duration) as duration
          FROM play_history 
          WHERE userId = ? AND duration > 0
          GROUP BY audioId
        )
      `);
      const listeningTimeResult = listeningTimeQuery.get(user.id) as { totalTime: number | null };
      const listeningTime = Math.round((listeningTimeResult.totalTime || 0) / 60); // 转换为分钟

      // 获取播放列表数量（这里暂时设为0，因为还没有播放列表功能）
      const totalPlaylists = 0;

      // 获取最近7天的活动统计
      const recentActivityQuery = db.prepare(`
        SELECT 
          DATE(lastPlayedAt) as date,
          COUNT(DISTINCT audioId) as audiosPlayed
        FROM play_history 
        WHERE userId = ? AND lastPlayedAt >= datetime('now', '-7 days')
        GROUP BY DATE(lastPlayedAt)
        ORDER BY date DESC
      `);
      const recentActivity = recentActivityQuery.all(user.id) as Array<{
        date: string;
        audiosPlayed: number;
      }>;

      // 获取最喜欢的学科（基于播放历史）
      const favoriteSubjectsQuery = db.prepare(`
        SELECT 
          a.subject,
          COUNT(*) as playCount
        FROM play_history ph
        JOIN audios a ON ph.audioId = a.id
        WHERE ph.userId = ? AND a.subject IS NOT NULL
        GROUP BY a.subject
        ORDER BY playCount DESC
        LIMIT 5
      `);
      const favoriteSubjects = favoriteSubjectsQuery.all(user.id) as Array<{
        subject: string;
        playCount: number;
      }>;

      return ApiResponse.success({
        stats: {
          totalListened,
          totalFavorites,
          totalPlaylists,
          listeningTime
        },
        profile: {
          joinDate: user.createdAt,
          recentActivity,
          favoriteSubjects
        }
      });

    } catch (error) {
      return DatabaseErrorHandler.handle(error, '获取用户统计失败');
    }
  }, { requireAuth: true, enableRateLimit: true, allowedMethods: ['GET'] }
)