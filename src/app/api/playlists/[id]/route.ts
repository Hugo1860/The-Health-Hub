import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { ApiResponse, DatabaseErrorHandler } from '@/lib/api-response'
import { authMiddleware } from '@/lib/auth-middleware'

const PLAYLISTS_FILE = join(process.cwd(), 'data', 'playlists.json')

interface PlaylistItem {
  playlistId: string
  audioId: string
  order: number
}

interface Playlist {
  id: string
  title: string
  description: string
  createdBy: string
  createdAt: string
  isPublic: boolean
  items: PlaylistItem[]
}

// 获取所有播放列表
async function getPlaylists(): Promise<Playlist[]> {
  try {
    const data = await readFile(PLAYLISTS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    return []
  }
}

// 保存播放列表
async function savePlaylists(playlists: Playlist[]): Promise<void> {
  await writeFile(PLAYLISTS_FILE, JSON.stringify(playlists, null, 2))
}

// 获取单个播放列表 - 需要用户认证
export const GET = authMiddleware.user(
  async (request: NextRequest, context, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      const playlists = await getPlaylists()
      const playlist = playlists.find(p => p.id === id)
      
      if (!playlist) {
        return ApiResponse.notFound('播放列表不存在')
      }
      
      // 检查访问权限
      if (!playlist.isPublic && playlist.createdBy !== context.user!.id) {
        return ApiResponse.forbidden('权限不足')
      }
      
      return ApiResponse.success({ playlist })
      
    } catch (error) {
      return DatabaseErrorHandler.handle(error, 'Get playlist error')
    }
  }
)

// 更新播放列表 - 需要用户认证
export const PUT = authMiddleware.user(
  async (request: NextRequest, context, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      const updateData = await request.json()
      const playlists = await getPlaylists()
      const playlistIndex = playlists.findIndex(p => p.id === id)
      
      if (playlistIndex === -1) {
        return ApiResponse.notFound('播放列表不存在')
      }
      
      const playlist = playlists[playlistIndex]
      
      // 检查权限
      if (playlist.createdBy !== context.user!.id) {
        return ApiResponse.forbidden('权限不足')
      }
      
      // 更新播放列表信息
      const updatedPlaylist = {
        ...playlist,
        ...updateData,
        id: id, // 确保ID不被修改
        createdBy: playlist.createdBy, // 确保创建者不被修改
        createdAt: playlist.createdAt // 确保创建时间不被修改
      }
      
      // 验证必填字段
      if (!updatedPlaylist.title) {
        return ApiResponse.badRequest('播放列表标题是必填项', {
          field: 'title',
          message: 'Title is required'
        })
      }
      
      playlists[playlistIndex] = updatedPlaylist
      await savePlaylists(playlists)
      
      return ApiResponse.success(updatedPlaylist, '播放列表更新成功')
      
    } catch (error) {
      return DatabaseErrorHandler.handle(error, 'Update playlist error')
    }
  }
)

// 删除播放列表 - 需要用户认证
export const DELETE = authMiddleware.user(
  async (request: NextRequest, context, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      const playlists = await getPlaylists()
      const playlistIndex = playlists.findIndex(p => p.id === id)
      
      if (playlistIndex === -1) {
        return ApiResponse.notFound('播放列表不存在')
      }
      
      const playlist = playlists[playlistIndex]
      
      // 检查权限
      if (playlist.createdBy !== context.user!.id) {
        return ApiResponse.forbidden('权限不足')
      }
      
      // 删除播放列表
      playlists.splice(playlistIndex, 1)
      await savePlaylists(playlists)
      
      return ApiResponse.success(null, '播放列表删除成功')
      
    } catch (error) {
      return DatabaseErrorHandler.handle(error, 'Delete playlist error')
    }
  }
)