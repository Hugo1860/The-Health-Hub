import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET() {
  try {
    const db = getDatabase();
    
    // 测试数据库连接
    const result = await db.query('SELECT 1 as test');
    
    return NextResponse.json({
      success: true,
      message: '数据库连接正常',
      data: result.rows
    });
  } catch (error) {
    console.error('数据库测试失败:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : '数据库连接失败'
      }
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { categoryId } = await request.json();
    
    if (!categoryId) {
      return NextResponse.json({
        success: false,
        error: { message: '缺少分类ID' }
      }, { status: 400 });
    }

    const db = getDatabase();
    
    // 检查分类是否存在
    const checkResult = await db.query(
      'SELECT id, name, level, parent_id, audio_count FROM categories WHERE id = $1',
      [categoryId]
    );
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: { message: '分类不存在' }
      }, { status: 404 });
    }

    const category = checkResult.rows[0];
    
    // 检查是否有子分类
    const childrenResult = await db.query(
      'SELECT COUNT(*) as count FROM categories WHERE parent_id = $1',
      [categoryId]
    );
    
    const hasChildren = parseInt(childrenResult.rows[0].count) > 0;
    const hasAudios = (category.audio_count || 0) > 0;
    
    return NextResponse.json({
      success: true,
      data: {
        category,
        hasChildren,
        hasAudios,
        canDelete: !hasChildren && !hasAudios
      }
    });
  } catch (error) {
    console.error('删除检查失败:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : '检查失败'
      }
    }, { status: 500 });
  }
}