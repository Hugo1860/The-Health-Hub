// 音频管理 API

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { authMiddleware } from '@/lib/auth-middleware';

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
export const GET = authMiddleware.admin(async (request: NextRequest) => {
  try {
    const db = getDatabase();
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
    const search = url.searchParams.get('search') || '';
    const subject = url.searchParams.get('subject') || '';
    const status = url.searchParams.get('status') || '';

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    // 搜索条件
    if (search) {
      whereClause += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex + 1} OR speaker ILIKE $${paramIndex + 2})`;
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
        ""coverImage"",
        duration,
        filesize,
        subject,
        speaker,
        ""uploadDate"",
        status
      FROM audios 
      ${whereClause}
      ORDER BY ""uploadDate"" DESC
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
      url: row.url, coverImage: row.coverImage,
      duration: row.duration,
      filesize: row.filesize,
      subject: row.subject || '未分类',
      speaker: row.speaker, uploadDate: row.uploadDate,
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
    console.error('获取音频列表失败:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: '获取音频列表失败',
        details: error instanceof Error ? error.message : '未知错误'
      }
    }, { status: 500 });
  }
});

// POST - 创建新音频
export const POST = authMiddleware.admin(async (request: NextRequest) => {
  try {
    const db = getDatabase();
    const body = await request.json();
    const { 
      title, 
      description, 
      subject, 
      speaker, 
      status = 'draft',
      coverImage,
      filename,
      url,
      duration,
      filesize
    } = body;

    // 验证必填字段
    if (!title || !subject) {
      return NextResponse.json({
        success: false,
        error: { message: '标题和分类是必填字段' }
      }, { status: 400 });
    }

    // 创建音频记录
    const result = await db.query(`
      INSERT INTO audios (
        title, 
        description, 
        filename, 
        url, 
        ""coverImage"", 
        duration, 
        filesize, 
        subject, 
        speaker, 
        ""uploadDate"", 
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, $10)
      RETURNING *
    `, [
      title, 
      description, 
      filename || `${title}.mp3`, 
      url || `/uploads/${title}.mp3`, 
      "coverImage", 
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
        url: newAudio.url, coverImage: newAudio.coverImage,
        duration: newAudio.duration,
        filesize: newAudio.filesize,
        subject: newAudio.subject,
        speaker: newAudio.speaker, uploadDate: newAudio.uploadDate,
        status: newAudio.status
      },
      message: '音频创建成功'
    });

  } catch (error) {
    console.error('创建音频失败:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: '创建音频失败',
        details: error instanceof Error ? error.message : '未知错误'
      }
    }, { status: 500 });
  }
});