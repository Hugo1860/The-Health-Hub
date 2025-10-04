import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { ApiResponse, DatabaseErrorHandler } from '@/lib/api-response'
import { withSecurity } from '@/lib/secureApiWrapper'

const DATA_DIR = join(process.cwd(), 'data')
const PLAYLISTS_FILE = join(DATA_DIR, 'playlists.json')

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

// 确保数据结构存在
async function ensureDataStructure() {
  try {
    await mkdir(DATA_DIR, { recursive: true })
  } catch (error) {
    // 目录已存在
  }
  
  try {
    await readFile(PLAYLISTS_FILE, 'utf-8')
  } catch (error) {
    // 如果文件不存在，创建空数组
    await writeFile(PLAYLISTS_FILE, JSON.stringify([], null, 2))
  }
}

// 获取所有播放列表
async function getPlaylists(): Promise<Playlist[]> {
  await ensureDataStructure()
  const data = await readFile(PLAYLISTS_FILE, 'utf-8')
  return JSON.parse(data)
}

// 保存播放列表
async function savePlaylists(playlists: Playlist[]): Promise<void> {
  await writeFile(PLAYLISTS_FILE, JSON.stringify(playlists, null, 2))
}

// 生成播放列表ID
function generatePlaylistId(): string {
  return 'playlist-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
}

// 获取播放列表列表 - 需要用户认证
export const GET = withSecurity(
  async (request: NextRequest) => {
    try {
      const playlists = await getPlaylists()
      
      // 过滤用户可以看到的播放列表（自己的或公开的）
      const userId = request.headers.get('x-user-id') as string
      const visiblePlaylists = playlists.filter(playlist => playlist.createdBy === userId || playlist.isPublic)
      
      return ApiResponse.success({ playlists: visiblePlaylists })
      
    } catch (error) {
      return DatabaseErrorHandler.handle(error, 'Get playlists error')
    }
  }, { requireAuth: true, enableRateLimit: true, allowedMethods: ['GET'] }
)

// 创建播放列表 - 需要用户认证
export const POST = withSecurity(
  async (request: NextRequest) => {
    try {
      const { title, description, isPublic = false } = await request.json()
      
      // 验证输入
      if (!title) {
        return ApiResponse.badRequest('播放列表标题是必填项', {
          field: 'title',
          message: 'Title is required'
        })
      }
      
      const playlists = await getPlaylists()
      
      // 创建新播放列表
      const userId = request.headers.get('x-user-id') as string
      const newPlaylist: Playlist = {
        id: generatePlaylistId(),
        title,
        description: description || '',
        createdBy: userId,
        createdAt: new Date().toISOString(),
        isPublic,
        items: []
      }
      
      playlists.push(newPlaylist)
      await savePlaylists(playlists)
      
      return ApiResponse.created(newPlaylist, '播放列表创建成功')
      
    } catch (error) {
      return DatabaseErrorHandler.handle(error, 'Create playlist error')
    }
  }, { requireAuth: true, requireCSRF: true, enableRateLimit: true, rateLimitMax: 10, rateLimitWindow: 60000, allowedMethods: ['POST'] }
)