// Dashboard 最近活动 API

import { NextRequest } from 'next/server'
import db from '@/lib/db'
import { AdminApiResponseBuilder } from '@/lib/adminApiUtils'

// 活动类型枚举
enum ActivityType {
  AUDIO_UPLOAD = 'audio_upload',
  USER_REGISTER = 'user_register',
  COMMENT_POST = 'comment_post'
}

// 最近活动接口
interface RecentActivity {
  id: string
  type: ActivityType
  title: string
  description: string
  userId?: string
  username?: string
  targetId?: string
  targetTitle?: string
  timestamp: string
  metadata?: Record<string, any>
}

// 获取音频上传活动
const getAudioUploadActivities = async (limit: number): Promise<RecentActivity[]> => {
  try {
    const query = `
      SELECT 
        a.id,
        a.title,
        a.uploadDate as timestamp,
        'system' as username
      FROM audios a
      ORDER BY a.uploadDate DESC
      LIMIT ?
    `
    
    const results = db.prepare(query).all(limit) as any[]
    
    return results.map(row => ({
      id: `audio_${row.id}`,
      type: ActivityType.AUDIO_UPLOAD,
      title: `新增音频《${row.title}》`,
      description: `系统上传了新音频`,
      userId: 'system',
      username: row.username,
      targetId: row.id,
      targetTitle: row.title,
      timestamp: row.timestamp,
      metadata: {
        audioId: row.id,
        audioTitle: row.title
      }
    }))
  } catch (error) {
    console.error('获取音频上传活动失败:', error)
    return []
  }
}

// 获取用户注册活动
const getUserRegisterActivities = async (limit: number): Promise<RecentActivity[]> => {
  try {
    const query = `
      SELECT 
        id,
        username,
        email,
        createdAt as timestamp
      FROM users
      ORDER BY createdAt DESC
      LIMIT ?
    `
    
    const results = db.prepare(query).all(limit) as any[]
    
    return results.map(row => {
      const username = row.username || row.email?.split('@')[0] || '未知用户'
      
      return {
        id: `user_${row.id}`,
        type: ActivityType.USER_REGISTER,
        title: `新用户注册：${username}`,
        description: `新用户 ${username} 加入了平台`,
        userId: row.id,
        username,
        timestamp: row.timestamp,
        metadata: {
          userId: row.id,
          email: row.email
        }
      }
    })
  } catch (error) {
    console.error('获取用户注册活动失败:', error)
    return []
  }
}

// 获取评论活动
const getCommentActivities = async (limit: number): Promise<RecentActivity[]> => {
  try {
    const query = `
      SELECT 
        c.id,
        c.content,
        c.createdAt as timestamp,
        c.audioId as audio_id,
        'anonymous' as username,
        a.title as audio_title
      FROM comments c
      LEFT JOIN audios a ON c.audioId = a.id
      ORDER BY c.createdAt DESC
      LIMIT ?
    `
    
    const results = db.prepare(query).all(limit) as any[]
    
    return results.map(row => {
      const username = row.username || '匿名用户'
      
      return {
        id: `comment_${row.id}`,
        type: ActivityType.COMMENT_POST,
        title: '收到新评论',
        description: `${username} 对《${row.audio_title}》发表了评论`,
        userId: 'anonymous',
        username,
        targetId: row.audio_id,
        targetTitle: row.audio_title,
        timestamp: row.timestamp,
        metadata: {
          commentId: row.id,
          audioId: row.audio_id,
          commentContent: row.content?.substring(0, 100)
        }
      }
    })
  } catch (error) {
    console.error('获取评论活动失败:', error)
    return []
  }
}

// 获取所有最近活动
const getAllRecentActivities = async (limit: number = 50): Promise<RecentActivity[]> => {
  try {
    const activityLimit = Math.ceil(limit / 3) // 每种活动类型获取的数量
    
    // 并行获取各种活动
    const [audioActivities, userActivities, commentActivities] = await Promise.all([
      getAudioUploadActivities(activityLimit),
      getUserRegisterActivities(activityLimit),
      getCommentActivities(activityLimit)
    ])
    
    // 合并所有活动
    const allActivities = [
      ...audioActivities,
      ...userActivities,
      ...commentActivities
    ]
    
    // 按时间排序并限制数量
    return allActivities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  } catch (error) {
    console.error('获取所有最近活动失败:', error)
    return []
  }
}

// GET 处理函数
export async function GET(request: NextRequest): Promise<Response> {
  try {
    console.log('[Recent Activity API] 开始获取最近活动数据')
    
    const url = new URL(request.url)
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20')
    
    const activities = await getAllRecentActivities(pageSize)
    
    console.log(`[Recent Activity API] 获取到 ${activities.length} 条活动记录`)
    
    return AdminApiResponseBuilder.success(
      activities,
      '最近活动获取成功'
    )
  } catch (error) {
    console.error('[Recent Activity API] 获取最近活动失败:', error)
    return AdminApiResponseBuilder.error(
      'INTERNAL_ERROR' as any,
      '获取最近活动失败',
      error instanceof Error ? error.message : '未知错误'
    )
  }
}