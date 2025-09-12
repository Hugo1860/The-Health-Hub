import { NextRequest } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { AuthResponseBuilder } from '@/lib/auth-response-builder'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import bcrypt from 'bcryptjs'

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

// 修改密码
export const POST = authMiddleware.userWithRateLimit(
  async (request: NextRequest, context) => {
    try {
      const { currentPassword, newPassword } = await request.json()
      
      // 验证输入
      const errors: Record<string, string[]> = {}
      
      if (!currentPassword || typeof currentPassword !== 'string') {
        errors.currentPassword = ['请输入当前密码']
      }
      
      if (!newPassword || typeof newPassword !== 'string') {
        errors.newPassword = ['请输入新密码']
      } else if (newPassword.length < 6) {
        errors.newPassword = ['密码长度至少6个字符']
      } else if (newPassword.length > 100) {
        errors.newPassword = ['密码长度不能超过100个字符']
      }
      
      if (Object.keys(errors).length > 0) {
        return AuthResponseBuilder.validationError(
          '输入验证失败',
          errors
        )
      }
      
      const users = await getUsers()
      const userIndex = users.findIndex(u => u.id === context.user!.id)
      
      if (userIndex === -1) {
        return AuthResponseBuilder.customError(
          '用户不存在',
          'USER_NOT_FOUND',
          404
        )
      }
      
      const user = users[userIndex]
      
      // 验证当前密码
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password)
      if (!isCurrentPasswordValid) {
        return AuthResponseBuilder.customError(
          '当前密码错误',
          'INVALID_CURRENT_PASSWORD',
          400
        )
      }
      
      // 检查新密码是否与当前密码相同
      const isSamePassword = await bcrypt.compare(newPassword, user.password)
      if (isSamePassword) {
        return AuthResponseBuilder.customError(
          '新密码不能与当前密码相同',
          'SAME_PASSWORD',
          400
        )
      }
      
      // 加密新密码
      const hashedNewPassword = await bcrypt.hash(newPassword, 12)
      
      // 更新密码
      users[userIndex].password = hashedNewPassword
      
      await saveUsers(users)
      
      return AuthResponseBuilder.success({
        message: '密码修改成功'
      })
      
    } catch (error) {
      console.error('Change password error:', error)
      return AuthResponseBuilder.fromError(error)
    }
  },
  3, // 每分钟最多3次密码修改请求
  60000
)