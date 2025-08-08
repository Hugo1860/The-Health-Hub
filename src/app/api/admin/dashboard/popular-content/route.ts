// Dashboard 热门内容 API

import { NextRequest } from 'next/server'
import db from '@/lib/db'
import { AdminApiResponseBuilder, parseSearchParams } from '@/lib/adminApiUtils'
import { createAdminMiddleware, AdminPermission } from '@/lib/adminAuthMiddleware'
import { withErrorHandling, withDatabaseErrorHandling } from '@/lib/adminErrorMiddleware'

// 热门内容数据接口
interface PopularContent {
  recentAudios: Array<{
    id: string
    title: string
    uploadDate: string
    plays: number
    duration: number
    speaker?: string
    subject: string
    description: string
  }>
  popularAudios: Array<{
    id: string
    title: string
    plays: number
    likes: number
    comments: number
    rating: number
    subject: string
    speaker?: string
  }>
  topCategories: Array<{
    category: string
    audioCount: number
    totalPlays: number
    averageRating: number
  }>
  trendingAudios: Array<{
    id: string
    title: string
    recentPlays: number
    growthRate: number
    subject: string
  }>
}

// 获取最新音频
const getRecentAudios = withDatabaseErrorHandling(async (limit: number = 10): Promise<PopularContent['recentAudios']> => {
  const query = `
    SELECT 
      id,
      title,
      description,
      created_at as upload_date,
      COALESCE(play_count, 0) as plays,
      COALESCE(duration, 0) as duration,
      speaker,
      subject
    FROM audios
    WHERE deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT ?
  `
  
  const results = db.prepare(query).all(limit) as any[]
  
  return results.map(row => ({
    id: row.id,
    title: row.title,
    uploadDate: row.upload_date,
    plays: row.plays,
    duration: row.duration,
    speaker: row.speaker,
    subject: row.subject || '未分类',
    description: row.description || ''
  }))
})

// 获取热门音频（按播放量排序）
const getPopularAudios = withDatabaseErrorHandling(async (limit: number = 10): Promise<PopularContent['popularAudios']> => {
  const query = `
    SELECT 
      a.id,
      a.title,
      COALESCE(a.play_count, 0) as plays,
      a.speaker,
      a.subject,
      COUNT(DISTINCT c.id) as comments,
      COUNT(DISTINCT f.id) as likes,
      COALESCE(AVG(r.rating), 0) as rating
    FROM audios a
    LEFT JOIN comments c ON a.id = c.audio_id AND c.deleted_at IS NULL
    LEFT JOIN favorites f ON a.id = f.audio_id AND f.deleted_at IS NULL
    LEFT JOIN ratings r ON a.id = r.audio_id AND r.deleted_at IS NULL
    WHERE a.deleted_at IS NULL
    GROUP BY a.id, a.title, a.play_count, a.speaker, a.subject
    ORDER BY plays DESC, comments DESC, likes DESC
    LIMIT ?
  `
  
  const results = db.prepare(query).all(limit) as any[]
  
  return results.map(row => ({
    id: row.id,
    title: row.title,
    plays: row.plays,
    likes: row.likes,
    comments: row.comments,
    rating: Math.round(row.rating * 10) / 10, // 保留一位小数
    subject: row.subject || '未分类',
    speaker: row.speaker
  }))
})

// 获取热门分类
const getTopCategories = withDatabaseErrorHandling(async (limit: number = 8): Promise<PopularContent['topCategories']> => {
  const query = `
    SELECT 
      subject as category,
      COUNT(*) as audio_count,
      SUM(COALESCE(play_count, 0)) as total_plays,
      AVG(COALESCE(r.rating, 0)) as average_rating
    FROM audios a
    LEFT JOIN ratings r ON a.id = r.audio_id AND r.deleted_at IS NULL
    WHERE a.deleted_at IS NULL 
      AND a.subject IS NOT NULL 
      AND a.subject != ''
    GROUP BY subject
    HAVING audio_count > 0
    ORDER BY total_plays DESC, audio_count DESC
    LIMIT ?
  `
  
  const results = db.prepare(query).all(limit) as any[]
  
  return results.map(row => ({
    category: row.category,
    audioCount: row.audio_count,
    totalPlays: row.total_plays,
    averageRating: Math.round(row.average_rating * 10) / 10
  }))
})

