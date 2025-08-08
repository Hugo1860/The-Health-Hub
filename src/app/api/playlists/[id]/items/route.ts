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

// 添加音频到播放列表
export async function POST(
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
    
    const { audioId } = await request.json()
    
    if (!audioId) {
      return NextResponse.json(
        { error: '音频ID是必填项' },
        { status: 400 }
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
    
    // 检查音频是否已在播放列表中
    const existingItem = playlist.items.find(item => item.audioId === audioId)
    if (existingItem) {
      return NextResponse.json(
        { error: '音频已在播放列表中' },
        { status: 409 }
      )
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
    
    return NextResponse.json({
      message: '音频添加到播放列表成功',
      item: newItem
    }, { status: 201 })
    
  } catch (error) {
    console.error('Add to playlist error:', error)
    return NextResponse.json(
      { error: '添加到播放列表失败' },
      { status: 500 }
    )
  }
}

// 从播放列表移除音频
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
    
    const { searchParams } = new URL(request.url)
    const audioId = searchParams.get('audioId')
    
    if (!audioId) {
      return NextResponse.json(
        { error: '音频ID是必填项' },
        { status: 400 }
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
    
    // 查找并移除音频
    const itemIndex = playlist.items.findIndex(item => item.audioId === audioId)
    if (itemIndex === -1) {
      return NextResponse.json(
        { error: '音频不在播放列表中' },
        { status: 404 }
      )
    }
    
    playlist.items.splice(itemIndex, 1)
    
    // 重新排序剩余项目
    playlist.items.forEach((item, index) => {
      item.order = index
    })
    
    playlists[playlistIndex] = playlist
    await savePlaylists(playlists)
    
    return NextResponse.json({
      message: '音频从播放列表移除成功'
    })
    
  } catch (error) {
    console.error('Remove from playlist error:', error)
    return NextResponse.json(
      { error: '从播放列表移除失败' },
      { status: 500 }
    )
  }
}

// 更新播放列表项顺序
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
    
    const { items } = await request.json()
    
    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: '无效的项目数据' },
        { status: 400 }
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
    
    // 更新项目顺序
    playlist.items = items.map((item, index) => ({
      ...item,
      playlistId: id,
      order: index
    }))
    
    playlists[playlistIndex] = playlist
    await savePlaylists(playlists)
    
    return NextResponse.json({
      message: '播放列表顺序更新成功',
      items: playlist.items
    })
    
  } catch (error) {
    console.error('Update playlist order error:', error)
    return NextResponse.json(
      { error: '更新播放列表顺序失败' },
      { status: 500 }
    )
  }
}