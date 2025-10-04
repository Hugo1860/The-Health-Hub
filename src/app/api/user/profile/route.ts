import { NextRequest } from 'next/server'
import { withSecurity } from '@/lib/secureApiWrapper'
import { AuthResponseBuilder } from '@/lib/auth-response-builder'
import { z } from 'zod'
import { getDatabase } from '@/lib/database'
import { sanitizeString } from '@/lib/adminApiUtils'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// 获取用户信息（MySQL）
export const GET = withSecurity(
  async (request: NextRequest) => {
    try {
      const db = getDatabase()
      let userId = request.headers.get('x-user-id') as string | null
      if (!userId) {
        try {
          const session = await getServerSession(authOptions)
          userId = (session?.user?.id as string) || null
        } catch {}
      }
      if (!userId) {
        return AuthResponseBuilder.customError('未授权访问', 'UNAUTHORIZED', 401)
      }

      const result = await db.query(
        'SELECT id, email, username, role, status, created_at, last_login, preferences FROM users WHERE id = ? LIMIT 1',
        [userId]
      )
      const user = result.rows?.[0]
      
      // 转换字段名为驼峰命名
      if (user) {
        user.createdAt = user.created_at;
        user.lastLoginAt = user.last_login;
        delete user.created_at;
        delete user.last_login;
      }

      if (!user) {
        return AuthResponseBuilder.customError('用户不存在', 'USER_NOT_FOUND', 404)
      }

      // 返回用户信息（不包含密码）
      return AuthResponseBuilder.success({ user })
    } catch (error) {
      console.error('Get profile error:', error)
      return AuthResponseBuilder.fromError(error instanceof Error ? error : String(error))
    }
  }, { requireAuth: true, enableRateLimit: true })

// 更新用户信息（MySQL）
const updateProfileSchema = z.object({
  username: z.string().min(2).max(50).optional(),
  preferences: z.any().optional()
})

export const PUT = withSecurity(
  async (request: NextRequest) => {
    try {
      const db = getDatabase()
      const userId = request.headers.get('x-user-id') as string
      const body = await request.json()
      const parsed = updateProfileSchema.safeParse(body)
      if (!parsed.success) {
        const errors: Record<string, string[]> = {}
        for (const issue of parsed.error.issues) {
          const key = issue.path.join('.') || 'root'
          errors[key] = [issue.message]
        }
        return AuthResponseBuilder.validationError('输入验证失败', errors)
      }

      const { username, preferences } = parsed.data

      if (username) {
        const uname = sanitizeString(username)
        // 冲突检测
        const conflict = await db.query('SELECT id FROM users WHERE username = ? AND id != ? LIMIT 1', [uname, userId])
        if (conflict.rows?.length) {
          return AuthResponseBuilder.validationError('输入验证失败', { username: ['用户名已存在'] })
        }
        await db.query('UPDATE users SET username = ? WHERE id = ?', [uname, userId])
      }

      if (preferences) {
        await db.query('UPDATE users SET preferences = ? WHERE id = ?', [JSON.stringify(preferences), userId])
      }

      const after = await db.query('SELECT id, email, username, role, status, created_at, last_login, preferences FROM users WHERE id = ? LIMIT 1', [userId])
      const user = after.rows?.[0]
      
      // 转换字段名为驼峰命名
      if (user) {
        user.createdAt = user.created_at;
        user.lastLoginAt = user.last_login;
        delete user.created_at;
        delete user.last_login;
      }

      return AuthResponseBuilder.success({ message: '用户信息更新成功', user })
    } catch (error) {
      console.error('Update profile error:', error)
      return AuthResponseBuilder.fromError(error instanceof Error ? error : String(error))
    }
  }, { requireAuth: true, requireCSRF: true, enableRateLimit: true, rateLimitMax: 5, rateLimitWindow: 60000, allowedMethods: ['PUT'] })