import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// 音频排行榜API端点 - 按播放次数排序
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const period = searchParams.get('period') || 'all'; // all, week, month
    
    let dateFilter = '';
    if (period === 'week') {
      dateFilter = 'AND a.upload_date >= NOW() - INTERVAL 7 DAY';
    } else if (period === 'month') {
      dateFilter = 'AND a.upload_date >= NOW() - INTERVAL 30 DAY';
    }

    // 获取播放次数排行榜
    const query = `
      SELECT 
        a.id,
        a.title,
        a.description,
        a.url,
        a.filename,
        a.upload_date,
        a.category_id,
        a.subcategory_id,
        a.tags,
        a.speaker,
        a.recording_date,
        a.duration,
        a.cover_image,
        a.status,
        COALESCE(a.play_count, 0) as play_count,
        c1.name as category_name,
        c1.color as category_color,
        c1.icon as category_icon,
        c2.name as subcategory_name
      FROM audios a
      LEFT JOIN categories c1 ON a.category_id = c1.id
      LEFT JOIN categories c2 ON a.subcategory_id = c2.id
      WHERE a.status = 'published' 
        ${dateFilter}
      ORDER BY COALESCE(a.play_count, 0) DESC, a.upload_date DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM audios a
      WHERE a.status = 'published' 
        ${dateFilter}
    `;

    const [audioResult, countResult] = await Promise.all([
      db.query(query, [limit, offset]),
      db.query(countQuery)
    ]);
    
    const rankings = audioResult.rows.map((row, idx) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      url: row.url,
      filename: row.filename,
      uploadDate: row.upload_date,
      categoryId: row.category_id,
      subcategoryId: row.subcategory_id,
      tags: row.tags,
      speaker: row.speaker,
      recordingDate: row.recording_date,
      duration: row.duration,
      coverImage: row.cover_image,
      status: row.status,
      playCount: parseInt(row.play_count) || 0,
      categoryName: row.category_name,
      categoryColor: row.category_color,
      categoryIcon: row.category_icon,
      subcategoryName: row.subcategory_name,
      rank: offset + idx + 1
    }));

    const total = parseInt(countResult.rows[0]?.total || '0');

    return NextResponse.json({
      success: true,
      data: rankings,
      meta: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        },
        period
      }
    });

  } catch (error) {
    console.error('获取排行榜失败:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'FETCH_RANKINGS_FAILED',
        message: '获取排行榜失败',
        details: error instanceof Error ? error.message : '未知错误'
      }
    }, { status: 500 });
  }
}
