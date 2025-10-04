/**
 * 管理员评论审核API
 * 使用统一认证中间件
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { withAdminAuth, UnifiedResponseBuilder, AuthContext } from '@/lib/unified-auth-middleware';

const db = getDatabase();

// 获取待审核评论列表
async function handleGet(request: NextRequest, context: AuthContext) {
  try {
    console.log(`[${context.requestId}] 获取评论审核列表`);
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status') || 'pending';
    const audioId = searchParams.get('audioId');
    
    const offset = (page - 1) * pageSize;
    
    // 构建查询条件
    let whereConditions = ['1=1'];
    let queryParams: any[] = [];
    let paramIndex = 1;
    
    if (status) {
      whereConditions.push(`c.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }
    
    if (audioId) {
      whereConditions.push(`c.audio_id = $${paramIndex}`);
      queryParams.push(audioId);
      paramIndex++;
    }
    
    // 获取总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN audios a ON c.audio_id = a.id
      WHERE ${whereConditions.join(' AND ')}
    `;
    
    const countResult = await db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0]?.total || '0');
    
    // 获取评论列表
    const commentsQuery = `
      SELECT 
        c.id,
        c.content,
        c.created_at,
        c.status,
        c.moderated_at,
        c.moderated_by,
        c.moderation_reason,
        c.user_id,
        u.username,
        u.email,
        a.title as audio_title,
        a.id as audio_id
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN audios a ON c.audio_id = a.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY c.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const commentsParams = [...queryParams, pageSize, offset];
    const commentsResult = await db.query(commentsQuery, commentsParams);
    
    const comments = commentsResult.rows.map(row => ({
      id: row.id,
      content: row.content,
      createdAt: row.created_at,
      status: row.status,
      moderatedAt: row.moderated_at,
      moderatedBy: row.moderated_by,
      moderationReason: row.moderation_reason,
      userId: row.user_id,
      username: row.username || '匿名用户',
      email: row.email,
      audioTitle: row.audio_title,
      audioId: row.audio_id
    }));
    
    return UnifiedResponseBuilder.success({
      comments,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    }, '获取评论列表成功');
    
  } catch (error) {
    console.error(`[${context.requestId}] 获取评论列表失败:`, error);
    return UnifiedResponseBuilder.serverError(
      `获取评论列表失败: ${error instanceof Error ? error.message : '未知错误'}`
    );
  }
}

// 审核评论
async function handlePost(request: NextRequest, context: AuthContext) {
  try {
    console.log(`[${context.requestId}] 审核评论`);
    
    const { commentId, action, reason } = await request.json();
    
    if (!commentId || !action) {
      return UnifiedResponseBuilder.error('缺少必要参数', 'MISSING_PARAMS', 400);
    }
    
    if (!['approve', 'reject'].includes(action)) {
      return UnifiedResponseBuilder.error('无效的审核操作', 'INVALID_ACTION', 400);
    }
    
    // 检查评论是否存在
    const commentCheck = await db.query('SELECT id, status FROM comments WHERE id = ?', [commentId]);
    if (commentCheck.rows.length === 0) {
      return UnifiedResponseBuilder.error('评论不存在', 'COMMENT_NOT_FOUND', 404);
    }
    
    const currentStatus = commentCheck.rows[0].status;
    if (currentStatus !== 'pending') {
      return UnifiedResponseBuilder.error('评论已被审核', 'ALREADY_MODERATED', 400);
    }
    
    // 更新评论状态
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const updateQuery = `
      UPDATE comments 
      SET 
        status = ?,
        moderated_at = CURRENT_TIMESTAMP,
        moderated_by = ?,
        moderation_reason = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `;
    
    const updateResult = await db.query(updateQuery, [
      newStatus,
      context.user!.id,
      reason || null,
      commentId
    ]);
    
    const updatedComment = updateResult.rows[0];
    
    return UnifiedResponseBuilder.success({
      id: updatedComment.id,
      status: updatedComment.status,
      moderatedAt: updatedComment.moderated_at,
      moderatedBy: updatedComment.moderated_by,
      moderationReason: updatedComment.moderation_reason
    }, `评论${action === 'approve' ? '审核通过' : '已拒绝'}`);
    
  } catch (error) {
    console.error(`[${context.requestId}] 审核评论失败:`, error);
    return UnifiedResponseBuilder.serverError(
      `审核评论失败: ${error instanceof Error ? error.message : '未知错误'}`
    );
  }
}

// 批量审核评论
async function handlePut(request: NextRequest, context: AuthContext) {
  try {
    console.log(`[${context.requestId}] 批量审核评论`);
    
    const { commentIds, action, reason } = await request.json();
    
    if (!commentIds || !Array.isArray(commentIds) || commentIds.length === 0) {
      return UnifiedResponseBuilder.error('缺少评论ID列表', 'MISSING_COMMENT_IDS', 400);
    }
    
    if (!action || !['approve', 'reject'].includes(action)) {
      return UnifiedResponseBuilder.error('无效的审核操作', 'INVALID_ACTION', 400);
    }
    
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    
    // 批量更新评论状态
    const updateQuery = `
      UPDATE comments 
      SET 
        status = ?,
        moderated_at = CURRENT_TIMESTAMP,
        moderated_by = ?,
        moderation_reason = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY(?) AND status = 'pending'
      RETURNING id, status
    `;
    
    const updateResult = await db.query(updateQuery, [
      newStatus,
      context.user!.id,
      reason || null,
      commentIds
    ]);
    
    const updatedComments = updateResult.rows;
    
    return UnifiedResponseBuilder.success({
      updatedCount: updatedComments.length,
      updatedComments: updatedComments.map(c => ({
        id: c.id,
        status: c.status
      }))
    }, `批量${action === 'approve' ? '审核通过' : '拒绝'}了${updatedComments.length}条评论`);
    
  } catch (error) {
    console.error(`[${context.requestId}] 批量审核评论失败:`, error);
    return UnifiedResponseBuilder.serverError(
      `批量审核评论失败: ${error instanceof Error ? error.message : '未知错误'}`
    );
  }
}

export const GET = withAdminAuth(handleGet);
export const POST = withAdminAuth(handlePost);
export const PUT = withAdminAuth(handlePut);
