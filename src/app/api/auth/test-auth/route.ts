import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const db = getDatabase()
    const countResult = await db.query('SELECT COUNT(*) as total FROM users')
    const totalUsers = Number(countResult.rows?.[0]?.total || 0)

    const adminResult = await db.query(
      'SELECT id, email, username, role FROM users WHERE role = ? LIMIT 1',
      ['admin']
    )
    const adminUser = adminResult.rows?.[0] || null

    return NextResponse.json({
      success: true,
      message: '认证测试API',
      data: {
        totalUsers,
        adminUser,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('认证测试错误:', error)
    return NextResponse.json({ success: false, error: '数据库查询失败' }, { status: 500 })
  }
}