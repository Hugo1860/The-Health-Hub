/**
 * 用户收藏API
 * 获取和管理用户收藏的音频内容
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { ApiResponse, DatabaseErrorHandler } from '@/lib/api-response';
import { authMiddleware } from '@/lib/auth-middleware';

// 获取用户收藏列表 - 需要用户认证
export const GET = authMiddleware.user(
  async (request: NextRequest, context) => {
    try {
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');
      const offset = (page - 1) * limit;

      // 获取用户ID
      const userQuery = db.prepare('SELECT id FROM users WHERE email = ?');
      const user = userQuery.get(context.user!.email) as { id: number } | undefined;
      
      if (!user) {
        return ApiResponse.notFound('用户不存在');
      }

      // 获取收藏列表
      const favoritesQuery = db.prepare(`
        SELECT 
          a.id,
          a.title,
          a.subject,
          a."uploadDate",
          a.duration,
          a.description,
          f.createdAt as favoriteDate
        FROM favorites f
        JOIN audios a ON f.audioId = a.id
        WHERE f.userId = ?
        ORDER BY f.createdAt DESC
        LIMIT ? OFFSET ?
      `);

      const favorites = favoritesQuery.all(user.id, limit, offset) as Array<{
        id: number;
        title: string;
        subject: string;
        "uploadDate": string;
        duration?: number;
        description?: string;
        favoriteDate: string;
      }>;

      // 获取总数
      const countQuery = db.prepare('SELECT COUNT(*) as total FROM favorites WHERE userId = ?');
      const { total } = countQuery.get(user.id) as { total: number };

      return ApiResponse.success({
        favorites: favorites.map(item => ({
          id: item.id.toString(),
          title: item.title,
          subject: item.subject, uploadDate: item.uploadDate,
          duration: item.duration,
          description: item.description,
          favoriteDate: item.favoriteDate
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      return DatabaseErrorHandler.handle(error, '获取收藏列表失败');
    }
  }
)

// 添加收藏 - 需要用户认证
export const POST = authMiddleware.userWithRateLimit(
  async (request: NextRequest, context) => {
    try {
      const { audioId } = await request.json();
      
      if (!audioId) {
        return ApiResponse.badRequest('音频ID不能为空', {
          field: 'audioId',
          message: 'Audio ID is required'
        });
      }

      // 获取用户ID
      const userQuery = db.prepare('SELECT id FROM users WHERE email = ?');
      const user = userQuery.get(context.user!.email) as { id: number } | undefined;
      
      if (!user) {
        return ApiResponse.notFound('用户不存在');
      }

      // 检查音频是否存在
      const audioQuery = db.prepare('SELECT id FROM audios WHERE id = ?');
      const audio = audioQuery.get(audioId);
      
      if (!audio) {
        return ApiResponse.notFound('音频不存在');
      }

      // 检查是否已收藏
      const existingQuery = db.prepare('SELECT id FROM favorites WHERE userId = ? AND audioId = ?');
      const existing = existingQuery.get(user.id, audioId);
      
      if (existing) {
        return ApiResponse.badRequest('已经收藏过了', {
          code: 'ALREADY_FAVORITED'
        });
      }

      // 添加收藏
      const insertQuery = db.prepare(`
        INSERT INTO favorites (userId, audioId, createdAt)
        VALUES (?, ?, datetime('now'))
      `);
      
      insertQuery.run(user.id, audioId);

      return ApiResponse.success(null, '收藏成功');

    } catch (error) {
      return DatabaseErrorHandler.handle(error, '添加收藏失败');
    }
  },
  20, // maxRequests
  60000 // windowMs
)

// 取消收藏 - 需要用户认证
export const DELETE = authMiddleware.user(
  async (request: NextRequest, context) => {
    try {
      const { searchParams } = new URL(request.url);
      const audioId = searchParams.get('audioId');
      
      if (!audioId) {
        return ApiResponse.badRequest('音频ID不能为空', {
          field: 'audioId',
          message: 'Audio ID is required'
        });
      }

      // 获取用户ID
      const userQuery = db.prepare('SELECT id FROM users WHERE email = ?');
      const user = userQuery.get(context.user!.email) as { id: number } | undefined;
      
      if (!user) {
        return ApiResponse.notFound('用户不存在');
      }

      // 删除收藏
      const deleteQuery = db.prepare('DELETE FROM favorites WHERE userId = ? AND audioId = ?');
      const result = deleteQuery.run(user.id, audioId);

      if (result.changes === 0) {
        return ApiResponse.notFound('收藏不存在');
      }

      return ApiResponse.success(null, '取消收藏成功');

    } catch (error) {
      return DatabaseErrorHandler.handle(error, '取消收藏失败');
    }
  }
)