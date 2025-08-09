// Admin 单个用户管理 API

import { NextRequest } from 'next/server'
import db from '@/lib/db'
import { AdminApiResponseBuilder, validateRequiredFields, sanitizeString } from '@/lib/adminApiUtils'
import { createAdminMiddleware, AdminPermission, AdminRole } from '@/lib/adminAuthMiddleware'
import { withErrorHandling, withDatabaseErrorHandling, ValidationError, NotFoundError } from '@/lib/adminErrorMiddleware'

// 用户更新数据接口
interface UserUpdateData {
  username?: string
  email?: string
  role?: AdminRole | 'user'
  status?: 'active' | 'inactive' | 'banned'
  profile?: {
    firstName?: string
    lastName?: string
    bio?: string
  }
}

// 获取单个用户
const getUserById = withDatabaseErrorHandling(async (userId: string): Promise<any> => {
  const query = `
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
      WHERE u2.id = ?
      GROUP BY user_id
    ) stats ON u.id = stats.user_id
    WHERE u.id = ? AND u.deleted_at IS NULL
  `
  
  const user = db.prepare(query).get(userId, userId) as any
  
  if (!user) {
    throw new NotFoundError('用户')
  }
  
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    lastLogin: user.last_login,
    profile: {
      firstName: user.first_name,
      lastName: user.last_name,
      avatar: user.avatar,
      bio: user.bio
    },
    statistics: {
      totalPlays: user.total_plays || 0,
      totalComments: user.total_comments || 0,
      totalFavorites: user.total_favorites || 0,
      totalAudios: user.total_audios || 0
    }
  }
})

// 更新用户
const updateUser = withDatabaseErrorHandling(async (userId: string, updateData: UserUpdateData): Promise<any> => {
  // 检查用户是否存在
  const existingUser = db.prepare(`
    SELECT id FROM users WHERE id = ? AND deleted_at IS NULL
  `).get(userId)
  
  if (!existingUser) {
    throw new NotFoundError('用户')
  }
  
  // 如果更新用户名或邮箱，检查是否与其他用户冲突
  if (updateData.username || updateData.email) {
    const conflictQuery = `
      SELECT id FROM users 
      WHERE id != ? AND (username = ? OR email = ?) AND deleted_at IS NULL
    `
    
    const conflictUser = db.prepare(conflictQuery).get(
      userId,
      updateData.username || '',
      updateData.email || ''
    )
    
    if (conflictUser) {
      throw new ValidationError('用户名或邮箱已被其他用户使用')
    }
  }
  
  // 构建更新字段
  const updateFields: string[] = []
  const updateValues: any[] = []
  
  if (updateData.username !== undefined) {
    updateFields.push('username = ?')
    updateValues.push(sanitizeString(updateData.username))
  }
  
  if (updateData.email !== undefined) {
    updateFields.push('email = ?')
    updateValues.push(updateData.email.toLowerCase())
  }
  
  if (updateData.role !== undefined) {
    updateFields.push('role = ?')
    updateValues.push(updateData.role)
  }
  
  if (updateData.status !== undefined) {
    updateFields.push('status = ?')
    updateValues.push(updateData.status)
  }
  
  if (updateData.profile?.firstName !== undefined) {
    updateFields.push('first_name = ?')
    updateValues.push(updateData.profile.firstName || null)
  }
  
  if (updateData.profile?.lastName !== undefined) {
    updateFields.push('last_name = ?')
    updateValues.push(updateData.profile.lastName || null)
  }
  
  if (updateData.profile?.bio !== undefined) {
    updateFields.push('bio = ?')
    updateValues.push(updateData.profile.bio || null)
  }
  
  if (updateFields.length === 0) {
    throw new ValidationError('没有提供要更新的字段')
  }
  
  // 添加更新时间
  updateFields.push('updated_at = ?')
  updateValues.push(new Date().toISOString())
  
  // 执行更新
  const updateQuery = `
    UPDATE users 
    SET ${updateFields.join(', ')}
    WHERE id = ? AND deleted_at IS NULL
  `
  
  updateValues.push(userId)
  
  const result = db.prepare(updateQuery).run(...updateValues)
  
  if (result.changes === 0) {
    throw new NotFoundError('用户')
  }
  
  // 返回更新后的用户
  return await getUserById(userId)
})

