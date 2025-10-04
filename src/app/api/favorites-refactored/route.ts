/**
 * 重构后的收藏API - 使用新的会话验证工具函数和统一响应格式
 * 这是一个示例，展示如何使用统一的会话验证函数和响应构建器
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateUserSession, requireUser } from '@/lib/session-validator'
import { AuthResponseBuilder } from '@/lib/auth-response-builder'
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

// 获取用户收藏列表 - 使用新的会话验证和响应格式
export async function GET(request: NextRequest) {
  try {
    // 使用新的会话验证函数
    const sessionResult = await validateUserSession()
    
    if (!sessionResult.isValid || !sessionResult.user) {
      return AuthResponseBuilder.fromError(
        sessionResult.error || '未授权访问'
      )
    }
    
    const user = sessionResult.user
    const { searchParams } = new URL(request.url)
    const audioId = searchParams.get('audioId')
    
    const favorites = await getFavorites()
    
    if (audioId) {
      // 检查特定音频是否被收藏
      const isFavorited = favorites.some(
        fav => fav.audioId === audioId && fav.userId === user.id
      )
      
      return AuthResponseBuilder.success({ 
        audioId,
        isFavorited 
      })
    } else {
      // 获取用户的所有收藏
      const userFavorites = favorites.filter(fav => fav.userId === user.id)
      
      // 按收藏时间倒序排列
      userFavorites.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      
      return AuthResponseBuilder.success({ 
        favorites: userFavorites 
      })
    }
    
  } catch (error) {
    console.error('Get favorites error:', error)
    return AuthResponseBuilder.customError(
      '获取收藏失败',
      'INTERNAL_ERROR',
      500
    )
  }
}

// 添加收藏 - 使用便捷的requireUser函数
export async function POST(request: NextRequest) {
  try {
    // 使用便捷的requireUser函数
    const user = await requireUser()
    
    const { audioId } = await request.json()
    
    // 验证输入
    if (!audioId) {
      return AuthResponseBuilder.validationError(
        '音频ID是必填项',
        { audioId: ['音频ID是必填项'] }
      )
    }
    
    const favorites = await getFavorites()
    
    // 检查是否已经收藏
    const existingFavorite = favorites.find(
      fav => fav.audioId === audioId && fav.userId === user.id
    )
    
    if (existingFavorite) {
      return AuthResponseBuilder.customError(
        '已经收藏过这个音频',
        'ALREADY_EXISTS',
        409
      )
    }
    
    // 添加收藏
    const newFavorite: Favorite = {
      audioId,
      userId: user.id,
      createdAt: new Date().toISOString()
    }
    
    favorites.push(newFavorite)
    await saveFavorites(favorites)
    
    return AuthResponseBuilder.created({
      message: '收藏成功',
      favorite: newFavorite
    })
    
  } catch (error) {
    console.error('Add favorite error:', error)
    
    // 使用统一的错误响应构建器
    return AuthResponseBuilder.fromError(
      error instanceof Error ? error : '收藏失败'
    )
  }
}

// 取消收藏 - 展示错误处理的改进
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser()
    
    const { searchParams } = new URL(request.url)
    const audioId = searchParams.get('audioId')
    
    if (!audioId) {
      return AuthResponseBuilder.validationError(
        '音频ID是必填项',
        { audioId: ['音频ID是必填项'] }
      )
    }
    
    const favorites = await getFavorites()
    
    // 查找并移除收藏
    const favoriteIndex = favorites.findIndex(
      fav => fav.audioId === audioId && fav.userId === user.id
    )
    
    if (favoriteIndex === -1) {
      return AuthResponseBuilder.customError(
        '未收藏此音频',
        'NOT_FOUND',
        404
      )
    }
    
    favorites.splice(favoriteIndex, 1)
    await saveFavorites(favorites)
    
    return AuthResponseBuilder.success({
      message: '取消收藏成功'
    })
    
  } catch (error) {
    console.error('Remove favorite error:', error)
    
    // 使用统一的错误响应构建器
    return AuthResponseBuilder.fromError(
      error instanceof Error ? error : '取消收藏失败'
    )
  }
}