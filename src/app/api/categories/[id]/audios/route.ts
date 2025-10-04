import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { withSecurity } from '@/lib/secureApiWrapper';

// 按分类获取音频列表API端点
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const handler = withSecurity(async (req: NextRequest) => {
    const { id: categoryId } = await context.params;
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '8');
    const offset = parseInt(searchParams.get('offset') || '0');
  try {
    
    
    // 验证分类ID
    if (!categoryId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_CATEGORY_ID',
          message: '分类ID不能为空'
        }
      }, { status: 400 });
    }

    // 获取指定分类的音频列表
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
        AND (a.category_id = ? OR a.subcategory_id = ?)
      ORDER BY COALESCE(a.play_count, 0) DESC, a.upload_date DESC
      LIMIT ${Number.isFinite(limit) ? limit : 8} OFFSET ${Number.isFinite(offset) ? offset : 0}
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM audios a
      WHERE a.status = 'published' 
        AND (a.category_id = ? OR a.subcategory_id = ?)
    `;

    const [audioResult, countResult] = await Promise.all([
      db.query(query, [categoryId, categoryId]),
      db.query(countQuery, [categoryId, categoryId])
    ]);
    
    const audios = audioResult.rows.map(row => ({
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
      subcategoryName: row.subcategory_name
    }));

    const total = parseInt(countResult.rows[0]?.total || '0');

    return NextResponse.json({
      success: true,
      data: audios,
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
        }
      }
    });

  } catch (error) {
    console.error(`获取分类音频列表失败:`, error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'FETCH_CATEGORY_AUDIOS_FAILED',
        message: '获取分类音频列表失败',
        details: error instanceof Error ? error.message : '未知错误'
      }
    }, { status: 500 });
  }
  }, { requireAuth: false, enableRateLimit: true, allowedMethods: ['GET'] });
  return handler(request);
}