// 删除用户（软删除）
const deleteUser = withDatabaseErrorHandling(async (userId: string): Promise<void> => {
  // 检查用户是否存在
  const existingUser = db.prepare(`
    SELECT id FROM users WHERE id = ? AND deleted_at IS NULL
  `).get(userId)
  
  if (!existingUser) {
    throw new NotFoundError('用户')
  }
  
  // 执行软删除
  const deleteQuery = `
    UPDATE users 
    SET deleted_at = ?, updated_at = ?
    WHERE id = ? AND deleted_at IS NULL
  `
  
  const now = new Date().toISOString()
  const result = db.prepare(deleteQuery).run(now, now, userId)
  
  if (result.changes === 0) {
    throw new NotFoundError('用户')
  }
})

// 获取用户活动历史
const getUserActivity = withDatabaseErrorHandling(async (userId: string, limit: number = 20): Promise<any[]> => {
  const activities: any[] = []
  
  // 获取用户的音频上传记录
  const audioQuery = `
    SELECT 'audio_upload' as type, title as title, created_at as timestamp
    FROM audios 
    WHERE user_id = ? AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT ?
  `
  
  const audioActivities = db.prepare(audioQuery).all(userId, Math.ceil(limit / 3)) as any[]
  activities.push(...audioActivities.map(a => ({
    type: a.type,
    title: `上传音频: ${a.title}`,
    timestamp: a.timestamp
  })))
  
  // 获取用户的评论记录
  const commentQuery = `
    SELECT 'comment' as type, c.content, c.created_at as timestamp, a.title as audio_title
    FROM comments c
    LEFT JOIN audios a ON c.audio_id = a.id
    WHERE c.user_id = ? AND c.deleted_at IS NULL
    ORDER BY c.created_at DESC
    LIMIT ?
  `
  
  const commentActivities = db.prepare(commentQuery).all(userId, Math.ceil(limit / 3)) as any[]
  activities.push(...commentActivities.map(c => ({
    type: c.type,
    title: `评论音频: ${c.audio_title}`,
    timestamp: c.timestamp
  })))
  
  // 获取用户的收藏记录
  try {
    const favoriteQuery = `
      SELECT 'favorite' as type, f.created_at as timestamp, a.title as audio_title
      FROM favorites f
      LEFT JOIN audios a ON f.audio_id = a.id
      WHERE f.user_id = ? AND f.deleted_at IS NULL
      ORDER BY f.created_at DESC
      LIMIT ?
    `
    
    const favoriteActivities = db.prepare(favoriteQuery).all(userId, Math.ceil(limit / 3)) as any[]
    activities.push(...favoriteActivities.map(f => ({
      type: f.type,
      title: `收藏音频: ${f.audio_title}`,
      timestamp: f.timestamp
    })))
  } catch (error) {
    // 如果favorites表不存在，忽略错误
    console.log('Favorites table not found, skipping favorite activities')
  }
  
  // 按时间排序并限制数量
  return activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit)
})

// GET 处理函数 - 获取单个用户
async function handleGet(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const { id: userId } = await context.params
    const searchParams = request.nextUrl.searchParams
    const includeActivity = searchParams.get('includeActivity') === 'true'
    
    const user = await getUserById(userId)
    
    if (includeActivity) {
      const activities = await getUserActivity(userId)
      user.recentActivities = activities
    }
    
    return AdminApiResponseBuilder.success(
      user,
      '用户信息获取成功'
    )
  } catch (error) {
    console.error('Failed to fetch user:', error)
    throw error
  }
}

// PUT 处理函数 - 更新用户
async function handlePut(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const { id: userId } = await context.params
    const updateData: UserUpdateData = await request.json()
    
    const updatedUser = await updateUser(userId, updateData)
    
    return AdminApiResponseBuilder.success(
      updatedUser,
      '用户信息更新成功'
    )
  } catch (error) {
    console.error('Failed to update user:', error)
    throw error
  }
}

// DELETE 处理函数 - 删除用户
async function handleDelete(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const { id: userId } = await context.params
    
    await deleteUser(userId)
    
    return AdminApiResponseBuilder.success(
      { id: userId },
      '用户删除成功'
    )
  } catch (error) {
    console.error('Failed to delete user:', error)
    throw error
  }
}

// 应用中间件并导出处理函数
export const GET = createAdminMiddleware({
  permissions: [AdminPermission.VIEW_USERS],
  rateLimit: { maxRequests: 200, windowMs: 60000 }
})(withErrorHandling(handleGet))

export const PUT = createAdminMiddleware({
  permissions: [AdminPermission.UPDATE_USER],
  rateLimit: { maxRequests: 50, windowMs: 60000 }
})(withErrorHandling(handlePut))

export const DELETE = createAdminMiddleware({
  permissions: [AdminPermission.DELETE_USER],
  rateLimit: { maxRequests: 20, windowMs: 60000 }
})(withErrorHandling(handleDelete))