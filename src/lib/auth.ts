import CredentialsProvider from 'next-auth/providers/credentials'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import bcrypt from 'bcryptjs'
import type { NextAuthOptions } from 'next-auth'

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

// 确保用户文件存在
async function ensureUsersFile() {
  try {
    await readFile(USERS_FILE, 'utf-8')
  } catch (error) {
    // 如果文件不存在，创建默认的管理员用户
    const defaultAdmin: User = {
      id: 'admin-1',
      username: 'admin',
      email: 'admin@example.com',
      password: await bcrypt.hash('admin123', 12),
      role: 'admin',
      status: 'active',
      createdAt: new Date().toISOString(),
      preferences: {
        theme: 'light',
        autoplay: false,
        defaultPlaybackRate: 1,
        defaultVolume: 0.8
      }
    }
    
    await writeFile(USERS_FILE, JSON.stringify([defaultAdmin], null, 2))
  }
}

// 获取所有用户
async function getUsers(): Promise<User[]> {
  await ensureUsersFile()
  const data = await readFile(USERS_FILE, 'utf-8')
  return JSON.parse(data)
}

// 根据邮箱查找用户
async function getUserByEmail(email: string): Promise<User | null> {
  const users = await getUsers()
  return users.find(user => user.email === email) || null
}

// 更新用户最后登录时间
async function updateLastLogin(userId: string): Promise<void> {
  const users = await getUsers()
  const userIndex = users.findIndex(user => user.id === userId)
  
  if (userIndex !== -1) {
    users[userIndex].lastLogin = new Date().toISOString()
    await writeFile(USERS_FILE, JSON.stringify(users, null, 2))
  }
}

// 验证用户凭据
async function verifyCredentials(email: string, password: string): Promise<User | null> {
  console.log('Verifying credentials for:', email)
  const user = await getUserByEmail(email)
  if (!user) {
    console.log('User not found:', email)
    return null
  }
  
  // 检查用户状态
  if (user.status === 'banned') {
    console.log('User is banned:', email)
    return null
  }
  
  if (user.status === 'inactive') {
    console.log('User is inactive:', email)
    return null
  }
  
  console.log('User found:', user.email, 'Role:', user.role, 'Status:', user.status)
  const isValid = await bcrypt.compare(password, user.password)
  console.log('Password valid:', isValid)
  
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
            return {
              id: user.id,
              email: user.email,
              name: user.username,
              role: user.role,
              status: user.status
            }
          }
          
          return null
        } catch (error) {
          console.error('Authentication error:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.status = (user as any).status
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
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
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key-here'
}