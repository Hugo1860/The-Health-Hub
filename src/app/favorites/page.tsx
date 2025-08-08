'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import { useAudioStore, AudioFile } from '../../store/audioStore'
import Link from 'next/link'
import ShareButton from '../../components/ShareButton'

interface Favorite {
  audioId: string
  userId: string
  createdAt: string
}

export default function FavoritesPage() {
  const { user, isLoading } = useAuth()
  const { setCurrentAudio, addToQueue, setPlaylist } = useAudioStore()
  const router = useRouter()
  
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/signin')
      return
    }

    if (user) {
      fetchFavorites()
    }
  }, [user, isLoading, router])

  const fetchFavorites = async () => {
    try {
      // 获取用户收藏列表
      const favResponse = await fetch('/api/favorites')
      if (!favResponse.ok) {
        throw new Error('获取收藏列表失败')
      }
      const favData = await favResponse.json()
      setFavorites(favData.favorites || [])
      
      // 获取所有音频文件
      const audioResponse = await fetch('/api/upload')
      if (audioResponse.ok) {
        const audioData = await audioResponse.json()
        const allAudioFiles = audioData.audioList || []
        
        // 过滤出收藏的音频文件
        const favoriteAudioFiles = favData.favorites
          .map((fav: Favorite) => allAudioFiles.find((audio: AudioFile) => audio.id === fav.audioId))
          .filter((audio: AudioFile) => audio) // 过滤掉不存在的音频
        
        setAudioFiles(favoriteAudioFiles)
      }
    } catch (error) {
      console.error('获取收藏列表失败:', error)
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

  const handleAddToQueue = (audio: AudioFile) => {
    addToQueue(audio)
  }

  const handlePlayAll = () => {
    if (audioFiles.length === 0) return
    
    // 播放第一个音频
    handlePlay(audioFiles[0], 0)
  }

  const handleRemoveFavorite = async (audioId: string) => {
    try {
      const response = await fetch(`/api/favorites?audioId=${audioId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // 重新获取收藏列表
        await fetchFavorites()
      } else {
        const data = await response.json()
        alert(data.error || '取消收藏失败')
      }
    } catch (error) {
      alert('取消收藏失败，请稍后重试')
    }
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

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-4xl mx-auto px-2 sm:px-4">
        <div className="bg-white rounded-lg shadow-lg p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-0">我的收藏</h1>
            <div className="flex gap-2">
              <Link
                href="/"
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 active:bg-gray-400 touch-manipulation text-sm"
              >
                返回首页
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

          {audioFiles.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">💝</div>
              <p className="text-gray-500 mb-4">还没有收藏任何音频</p>
              <Link
                href="/"
                className="text-blue-600 hover:text-blue-800 active:text-blue-900 touch-manipulation"
              >
                去发现喜欢的音频
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 mb-4">
                共收藏了 {audioFiles.length} 个音频
              </div>
              
              {audioFiles.map((audio, index) => {
                const favorite = favorites.find(fav => fav.audioId === audio.id)
                return (
                  <div key={audio.id} className="border rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                        {index + 1}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <Link href={`/audio/${audio.id}`}>
                          <h3 className="text-base sm:text-lg font-semibold mb-2 hover:text-blue-600 cursor-pointer">
                            {audio.title}
                          </h3>
                        </Link>
                        
                        {audio.description && (
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2 sm:line-clamp-none">
                            {audio.description}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap gap-1 mb-3">
                          <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                            {audio.subject}
                          </span>
                          {(audio.tags || []).slice(0, 3).map((tag, tagIndex) => (
                            <span key={tagIndex} className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="text-xs text-gray-500">
                            <span>收藏于 {favorite ? new Date(favorite.createdAt).toLocaleDateString('zh-CN') : ''}</span>
                            <span className="mx-2">•</span>
                            <span>上传于 {new Date(audio.uploadDate).toLocaleDateString('zh-CN')}</span>
                          </div>
                          
                          <div className="flex gap-2 flex-wrap">
                            <ShareButton
                              audioId={audio.id}
                              audioTitle={audio.title}
                              audioDescription={audio.description}
                              size="sm"
                              showText={false}
                            />
                            
                            <button
                              onClick={() => handleRemoveFavorite(audio.id)}
                              className="bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 active:bg-red-800 touch-manipulation"
                              title="取消收藏"
                            >
                              取消收藏
                            </button>
                            
                            <button
                              onClick={() => handleAddToQueue(audio)}
                              className="bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-300 active:bg-gray-400 touch-manipulation"
                              title="添加到播放队列"
                            >
                              加入队列
                            </button>
                            
                            <button
                              onClick={() => handlePlay(audio, index)}
                              className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 active:bg-blue-800 touch-manipulation"
                            >
                              播放
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}