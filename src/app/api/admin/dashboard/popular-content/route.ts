// Dashboard 热门内容 API

import { NextRequest } from 'next/server'
import { getDatabase } from '@/lib/database'
import { AdminApiResponseBuilder } from '@/lib/adminApiUtils'

// 热门内容数据接口
interface PopularContent {
  recentAudios: Array<{
    id: string
    title: string
    "uploadDate": string
    plays: number
    duration: number
    speaker?: string
    subject: string
    description?: string
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
}

// 获取最新音频
const getRecentAudios = async (limit: number = 10): Promise<PopularContent['recentAudios']> => {
  try {
    const db = getDatabase()
    const query = `
      SELECT 
        id,
        title,
        description,
        upload_date as "uploadDate",
        0 as plays,
        COALESCE(duration, 0) as duration,
        speaker,
        subject
      FROM audios
      ORDER BY upload_date DESC
      LIMIT ?
    `
    
    const result = await db.query(query, [limit])
    const results = result.rows
    
    return results.map(row => ({
      id: row.id,
      title: row.title, uploadDate: row.uploadDate,
      plays: row.plays,
      duration: row.duration,
      speaker: row.speaker,
      subject: row.subject || '未分类',
      description: row.description || ''
    }))
  } catch (error) {
    console.error('获取最新音频失败:', error)
    return []
  }
}

// 获取热门音频（按播放量排序）
const getPopularAudios = async (limit: number = 10): Promise<PopularContent['popularAudios']> => {
  try {
    const db = getDatabase()
    const query = `
      SELECT 
        a.id,
        a.title,
        0 as plays,
        a.speaker,
        a.subject,
        COUNT(DISTINCT c.id) as comments,
        0 as likes,
        0 as rating
      FROM audios a
      LEFT JOIN comments c ON a.id = c.audio_id
      GROUP BY a.id, a.title, a.speaker, a.subject
      ORDER BY comments DESC
      LIMIT ?
    `
    
    const result = await db.query(query, [limit])
    const results = result.rows
    
    return results.map(row => ({
      id: row.id,
      title: row.title,
      plays: Number(row.plays),
      likes: Number(row.likes),
      comments: Number(row.comments),
      rating: Number(row.rating),
      subject: row.subject || '未分类',
      speaker: row.speaker
    }))
  } catch (error) {
    console.error('获取热门音频失败:', error)
    return []
  }
}

// 获取热门分类
const getTopCategories = async (limit: number = 8): Promise<PopularContent['topCategories']> => {
  try {
    const db = getDatabase()
    const query = `
      SELECT 
        subject as category,
        COUNT(*) as audio_count,
        0 as total_plays,
        0 as average_rating
      FROM audios a
      WHERE a.subject IS NOT NULL 
        AND a.subject != ''
      GROUP BY subject
      HAVING COUNT(*) > 0
      ORDER BY COUNT(*) DESC
      LIMIT ?
    `
    
    const result = await db.query(query, [limit])
    const results = result.rows
    
    return results.map(row => ({
      category: row.category,
      audioCount: Number(row.audio_count),
      totalPlays: Number(row.total_plays),
      averageRating: Number(row.average_rating)
    }))
  } catch (error) {
    console.error('获取热门分类失败:', error)
    return []
  }
}

// GET 处理函数
export async function GET(request: NextRequest): Promise<Response> {
  try {
    console.log('[Popular Content API] 开始获取热门内容数据')
    
    const url = new URL(request.url)
    const recentLimit = parseInt(url.searchParams.get('recentLimit') || '10')
    const popularLimit = parseInt(url.searchParams.get('popularLimit') || '10')
    const categoryLimit = parseInt(url.searchParams.get('categoryLimit') || '8')
    
    // 并行获取所有数据
    const [recentAudios, popularAudios, topCategories] = await Promise.all([
      getRecentAudios(recentLimit),
      getPopularAudios(popularLimit),
      getTopCategories(categoryLimit)
    ])
    
    const popularContent: PopularContent = {
      recentAudios,
      popularAudios,
      topCategories
    }
    
    console.log(`[Popular Content API] 获取数据完成: ${recentAudios.length} 最新音频, ${popularAudios.length} 热门音频, ${topCategories.length} 热门分类`)
    
    return AdminApiResponseBuilder.success(
      popularContent,
      '热门内容数据获取成功'
    )
  } catch (error) {
    console.error('[Popular Content API] 获取热门内容失败:', error)
    return AdminApiResponseBuilder.error(
      'INTERNAL_ERROR' as any,
      '获取热门内容失败',
      error instanceof Error ? error.message : '未知错误'
    )
  }
}