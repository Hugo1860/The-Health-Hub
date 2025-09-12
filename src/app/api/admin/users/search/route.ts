import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { withSecurityAndValidation } from '@/lib/secureApiWrapper'
import { sanitizeText } from '@/lib/validation'
import { z } from 'zod'
import { existsSync } from 'fs'

const DATA_DIR = join(process.cwd(), 'data')
const USERS_FILE = join(DATA_DIR, 'users.json')

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

// 确保数据目录和文件存在
async function ensureDataStructure() {
  try {
    if (!existsSync(DATA_DIR)) {
      await mkdir(DATA_DIR, { recursive: true })
    }
    
    if (!existsSync(USERS_FILE)) {
      await import('fs/promises').then(fs => 
        fs.writeFile(USERS_FILE, JSON.stringify([], null, 2))
      )
    }
  } catch (error) {
    console.error('Failed to ensure data structure:', error)
  }
}

// 获取所有用户
async function getUsers(): Promise<User[]> {
  try {
    await ensureDataStructure()
    const data = await readFile(USERS_FILE, 'utf-8')
    const users = JSON.parse(data)
    return Array.isArray(users) ? users : []
  } catch (error) {
    console.error('Failed to read users:', error)
    return []
  }
}

// 搜索用户验证模式
const searchUsersSchema = z.object({
  q: z.string()
    .min(2, '搜索关键词至少需要2个字符')
    .max(100, '搜索关键词不能超过100个字符'),
  role: z.enum(['user', 'admin']).optional(),
  status: z.enum(['active', 'inactive', 'banned']).optional(),
  limit: z.string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine(val => val > 0 && val <= 100, '限制数量必须在1-100之间')
    .optional()
    .default(20),
})

// 搜索用户
export const GET = withSecurityAndValidation(
  async (request: NextRequest, validatedData: z.infer<typeof searchUsersSchema>) => {
    try {
      const { q: query, role, status, limit } = validatedData

      let users = await getUsers()
      
      // 净化搜索关键词
      const searchTerm = sanitizeText(query).toLowerCase().trim()
      
      // 搜索功能 - 支持用户名、邮箱、ID搜索
      users = users.filter(user => {
        const username = user.username.toLowerCase()
        const email = user.email.toLowerCase()
        const id = user.id.toLowerCase()
        
        return username.includes(searchTerm) ||
               email.includes(searchTerm) ||
               id.includes(searchTerm)
      })

      // 角色筛选
      if (role) {
        users = users.filter(user => user.role === role)
      }

      // 状态筛选
      if (status) {
        users = users.filter(user => user.status === status)
      }

      // 按相关性排序（精确匹配优先）
      users.sort((a, b) => {
        const aUsername = a.username.toLowerCase()
        const bUsername = b.username.toLowerCase()
        const aEmail = a.email.toLowerCase()
        const bEmail = b.email.toLowerCase()
        
        // 精确匹配用户名优先
        if (aUsername === searchTerm && bUsername !== searchTerm) return -1
        if (bUsername === searchTerm && aUsername !== searchTerm) return 1
        
        // 精确匹配邮箱其次
        if (aEmail === searchTerm && bEmail !== searchTerm) return -1
        if (bEmail === searchTerm && aEmail !== searchTerm) return 1
        
        // 用户名开头匹配优先
        if (aUsername.startsWith(searchTerm) && !bUsername.startsWith(searchTerm)) return -1
        if (bUsername.startsWith(searchTerm) && !aUsername.startsWith(searchTerm)) return 1
        
        // 按创建时间倒序
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })

      // 限制结果数量
      const limitedUsers = users.slice(0, limit)

      // 移除密码字段并净化数据
      const usersWithoutPassword = limitedUsers.map(({ password, ...user }) => ({
        ...user,
        username: sanitizeText(user.username),
        email: sanitizeText(user.email),
      }))

      return NextResponse.json({
        users: usersWithoutPassword,
        total: users.length, // 总匹配数量
        returned: usersWithoutPassword.length, // 返回数量
        query: searchTerm,
        filters: {
          role: role || null,
          status: status || null,
          limit
        },
        hasMore: users.length > limit
      })

    } catch (error) {
      console.error('Search users error:', error)
      return NextResponse.json(
        { error: { code: 'SEARCH_ERROR', message: '搜索用户失败' } },
        { status: 500 }
      )
    }
  },
  searchUsersSchema,
  {
    requireAuth: true,
    enableRateLimit: true,
    rateLimitMax: 30,
    rateLimitWindow: 60000,
    allowedMethods: ['GET'],
  }
)