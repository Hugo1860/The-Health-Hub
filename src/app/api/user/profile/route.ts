import { NextRequest } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { AuthResponseBuilder } from '@/lib/auth-response-builder'
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
export const GET = authMiddleware.user(
  async (request: NextRequest, context) => {
    try {
      const users = await getUsers()
      const user = users.find(u => u.id === context.user!.id)
      
      if (!user) {
        return AuthResponseBuilder.customError(
          '用户不存在',
          'USER_NOT_FOUND',
          404
        )
      }
      
      // 更新最后登录时间（如果超过1小时没有更新）
      const now = new Date()
      const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      
      if (!lastLogin || lastLogin < oneHourAgo) {
        const userIndex = users.findIndex(u => u.id === context.user!.id)
        if (userIndex !== -1) {
          users[userIndex].lastLogin = now.toISOString()
          await saveUsers(users)
          user.lastLogin = now.toISOString()
        }
      }
      
      // 返回用户信息（不包含密码）
      const { password: _, ...userWithoutPassword } = user
      
      return AuthResponseBuilder.success({ user: userWithoutPassword })
      
    } catch (error) {
      console.error('Get profile error:', error)
      return AuthResponseBuilder.fromError(error)
    }
  }
)

// 更新用户信息
export const PUT = authMiddleware.userWithRateLimit(
  async (request: NextRequest, context) => {
    try {
      const { username, preferences } = await request.json()
      
      const users = await getUsers()
      const userIndex = users.findIndex(u => u.id === context.user!.id)
      
      if (userIndex === -1) {
        return AuthResponseBuilder.customError(
          '用户不存在',
          'USER_NOT_FOUND',
          404
        )
      }
      
      // 验证输入
      const errors: Record<string, string[]> = {}
      
      if (username !== undefined) {
        if (typeof username !== 'string' || username.trim().length === 0) {
          errors.username = ['用户名不能为空']
        } else if (username.length < 2 || username.length > 50) {
          errors.username = ['用户名长度必须在2-50个字符之间']
        } else {
          // 检查用户名是否已被其他用户使用
          const existingUser = users.find(u => u.username === username && u.id !== context.user!.id)
          if (existingUser) {
            errors.username = ['用户名已存在']
          }
        }
      }
      
      if (Object.keys(errors).length > 0) {
        return AuthResponseBuilder.validationError(
          '输入验证失败',
          errors
        )
      }
      
      // 更新用户信息
      if (username) {
        users[userIndex].username = username.trim()
      }
      
      if (preferences) {
        users[userIndex].preferences = { ...users[userIndex].preferences, ...preferences }
      }
      
      await saveUsers(users)
      
      // 返回更新后的用户信息（不包含密码）
      const { password: _, ...userWithoutPassword } = users[userIndex]
      
      return AuthResponseBuilder.success({
        message: '用户信息更新成功',
        user: userWithoutPassword
      })
      
    } catch (error) {
      console.error('Update profile error:', error)
      return AuthResponseBuilder.fromError(error)
    }
  },
  5, // 每分钟最多5个更新请求
  60000
)