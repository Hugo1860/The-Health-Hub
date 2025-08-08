import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
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

// 获取音频评分统计
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const audioId = searchParams.get('audioId')
    
    if (!audioId) {
      return NextResponse.json(
        { error: '音频ID是必填项' },
        { status: 400 }
      )
    }
    
    const ratings = await getRatings()
    
    // 过滤指定音频的评分
    const audioRatings = ratings.filter(rating => rating.audioId === audioId)
    
    if (audioRatings.length === 0) {
      return NextResponse.json({
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
    
    return NextResponse.json({
      audioId,
      averageRating,
      totalRatings: audioRatings.length,
      distribution
    })
    
  } catch (error) {
    console.error('Get ratings error:', error)
    return NextResponse.json(
      { error: '获取评分失败' },
      { status: 500 }
    )
  }
}

// 提交或更新评分
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }
    
    const { audioId, value } = await request.json()
    
    // 验证输入
    if (!audioId || typeof value !== 'number') {
      return NextResponse.json(
        { error: '音频ID和评分值是必填项' },
        { status: 400 }
      )
    }
    
    if (value < 1 || value > 5 || !Number.isInteger(value)) {
      return NextResponse.json(
        { error: '评分值必须是1-5之间的整数' },
        { status: 400 }
      )
    }
    
    const ratings = await getRatings()
    
    // 检查用户是否已经评分过
    const existingRatingIndex = ratings.findIndex(
      rating => rating.audioId === audioId && rating.userId === session.user.id
    )
    
    if (existingRatingIndex !== -1) {
      // 更新现有评分
      ratings[existingRatingIndex] = {
        ...ratings[existingRatingIndex],
        value,
        createdAt: new Date().toISOString() // 更新时间
      }
      
      await saveRatings(ratings)
      
      return NextResponse.json({
        message: '评分更新成功',
        rating: ratings[existingRatingIndex]
      })
    } else {
      // 创建新评分
      const newRating: Rating = {
        audioId,
        userId: session.user.id,
        value,
        createdAt: new Date().toISOString()
      }
      
      ratings.push(newRating)
      await saveRatings(ratings)
      
      return NextResponse.json({
        message: '评分提交成功',
        rating: newRating
      }, { status: 201 })
    }
    
  } catch (error) {
    console.error('Submit rating error:', error)
    return NextResponse.json(
      { error: '提交评分失败' },
      { status: 500 }
    )
  }
}

// 获取用户对特定音频的评分
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }
    
    const { audioId } = await request.json()
    
    if (!audioId) {
      return NextResponse.json(
        { error: '音频ID是必填项' },
        { status: 400 }
      )
    }
    
    const ratings = await getRatings()
    
    // 查找用户对该音频的评分
    const userRating = ratings.find(
      rating => rating.audioId === audioId && rating.userId === session.user.id
    )
    
    return NextResponse.json({
      audioId,
      userRating: userRating ? userRating.value : null
    })
    
  } catch (error) {
    console.error('Get user rating error:', error)
    return NextResponse.json(
      { error: '获取用户评分失败' },
      { status: 500 }
    )
  }
}