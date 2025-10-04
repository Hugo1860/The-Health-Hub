import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    logger.info('🔍 Database Debug API called');

    // 测试数据库连接
    const testQuery = 'SELECT 1 as test, NOW() as current_time';
    const testResult = await db.query(testQuery);

    // 获取用户数据
    const usersQuery = `
      SELECT
        id,
        username,
        email,
        role,
        status,
        created_at as createdAt,
        last_login as lastLogin
      FROM users
      ORDER BY created_at DESC
      LIMIT 5
    `;

    const usersResult = await db.query(usersQuery);

    // 获取表信息
    const tablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      ORDER BY table_name
    `;

    const tablesResult = await db.query(tablesQuery);

    logger.info('✅ 数据库测试成功');

    return NextResponse.json({
      success: true,
      debug: {
        database: {
          connection: 'success',
          testResult: testResult.rows[0],
          currentTime: testResult.rows[0]?.current_time
        },
        users: usersResult.rows,
        tables: tablesResult.rows.map((row: any) => row.table_name),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('❌ Database Debug API error:', error);

    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Database debug failed',
        details: error instanceof Error ? error.stack : undefined
      }
    }, { status: 500 });
  }
}
