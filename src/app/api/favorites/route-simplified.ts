import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

// 简化的错误处理
const handleError = (message: string, status = 500) => {
  return NextResponse.json({
    success: false,
    error: { message }
  }, { status });
};

// GET: 检查收藏状态或获取收藏列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return handleError('请先登录', 401);
    }

    const { searchParams } = request.nextUrl;
    const audioId = searchParams.get('audioId');
    
    // 如果提供了 audioId，检查收藏状态
    if (audioId) {
      const existingFavorite = await db.query(
        'SELECT id FROM favorites WHERE user_id = ? AND audio_id = ?',
        [session.user.id, audioId]
      );
      
      return NextResponse.json({
        success: true,
        data: { isFavorited: existingFavorite.rows.length > 0 }
      });
    }

    // 否则返回收藏列表
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const query = `
      SELECT 
        f.id as favorite_id,
        f.created_at as favorited_at,
        a.id,
        a.title,
        a.description,
        a.url,
        a.duration,
        a."coverImage",
        a.speaker
      FROM favorites f
      JOIN audios a ON f.audio_id = a.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
      LIMIT ?
    `;

    const result = await db.query(query, [session.user.id, limit]);

    const favorites = result.rows.map(row => ({
      favoriteId: row.favorite_id,
      favoritedAt: row.favorited_at,
      audio: {
        id: row.id,
        title: row.title,
        description: row.description,
        url: row.url,
        duration: row.duration,
        coverImage: row.coverImage,
        speaker: row.speaker
      }
    }));

    return NextResponse.json({
      success: true,
      data: { favorites }
    });

  } catch (error) {
    console.error('获取收藏失败:', error);
    return handleError('获取收藏失败');
  }
}

// POST: 添加或移除收藏
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return handleError('请先登录', 401);
    }

    const { audioId, action = 'add' } = await request.json();
    
    if (!audioId) {
      return handleError('参数无效', 400);
    }

    // 检查音频是否存在
    const audioCheck = await db.query('SELECT id FROM audios WHERE id = ?', [audioId]);
    if (audioCheck.rows.length === 0) {
      return handleError('音频不存在', 404);
    }

    // 检查是否已收藏
    const existingFavorite = await db.query(
      'SELECT id FROM favorites WHERE user_id = ? AND audio_id = ?',
      [session.user.id, audioId]
    );

    if (action === 'add') {
      if (existingFavorite.rows.length > 0) {
        return handleError('已经收藏过了', 400);
      }

      await db.query(
        'INSERT INTO favorites (user_id, audio_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
        [session.user.id, audioId]
      );

      return NextResponse.json({
        success: true,
        message: '收藏成功'
      });

    } else if (action === 'remove') {
      if (existingFavorite.rows.length === 0) {
        return handleError('尚未收藏', 400);
      }

      await db.query(
        'DELETE FROM favorites WHERE user_id = ? AND audio_id = ?',
        [session.user.id, audioId]
      );

      return NextResponse.json({
        success: true,
        message: '取消收藏成功'
      });
    }

    return handleError('无效的操作', 400);

  } catch (error) {
    console.error('收藏操作失败:', error);
    return handleError('收藏操作失败');
  }
}