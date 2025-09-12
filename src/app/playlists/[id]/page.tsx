'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../contexts/AuthContext'
import { useAudioStore, AudioFile } from '../../../store/audioStore'
import Link from 'next/link'
import DeleteConfirmModal from '../../../components/DeleteConfirmModal'

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

export default function PlaylistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, isLoading } = useAuth()
  const { setCurrentAudio, setPlaylist } = useAudioStore()
  const router = useRouter()
  
  const [playlistId, setPlaylistId] = useState<string>('')
  const [playlist, setPlaylistData] = useState<Playlist | null>(null)
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    audioId: string | null
  }>({ isOpen: false, audioId: null })
  const [isRemoving, setIsRemoving] = useState(false)

  useEffect(() => {
    const initParams = async () => {
      const resolvedParams = await params
      setPlaylistId(resolvedParams.id)
    }
    initParams()
  }, [params])

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/signin')
      return
    }

    if (user && playlistId) {
      fetchPlaylistData()
    }
  }, [user, isLoading, router, playlistId])

  const fetchPlaylistData = async () => {
    if (!playlistId) return
    
    try {
      // 获取播放列表信息
      const playlistResponse = await fetch(`/api/playlists/${playlistId}`)
      if (!playlistResponse.ok) {
        if (playlistResponse.status === 404) {
          setError('播放列表不存在')
        } else if (playlistResponse.status === 403) {
          setError('权限不足')
        } else {
          setError('获取播放列表失败')
        }
        return
      }
      
      const playlistData = await playlistResponse.json()
      setPlaylistData(playlistData.playlist)
      
      // 获取所有音频文件
      const audioResponse = await fetch('/api/upload')
      if (audioResponse.ok) {
        const audioData = await audioResponse.json()
        const allAudioFiles = audioData.audioList || []
        
        // 根据播放列表项过滤和排序音频
        const playlistAudioFiles = playlistData.playlist.items
          .map((item: PlaylistItem) => allAudioFiles.find((audio: AudioFile) => audio.id === item.audioId))
          .filter((audio: AudioFile) => audio) // 过滤掉不存在的音频
          .sort((a: AudioFile, b: AudioFile) => {
            const aItem = playlistData.playlist.items.find((item: PlaylistItem) => item.audioId === a.id)
            const bItem = playlistData.playlist.items.find((item: PlaylistItem) => item.audioId === b.id)
            return (aItem?.order || 0) - (bItem?.order || 0)
          })
        
        setAudioFiles(playlistAudioFiles)
      }
    } catch (error) {
      console.error('获取播放列表数据失败:', error)
      setError('获取播放列表数据失败')
    } finally {
      setLoading(false)
    }
  }

  const handlePlay = (audio: AudioFile, index: number) => {
    // 设置当前播放音频
    setCurrentAudio(audio)
    
    // 设置播放队列为剩余的音频
    if (index < audioFiles.length - 1) {
      setPlaylist(audioFiles.slice(index + 1))
    }
    
    // 触发播放事件
    const event = new CustomEvent('playAudio', { detail: audio })
    window.dispatchEvent(event)
  }

  const handlePlayAll = () => {
    if (audioFiles.length === 0) return
    
    // 播放第一个音频
    handlePlay(audioFiles[0], 0)
  }

  const handleRemoveFromPlaylist = (audioId: string) => {
    setDeleteModal({ isOpen: true, audioId })
  }

  const confirmRemove = async () => {
    if (!deleteModal.audioId || !playlist) return
    
    setIsRemoving(true)
    try {
      const response = await fetch(`/api/playlists/${playlistId}/items?audioId=${deleteModal.audioId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchPlaylistData()
        setDeleteModal({ isOpen: false, audioId: null })
      } else {
        const data = await response.json()
        alert(data.error || '移除失败')
      }
    } catch (error) {
      alert('移除失败，请稍后重试')
    } finally {
      setIsRemoving(false)
    }
  }

  const cancelRemove = () => {
    setDeleteModal({ isOpen: false, audioId: null })
  }

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
        <div className="max-w-2xl mx-auto px-2 sm:px-4">
          <div className="bg-white rounded-lg shadow-lg p-3 sm:p-6 text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">错误</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link
              href="/playlists"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 active:bg-blue-800 touch-manipulation"
            >
              返回播放列表
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!playlist) {
    return null
  }

  const isOwner = playlist.createdBy === user.id

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-4xl mx-auto px-2 sm:px-4">
        <div className="bg-white rounded-lg shadow-lg p-3 sm:p-6">
          {/* 播放列表头部 */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6">
            <div className="flex-1 mb-4 sm:mb-0">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{playlist.title}</h1>
                {playlist.isPublic && (
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                    公开
                  </span>
                )}
              </div>
              
              {playlist.description && (
                <p className="text-gray-600 mb-3">{playlist.description}</p>
              )}
              
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>{audioFiles.length} 个音频</span>
                <span>创建于 {new Date(playlist.createdAt).toLocaleDateString('zh-CN')}</span>
                {!isOwner && <span>由他人创建</span>}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Link
                href="/playlists"
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 active:bg-gray-400 touch-manipulation text-sm"
              >
                返回列表
              </Link>
              
              {audioFiles.length > 0 && (
                <button
                  onClick={handlePlayAll}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 active:bg-blue-800 touch-manipulation text-sm"
                >
                  播放全部
                </button>
              )}
            </div>
          </div>

          {/* 音频列表 */}
          {audioFiles.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">播放列表为空</p>
              <Link
                href="/"
                className="text-blue-600 hover:text-blue-800 active:text-blue-900 touch-manipulation"
              >
                去添加音频
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {audioFiles.map((audio, index) => (
                <div key={audio.id} className="border rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                      {index + 1}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold truncate">{audio.title}</h3>
                      {audio.description && (
                        <p className="text-gray-600 text-sm truncate">{audio.description}</p>
                      )}
                      
                      <div className="flex flex-wrap gap-1 mt-2">
                        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          {audio.subject}
                        </span>
                        {(audio.tags || []).slice(0, 2).map((tag, tagIndex) => (
                          <span key={tagIndex} className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {isOwner && (
                        <button
                          onClick={() => handleRemoveFromPlaylist(audio.id)}
                          className="bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 active:bg-red-800 touch-manipulation"
                          title="从播放列表移除"
                        >
                          移除
                        </button>
                      )}
                      
                      <button
                        onClick={() => handlePlay(audio, index)}
                        className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 active:bg-blue-800 touch-manipulation"
                      >
                        播放
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 移除确认模态框 */}
          <DeleteConfirmModal
            isOpen={deleteModal.isOpen}
            title="确认移除音频"
            message="您确定要从播放列表中移除这个音频吗？"
            onConfirm={confirmRemove}
            onCancel={cancelRemove}
            isDeleting={isRemoving}
          />
        </div>
      </div>
    </div>
  )
}