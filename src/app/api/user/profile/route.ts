import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

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

// 获取用户信息
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }
    
    const users = await getUsers()
    const user = users.find(u => u.id === session.user.id)
    
    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }
    
    // 更新最后登录时间（如果超过1小时没有更新）
    const now = new Date()
    const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    
    if (!lastLogin || lastLogin < oneHourAgo) {
      const userIndex = users.findIndex(u => u.id === session.user.id)
      if (userIndex !== -1) {
        users[userIndex].lastLogin = now.toISOString()
        await saveUsers(users)
        user.lastLogin = now.toISOString()
      }
    }
    
    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = user
    
    return NextResponse.json({ user: userWithoutPassword })
    
  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json(
      { error: '获取用户信息失败' },
      { status: 500 }
    )
  }
}

// 更新用户信息
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }
    
    const { username, preferences } = await request.json()
    
    const users = await getUsers()
    const userIndex = users.findIndex(u => u.id === session.user.id)
    
    if (userIndex === -1) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }
    
    // 更新用户信息
    if (username) {
      // 检查用户名是否已被其他用户使用
      const existingUser = users.find(u => u.username === username && u.id !== session.user.id)
      if (existingUser) {
        return NextResponse.json(
          { error: '用户名已存在' },
          { status: 409 }
        )
      }
      users[userIndex].username = username
    }
    
    if (preferences) {
      users[userIndex].preferences = { ...users[userIndex].preferences, ...preferences }
    }
    
    await saveUsers(users)
    
    // 返回更新后的用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = users[userIndex]
    
    return NextResponse.json({
      message: '用户信息更新成功',
      user: userWithoutPassword
    })
    
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      { error: '更新用户信息失败' },
      { status: 500 }
    )
  }
}