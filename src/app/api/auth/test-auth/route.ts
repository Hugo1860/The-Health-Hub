import { getServerSession } from 'next-auth/next'
import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

const USERS_FILE = join(process.cwd(), 'data', 'users.json')

export async function GET(request: NextRequest) {
  try {
    // 读取用户数据
    const userData = await readFile(USERS_FILE, 'utf-8')
    const users = JSON.parse(userData)
    
    // 查找管理员用户
    const adminUser = users.find((user: any) => user.role === 'admin')
    
    return NextResponse.json({
      success: true,
      message: '认证测试API',
      data: {
        usersFileExists: true,
        totalUsers: users.length,
        adminUser: adminUser ? {
          id: adminUser.id,
          username: adminUser.username,
          email: adminUser.email,
          role: adminUser.role,
          hasPassword: !!adminUser.password
        } : null,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('认证测试错误:', error)
    return NextResponse.json({
      success: false,
      error: '读取用户数据失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 