// 单个音频管理 API

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { withSecurityAndValidation, withSecurity } from '@/lib/secureApiWrapper';
import { ANTD_ADMIN_PERMISSIONS } from '@/hooks/useAntdAdminAuth';
import { z } from 'zod';
import logger from '@/lib/logger';

// GET - 获取单个音频详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: audioId } = await params;
  const handler = withSecurity(async (req: NextRequest) => {
    try {
      const db = getDatabase();

    const result = await db.query(`
      SELECT 
        id,
        title,
        description,
        filename,
        url,
        coverImage,
        duration,
        size as filesize,
        subject,
        speaker,
        uploadDate,
        status
      FROM audios 
      WHERE id = ?
    `, [audioId]);

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: { message: '音频不存在' }
      }, { status: 404 });
    }

    const audio = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        id: audio.id,
        title: audio.title,
        description: audio.description,
        filename: audio.filename,
        url: audio.url,
        coverImage: audio.coverImage,
        duration: audio.duration,
        filesize: audio.filesize,
        subject: audio.subject,
        speaker: audio.speaker,
        uploadDate: audio.uploadDate,
        status: audio.status
      }
    });

    } catch (error) {
      logger.error('获取音频详情失败:', error);
      return NextResponse.json({
        success: false,
        error: {
          message: '获取音频详情失败',
          details: error instanceof Error ? error.message : '未知错误'
        }
      }, { status: 500 });
    }
  }, { requireAuth: true, requiredPermissions: [ANTD_ADMIN_PERMISSIONS.EDIT_AUDIO, ANTD_ADMIN_PERMISSIONS.VIEW_USERS] });
  return handler(request);
}

// PUT - 更新音频信息
const updateSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  subject: z.string().optional(),
  speaker: z.string().optional(),
  status: z.string().optional(),
  coverImage: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: audioId } = await params;
  const handler = withSecurityAndValidation(async (req: NextRequest, body: z.infer<typeof updateSchema>) => {
    try {
      const db = getDatabase();
    const { title, description, subject, speaker, status, coverImage } = body;

    // 检查音频是否存在
    const existingAudio = await db.query(
      'SELECT id FROM audios WHERE id = ?',
      [audioId]
    );

    if (existingAudio.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: { message: '音频不存在' }
      }, { status: 404 });
    }

    // 构建更新查询
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updateFields.push(`title = $${paramIndex}`);
      updateValues.push(title);
      paramIndex++;
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      updateValues.push(description);
      paramIndex++;
    }

    if (subject !== undefined) {
      updateFields.push(`subject = $${paramIndex}`);
      updateValues.push(subject);
      paramIndex++;
    }

    if (speaker !== undefined) {
      updateFields.push(`speaker = $${paramIndex}`);
      updateValues.push(speaker);
      paramIndex++;
    }

    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      updateValues.push(status);
      paramIndex++;
    }

    if (coverImage !== undefined) {
      updateFields.push(`coverImage = $${paramIndex}`);
      updateValues.push(coverImage);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return NextResponse.json({
        success: false,
        error: { message: '没有需要更新的字段' }
      }, { status: 400 });
    }

    // 执行更新
    updateValues.push(audioId); // 添加 WHERE 条件的参数
    const updateQuery = `
      UPDATE audios 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(updateQuery, updateValues);
    const updatedAudio = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        id: updatedAudio.id,
        title: updatedAudio.title,
        description: updatedAudio.description,
        filename: updatedAudio.filename,
        url: updatedAudio.url,
        coverImage: updatedAudio.coverImage,
        duration: updatedAudio.duration,
        filesize: updatedAudio.filesize,
        subject: updatedAudio.subject,
        speaker: updatedAudio.speaker,
        uploadDate: updatedAudio.uploadDate,
        status: updatedAudio.status
      },
      message: '音频更新成功'
    });

    } catch (error) {
      logger.error('更新音频失败:', error);
      return NextResponse.json({
        success: false,
        error: {
          message: '更新音频失败',
          details: error instanceof Error ? error.message : '未知错误'
        }
      }, { status: 500 });
    }
  }, updateSchema, { requireAuth: true, requiredPermissions: [ANTD_ADMIN_PERMISSIONS.EDIT_AUDIO], requireCSRF: true });
  return handler(request);
}

// DELETE - 删除音频
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: audioId } = await params;
  const handler = withSecurity(async (req: NextRequest) => {
    try {
      const db = getDatabase();

    // 检查音频是否存在
    const existingAudio = await db.query(
      'SELECT id, title, filename FROM audios WHERE id = ?',
      [audioId]
    );

    if (existingAudio.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: { message: '音频不存在' }
      }, { status: 404 });
    }

    const audio = existingAudio.rows[0];

    // 删除音频记录
    await db.query('DELETE FROM audios WHERE id = ?', [audioId]);

    return NextResponse.json({
      success: true,
      message: '音频删除成功',
      data: {
        deletedAudioId: audioId,
        deletedAudioTitle: audio.title
      }
    });

    } catch (error) {
      logger.error('删除音频失败:', error);
      return NextResponse.json({
        success: false,
        error: {
          message: '删除音频失败',
          details: error instanceof Error ? error.message : '未知错误'
        }
      }, { status: 500 });
    }
  }, { requireAuth: true, requiredPermissions: [ANTD_ADMIN_PERMISSIONS.DELETE_AUDIO], requireCSRF: true });
  return handler(request);
}