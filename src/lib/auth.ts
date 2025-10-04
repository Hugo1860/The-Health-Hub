import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import type { NextAuthOptions } from 'next-auth'
import db from './db'
interface User {
  id: string
  username: string
  email: string
  password: string
  role: 'user' | 'admin'
  status: 'active' | 'inactive' | 'banned'
  createdAt: string
  lastLoginAt?: string
  preferences: {
    theme: 'light' | 'dark' | 'system'
    autoplay: boolean
    defaultPlaybackRate: number
    defaultVolume: number
  }
}

// 根据邮箱查找用户（仅 MySQL，避免依赖可变列名）
async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const query = `
      SELECT
        id,
        username,
        email,
        password,
        role,
        status,
        preferences,
        created_at,
        last_login
      FROM users
      WHERE email = ?
      LIMIT 1
    `

    const result = await db.query(query, [email])

    if (result.rows && result.rows.length > 0) {
      const user = result.rows[0] as any
      const mapped: User = {
        id: user.id,
        username: user.username,
        email: user.email,
        password: user.password,
        role: user.role,
        status: user.status,
        // createdAt/lastLoginAt 可能不存在，保持兼容
        createdAt: user.createdAt || user.created_at || new Date(0).toISOString(),
        lastLoginAt: user.lastLoginAt || user.last_login,
        // preferences 处理 JSON 字段
        preferences: user.preferences
          ? typeof user.preferences === 'string'
            ? JSON.parse(user.preferences)
            : user.preferences
          : {
              theme: 'light',
              autoplay: false,
              defaultPlaybackRate: 1,
              defaultVolume: 0.8
            }
      }
      return mapped
    }

    return null
  } catch (error) {
    console.error('❌ 数据库查询用户失败:', error)
    return null
  }
}

// 更新用户最后登录时间（仅 MySQL，兼容不同列名）
async function updateLastLogin(userId: string): Promise<void> {
  try {
    // 优先尝试驼峰
    await db.query(
      `UPDATE users SET lastLoginAt = CURRENT_TIMESTAMP WHERE id = ?`,
      [userId]
    )
  } catch (error) {
    // 回退尝试下划线
    try {
      await db.query(
        `UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?`,
        [userId]
      )
    } catch (e2) {
      console.error('❌ 更新用户最后登录时间失败:', error, e2)
    }
  }
}

// 验证用户凭据
async function verifyCredentials(email: string, password: string): Promise<User | null> {
  // 降低日志噪音，仅在调试时启用
  if (process.env.DEBUG_AUTH === '1') {
    console.log('Verifying credentials for:', email)
  }
  const user = await getUserByEmail(email)
  if (!user) {
    if (process.env.DEBUG_AUTH === '1') {
      console.log('User not found:', email)
    }
    return null
  }
  
  // 检查用户状态
  if (user.status === 'banned') {
    if (process.env.DEBUG_AUTH === '1') {
      console.log('User is banned:', email)
    }
    return null
  }
  
  if (user.status === 'inactive') {
    if (process.env.DEBUG_AUTH === '1') {
      console.log('User is inactive:', email)
    }
    return null
  }
  
  if (process.env.DEBUG_AUTH === '1') {
    console.log('User found:', user.email, 'Role:', user.role, 'Status:', user.status)
  }
  const isValid = await bcrypt.compare(password, user.password)
  if (process.env.DEBUG_AUTH === '1') {
    console.log('Password valid:', isValid)
  }
  
  if (isValid) {
    // 更新最后登录时间
    await updateLastLogin(user.id)
    return user
  }
  
  return null
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const user = await verifyCredentials(credentials.email, credentials.password)
          
          if (user) {
            if (process.env.DEBUG_AUTH === '1') {
              console.log('✅ NextAuth用户验证成功:', {
                id: user.id,
                email: user.email,
                role: user.role,
                status: user.status
              })
            }
            return {
              id: user.id,
              email: user.email,
              name: user.username,
              role: user.role,
              status: user.status
            }
          }
          
          if (process.env.DEBUG_AUTH === '1') {
            console.log('❌ NextAuth用户验证失败:', credentials.email)
          }
          return null
        } catch (error) {
          console.error('❌ NextAuth认证错误:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7天 (604800秒)
    updateAge: 24 * 60 * 60, // 每24小时更新一次 session
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      // 登录时更新 token
      if (user) {
        if (process.env.DEBUG_AUTH === '1') {
          console.log('🔐 JWT回调 - 用户信息:', user)
        }
        token.role = (user as any).role
        token.status = (user as any).status
        token.id = user.id
      }
      
      // 刷新时保持 token 信息
      if (trigger === 'update') {
        if (process.env.DEBUG_AUTH === '1') {
          console.log('🔄 JWT更新 - 保持Token信息')
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        if (process.env.DEBUG_AUTH === '1') {
          console.log('📊 Session回调 - Token信息:', token)
        }
        session.user.id = token.id as string || token.sub!
        ;(session.user as any).role = token.role as string
        ;(session.user as any).status = token.status as string
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin'
  },
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key-here',
  debug: process.env.NODE_ENV === 'development'
}