// 获取趋势音频（最近播放量增长较快的音频）
const getTrendingAudios = withDatabaseErrorHandling(async (limit: number = 10): Promise<PopularContent['trendingAudios']> => {
  // 由于没有详细的播放记录表，这里使用简化的逻辑
  // 实际应用中应该基于时间段内的播放记录来计算趋势
  const query = `
    SELECT 
      a.id,
      a.title,
      a.subject,
      COALESCE(a.play_count, 0) as total_plays,
      a.created_at,
      -- 简化的趋势计算：最近创建的音频且播放量不错的
      CASE 
        WHEN julianday('now') - julianday(a.created_at) <= 7 THEN COALESCE(a.play_count, 0) * 2
        WHEN julianday('now') - julianday(a.created_at) <= 30 THEN COALESCE(a.play_count, 0) * 1.5
        ELSE COALESCE(a.play_count, 0)
      END as trend_score
    FROM audios a
    WHERE a.deleted_at IS NULL
      AND a.play_count > 0
    ORDER BY trend_score DESC, a.created_at DESC
    LIMIT ?
  `
  
  const results = db.prepare(query).all(limit) as any[]
  
  return results.map(row => {
    const daysSinceCreated = Math.floor(
      (Date.now() - new Date(row.created_at).getTime()) / (1000 * 60 * 60 * 24)
    )
    
    // 简化的增长率计算
    const growthRate = daysSinceCreated > 0 ? 
      Math.round((row.total_plays / Math.max(daysSinceCreated, 1)) * 100) / 100 : 
      row.total_plays
    
    return {
      id: row.id,
      title: row.title,
      recentPlays: row.total_plays,
      growthRate,
      subject: row.subject || '未分类'
    }
  })
})

// 获取用户参与度统计
const getUserEngagementStats = withDatabaseErrorHandling(async (): Promise<{
  activeUsers: number
  newUsers: number
  engagementRate: number
}> => {
  // 获取活跃用户数（最近30天有活动的用户）
  const activeUsersQuery = `
    SELECT COUNT(DISTINCT user_id) as active_users
    FROM (
      SELECT user_id FROM comments WHERE created_at >= datetime('now', '-30 days') AND deleted_at IS NULL
      UNION
      SELECT user_id FROM favorites WHERE created_at >= datetime('now', '-30 days') AND deleted_at IS NULL
      UNION  
      SELECT user_id FROM audios WHERE created_at >= datetime('now', '-30 days') AND deleted_at IS NULL
    )
  `
  
  // 获取新用户数（最近30天注册的用户）
  const newUsersQuery = `
    SELECT COUNT(*) as new_users
    FROM users
    WHERE created_at >= datetime('now', '-30 days') AND deleted_at IS NULL
  `
  
  // 获取总用户数
  const totalUsersQuery = `
    SELECT COUNT(*) as total_users
    FROM users
    WHERE deleted_at IS NULL
  `
  
  const [activeResult, newResult, totalResult] = await Promise.all([
    db.prepare(activeUsersQuery).get() as any,
    db.prepare(newUsersQuery).get() as any,
    db.prepare(totalUsersQuery).get() as any
  ])
  
  const activeUsers = activeResult.active_users || 0
  const newUsers = newResult.new_users || 0
  const totalUsers = totalResult.total_users || 0
  
  const engagementRate = totalUsers > 0 ? 
    Math.round((activeUsers / totalUsers) * 100 * 100) / 100 : 0
  
  return {
    activeUsers,
    newUsers,
    engagementRate
  }
})

// GET 处理函数
async function handleGet(request: NextRequest): Promise<Response> {
  const admin = (request as any).admin as AuthenticatedAdmin;
  try {
    const { filters } = parseSearchParams(request)
    
    // 获取限制参数
    const recentLimit = parseInt(filters?.recentLimit as string) || 10
    const popularLimit = parseInt(filters?.popularLimit as string) || 10
    const categoryLimit = parseInt(filters?.categoryLimit as string) || 8
    const trendingLimit = parseInt(filters?.trendingLimit as string) || 10
    
    // 并行获取所有数据
    const [recentAudios, popularAudios, topCategories, trendingAudios, engagementStats] = await Promise.all([
      getRecentAudios(recentLimit),
      getPopularAudios(popularLimit),
      getTopCategories(categoryLimit),
      getTrendingAudios(trendingLimit),
      getUserEngagementStats()
    ])
    
    const popularContent: PopularContent & { engagementStats: typeof engagementStats } = {
      recentAudios,
      popularAudios,
      topCategories,
      trendingAudios,
      engagementStats
    }
    
    return AdminApiResponseBuilder.success(
      popularContent,
      '热门内容数据获取成功'
    )
  } catch (error) {
    console.error('Failed to fetch popular content:', error)
    throw error
  }
}

// 应用中间件并导出处理函数
export const GET = createAdminMiddleware({
  permissions: [AdminPermission.VIEW_SYSTEM_STATS],
  rateLimit: { maxRequests: 60, windowMs: 60000 } // 每分钟最多60次请求
})(withErrorHandling(handleGet))