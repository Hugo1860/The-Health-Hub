// Dashboard 最近活动 API

import { NextRequest } from 'next/server'
import db from '@/lib/db'
import { AdminApiResponseBuilder, parseSearchParams } from '@/lib/adminApiUtils'
import { createAdminMiddleware, AdminPermission } from '@/lib/adminAuthMiddleware'
import { withErrorHandling, withDatabaseErrorHandling } from '@/lib/adminErrorMiddleware'
import { ActivityType, RecentActivity } from '@/types/admin'

// 活动标题和描述映射
const ACTIVITY_CONFIG: Record<ActivityType, {
  titleTemplate: string
  descriptionTemplate: string
  icon: string
}> = {
  [ActivityType.AUDIO_UPLOAD]: {
    titleTemplate: '新增音频《{title}》',
    descriptionTemplate: '{username} 上传了新音频',
    icon: 'sound'
  },
  [ActivityType.USER_REGISTER]: {
    titleTemplate: '新用户注册：{username}',
    descriptionTemplate: '新用户 {username} 加入了平台',
    icon: 'user-add'
  },
  [ActivityType.COMMENT_POST]: {
    titleTemplate: '收到新评论',
    descriptionTemplate: '{username} 对《{targetTitle}》发表了评论',
    icon: 'comment'
  },
  [ActivityType.USER_LOGIN]: {
    titleTemplate: '用户登录：{username}',
    descriptionTemplate: '{username} 登录了系统',
    icon: 'login'
  },
  [ActivityType.AUDIO_PLAY]: {
    titleTemplate: '音频播放：《{targetTitle}》',
    descriptionTemplate: '{username} 播放了音频《{targetTitle}》',
    icon: 'play'
  },
  [ActivityType.FAVORITE_ADD]: {
    titleTemplate: '添加收藏：《{targetTitle}》',
    descriptionTemplate: '{username} 收藏了音频《{targetTitle}》',
    icon: 'heart'
  },
  [ActivityType.PLAYLIST_CREATE]: {
    titleTemplate: '创建播放列表：{targetTitle}',
    descriptionTemplate: '{username} 创建了新的播放列表',
    icon: 'playlist'
  }
}

// 格式化活动标题和描述
function formatActivity(
  type: ActivityType,
  data: {
    username?: string
    title?: string
    targetTitle?: string
    [key: string]: any
  }
): { title: string; description: string } {
  const config = ACTIVITY_CONFIG[type]
  
  const title = config.titleTemplate
    .replace('{username}', data.username || '未知用户')
    .replace('{title}', data.title || '未知标题')
    .replace('{targetTitle}', data.targetTitle || '未知资源')
  
  const description = config.descriptionTemplate
    .replace('{username}', data.username || '未知用户')
    .replace('{title}', data.title || '未知标题')
    .replace('{targetTitle}', data.targetTitle || '未知资源')
  
  return { title, description }
}

// 获取音频上传活动
const getAudioUploadActivities = withDatabaseErrorHandling(async (limit: number): Promise<RecentActivity[]> => {
  const query = `
    SELECT 
      a.id,
      a.title,
      a.created_at as timestamp,
      u.id as user_id,
      u.username,
      u.email
    FROM audios a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE a.deleted_at IS NULL
    ORDER BY a.created_at DESC
    LIMIT ?
  `
  
  const results = db.prepare(query).all(limit) as any[]
  
  return results.map(row => {
    const { title, description } = formatActivity(ActivityType.AUDIO_UPLOAD, {
      username: row.username || row.email?.split('@')[0] || '未知用户',
      title: row.title
    })
    
    return {
      id: `audio_${row.id}`,
      type: ActivityType.AUDIO_UPLOAD,
      title,
      description,
      userId: row.user_id,
      username: row.username || row.email?.split('@')[0],
      targetId: row.id,
      targetTitle: row.title,
      timestamp: row.timestamp,
      metadata: {
        audioId: row.id,
        audioTitle: row.title
      }
    }
  })
})

// 获取用户注册活动
const getUserRegisterActivities = withDatabaseErrorHandling(async (limit: number): Promise<RecentActivity[]> => {
  const query = `
    SELECT 
      id,
      username,
      email,
      created_at as timestamp
    FROM users
    WHERE deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT ?
  `
  
  const results = db.prepare(query).all(limit) as any[]
  
  return results.map(row => {
    const username = row.username || row.email?.split('@')[0] || '未知用户'
    const { title, description } = formatActivity(ActivityType.USER_REGISTER, { username })
    
    return {
      id: `user_${row.id}`,
      type: ActivityType.USER_REGISTER,
      title,
      description,
      userId: row.id,
      username,
      timestamp: row.timestamp,
      metadata: {
        userId: row.id,
        email: row.email
      }
    }
  })
})

