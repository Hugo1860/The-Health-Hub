import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('=== 测试数据库连接 ===');

    const db = getDatabase();

    // 测试基础查询
    const audioResult = await db.query('SELECT COUNT(*) as count FROM audios');
    const userResult = await db.query('SELECT COUNT(*) as count FROM users');

    const stats = {
      totalAudios: Number(audioResult.rows[0]?.count) || 0,
      totalUsers: Number(userResult.rows[0]?.count) || 0,
      databaseType: 'MySQL',
      timestamp: new Date().toISOString()
    };

    console.log('✅ 数据库查询成功:', stats);

    return NextResponse.json({
      success: true,
      message: '数据库连接测试成功',
      data: stats
    });

  } catch (error) {
    console.error('❌ 数据库查询失败:', error);
    return NextResponse.json({
      success: false,
      message: '数据库连接测试失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}
