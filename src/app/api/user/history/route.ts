/**
 * 用户播放历史API
 * 获取和管理用户的播放历史记录
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { ApiResponse, DatabaseErrorHandler } from '@/lib/api-response';
import { withSecurity } from '@/lib/secureApiWrapper';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// 获取用户播放历史 - 需要用户认证
export const GET = withSecurity(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');
      const offset = (page - 1) * limit;

      // 获取用户ID
      const session = await getServerSession(authOptions);
      const email = session?.user?.email as string | undefined;
      const userQuery = db.prepare('SELECT id FROM users WHERE email = ?');
      const user = email ? await userQuery.get(email) as { id: number } | undefined : undefined;
      
      if (!user) {
        return ApiResponse.notFound('用户不存在');
      }

      // 获取播放历史（去重，只保留最新的播放记录）
      const historyQuery = db.prepare(`
        SELECT 
          a.id,
          a.title,
          a.subject,
          a."uploadDate",
          a.duration,
          a.description,
          h.lastPlayedAt,
          h.playCount,
          h.lastPosition
        FROM (
          SELECT 
            audioId,
            MAX(lastPlayedAt) as lastPlayedAt,
            COUNT(*) as playCount,
            lastPosition
          FROM play_history 
          WHERE userId = ?
          GROUP BY audioId
        ) h
        JOIN audios a ON h.audioId = a.id
        ORDER BY h.lastPlayedAt DESC
        LIMIT ? OFFSET ?
      `);

      const history = await historyQuery.all(user.id, limit, offset) as Array<{
        id: number;
        title: string;
        subject: string;
        "uploadDate": string;
        duration?: number;
        description?: string;
        lastPlayedAt: string;
        playCount: number;
        lastPosition?: number;
      }>;

      // 获取总数（去重后的）
      const countQuery = db.prepare(`
        SELECT COUNT(DISTINCT audioId) as total 
        FROM play_history 
        WHERE userId = ?
      `);
      const { total } = await countQuery.get(user.id) as { total: number };

      return ApiResponse.success({
        history: history.map(item => ({
          id: item.id.toString(),
          title: item.title,
          subject: item.subject, uploadDate: item.uploadDate,
          duration: item.duration,
          description: item.description,
          lastPlayedAt: item.lastPlayedAt,
          playCount: item.playCount,
          lastPosition: item.lastPosition
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      return DatabaseErrorHandler.handle(error, '获取播放历史失败');
    }
  }, { requireAuth: true, enableRateLimit: true, allowedMethods: ['GET'] }
)

// 记录播放历史 - 需要用户认证
export const POST = withSecurity(
  async (request: NextRequest) => {
    try {
      const { audioId, position = 0, duration = 0 } = await request.json();
      
      if (!audioId) {
        return ApiResponse.badRequest('音频ID不能为空', {
          field: 'audioId',
          message: 'Audio ID is required'
        });
      }

      // 获取用户ID
      const session = await getServerSession(authOptions);
      const email = session?.user?.email as string | undefined;
      const userQuery = db.prepare('SELECT id FROM users WHERE email = ?');
      const user = email ? await userQuery.get(email) as { id: number } | undefined : undefined;
      
      if (!user) {
        return ApiResponse.notFound('用户不存在');
      }

      // 检查音频是否存在
      const audioQuery = db.prepare('SELECT id FROM audios WHERE id = ?');
      const audio = await audioQuery.get(audioId);
      
      if (!audio) {
        return ApiResponse.notFound('音频不存在');
      }

      // 记录播放历史
      const insertQuery = db.prepare(`
        INSERT INTO play_history (userId, audioId, lastPlayedAt, lastPosition, duration)
        VALUES (?, ?, datetime('now'), ?, ?)
      `);
      
      await insertQuery.run(user.id, audioId, position, duration);

      return ApiResponse.success(null, '播放记录已保存');

    } catch (error) {
      return DatabaseErrorHandler.handle(error, '记录播放历史失败');
    }
  }, { requireAuth: true, requireCSRF: true, enableRateLimit: true, rateLimitMax: 100, rateLimitWindow: 60000, allowedMethods: ['POST'] }
)

// 清除播放历史 - 需要用户认证
export const DELETE = withSecurity(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const audioId = searchParams.get('audioId');

      // 获取用户ID
      const session = await getServerSession(authOptions);
      const email = session?.user?.email as string | undefined;
      const userQuery = db.prepare('SELECT id FROM users WHERE email = ?');
      const user = email ? await userQuery.get(email) as { id: number } | undefined : undefined;
      
      if (!user) {
        return ApiResponse.notFound('用户不存在');
      }

      let deleteQuery;
      let result;

      if (audioId) {
        // 删除特定音频的播放历史
        deleteQuery = db.prepare('DELETE FROM play_history WHERE userId = ? AND audioId = ?');
        result = await deleteQuery.run(user.id, audioId);
      } else {
        // 清除所有播放历史
        deleteQuery = db.prepare('DELETE FROM play_history WHERE userId = ?');
        result = await deleteQuery.run(user.id);
      }

      return ApiResponse.success({
        deletedCount: result.changes
      }, audioId ? '播放记录已删除' : '播放历史已清空');

    } catch (error) {
      return DatabaseErrorHandler.handle(error, '删除播放历史失败');
    }
  }, { requireAuth: true, requireCSRF: true, enableRateLimit: true, allowedMethods: ['DELETE'] }
)