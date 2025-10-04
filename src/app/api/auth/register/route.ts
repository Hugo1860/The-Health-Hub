import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { withSecurity } from '@/lib/secureApiWrapper'
import { z } from 'zod'
import { getDatabase } from '@/lib/database'
import { userRegistrationSchema } from '@/lib/validation'
import { sanitizeString } from '@/lib/adminApiUtils'

export const POST = withSecurity(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const parseResult = userRegistrationSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json({
        error: '输入数据验证失败',
        details: parseResult.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }))
      }, { status: 400 })
    }

    const db = getDatabase()
    const username = sanitizeString(parseResult.data.username)
    const email = sanitizeString(parseResult.data.email)
    const password = parseResult.data.password

    const existing = await db.query(
      'SELECT id FROM users WHERE email = ? OR (username = ? AND username IS NOT NULL) LIMIT 1',
      [email, username]
    )
    const exists = existing.rows && existing.rows.length > 0
    if (exists) {
      return NextResponse.json({ error: '用户名或邮箱已存在' }, { status: 409 })
    }

    const id = crypto.randomUUID()
    const hashed = await bcrypt.hash(password, 12)
    const defaultPrefs = JSON.stringify({ theme: 'light', autoplay: false, defaultPlaybackRate: 1, defaultVolume: 0.8 })

    await db.query(
      `
      INSERT INTO users (id, email, username, password, role, status, created_at, updated_at, preferences)
      VALUES (?, ?, ?, ?, 'user', 'active', NOW(), NOW(), ?)
      `,
      [id, email, username, hashed, defaultPrefs]
    )

    return NextResponse.json({
      message: '用户注册成功',
      user: { id, email, username, role: 'user', status: 'active' }
    }, { status: 201 })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: '注册失败，请稍后重试' }, { status: 500 })
  }
}, { 
  requireAuth: false, // 明确指定不需要认证
  enableRateLimit: true, 
  rateLimitMax: 20, 
  rateLimitWindow: 60000, 
  allowedMethods: ['POST'] 
})