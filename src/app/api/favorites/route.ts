import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const DATA_DIR = join(process.cwd(), 'data')
const FAVORITES_FILE = join(DATA_DIR, 'favorites.json')

interface Favorite {
  audioId: string
  userId: string
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
    await readFile(FAVORITES_FILE, 'utf-8')
  } catch (error) {
    // 如果文件不存在，创建空数组
    await writeFile(FAVORITES_FILE, JSON.stringify([], null, 2))
  }
}

// 获取所有收藏
async function getFavorites(): Promise<Favorite[]> {
  await ensureDataStructure()
  const data = await readFile(FAVORITES_FILE, 'utf-8')
  return JSON.parse(data)
}

// 保存收藏
async function saveFavorites(favorites: Favorite[]): Promise<void> {
  await writeFile(FAVORITES_FILE, JSON.stringify(favorites, null, 2))
}

// 获取用户收藏列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const audioId = searchParams.get('audioId')
    
    const favorites = await getFavorites()
    
    if (audioId) {
      // 检查特定音频是否被收藏
      const isFavorited = favorites.some(
        fav => fav.audioId === audioId && fav.userId === session.user.id
      )
      
      return NextResponse.json({ 
        audioId,
        isFavorited 
      })
    } else {
      // 获取用户的所有收藏
      const userFavorites = favorites.filter(fav => fav.userId === session.user.id)
      
      // 按收藏时间倒序排列
      userFavorites.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      
      return NextResponse.json({ 
        favorites: userFavorites 
      })
    }
    
  } catch (error) {
    console.error('Get favorites error:', error)
    return NextResponse.json(
      { error: '获取收藏失败' },
      { status: 500 }
    )
  }
}

// 添加收藏
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }
    
    const { audioId } = await request.json()
    
    // 验证输入
    if (!audioId) {
      return NextResponse.json(
        { error: '音频ID是必填项' },
        { status: 400 }
      )
    }
    
    const favorites = await getFavorites()
    
    // 检查是否已经收藏
    const existingFavorite = favorites.find(
      fav => fav.audioId === audioId && fav.userId === session.user.id
    )
    
    if (existingFavorite) {
      return NextResponse.json(
        { error: '已经收藏过这个音频' },
        { status: 409 }
      )
    }
    
    // 添加收藏
    const newFavorite: Favorite = {
      audioId,
      userId: session.user.id,
      createdAt: new Date().toISOString()
    }
    
    favorites.push(newFavorite)
    await saveFavorites(favorites)
    
    return NextResponse.json({
      message: '收藏成功',
      favorite: newFavorite
    }, { status: 201 })
    
  } catch (error) {
    console.error('Add favorite error:', error)
    return NextResponse.json(
      { error: '收藏失败' },
      { status: 500 }
    )
  }
}

// 取消收藏
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const audioId = searchParams.get('audioId')
    
    if (!audioId) {
      return NextResponse.json(
        { error: '音频ID是必填项' },
        { status: 400 }
      )
    }
    
    const favorites = await getFavorites()
    
    // 查找并移除收藏
    const favoriteIndex = favorites.findIndex(
      fav => fav.audioId === audioId && fav.userId === session.user.id
    )
    
    if (favoriteIndex === -1) {
      return NextResponse.json(
        { error: '未收藏此音频' },
        { status: 404 }
      )
    }
    
    favorites.splice(favoriteIndex, 1)
    await saveFavorites(favorites)
    
    return NextResponse.json({
      message: '取消收藏成功'
    })
    
  } catch (error) {
    console.error('Remove favorite error:', error)
    return NextResponse.json(
      { error: '取消收藏失败' },
      { status: 500 }
    )
  }
}