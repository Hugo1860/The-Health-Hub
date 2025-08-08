// Admin 用户管理 API

import { NextRequest } from 'next/server'
import db from '@/lib/db'
import { AdminApiResponseBuilder, parseSearchParams, createPagination, validateRequiredFields, sanitizeString } from '@/lib/adminApiUtils'
import { createAdminMiddleware, AdminPermission, AdminRole } from '@/lib/adminAuthMiddleware'
import { withErrorHandling, withDatabaseErrorHandling, ValidationError } from '@/lib/adminErrorMiddleware'

// 用户数据接口
interface AdminUser {
  id: string
  username: string
  email: string
  role: AdminRole | 'user'
  status: 'active' | 'inactive' | 'banned'
  createdAt: string
  updatedAt: string
  lastLogin?: string
  profile?: {
    firstName?: string
    lastName?: string
    avatar?: string
    bio?: string
  }
  statistics?: {
    totalPlays: number
    totalComments: number
    totalFavorites: number
    totalAudios: number
  }
}

// 用户创建/更新数据接口
interface UserCreateData {
  username: string
  email: string
  password?: string
  role: AdminRole | 'user'
  status: 'active' | 'inactive' | 'banned'
  profile?: {
    firstName?: string
    lastName?: string
    bio?: string
  }
}

interface UserUpdateData extends Partial<UserCreateData> {
  id: string
}

