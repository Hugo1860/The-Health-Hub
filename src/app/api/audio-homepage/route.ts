import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// 主页专用的精简音频数据类型
type HomepageAudio = {
  id: string;
  title: string;
  description?: string;
  uploadDate: string;
  subject?: string;
  coverImage?: string;
  categoryId?: string;
  subcategoryId?: string;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '8'), 20); // 最多20个

    console.log('🏠 主页API: 获取精简音频数据...');

    // 优化的SQL查询，只获取必要字段
    const sql = `
      SELECT 
        id,
        title,
        SUBSTR(description, 1, 100) as description, -- 只取前100个字符
        upload_date,
        subject,
        cover_image,
        category_id,
        subcategory_id
      FROM audios 
      WHERE status = 'published' OR status IS NULL
      ORDER BY upload_date DESC 
      LIMIT ?
    `;

    // 兼容不同数据库类型
    let rows: any[];
    
      try {
        // 统一通过适配器查询
        const result = await db.query(sql, [limit]);
        rows = result.rows || (result as any);
      } catch (err) {
        console.error('数据库查询失败', err);
        throw new Error('数据库查询失败');
      }

    // 转换数据格式
    const audios: HomepageAudio[] = rows.map(row => ({
      id: row.id,
      title: row.title || '未命名音频',
      description: row.description || '',
      uploadDate: row.upload_date || new Date().toISOString(),
      subject: row.subject || '',
      coverImage: row.cover_image || '',
      categoryId: row.category_id || '',
      subcategoryId: row.subcategory_id || ''
    }));

    console.log(`✅ 主页API: 返回 ${audios.length} 个音频`);

    return NextResponse.json({
      success: true,
      data: audios,
      total: audios.length,
      message: '主页数据获取成功'
    });

  } catch (error) {
    console.error('❌ 主页API错误:', error);
    
    return NextResponse.json({
      success: false,
      data: [],
      total: 0,
      error: {
        code: 'HOMEPAGE_API_ERROR',
        message: '主页数据获取失败'
      }
    }, { status: 500 });
  }
}
