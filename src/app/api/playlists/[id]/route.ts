import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

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

// 获取单个播放列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }
    
    const playlists = await getPlaylists()
    const playlist = playlists.find(p => p.id === id)
    
    if (!playlist) {
      return NextResponse.json(
        { error: '播放列表不存在' },
        { status: 404 }
      )
    }
    
    // 检查访问权限
    if (!playlist.isPublic && playlist.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: '权限不足' },
        { status: 403 }
      )
    }
    
    return NextResponse.json({ playlist })
    
  } catch (error) {
    console.error('Get playlist error:', error)
    return NextResponse.json(
      { error: '获取播放列表失败' },
      { status: 500 }
    )
  }
}

// 更新播放列表
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }
    
    const updateData = await request.json()
    const playlists = await getPlaylists()
    const playlistIndex = playlists.findIndex(p => p.id === id)
    
    if (playlistIndex === -1) {
      return NextResponse.json(
        { error: '播放列表不存在' },
        { status: 404 }
      )
    }
    
    const playlist = playlists[playlistIndex]
    
    // 检查权限
    if (playlist.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: '权限不足' },
        { status: 403 }
      )
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
      return NextResponse.json(
        { error: '播放列表标题是必填项' },
        { status: 400 }
      )
    }
    
    playlists[playlistIndex] = updatedPlaylist
    await savePlaylists(playlists)
    
    return NextResponse.json({
      message: '播放列表更新成功',
      playlist: updatedPlaylist
    })
    
  } catch (error) {
    console.error('Update playlist error:', error)
    return NextResponse.json(
      { error: '更新播放列表失败' },
      { status: 500 }
    )
  }
}

// 删除播放列表
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }
    
    const playlists = await getPlaylists()
    const playlistIndex = playlists.findIndex(p => p.id === id)
    
    if (playlistIndex === -1) {
      return NextResponse.json(
        { error: '播放列表不存在' },
        { status: 404 }
      )
    }
    
    const playlist = playlists[playlistIndex]
    
    // 检查权限
    if (playlist.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: '权限不足' },
        { status: 403 }
      )
    }
    
    // 删除播放列表
    playlists.splice(playlistIndex, 1)
    await savePlaylists(playlists)
    
    return NextResponse.json({
      message: '播放列表删除成功'
    })
    
  } catch (error) {
    console.error('Delete playlist error:', error)
    return NextResponse.json(
      { error: '删除播放列表失败' },
      { status: 500 }
    )
  }
}