// 获取评论活动
const getCommentActivities = withDatabaseErrorHandling(async (limit: number): Promise<RecentActivity[]> => {
  const query = `
    SELECT 
      c.id,
      c.content,
      c.created_at as timestamp,
      c.audio_id,
      u.id as user_id,
      u.username,
      u.email,
      a.title as audio_title
    FROM comments c
    LEFT JOIN users u ON c.user_id = u.id
    LEFT JOIN audios a ON c.audio_id = a.id
    WHERE c.deleted_at IS NULL
    ORDER BY c.created_at DESC
    LIMIT ?
  `
  
  const results = db.prepare(query).all(limit) as any[]
  
  return results.map(row => {
    const username = row.username || row.email?.split('@')[0] || '未知用户'
    const { title, description } = formatActivity(ActivityType.COMMENT_POST, {
      username,
      targetTitle: row.audio_title
    })
    
    return {
      id: `comment_${row.id}`,
      type: ActivityType.COMMENT_POST,
      title,
      description,
      userId: row.user_id,
      username,
      targetId: row.audio_id,
      targetTitle: row.audio_title,
      timestamp: row.timestamp,
      metadata: {
        commentId: row.id,
        audioId: row.audio_id,
        commentContent: row.content?.substring(0, 100) // 截取前100字符
      }
    }
  })
})

// 获取收藏活动（如果有收藏表的话）
const getFavoriteActivities = withDatabaseErrorHandling(async (limit: number): Promise<RecentActivity[]> => {
  try {
    const query = `
      SELECT 
        f.id,
        f.created_at as timestamp,
        f.audio_id,
        u.id as user_id,
        u.username,
        u.email,
        a.title as audio_title
      FROM favorites f
      LEFT JOIN users u ON f.user_id = u.id
      LEFT JOIN audios a ON f.audio_id = a.id
      WHERE f.deleted_at IS NULL
      ORDER BY f.created_at DESC
      LIMIT ?
    `
    
    const results = db.prepare(query).all(limit) as any[]
    
    return results.map(row => {
      const username = row.username || row.email?.split('@')[0] || '未知用户'
      const { title, description } = formatActivity(ActivityType.FAVORITE_ADD, {
        username,
        targetTitle: row.audio_title
      })
      
      return {
        id: `favorite_${row.id}`,
        type: ActivityType.FAVORITE_ADD,
        title,
        description,
        userId: row.user_id,
        username,
        targetId: row.audio_id,
        targetTitle: row.audio_title,
        timestamp: row.timestamp,
        metadata: {
          favoriteId: row.id,
          audioId: row.audio_id
        }
      }
    })
  } catch (error) {
    // 如果favorites表不存在，返回空数组
    console.log('Favorites table not found, skipping favorite activities')
    return []
  }
})

// 获取所有最近活动
const getAllRecentActivities = withDatabaseErrorHandling(async (limit: number = 50): Promise<RecentActivity[]> => {
  const activityLimit = Math.ceil(limit / 4) // 每种活动类型获取的数量
  
  // 并行获取各种活动
  const [audioActivities, userActivities, commentActivities, favoriteActivities] = await Promise.all([
    getAudioUploadActivities(activityLimit),
    getUserRegisterActivities(activityLimit),
    getCommentActivities(activityLimit),
    getFavoriteActivities(activityLimit)
  ])
  
  // 合并所有活动
  const allActivities = [
    ...audioActivities,
    ...userActivities,
    ...commentActivities,
    ...favoriteActivities
  ]
  
  // 按时间排序并限制数量
  return allActivities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit)
})

// GET 处理函数
async function handleGet(request: NextRequest): Promise<Response> {
  try {
    const { page = 1, pageSize = 20, filters } = parseSearchParams(request)
    
    // 获取活动类型过滤器
    const activityType = filters?.type as ActivityType | undefined
    
    let activities: RecentActivity[]
    
    if (activityType) {
      // 获取特定类型的活动
      switch (activityType) {
        case ActivityType.AUDIO_UPLOAD:
          activities = await getAudioUploadActivities(pageSize)
          break
        case ActivityType.USER_REGISTER:
          activities = await getUserRegisterActivities(pageSize)
          break
        case ActivityType.COMMENT_POST:
          activities = await getCommentActivities(pageSize)
          break
        case ActivityType.FAVORITE_ADD:
          activities = await getFavoriteActivities(pageSize)
          break
        default:
          activities = await getAllRecentActivities(pageSize)
      }
    } else {
      // 获取所有活动
      activities = await getAllRecentActivities(pageSize)
    }
    
    // 简单分页处理
    const startIndex = (page - 1) * pageSize
    const paginatedActivities = activities.slice(startIndex, startIndex + pageSize)
    
    return AdminApiResponseBuilder.success(
      paginatedActivities,
      '最近活动获取成功',
      {
        page,
        pageSize,
        total: activities.length,
        totalPages: Math.ceil(activities.length / pageSize),
        hasNext: startIndex + pageSize < activities.length,
        hasPrev: page > 1
      }
    )
  } catch (error) {
    console.error('Failed to fetch recent activities:', error)
    throw error
  }
}

// 应用中间件并导出处理函数
export const GET = createAdminMiddleware({
  permissions: [AdminPermission.VIEW_SYSTEM_STATS],
  rateLimit: { maxRequests: 100, windowMs: 60000 } // 每分钟最多100次请求
})(withErrorHandling(handleGet))