// 获取用户列表（带搜索和过滤）
const getUserList = withDatabaseErrorHandling(async (params: {
  page: number
  pageSize: number
  query?: string
  role?: string
  status?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}): Promise<{ users: AdminUser[]; total: number }> => {
  const { page, pageSize, query, role, status, sortBy = 'created_at', sortOrder = 'desc' } = params
  
  // 构建WHERE条件
  const conditions: string[] = ['u.deleted_at IS NULL']
  const queryParams: any[] = []
  
  // 搜索条件
  if (query) {
    conditions.push('(u.username LIKE ? OR u.email LIKE ?)')
    const searchTerm = `%${sanitizeString(query)}%`
    queryParams.push(searchTerm, searchTerm)
  }
  
  // 角色过滤
  if (role) {
    conditions.push('u.role = ?')
    queryParams.push(role)
  }
  
  // 状态过滤
  if (status) {
    conditions.push('u.status = ?')
    queryParams.push(status)
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  
  // 验证排序字段
  const allowedSortFields = ['username', 'email', 'created_at', 'updated_at', 'last_login']
  const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at'
  const validSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC'
  
  // 获取总数
  const countQuery = `
    SELECT COUNT(*) as total
    FROM users u
    ${whereClause}
  `
  
  const countResult = db.prepare(countQuery).get(...queryParams) as { total: number }
  const total = countResult.total
  
  // 获取用户列表
  const offset = (page - 1) * pageSize
  const listQuery = `
    SELECT 
      u.id,
      u.username,
      u.email,
      u.role,
      u.status,
      u.created_at,
      u.updated_at,
      u.last_login,
      u.first_name,
      u.last_name,
      u.bio,
      u.avatar,
      COALESCE(stats.total_plays, 0) as total_plays,
      COALESCE(stats.total_comments, 0) as total_comments,
      COALESCE(stats.total_favorites, 0) as total_favorites,
      COALESCE(stats.total_audios, 0) as total_audios
    FROM users u
    LEFT JOIN (
      SELECT 
        user_id,
        COUNT(DISTINCT ap.id) as total_plays,
        COUNT(DISTINCT c.id) as total_comments,
        COUNT(DISTINCT f.id) as total_favorites,
        COUNT(DISTINCT a.id) as total_audios
      FROM users u2
      LEFT JOIN audio_plays ap ON u2.id = ap.user_id
      LEFT JOIN comments c ON u2.id = c.user_id AND c.deleted_at IS NULL
      LEFT JOIN favorites f ON u2.id = f.user_id AND f.deleted_at IS NULL
      LEFT JOIN audios a ON u2.id = a.user_id AND a.deleted_at IS NULL
      GROUP BY user_id
    ) stats ON u.id = stats.user_id
    ${whereClause}
    ORDER BY u.${validSortBy} ${validSortOrder}
    LIMIT ? OFFSET ?
  `
  
  const users = db.prepare(listQuery).all(...queryParams, pageSize, offset) as any[]
  
  // 格式化用户数据
  const formattedUsers: AdminUser[] = users.map(row => ({
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role as AdminRole | 'user',
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLogin: row.last_login,
    profile: {
      firstName: row.first_name,
      lastName: row.last_name,
      avatar: row.avatar,
      bio: row.bio
    },
    statistics: {
      totalPlays: row.total_plays || 0,
      totalComments: row.total_comments || 0,
      totalFavorites: row.total_favorites || 0,
      totalAudios: row.total_audios || 0
    }
  }))
  
  return { users: formattedUsers, total }
})

// 创建用户
const createUser = withDatabaseErrorHandling(async (userData: UserCreateData): Promise<AdminUser> => {
  // 验证必填字段
  const validation = validateRequiredFields(userData, ['username', 'email', 'role'])
  if (!validation.isValid) {
    throw new ValidationError(`缺少必填字段: ${validation.missingFields.join(', ')}`)
  }
  
  // 检查用户名和邮箱是否已存在
  const existingUser = db.prepare(`
    SELECT id FROM users 
    WHERE (username = ? OR email = ?) AND deleted_at IS NULL
  `).get(userData.username, userData.email)
  
  if (existingUser) {
    throw new ValidationError('用户名或邮箱已存在')
  }
  
  // 插入新用户
  const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const now = new Date().toISOString()
  
  const insertQuery = `
    INSERT INTO users (
      id, username, email, role, status, 
      first_name, last_name, bio,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  
  db.prepare(insertQuery).run(
    userId,
    sanitizeString(userData.username),
    userData.email.toLowerCase(),
    userData.role,
    userData.status || 'active',
    userData.profile?.firstName || null,
    userData.profile?.lastName || null,
    userData.profile?.bio || null,
    now,
    now
  )
  
  // 返回创建的用户
  const newUser = db.prepare(`
    SELECT * FROM users WHERE id = ? AND deleted_at IS NULL
  `).get(userId) as any
  
  return {
    id: newUser.id,
    username: newUser.username,
    email: newUser.email,
    role: newUser.role,
    status: newUser.status,
    createdAt: newUser.created_at,
    updatedAt: newUser.updated_at,
    profile: {
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      bio: newUser.bio
    },
    statistics: {
      totalPlays: 0,
      totalComments: 0,
      totalFavorites: 0,
      totalAudios: 0
    }
  }
})

// GET 处理函数 - 获取用户列表
async function handleGet(request: NextRequest): Promise<Response> {
  try {
    const searchParams = parseSearchParams(request)
    const { page = 1, pageSize = 20, query, filters, sortBy, sortOrder } = searchParams
    
    const result = await getUserList({
      page,
      pageSize,
      query,
      role: filters?.role,
      status: filters?.status,
      sortBy,
      sortOrder
    })
    
    const pagination = createPagination(page, pageSize, result.total)
    
    return AdminApiResponseBuilder.success(
      result.users,
      '用户列表获取成功',
      pagination
    )
  } catch (error) {
    console.error('Failed to fetch user list:', error)
    throw error
  }
}

// POST 处理函数 - 创建用户
async function handlePost(request: NextRequest): Promise<Response> {
  try {
    const userData: UserCreateData = await request.json()
    
    const newUser = await createUser(userData)
    
    return AdminApiResponseBuilder.created(
      newUser,
      '用户创建成功'
    )
  } catch (error) {
    console.error('Failed to create user:', error)
    throw error
  }
}

// 应用中间件并导出处理函数
export const GET = createAdminMiddleware({
  permissions: [AdminPermission.VIEW_USERS],
  rateLimit: { maxRequests: 100, windowMs: 60000 }
})(withErrorHandling(handleGet))

export const POST = createAdminMiddleware({
  permissions: [AdminPermission.CREATE_USER],
  rateLimit: { maxRequests: 20, windowMs: 60000 }
})(withErrorHandling(handlePost))