// Dashboard 统计数据 API

import { NextRequest } from 'next/server'
import db from '@/lib/db'
import { AdminApiResponseBuilder, AdminApiErrorCode } from '@/lib/adminApiUtils'

// 数据库健康检查
const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    const result = db.prepare('SELECT 1 as health_check').get() as { health_check: number } | undefined
    return Boolean(result && result.health_check === 1)
  } catch (error) {
    console.error('[Database Health] 数据库健康检查失败:', error)
    return false
  }
}

// 查询超时包装器
const withQueryTimeout = async <T>(
  queryPromise: Promise<T>,
  timeoutMs: number = 10000,
  queryName: string = '未知查询'
): Promise<T> => {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`${queryName}超时 (${timeoutMs}ms)`)), timeoutMs)
  })
  
  return Promise.race([queryPromise, timeout])
}

// 统计数据接口
interface DashboardStats {
  totalAudios: number
  totalUsers: number
  totalPlays: number
  totalComments: number
  monthlyGrowth: {
    audios: number
    users: number
    plays: number
    comments: number
  }
  categoryDistribution: Array<{
    category: string
    count: number
    percentage: number
  }>
  recentStats: {
    todayAudios: number
    todayUsers: number
    todayPlays: number
    weekAudios: number
    weekUsers: number
    weekPlays: number
  }
}

// 获取基础统计数据
const getBasicStats = async (): Promise<{
  totalAudios: number
  totalUsers: number
  totalPlays: number
  totalComments: number
}> => {
  try {
    console.log('[Dashboard Stats] 开始获取基础统计数据')
    
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM audios) as total_audios,
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT 0) as total_plays,
        (SELECT COUNT(*) FROM comments) as total_comments
    `
    
    const startTime = Date.now()
    const result = db.prepare(query).get() as any
    const queryTime = Date.now() - startTime
    
    console.log(`[Dashboard Stats] 基础统计查询完成，耗时: ${queryTime}ms`)
    
    if (!result) {
      console.error('[Dashboard Stats] 基础统计查询返回空结果')
      throw new Error('基础统计数据查询失败：返回空结果')
    }
    
    const stats = {
      totalAudios: Number(result.total_audios) || 0,
      totalUsers: Number(result.total_users) || 0,
      totalPlays: Number(result.total_plays) || 0,
      totalComments: Number(result.total_comments) || 0
    }
    
    console.log('[Dashboard Stats] 基础统计数据:', stats)
    return stats
    
  } catch (error) {
    console.error('[Dashboard Stats] 获取基础统计数据失败:', error)
    throw new Error(`基础统计数据获取失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

