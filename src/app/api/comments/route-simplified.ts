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

// GET: 获取评论列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const audioId = searchParams.get('audioId');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    if (!audioId) {
      return handleError('缺少音频ID参数', 400);
    }

    const query = `
      SELECT 
        c.id,
        c.content,
        c.created_at,
        c.user_id,
        c.username,
        u.email
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.audio_id = ?
      ORDER BY c.created_at DESC
      LIMIT ?
    `;

    const result = await db.query(query, [audioId, limit]);

    const comments = result.rows.map(row => ({
      id: row.id,
      content: row.content,
      createdAt: row.created_at,
      userId: row.user_id,
      username: row.username || '匿名用户',
      email: row.email
    }));

    return NextResponse.json({
      success: true,
      data: { comments }
    });

  } catch (error) {
    console.error('获取评论失败:', error);
    return handleError('获取评论失败');
  }
}

// POST: 创建新评论
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return handleError('请先登录', 401);
    }

    const { audioId, content } = await request.json();
    
    if (!audioId || !content?.trim()) {
      return handleError('参数无效', 400);
    }

    // 检查音频是否存在
    const audioCheck = await db.query('SELECT id FROM audios WHERE id = ?', [audioId]);
    if (audioCheck.rows.length === 0) {
      return handleError('音频不存在', 404);
    }

    // 创建评论
    const insertQuery = `
      INSERT INTO comments (id, audio_id, user_id, content, created_at, updated_at)
      VALUES (gen_random_uuid()::text, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const insertResult = await db.query(insertQuery, [audioId, session.user.id, content.trim()]);
    const newComment = insertResult.rows[0];

    // 获取用户信息
    const userQuery = 'SELECT username, email FROM users WHERE id = ?';
    const userResult = await db.query(userQuery, [session.user.id]);
    const user = userResult.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        id: newComment.id,
        content: newComment.content,
        createdAt: newComment.created_at,
        userId: newComment.user_id,
        username: user?.username || '匿名用户',
        email: user?.email
      },
      message: '评论发表成功'
    });

  } catch (error) {
    console.error('创建评论失败:', error);
    return handleError('创建评论失败');
  }
}