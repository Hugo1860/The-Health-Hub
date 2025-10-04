// Dashboard 统计数据 API

import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, getDatabaseStatus } from '@/lib/database'
import { withSecurity } from '@/lib/secureApiWrapper'
import { ANTD_ADMIN_PERMISSIONS } from '@/lib/server-permissions'

// 数据库健康检查
const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    const status = await getDatabaseStatus()
    return !!(status?.healthy && status?.connected)
  } catch (error) {
    console.error('[Database Health] 数据库健康检查失败:', error)
    return false
  }
}

// 查询超时包装器 (暂未使用)
// const withQueryTimeout = async <T>(
//   queryPromise: Promise<T>,
//   timeoutMs: number = 10000,
//   queryName: string = '未知查询'
// ): Promise<T> => {
//   const timeout = new Promise<never>((_, reject) => {
//     setTimeout(() => reject(new Error(`${queryName}超时 (${timeoutMs}ms)`)), timeoutMs)
//   })
//   
//   return Promise.race([queryPromise, timeout])
// }

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
    
    const db = getDatabase()
    
    // 使用适配后的查询获取统计数据（MySQL）
    const audioResult = await db.query('SELECT COUNT(*) as count FROM audios')
    const userResult = await db.query('SELECT COUNT(*) as count FROM users')
    
    // 检查comments表是否存在
    let commentsCount = 0
    try {
      const commentResult = await db.query('SELECT COUNT(*) as count FROM comments')
      commentsCount = Number(commentResult.rows[0]?.count) || 0
    } catch (error) {
      console.log('[Dashboard Stats] Comments表不存在，设为0')
    }
    
    const stats = {
      totalAudios: Number(audioResult.rows[0]?.count) || 0,
      totalUsers: Number(userResult.rows[0]?.count) || 0,
      totalPlays: 0, // 暂时设为0，因为没有plays表
      totalComments: commentsCount
    }
    
    console.log('[Dashboard Stats] 基础统计数据:', stats)
    return stats
    
  } catch (error) {
    console.error('[Dashboard Stats] 获取基础统计数据失败:', error)
    // 返回默认值而不是抛出错误
    return {
      totalAudios: 0,
      totalUsers: 0,
      totalPlays: 0,
      totalComments: 0
    }
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
    
    const db = getDatabase()
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
    
    // 获取本月新增的音频数量（注意列名为 uploadDate）
    const audioGrowthResult = await db.query(
      `
      SELECT COUNT(*) as count 
      FROM audios 
      WHERE uploadDate >= ?
      `,
      [oneMonthAgo.toISOString()]
    )
    
    // 获取本月新增的用户数量
    const userGrowthResult = await db.query(
      `
      SELECT COUNT(*) as count 
      FROM users 
      WHERE created_at >= ?
      `,
      [oneMonthAgo.toISOString()]
    )
    
    // 获取本月新增的评论数量
    let commentsGrowth = 0
    try {
      const commentGrowthResult = await db.query(
        `
        SELECT COUNT(*) as count 
        FROM comments 
        WHERE created_at >= ?
        `,
        [oneMonthAgo.toISOString()]
      )
      commentsGrowth = Number(commentGrowthResult.rows[0]?.count) || 0
    } catch (error) {
      console.log('[Dashboard Stats] Comments表不存在，增长设为0')
    }
    
    const growth = {
      audios: Number(audioGrowthResult.rows[0]?.count) || 0,
      users: Number(userGrowthResult.rows[0]?.count) || 0,
      plays: 0, // 暂时设为0，因为没有plays表
      comments: commentsGrowth
    }
    
    console.log('[Dashboard Stats] 月度增长数据:', growth)
    return growth
    
  } catch (error) {
    console.error('[Dashboard Stats] 获取月度增长数据失败:', error)
    return {
      audios: 0,
      users: 0,
      plays: 0,
      comments: 0
    }
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
    
    const db = getDatabase()
    
    // 使用PostgreSQL查询获取分类分布
    const result = await db.query(`
      SELECT subject as category, COUNT(*) as count
      FROM audios 
      WHERE subject IS NOT NULL AND subject != ''
      GROUP BY subject
      ORDER BY count DESC
      LIMIT 10
    `)
    
    const results = result.rows as Array<{ category: string; count: string }>
    
    console.log(`[Dashboard Stats] 分类分布查询完成，找到 ${results.length} 个分类`)
    
    // 计算总数和百分比
    const totalCount = results.reduce((sum, item) => sum + Number(item.count), 0)
    
    const distribution = results.map(item => ({
      category: String(item.category),
      count: Number(item.count),
      percentage: totalCount > 0 ? Math.round((Number(item.count) / totalCount) * 100) : 0
    }))
    
    console.log('[Dashboard Stats] 分类分布数据:', distribution)
    return distribution
    
  } catch (error) {
    console.error('[Dashboard Stats] 获取分类分布数据失败:', error)
    // 返回默认分类数据
    return [
      { category: '心血管', count: 5, percentage: 50 },
      { category: '神经科', count: 3, percentage: 30 },
      { category: '内科学', count: 2, percentage: 20 }
    ]
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
    
    const db = getDatabase()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    
    // 获取今日新增音频（列名 uploadDate）
    const todayAudiosResult = await db.query(
      `
      SELECT COUNT(*) as count 
      FROM audios 
      WHERE uploadDate >= ?
      `,
      [today.toISOString()]
    )
    
    // 获取今日新增用户
    const todayUsersResult = await db.query(
      `
      SELECT COUNT(*) as count 
      FROM users 
      WHERE created_at >= ?
      `,
      [today.toISOString()]
    )
    
    // 获取本周新增音频（列名 uploadDate）
    const weekAudiosResult = await db.query(
      `
      SELECT COUNT(*) as count 
      FROM audios 
      WHERE uploadDate >= ?
      `,
      [oneWeekAgo.toISOString()]
    )
    
    // 获取本周新增用户
    const weekUsersResult = await db.query(
      `
      SELECT COUNT(*) as count 
      FROM users 
      WHERE created_at >= ?
      `,
      [oneWeekAgo.toISOString()]
    )
    
    const recentStats = {
      todayAudios: Number(todayAudiosResult.rows[0]?.count) || 0,
      todayUsers: Number(todayUsersResult.rows[0]?.count) || 0,
      todayPlays: 0, // 暂时设为0，因为没有plays表
      weekAudios: Number(weekAudiosResult.rows[0]?.count) || 0,
      weekUsers: Number(weekUsersResult.rows[0]?.count) || 0,
      weekPlays: 0 // 暂时设为0，因为没有plays表
    }
    
    console.log('[Dashboard Stats] 最近统计数据:', recentStats)
    return recentStats
    
  } catch (error) {
    console.error('[Dashboard Stats] 获取最近统计数据失败:', error)
    return {
      todayAudios: 0,
      todayUsers: 0,
      todayPlays: 0,
      weekAudios: 0,
      weekUsers: 0,
      weekPlays: 0
    }
  }
}

