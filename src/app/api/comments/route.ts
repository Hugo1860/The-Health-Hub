import { NextRequest, NextResponse } from 'next/server';
import { withSecurity } from '@/lib/secureApiWrapper';
import { z } from 'zod';
import { sqlClient } from '@/lib/sqlClient';
import { sanitizeText } from '@/lib/validation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

// GET: 获取评论列表（方言无关）
export const GET = withSecurity(async (request: NextRequest) => {
  try {
    const { searchParams } = request.nextUrl;
    const audioId = sanitizeText(searchParams.get('audioId') || '');
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const includePending = searchParams.get('includePending') === 'true';
    
    if (!audioId) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_INPUT', message: '缺少音频ID参数' } }, { status: 400 });
    }

    // 构建查询条件
    const statusCondition = includePending
      ? "c.status IN ('approved', 'pending')"
      : "c.status = 'approved'";

    const query = `
      SELECT 
        c.id,
        c.content,
        c.created_at,
        c.user_id,
        c.status,
        c.moderated_at,
        c.moderated_by,
        c.moderation_reason,
        u.username,
        u.email
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.audio_id = ? AND ${statusCondition}
      ORDER BY c.created_at DESC
      LIMIT ?
    `;

    const rows = await sqlClient.query<any>(query, [audioId, limit]);

    const comments = rows.map((row: any) => ({
      id: row.id,
      content: row.content,
      createdAt: row.created_at,
      userId: row.user_id,
      username: row.username || '匿名用户',
      email: row.email,
      status: row.status,
      moderatedAt: row.moderated_at,
      moderatedBy: row.moderated_by,
      moderationReason: row.moderation_reason
    }));

    return NextResponse.json({ success: true, data: { comments } });

  } catch (error) {
    console.error('获取评论失败:', error);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: '获取评论失败' } }, { status: 500 });
  }
}, { requireAuth: false, enableRateLimit: true, rateLimitMax: 120, rateLimitWindow: 60000, allowedMethods: ['GET'] });

// POST: 创建新评论（方言无关）
const createCommentSchema = z.object({
  audioId: z.string().uuid('无效的音频ID'),
  content: z.string().min(1, '评论内容不能为空').max(1000, '评论内容不能超过1000个字符')
});

export const POST = withSecurity(async (request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createCommentSchema.safeParse({
      audioId: sanitizeText(body?.audioId || ''),
      content: sanitizeText(body?.content || '')
    });
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: '参数无效', details: parsed.error.flatten() } }, { status: 400 });
    }

    const { audioId, content } = parsed.data;

    // 检查音频是否存在
    const audio = await sqlClient.query<any>('SELECT id FROM audios WHERE id = ?', [audioId]);
    if (audio.length === 0) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: '音频不存在' } }, { status: 404 });
    }

    // 预生成ID，避免使用 RETURNING
    const id = uuidv4();
    const insertSql = `
      INSERT INTO comments (id, audio_id, user_id, content, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    if (sqlClient.execute) {
      await sqlClient.execute(insertSql, [id, audioId, session.user.id, content]);
    } else {
      await sqlClient.query(insertSql, [id, audioId, session.user.id, content]);
    }

    // 获取用户信息
    const user = await sqlClient.query<any>('SELECT username, email FROM users WHERE id = ?', [session.user.id]);

    return NextResponse.json({
      success: true,
      data: {
        id,
        content,
        createdAt: new Date().toISOString(),
        userId: session.user.id,
        username: user?.[0]?.username || '匿名用户',
        email: user?.[0]?.email,
        status: 'pending'
      },
      message: '评论已提交，等待管理员审核后显示'
    }, { status: 201 });

  } catch (error) {
    console.error('创建评论失败:', error);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: '创建评论失败' } }, { status: 500 });
  }
}, { requireAuth: true, enableRateLimit: true, rateLimitMax: 30, rateLimitWindow: 60000, allowedMethods: ['POST'] });