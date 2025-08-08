import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

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

// 获取播放列表列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }
    
    const playlists = await getPlaylists()
    
    // 过滤用户可以看到的播放列表（自己的或公开的）
    const visiblePlaylists = playlists.filter(playlist => 
      playlist.createdBy === session.user.id || playlist.isPublic
    )
    
    return NextResponse.json({ playlists: visiblePlaylists })
    
  } catch (error) {
    console.error('Get playlists error:', error)
    return NextResponse.json(
      { error: '获取播放列表失败' },
      { status: 500 }
    )
  }
}

// 创建播放列表
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }
    
    const { title, description, isPublic = false } = await request.json()
    
    // 验证输入
    if (!title) {
      return NextResponse.json(
        { error: '播放列表标题是必填项' },
        { status: 400 }
      )
    }
    
    const playlists = await getPlaylists()
    
    // 创建新播放列表
    const newPlaylist: Playlist = {
      id: generatePlaylistId(),
      title,
      description: description || '',
      createdBy: session.user.id,
      createdAt: new Date().toISOString(),
      isPublic,
      items: []
    }
    
    playlists.push(newPlaylist)
    await savePlaylists(playlists)
    
    return NextResponse.json({
      message: '播放列表创建成功',
      playlist: newPlaylist
    }, { status: 201 })
    
  } catch (error) {
    console.error('Create playlist error:', error)
    return NextResponse.json(
      { error: '创建播放列表失败' },
      { status: 500 }
    )
  }
}