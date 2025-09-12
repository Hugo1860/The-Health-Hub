import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing database connection...');
    
    // 测试基本连接
    const healthCheck = await db.healthCheck();
    console.log('Health check result:', healthCheck);
    
    // 测试简单查询
    const result = await db.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('Test query result:', result.rows[0]);
    
    // 检查表是否存在
    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    console.log('Available tables:', tables);
    
    // 检查audios表结构
    let audioTableInfo = null;
    if (tables.includes('audios')) {
      const audioStructure = await db.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'audios' 
        ORDER BY ordinal_position
      `);
      audioTableInfo = audioStructure.rows;
    }
    
    // 检查categories表结构
    let categoriesTableInfo = null;
    if (tables.includes('categories')) {
      const categoriesStructure = await db.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'categories' 
        ORDER BY ordinal_position
      `);
      categoriesTableInfo = categoriesStructure.rows;
    }
    
    return NextResponse.json({
      success: true,
      data: {
        connected: true,
        healthy: healthCheck,
        currentTime: result.rows[0]?.current_time,
        postgresVersion: result.rows[0]?.pg_version,
        tables,
        audioTableInfo,
        categoriesTableInfo,
        poolStats: db.getPoolStats()
      }
    });
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown database error',
        stack: error instanceof Error ? error.stack : undefined
      }
    }, { status: 500 });
  }
}