import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { ApiResponse, DatabaseErrorHandler } from '@/lib/api-response'
import { withSecurity } from '@/lib/secureApiWrapper'

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

// 添加音频到播放列表 - 需要用户认证
export const POST = withSecurity(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      const { audioId } = await request.json()
      
      if (!audioId) {
        return ApiResponse.badRequest('音频ID是必填项', {
          field: 'audioId',
          message: 'Audio ID is required'
        });
      }
      
      const playlists = await getPlaylists()
      const playlistIndex = playlists.findIndex(p => p.id === id)
      
      if (playlistIndex === -1) {
        return ApiResponse.notFound('播放列表不存在')
      }
      
      const playlist = playlists[playlistIndex]
      
      // 检查权限
      const userId = request.headers.get('x-user-id') as string
      if (playlist.createdBy !== userId) {
        return ApiResponse.forbidden('权限不足')
      }
      
      // 检查音频是否已在播放列表中
      const existingItem = playlist.items.find(item => item.audioId === audioId)
      if (existingItem) {
        return ApiResponse.badRequest('音频已在播放列表中', {
          code: 'ALREADY_IN_PLAYLIST'
        });
      }
      
      // 添加音频到播放列表
      const newItem: PlaylistItem = {
        playlistId: id,
        audioId,
        order: playlist.items.length
      }
      
      playlist.items.push(newItem)
      playlists[playlistIndex] = playlist
      await savePlaylists(playlists)
      
      return ApiResponse.created(newItem, '音频添加到播放列表成功')
      
    } catch (error) {
      return DatabaseErrorHandler.handle(error as Error, 'Add to playlist error')
    }
  }, { requireAuth: true, requireCSRF: true, enableRateLimit: true, allowedMethods: ['POST'] }
)

// 从播放列表移除音频 - 需要用户认证
export const DELETE = withSecurity(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      const { searchParams } = new URL(request.url)
      const audioId = searchParams.get('audioId')
      
      if (!audioId) {
        return ApiResponse.badRequest('音频ID是必填项', {
          field: 'audioId',
          message: 'Audio ID is required'
        });
      }
      
      const playlists = await getPlaylists()
      const playlistIndex = playlists.findIndex(p => p.id === id)
      
      if (playlistIndex === -1) {
        return ApiResponse.notFound('播放列表不存在')
      }
      
      const playlist = playlists[playlistIndex]
      
      // 检查权限
      const userId = request.headers.get('x-user-id') as string
      if (playlist.createdBy !== userId) {
        return ApiResponse.forbidden('权限不足')
      }
      
      // 查找并移除音频
      const itemIndex = playlist.items.findIndex(item => item.audioId === audioId)
      if (itemIndex === -1) {
        return ApiResponse.notFound('音频不在播放列表中')
      }
      
      playlist.items.splice(itemIndex, 1)
      
      // 重新排序剩余项目
      playlist.items.forEach((item, index) => {
        item.order = index
      })
      
      playlists[playlistIndex] = playlist
      await savePlaylists(playlists)
      
      return ApiResponse.success(null, '音频从播放列表移除成功')
      
    } catch (error) {
      return DatabaseErrorHandler.handle(error as Error, 'Remove from playlist error')
    }
  }, { requireAuth: true, requireCSRF: true, enableRateLimit: true, allowedMethods: ['DELETE'] }
)

// 更新播放列表项顺序 - 需要用户认证
export const PUT = withSecurity(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      const { items } = await request.json()
      
      if (!Array.isArray(items)) {
        return ApiResponse.badRequest('无效的项目数据', {
          field: 'items',
          message: 'Items must be an array'
        });
      }
      
      const playlists = await getPlaylists()
      const playlistIndex = playlists.findIndex(p => p.id === id)
      
      if (playlistIndex === -1) {
        return ApiResponse.notFound('播放列表不存在')
      }
      
      const playlist = playlists[playlistIndex]
      
      // 检查权限
      const userId = request.headers.get('x-user-id') as string
      if (playlist.createdBy !== userId) {
        return ApiResponse.forbidden('权限不足')
      }
      
      // 更新项目顺序
      playlist.items = items.map((item, index) => ({
        ...item,
        playlistId: id,
        order: index
      }))
      
      playlists[playlistIndex] = playlist
      await savePlaylists(playlists)
      
      return ApiResponse.success({
        items: playlist.items
      }, '播放列表顺序更新成功')
      
    } catch (error) {
      return DatabaseErrorHandler.handle(error as Error, 'Update playlist order error')
    }
  }, { requireAuth: true, requireCSRF: true, enableRateLimit: true, allowedMethods: ['PUT'] }
)