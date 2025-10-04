import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

// 仅在开发环境下可用的数据库查询API
export async function POST(request: NextRequest) {
  // 仅在开发环境下可用
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({
      success: false,
      error: { message: '此API仅在开发环境下可用' }
    }, { status: 403 });
  }

  try {
    const { query, params = [] } = await request.json();
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json({
        success: false,
        error: { message: '缺少查询语句' }
      }, { status: 400 });
    }

    // 只允许SELECT查询，防止误操作
    if (!query.trim().toLowerCase().startsWith('select')) {
      return NextResponse.json({
        success: false,
        error: { message: '只允许SELECT查询' }
      }, { status: 400 });
    }

    const db = getDatabase();
    const result = await db.query(query, params);
    
    return NextResponse.json({
      success: true,
      data: result.rows,
      rowCount: result.rowCount
    });

  } catch (error) {
    console.error('Database query error:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: '数据库查询失败',
        details: error instanceof Error ? error.message : '未知错误'
      }
    }, { status: 500 });
  }
}