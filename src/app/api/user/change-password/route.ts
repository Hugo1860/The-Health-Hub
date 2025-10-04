import { NextRequest } from 'next/server'
import { withSecurity } from '@/lib/secureApiWrapper'
import { AuthResponseBuilder } from '@/lib/auth-response-builder'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { getDatabase } from '@/lib/database'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6).max(100),
  newPassword: z.string().min(8).max(128).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '密码必须包含大小写字母和数字')
})

// 修改密码（MySQL）
export const POST = withSecurity(
  async (request: NextRequest) => {
    try {
      const body = await request.json()
      const parsed = changePasswordSchema.safeParse(body)
      if (!parsed.success) {
        const errors: Record<string, string[]> = {}
        for (const issue of parsed.error.issues) {
          const key = issue.path.join('.') || 'root'
          errors[key] = [issue.message]
        }
        return AuthResponseBuilder.validationError('输入验证失败', errors)
      }

      const db = getDatabase()
      const userId = request.headers.get('x-user-id') as string
      const { currentPassword, newPassword } = parsed.data

      const result = await db.query('SELECT id, password FROM users WHERE id = ? LIMIT 1', [userId])
      const user = result.rows?.[0]
      if (!user) {
        return AuthResponseBuilder.customError('用户不存在', 'USER_NOT_FOUND', 404)
      }

      const isCurrentValid = await bcrypt.compare(currentPassword, user.password)
      if (!isCurrentValid) {
        return AuthResponseBuilder.customError('当前密码错误', 'INVALID_CURRENT_PASSWORD', 400)
      }

      const isSame = await bcrypt.compare(newPassword, user.password)
      if (isSame) {
        return AuthResponseBuilder.customError('新密码不能与当前密码相同', 'SAME_PASSWORD', 400)
      }

      const hashed = await bcrypt.hash(newPassword, 12)
      await db.query('UPDATE users SET password = ?, updatedAt = NOW() WHERE id = ?', [hashed, userId])

      return AuthResponseBuilder.success({ message: '密码修改成功' })
    } catch (error) {
      console.error('Change password error:', error)
      return AuthResponseBuilder.fromError(error)
    }
  }, { requireAuth: true, requireCSRF: true, enableRateLimit: true, rateLimitMax: 3, rateLimitWindow: 60000, allowedMethods: ['POST'] }
)