// 获取月度增长数据
const getMonthlyGrowth = async (): Promise<{
  audios: number
  users: number
  plays: number
  comments: number
}> => {
  try {
    console.log('[Dashboard Stats] 开始获取月度增长数据')
    
    const currentMonth = new Date()
    currentMonth.setDate(1)
    currentMonth.setHours(0, 0, 0, 0)
    const currentMonthStr = currentMonth.toISOString()
    
    const lastMonth = new Date(currentMonth)
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    const lastMonthStr = lastMonth.toISOString()
    
    console.log(`[Dashboard Stats] 时间范围: ${lastMonthStr} 到 ${currentMonthStr}`)
    
    // 获取当月数据
    const currentMonthQuery = `
      SELECT 
        (SELECT COUNT(*) FROM audios WHERE uploadDate >= ?) as audios,
        (SELECT COUNT(*) FROM users WHERE createdAt >= ?) as users,
        (SELECT COUNT(*) FROM comments WHERE createdAt >= ?) as comments
    `
    
    const startTime1 = Date.now()
    const currentMonthResult = db.prepare(currentMonthQuery).get(
      currentMonthStr, currentMonthStr, currentMonthStr
    ) as any
    const queryTime1 = Date.now() - startTime1
    
    if (!currentMonthResult) {
      throw new Error('当月数据查询失败：返回空结果')
    }
    
    // 获取上月数据
    const lastMonthQuery = `
      SELECT 
        (SELECT COUNT(*) FROM audios WHERE uploadDate >= ? AND uploadDate < ?) as audios,
        (SELECT COUNT(*) FROM users WHERE createdAt >= ? AND createdAt < ?) as users,
        (SELECT COUNT(*) FROM comments WHERE createdAt >= ? AND createdAt < ?) as comments
    `
    
    const startTime2 = Date.now()
    const lastMonthResult = db.prepare(lastMonthQuery).get(
      lastMonthStr, currentMonthStr, lastMonthStr, currentMonthStr, lastMonthStr, currentMonthStr
    ) as any
    const queryTime2 = Date.now() - startTime2
    
    if (!lastMonthResult) {
      throw new Error('上月数据查询失败：返回空结果')
    }
    
    console.log(`[Dashboard Stats] 月度增长查询完成，当月查询耗时: ${queryTime1}ms，上月查询耗时: ${queryTime2}ms`)
    
    // 安全地转换数字并计算增长
    const currentAudios = Number(currentMonthResult.audios) || 0
    const currentUsers = Number(currentMonthResult.users) || 0
    const currentComments = Number(currentMonthResult.comments) || 0
    
    const lastAudios = Number(lastMonthResult.audios) || 0
    const lastUsers = Number(lastMonthResult.users) || 0
    const lastComments = Number(lastMonthResult.comments) || 0
    
    // 计算播放量增长（这里简化处理，实际应该有播放记录表）
    const playsGrowth = Math.max(0, currentAudios * 10 - lastAudios * 10)
    
    const growth = {
      audios: currentAudios - lastAudios,
      users: currentUsers - lastUsers,
      plays: playsGrowth,
      comments: currentComments - lastComments
    }
    
    console.log('[Dashboard Stats] 月度增长数据:', growth)
    return growth
    
  } catch (error) {
    console.error('[Dashboard Stats] 获取月度增长数据失败:', error)
    throw new Error(`月度增长数据获取失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

// 获取分类分布数据
const getCategoryDistribution = async (): Promise<Array<{
  category: string
  count: number
  percentage: number
}>> => {
  try {
    console.log('[Dashboard Stats] 开始获取分类分布数据')
    
    const query = `
      SELECT 
        subject as category,
        COUNT(*) as count
      FROM audios 
      WHERE subject IS NOT NULL AND subject != ''
      GROUP BY subject
      ORDER BY count DESC
      LIMIT 10
    `
    
    const startTime = Date.now()
    const results = db.prepare(query).all() as Array<{ category: string; count: number }>
    const queryTime = Date.now() - startTime
    
    console.log(`[Dashboard Stats] 分类分布查询完成，耗时: ${queryTime}ms，找到 ${results.length} 个分类`)
    
    if (!Array.isArray(results)) {
      throw new Error('分类分布查询失败：返回结果不是数组')
    }
    
    // 安全地计算总数和百分比
    const totalCount = results.reduce((sum, item) => {
      const count = Number(item.count) || 0
      return sum + count
    }, 0)
    
    const distribution = results.map(item => {
      const count = Number(item.count) || 0
      const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0
      
      return {
        category: String(item.category || '未知分类'),
        count,
        percentage
      }
    })
    
    console.log('[Dashboard Stats] 分类分布数据:', distribution)
    return distribution
    
  } catch (error) {
    console.error('[Dashboard Stats] 获取分类分布数据失败:', error)
    // 返回空数组而不是抛出错误，避免整个API失败
    console.log('[Dashboard Stats] 返回空的分类分布数据')
    return []
  }
}

// 获取最近统计数据
const getRecentStats = async (): Promise<{
  todayAudios: number
  todayUsers: number
  todayPlays: number
  weekAudios: number
  weekUsers: number
  weekPlays: number
}> => {
  try {
    console.log('[Dashboard Stats] 开始获取最近统计数据')
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString()
    
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const weekAgoStr = weekAgo.toISOString()
    
    console.log(`[Dashboard Stats] 时间范围: 今日 ${todayStr}，本周 ${weekAgoStr}`)
    
    // 今日数据
    const todayQuery = `
      SELECT 
        (SELECT COUNT(*) FROM audios WHERE uploadDate >= ?) as audios,
        (SELECT COUNT(*) FROM users WHERE createdAt >= ?) as users
    `
    
    const startTime1 = Date.now()
    const todayResult = db.prepare(todayQuery).get(todayStr, todayStr) as any
    const queryTime1 = Date.now() - startTime1
    
    if (!todayResult) {
      throw new Error('今日数据查询失败：返回空结果')
    }
    
    // 本周数据
    const weekQuery = `
      SELECT 
        (SELECT COUNT(*) FROM audios WHERE uploadDate >= ?) as audios,
        (SELECT COUNT(*) FROM users WHERE createdAt >= ?) as users
    `
    
    const startTime2 = Date.now()
    const weekResult = db.prepare(weekQuery).get(weekAgoStr, weekAgoStr) as any
    const queryTime2 = Date.now() - startTime2
    
    if (!weekResult) {
      throw new Error('本周数据查询失败：返回空结果')
    }
    
    console.log(`[Dashboard Stats] 最近统计查询完成，今日查询耗时: ${queryTime1}ms，本周查询耗时: ${queryTime2}ms`)
    
    // 安全地转换数字
    const todayAudios = Number(todayResult.audios) || 0
    const todayUsers = Number(todayResult.users) || 0
    const weekAudios = Number(weekResult.audios) || 0
    const weekUsers = Number(weekResult.users) || 0
    
    const recentStats = {
      todayAudios,
      todayUsers,
      todayPlays: todayAudios * 5, // 简化计算
      weekAudios,
      weekUsers,
      weekPlays: weekAudios * 5 // 简化计算
    }
    
    console.log('[Dashboard Stats] 最近统计数据:', recentStats)
    return recentStats
    
  } catch (error) {
    console.error('[Dashboard Stats] 获取最近统计数据失败:', error)
    throw new Error(`最近统计数据获取失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

// GET 处理函数
async function handleGet(request: NextRequest): Promise<Response> {
  const startTime = Date.now()
  const requestId = `dashboard-stats-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  try {
    console.log(`[${requestId}] 开始获取仪表盘统计数据`)
    
    // 首先检查数据库健康状态
    const isDbHealthy = await checkDatabaseHealth()
    if (!isDbHealthy) {
      throw new Error('数据库连接异常，无法提供服务')
    }
    
    // 设置超时时间（30秒）
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('请求超时')), 30000)
    })
    
    // 并行获取所有统计数据，带超时保护
    const dataPromise = Promise.all([
      getBasicStats(),
      getMonthlyGrowth(),
      getCategoryDistribution(),
      getRecentStats()
    ])
    
    const [basicStats, monthlyGrowth, categoryDistribution, recentStats] = await Promise.race([
      dataPromise,
      timeout
    ]) as [
      Awaited<ReturnType<typeof getBasicStats>>,
      Awaited<ReturnType<typeof getMonthlyGrowth>>,
      Awaited<ReturnType<typeof getCategoryDistribution>>,
      Awaited<ReturnType<typeof getRecentStats>>
    ]
    
    const totalTime = Date.now() - startTime
    console.log(`[${requestId}] 所有统计数据获取完成，总耗时: ${totalTime}ms`)
    
    // 数据完整性检查
    if (!basicStats) {
      throw new Error('基础统计数据获取失败')
    }
    
    if (!monthlyGrowth) {
      throw new Error('月度增长数据获取失败')
    }
    
    if (!recentStats) {
      throw new Error('最近统计数据获取失败')
    }
    
    const dashboardStats: DashboardStats = {
      ...basicStats,
      monthlyGrowth,
      categoryDistribution: categoryDistribution || [], // 分类数据允许为空
      recentStats
    }
    
    // 记录成功的管理员操作
    console.log(`[${requestId}] 管理员操作记录: dashboard_stats_view`, {
      requestId,
      totalTime,
      dataSize: JSON.stringify(dashboardStats).length
    })
    
    console.log(`[${requestId}] 仪表盘统计数据返回成功`)
    
    return AdminApiResponseBuilder.success(
      dashboardStats,
      '统计数据获取成功',
      undefined,
      200
    )
    
  } catch (error) {
    const totalTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    
    console.error(`[${requestId}] 仪表盘统计数据获取失败:`, {
      error: errorMessage,
      totalTime,
      stack: error instanceof Error ? error.stack : undefined
    })
    
    // 记录失败的操作
    console.log(`[${requestId}] 管理员操作错误记录: dashboard_stats_error`, {
      requestId,
      error: errorMessage,
      totalTime
    })
    
    // 根据错误类型返回不同的错误响应
    if (errorMessage.includes('超时')) {
      return AdminApiResponseBuilder.error(
        AdminApiErrorCode.SERVICE_UNAVAILABLE,
        '服务响应超时，请稍后重试',
        { requestId, totalTime }
      )
    }
    
    if (errorMessage.includes('数据库') || errorMessage.includes('查询')) {
      return AdminApiResponseBuilder.error(
        AdminApiErrorCode.DATABASE_ERROR,
        '数据库查询失败，请检查系统状态',
        { requestId, error: errorMessage }
      )
    }
    
    if (errorMessage.includes('连接')) {
      return AdminApiResponseBuilder.error(
        AdminApiErrorCode.CONNECTION_ERROR,
        '数据库连接失败，请稍后重试',
        { requestId }
      )
    }
    
    // 默认内部服务器错误
    return AdminApiResponseBuilder.error(
      AdminApiErrorCode.INTERNAL_ERROR,
      '获取统计数据时发生内部错误',
      { requestId, error: errorMessage }
    )
  }
}

// 导出处理函数
export const GET = handleGet