import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import logger from '@/lib/logger'

const USERS_FILE = join(process.cwd(), 'data', 'users.json')

interface User {
  id: string
  username: string
  email: string
  password: string
  role: 'user' | 'admin'
  status: 'active' | 'inactive' | 'banned'
  createdAt: string
  lastLogin?: string
  preferences: {
    theme: 'light' | 'dark' | 'system'
    autoplay: boolean
    defaultPlaybackRate: number
    defaultVolume: number
  }
}

// 获取所有用户
async function getUsers(): Promise<User[]> {
  try {
    const data = await readFile(USERS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    return []
  }
}

// 保存用户
async function saveUsers(users: User[]): Promise<void> {
  await writeFile(USERS_FILE, JSON.stringify(users, null, 2))
}

// 检查管理员权限
async function checkAdminPermission(): Promise<boolean> {
  const session = await getServerSession(authOptions)
  return (session?.user as any)?.role === 'admin'
}

// 更新用户状态
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    if (!(await checkAdminPermission())) {
      return NextResponse.json(
        { error: '权限不足' },
        { status: 403 }
      )
    }

    const { status } = await request.json()

    if (!status || !['active', 'inactive', 'banned'].includes(status)) {
      return NextResponse.json(
        { error: '无效的状态类型' },
        { status: 400 }
      )
    }

    const users = await getUsers()
    const userIndex = users.findIndex(u => u.id === id)

    if (userIndex === -1) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }

    const session = await getServerSession(authOptions)
    
    // 防止管理员修改自己的状态
    if (session?.user?.id === id) {
      return NextResponse.json(
        { error: '不能修改自己的状态' },
        { status: 400 }
      )
    }

    // 更新用户状态
    users[userIndex].status = status
    await saveUsers(users)

    // 返回更新后的用户信息（不包含密码）
    const { password, ...userWithoutPassword } = users[userIndex]

    return NextResponse.json({
      message: '用户状态更新成功',
      user: userWithoutPassword
    })

  } catch (error) {
    logger.error('Update user status error:', error)
    return NextResponse.json(
      { error: '更新用户状态失败' },
      { status: 500 }
    )
  }
}