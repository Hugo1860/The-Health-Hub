import { NextRequest, NextResponse } from 'next/server';

// 简单的测试路由，不依赖复杂的服务
export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Categories test API called');
    
    // 测试数据库连接
    const db = (await import('@/lib/db')).default;
    
    console.log('📡 Testing database connection...');
    const isConnected = db.isConnected();
    console.log('Database connected:', isConnected);
    
    // 简单查询测试
    console.log('📋 Testing simple query...');
    const result = await db.query('SELECT COUNT(*) as count FROM categories');
    const categoryCount = result.rows[0]?.count || 0;
    
    console.log('Category count:', categoryCount);
    
    // 检查表结构
    console.log('🏗️ Checking table structure...');
    const columnsResult = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'categories'
      ORDER BY ordinal_position
    `);
    
    const columns = columnsResult.rows.map(row => ({
      name: row.column_name,
      type: row.data_type
    }));
    
    console.log('Categories table columns:', columns);
    
    return NextResponse.json({
      success: true,
      message: 'Categories API test successful',
      data: {
        databaseConnected: isConnected,
        categoryCount: parseInt(categoryCount),
        tableColumns: columns,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Categories test API error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'TEST_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }
    }, { status: 500 });
  }
}