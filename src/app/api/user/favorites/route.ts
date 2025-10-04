/**
 * 用户收藏API（方言无关）
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSecurity } from '@/lib/secureApiWrapper';
import { z } from 'zod';
import { sqlClient } from '@/lib/sqlClient';
import { limitOffset } from '@/lib/sqlCompat';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sanitizeText } from '@/lib/validation';
import { v4 as uuidv4 } from 'uuid';

async function getUserIdFromSession(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

// GET: 获取用户收藏列表
export const GET = withSecurity(async (request: NextRequest) => {
  try {
    const userId = await getUserIdFromSession();
    if (!userId) {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: '未授权访问' } }, { status: 401 });
    }

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '10')));
    const offset = (page - 1) * limit;

    const listSql = `
      SELECT 
        a.id,
        a.title,
        a.subject,
        a.upload_date AS uploadDate,
        a.duration,
        a.description,
        f.created_at AS favoriteDate
      FROM favorites f
      JOIN audios a ON f.audio_id = a.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
      ${limitOffset(limit, offset)}
    `;

    const countSql = `SELECT COUNT(*) AS total FROM favorites WHERE user_id = ?`;

    const [rows, countRows] = await Promise.all([
      sqlClient.query<any>(listSql, [userId]),
      sqlClient.query<any>(countSql, [userId])
    ]);

    const total = parseInt(countRows?.[0]?.total ?? '0', 10) || 0;

    return NextResponse.json({
      success: true,
      data: rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        subject: r.subject,
        uploadDate: r.uploadDate,
        duration: r.duration ?? undefined,
        description: r.description ?? undefined,
        favoriteDate: r.favoriteDate
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取收藏列表失败:', error);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: '获取收藏列表失败' } }, { status: 500 });
  }
}, { requireAuth: true, enableRateLimit: true, rateLimitMax: 60, rateLimitWindow: 60000, allowedMethods: ['GET'] });

// POST: 添加收藏
const addFavoriteSchema = z.object({
  audioId: z.string().uuid('无效的音频ID')
});

export const POST = withSecurity(async (request: NextRequest) => {
  try {
    const userId = await getUserIdFromSession();
    if (!userId) {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: '未授权访问' } }, { status: 401 });
    }

    const body = await request.json();
    const parsed = addFavoriteSchema.safeParse({ audioId: sanitizeText(body?.audioId || '') });
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: '音频ID无效', details: parsed.error.flatten() } }, { status: 400 });
    }

    const audioId = parsed.data.audioId;

    // 检查音频是否存在
    const audioExists = await sqlClient.query<any>('SELECT id FROM audios WHERE id = ?', [audioId]);
    if (audioExists.length === 0) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: '音频不存在' } }, { status: 404 });
    }

    // 是否已收藏
    const existing = await sqlClient.query<any>('SELECT id FROM favorites WHERE user_id = ? AND audio_id = ?', [userId, audioId]);
    if (existing.length > 0) {
      return NextResponse.json({ success: false, error: { code: 'ALREADY_EXISTS', message: '已经收藏过了' } }, { status: 400 });
    }

    // 插入收藏
    const id = uuidv4();
    const insertSql = 'INSERT INTO favorites (id, user_id, audio_id, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)';
    if (sqlClient.execute) {
      await sqlClient.execute(insertSql, [id, userId, audioId]);
    } else {
      await sqlClient.query(insertSql, [id, userId, audioId]);
    }

    return NextResponse.json({ success: true, message: '收藏成功' }, { status: 201 });
  } catch (error: any) {
    const message = (error && typeof error === 'object' && 'code' in error && (error as any).code === '23505') || (error as any)?.errno === 1062
      ? '重复收藏'
      : '添加收藏失败';
    return NextResponse.json({ success: false, error: { code: 'QUERY_ERROR', message } }, { status: 400 });
  }
}, { requireAuth: true, enableRateLimit: true, rateLimitMax: 20, rateLimitWindow: 60000, allowedMethods: ['POST'] });

// DELETE: 取消收藏
export const DELETE = withSecurity(async (request: NextRequest) => {
  try {
    const userId = await getUserIdFromSession();
    if (!userId) {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: '未授权访问' } }, { status: 401 });
    }

    const url = new URL(request.url);
    const audioIdRaw = url.searchParams.get('audioId') || '';
    const parsed = addFavoriteSchema.safeParse({ audioId: sanitizeText(audioIdRaw) });
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: '音频ID无效', details: parsed.error.flatten() } }, { status: 400 });
    }

    const audioId = parsed.data.audioId;
    const deleteSql = 'DELETE FROM favorites WHERE user_id = ? AND audio_id = ?';
    let affected = 0;
    if (sqlClient.execute) {
      const res = await sqlClient.execute(deleteSql, [userId, audioId]);
      affected = res.rowCount;
    } else {
      await sqlClient.query(deleteSql, [userId, audioId]);
    }

    if (affected === 0) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: '收藏不存在' } }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: '取消收藏成功' });
  } catch (error) {
    console.error('取消收藏失败:', error);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: '取消收藏失败' } }, { status: 500 });
  }
}, { requireAuth: true, enableRateLimit: true, rateLimitMax: 60, rateLimitWindow: 60000, allowedMethods: ['DELETE'] });