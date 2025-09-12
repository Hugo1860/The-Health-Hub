import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// 测试分类数据API端点
export async function GET(request: NextRequest) {
  try {
    // 获取所有分类
    const categoriesQuery = `
      SELECT id, name, description, color, icon, parent_id, level, sort_order, is_active
      FROM categories 
      ORDER BY sort_order ASC, name ASC
    `;

    const categoriesResult = await db.query(categoriesQuery);
    
    // 获取音频数据示例
    const audiosQuery = `
      SELECT 
        a.id,
        a.title,
        a.category_id,
        a.subcategory_id,
        a.upload_date,
        c1.name as category_name,
        c1.color as category_color,
        c1.icon as category_icon
      FROM audios a
      LEFT JOIN categories c1 ON a.category_id = c1.id
      WHERE a.status = 'published'
      ORDER BY a.upload_date DESC
      LIMIT 10
    `;

    const audiosResult = await db.query(audiosQuery);

    return NextResponse.json({
      success: true,
      data: {
        categories: categoriesResult.rows,
        audios: audiosResult.rows,
        categoriesCount: categoriesResult.rows.length,
        audiosCount: audiosResult.rows.length
      },
      meta: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });

  } catch (error) {
    console.error('测试分类数据失败:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'TEST_CATEGORIES_DATA_FAILED',
        message: '测试分类数据失败',
        details: error instanceof Error ? error.message : '未知错误'
      }
    }, { status: 500 });
  }
}
