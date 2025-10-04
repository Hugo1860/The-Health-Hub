import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    logger.info('🔍 Debug Audio API called');
    
    const query = `
      SELECT 
        a.id,
        a.title,
        a.description,
        a.filename,
        a.url,
        a.coverImage AS cover_image,
        a.duration,
        a.size as filesize,
        a.subject,
        a.category_id,
        a.subcategory_id,
        a.speaker,
        a.uploadDate AS upload_date,
        COALESCE(a.status, 'draft') as status,
        c1.name as category_name,
        c1.color as category_color,
        c1.icon as category_icon,
        c2.name as subcategory_name
      FROM audios a
      LEFT JOIN categories c1 ON a.category_id = c1.id
      LEFT JOIN categories c2 ON a.subcategory_id = c2.id
      ORDER BY a.uploadDate DESC
      LIMIT 10
    `;
    
    logger.debug('📊 执行数据库查询...');
    const result = await db.query(query);
    logger.info(`✅ 查询成功，找到 ${result.rows.length} 条音频记录`);
    
    const audios = result.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      filename: row.filename,
      url: row.url,
      coverImage: row.cover_image,
      duration: row.duration,
      filesize: row.filesize,
      subject: row.subject,
      categoryId: row.category_id,
      subcategoryId: row.subcategory_id,
      speaker: row.speaker,
      uploadDate: row.upload_date,
      status: row.status || 'draft',
      // 分类信息
      category: row.category_name ? {
        id: row.category_id,
        name: row.category_name,
        color: row.category_color,
        icon: row.category_icon
      } : undefined,
      subcategory: row.subcategory_name ? {
        id: row.subcategory_id,
        name: row.subcategory_name
      } : undefined
    }));

    logger.debug('🎯 返回音频数据:', { count: audios.length });

    return NextResponse.json({
      success: true,
      audios,
      debug: {
        totalRows: result.rows.length,
        query: query.substring(0, 100) + '...',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('❌ Debug Audio API error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Debug audio failed'
      }
    }, { status: 500 });
  }
}
