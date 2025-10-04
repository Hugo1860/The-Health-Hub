import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// 精选推荐API端点
export async function GET(request: NextRequest) {
    try {
      const searchParams = request.nextUrl.searchParams;
      const limit = parseInt(searchParams.get('limit') || '4');
      
      // 获取精选推荐音频 - 基于播放量、收藏数、最近更新等综合指标
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
        ORDER BY 
          -- 优先级排序：播放次数、有封面的、有描述的、最近更新的
          COALESCE(a.play_count, 0) DESC,
          (CASE WHEN a.cover_image IS NOT NULL THEN 1 ELSE 0 END) DESC,
          (CASE WHEN a.description IS NOT NULL AND LENGTH(a.description) > 10 THEN 1 ELSE 0 END) DESC,
          a.upload_date DESC
        LIMIT ?
      `;

      const result = await db.query(query, [limit]);
      
      const recommendations = result.rows.map(row => ({
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
        // 添加推荐标签
        isRecommended: true,
        recommendationReason: '精选推荐'
      }));

      return NextResponse.json({
        success: true,
        data: recommendations,
        meta: {
          requestId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development'
        }
      });

    } catch (error) {
      console.error('获取推荐内容失败:', error);
      
      return NextResponse.json({
        success: false,
        error: {
          code: 'FETCH_RECOMMENDATIONS_FAILED',
          message: '获取推荐内容失败',
          details: error instanceof Error ? error.message : '未知错误'
        }
      }, { status: 500 });
    }
}
