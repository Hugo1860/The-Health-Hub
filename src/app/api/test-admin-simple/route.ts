import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 测试管理员API - 开始')
    
    // 测试数据库连接
    const db = getDatabase()
    const healthCheck = await db.healthCheck()
    console.log('📊 数据库健康检查:', healthCheck)
    
    if (!healthCheck) {
      return NextResponse.json({
        success: false,
        error: '数据库连接失败'
      }, { status: 500 })
    }
    
    // 获取基础统计
    const audioResult = await db.query('SELECT COUNT(*) as count FROM audios')
    const userResult = await db.query('SELECT COUNT(*) as count FROM users')
    
    const stats = {
      totalAudios: Number(audioResult.rows[0]?.count) || 0,
      totalUsers: Number(userResult.rows[0]?.count) || 0,
      timestamp: new Date().toISOString()
    }
    
    console.log('📈 统计数据:', stats)
    
    return NextResponse.json({
      success: true,
      data: stats,
      message: '测试成功'
    })
    
  } catch (error) {
    console.error('❌ 测试管理员API失败:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}