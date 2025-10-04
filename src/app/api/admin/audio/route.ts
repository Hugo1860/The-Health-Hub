// 音频管理 API

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { withSecurityAndValidation } from '@/lib/secureApiWrapper';
import { z } from 'zod';
import { ANTD_ADMIN_PERMISSIONS } from '@/hooks/useAntdAdminAuth';
import logger from '@/lib/logger';

// 音频接口
interface Audio {
  id: string;
  title: string;
  description?: string;
  filename: string;
  url: string;
  "coverImage"?: string;
  duration?: number;
  filesize?: number;
  subject: string;
  speaker?: string;
  "uploadDate": string;
  status: string;
}

// GET - 获取音频列表
const listSchema = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
  search: z.string().optional(),
  subject: z.string().optional(),
  status: z.string().optional(),
});

export const GET = withSecurityAndValidation(async (request: NextRequest, query: z.infer<typeof listSchema>) => {
  try {
    const db = getDatabase();
    const page = parseInt(query.page || '1');
    const pageSize = parseInt(query.pageSize || '10');
    const search = query.search || '';
    const subject = query.subject || '';
    const status = query.status || '';

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    // 搜索条件
    if (search) {
      whereClause += ` AND (title LIKE $${paramIndex} OR description LIKE $${paramIndex + 1} OR speaker LIKE $${paramIndex + 2})`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      paramIndex += 3;
    }

    // 分类筛选
    if (subject) {
      whereClause += ` AND subject = $${paramIndex}`;
      params.push(subject);
      paramIndex++;
    }

    // 状态筛选
    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // 获取音频列表
    const offset = (page - 1) * pageSize;
    const audiosQuery = `
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
      ${whereClause}
      ORDER BY uploadDate DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const audiosResult = await db.query(audiosQuery, [...params, pageSize, offset]);
    
    // 获取总数
    const countQuery = `SELECT COUNT(*) as total FROM audios ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0]?.total || '0');

    // 格式化音频数据
    const audios: Audio[] = audiosResult.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      filename: row.filename,
      url: row.url,
      coverImage: row.coverImage,
      duration: row.duration,
      filesize: row.filesize,
      subject: row.subject || '未分类',
      speaker: row.speaker,
      uploadDate: row.uploadDate,
      status: row.status || 'draft'
    }));

    return NextResponse.json({
      success: true,
      data: audios,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });

  } catch (error) {
    logger.error('获取音频列表失败:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: '获取音频列表失败',
        details: error instanceof Error ? error.message : '未知错误'
      }
    }, { status: 500 });
  }
}, listSchema, { requireAuth: true, requiredPermissions: [ANTD_ADMIN_PERMISSIONS.EDIT_AUDIO, ANTD_ADMIN_PERMISSIONS.VIEW_USERS] });

// POST - 创建新音频
const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  subject: z.string().min(1),
  speaker: z.string().optional(),
  status: z.string().optional(),
  coverImage: z.string().optional(),
  filename: z.string().optional(),
  url: z.string().optional(),
  duration: z.number().optional(),
  filesize: z.number().optional(),
});

export const POST = withSecurityAndValidation(async (request: NextRequest, body: z.infer<typeof createSchema>) => {
  try {
    const db = getDatabase();
    const { title, description, subject, speaker, status = 'draft', coverImage, filename, url, duration, filesize } = body;

    // 创建音频记录
    const result = await db.query(`
      INSERT INTO audios (
        title, 
        description, 
        filename, 
        url, 
        coverImage, 
        duration, 
        size, 
        subject, 
        speaker, 
        upload_date, 
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
      RETURNING *
    `, [
      title, 
      description, 
      filename || `${title}.mp3`, 
      url || `/uploads/${title}.mp3`, 
      coverImage || null, 
      duration, 
      filesize, 
      subject, 
      speaker, 
      status
    ]);

    const newAudio = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        id: newAudio.id,
        title: newAudio.title,
        description: newAudio.description,
        filename: newAudio.filename,
        url: newAudio.url,
        coverImage: newAudio.coverImage,
        duration: newAudio.duration,
        filesize: newAudio.filesize,
        subject: newAudio.subject,
        speaker: newAudio.speaker,
        uploadDate: newAudio.upload_date,
        status: newAudio.status
      },
      message: '音频创建成功'
    });

  } catch (error) {
    logger.error('创建音频失败:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: '创建音频失败',
        details: error instanceof Error ? error.message : '未知错误'
      }
    }, { status: 500 });
  }
}, createSchema, { requireAuth: true, requiredPermissions: [ANTD_ADMIN_PERMISSIONS.EDIT_AUDIO], requireCSRF: true });