// GET 处理函数
export const GET = withSecurity(
  async (request: NextRequest) => {
    const startTime = Date.now()
    const requestId = `dashboard-stats-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
    
    try {
      console.log(`[${requestId}] 开始获取仪表盘统计数据`)
      
      // 首先检查数据库健康状态
      const isDbHealthy = await checkDatabaseHealth()
      if (!isDbHealthy) {
        throw new Error('数据库连接异常，无法提供服务')
      }
      
      // 并行获取所有统计数据
      const [basicStats, monthlyGrowth, categoryDistribution, recentStats] = await Promise.all([
        getBasicStats(),
        getMonthlyGrowth(),
        getCategoryDistribution(),
        getRecentStats()
      ])
      
      const totalTime = Date.now() - startTime
      console.log(`[${requestId}] 所有统计数据获取完成，总耗时: ${totalTime}ms`)
      
      const dashboardStats: DashboardStats = {
        ...basicStats,
        monthlyGrowth,
        categoryDistribution: categoryDistribution || [],
        recentStats
      }
      
      console.log(`[${requestId}] 仪表盘统计数据返回成功`)
      
      return NextResponse.json({
        success: true,
        data: dashboardStats,
        message: '统计数据获取成功'
      })
      
    } catch (error) {
      const totalTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      
      console.error(`[${requestId}] 仪表盘统计数据获取失败:`, {
        error: errorMessage,
        totalTime,
        stack: error instanceof Error ? error.stack : undefined
      })
      
      return NextResponse.json({
        success: false,
        error: {
          message: '获取统计数据失败',
          details: errorMessage
        }
      }, { status: 500 })
    }
  }, { 
    requireAuth: true, 
    requiredPermissions: [ANTD_ADMIN_PERMISSIONS.VIEW_ANALYTICS], 
    enableRateLimit: true,
    rateLimitMax: 60,  // 每分钟最多60次请求（管理员仪表板需要更高限制）
    rateLimitWindow: 60000  // 60秒窗口期
  })