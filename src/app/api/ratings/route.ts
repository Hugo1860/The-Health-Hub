import { NextRequest } from 'next/server'
import { withSecurity } from '@/lib/secureApiWrapper'
import { AuthResponseBuilder } from '@/lib/auth-response-builder'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const DATA_DIR = join(process.cwd(), 'data')
const RATINGS_FILE = join(DATA_DIR, 'ratings.json')

interface Rating {
  audioId: string
  userId: string
  value: number // 1-5
  createdAt: string
}

// 确保数据结构存在
async function ensureDataStructure() {
  try {
    await mkdir(DATA_DIR, { recursive: true })
  } catch (error) {
    // 目录已存在
  }
  
  try {
    await readFile(RATINGS_FILE, 'utf-8')
  } catch (error) {
    // 如果文件不存在，创建空数组
    await writeFile(RATINGS_FILE, JSON.stringify([], null, 2))
  }
}

// 获取所有评分
async function getRatings(): Promise<Rating[]> {
  await ensureDataStructure()
  const data = await readFile(RATINGS_FILE, 'utf-8')
  return JSON.parse(data)
}

// 保存评分
async function saveRatings(ratings: Rating[]): Promise<void> {
  await writeFile(RATINGS_FILE, JSON.stringify(ratings, null, 2))
}

// 获取音频评分统计 - 公开访问
export const GET = withSecurity(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url)
      const audioId = searchParams.get('audioId')
      
      if (!audioId) {
        return AuthResponseBuilder.validationError(
          '音频ID是必填项',
          { audioId: ['音频ID是必填项'] }
        )
      }
      
      const ratings = await getRatings()
      
      // 过滤指定音频的评分
      const audioRatings = ratings.filter(rating => rating.audioId === audioId)
      
      if (audioRatings.length === 0) {
        return AuthResponseBuilder.success({
          audioId,
          averageRating: 0,
          totalRatings: 0,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        })
      }
      
      // 计算平均评分
      const totalScore = audioRatings.reduce((sum, rating) => sum + rating.value, 0)
      const averageRating = Math.round((totalScore / audioRatings.length) * 10) / 10
      
      // 计算评分分布
      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      audioRatings.forEach(rating => {
        distribution[rating.value as keyof typeof distribution]++
      })
      
      return AuthResponseBuilder.success({
        audioId,
        averageRating,
        totalRatings: audioRatings.length,
        distribution
      })
      
    } catch (error) {
      console.error('Get ratings error:', error)
      return AuthResponseBuilder.fromError(error instanceof Error ? error : String(error))
    }
  }, { requireAuth: false, enableRateLimit: true, allowedMethods: ['GET'] }
)

// 提交或更新评分
export const POST = withSecurity(
  async (request: NextRequest) => {
    try {
      const { audioId, value } = await request.json()
      
      // 验证输入
      const errors: Record<string, string[]> = {}
      
      if (!audioId) {
        errors.audioId = ['音频ID是必填项']
      }
      
      if (typeof value !== 'number') {
        errors.value = ['评分值是必填项']
      } else if (value < 1 || value > 5 || !Number.isInteger(value)) {
        errors.value = ['评分值必须是1-5之间的整数']
      }
      
      if (Object.keys(errors).length > 0) {
        return AuthResponseBuilder.validationError(
          '输入验证失败',
          errors
        )
      }
      
      const ratings = await getRatings()
      
      // 检查用户是否已经评分过
      const userId = request.headers.get('x-user-id') as string
      const existingRatingIndex = ratings.findIndex(rating => rating.audioId === audioId && rating.userId === userId)
      
      if (existingRatingIndex !== -1) {
        // 更新现有评分
        ratings[existingRatingIndex] = {
          ...ratings[existingRatingIndex],
          value,
          createdAt: new Date().toISOString() // 更新时间
        }
        
        await saveRatings(ratings)
        
        return AuthResponseBuilder.success({
          message: '评分更新成功',
          rating: ratings[existingRatingIndex]
        })
      } else {
        // 创建新评分
        const newRating: Rating = {
          audioId,
          userId,
          value,
          createdAt: new Date().toISOString()
        }
        
        ratings.push(newRating)
        await saveRatings(ratings)
        
        return AuthResponseBuilder.created({
          message: '评分提交成功',
          rating: newRating
        })
      }
      
    } catch (error) {
      console.error('Submit rating error:', error)
      return AuthResponseBuilder.fromError(error instanceof Error ? error : String(error))
    }
  }, { requireAuth: true, requireCSRF: true, enableRateLimit: true, rateLimitMax: 10, rateLimitWindow: 60000, allowedMethods: ['POST'] }
)

// 获取用户对特定音频的评分
export const PUT = withSecurity(
  async (request: NextRequest) => {
    try {
      const { audioId } = await request.json()
      
      if (!audioId) {
        return AuthResponseBuilder.validationError(
          '音频ID是必填项',
          { audioId: ['音频ID是必填项'] }
        )
      }
      
      const ratings = await getRatings()
      
      // 查找用户对该音频的评分
      const userId = request.headers.get('x-user-id') as string
      const userRating = ratings.find(rating => rating.audioId === audioId && rating.userId === userId)
      
      return AuthResponseBuilder.success({
        audioId,
        userRating: userRating ? userRating.value : null
      })
      
    } catch (error) {
      console.error('Get user rating error:', error)
      return AuthResponseBuilder.fromError(error instanceof Error ? error : String(error))
    }
  }, { requireAuth: true, enableRateLimit: true, allowedMethods: ['PUT'] }
)