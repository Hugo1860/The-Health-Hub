'use client'

import { useState, useEffect } from 'react'

interface Playlist {
  id: string
  title: string
  description: string
  createdBy: string
  createdAt: string
  isPublic: boolean
  items: any[]
}

interface AddToPlaylistModalProps {
  isOpen: boolean
  audioId: string | null
  audioTitle: string
  onClose: () => void
  onSuccess: () => void
}

export default function AddToPlaylistModal({
  isOpen,
  audioId,
  audioTitle,
  onClose,
  onSuccess
}: AddToPlaylistModalProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchPlaylists()
    }
  }, [isOpen])

  const fetchPlaylists = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/playlists')
      if (response.ok) {
        const data = await response.json()
        setPlaylists(data.playlists || [])
      }
    } catch (error) {
      console.error('获取播放列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToPlaylist = async (playlistId: string) => {
    if (!audioId) return

    setAdding(true)
    try {
      const response = await fetch(`/api/playlists/${playlistId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ audioId })
      })

      if (response.ok) {
        onSuccess()
        onClose()
      } else {
        const data = await response.json()
        alert(data.error || '添加失败')
      }
    } catch (error) {
      alert('添加失败，请稍后重试')
    } finally {
      setAdding(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">添加到播放列表</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 touch-manipulation"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            将音频 "<span className="font-medium">{audioTitle}</span>" 添加到播放列表：
          </p>
        </div>
        
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">加载播放列表...</p>
          </div>
        ) : playlists.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 mb-4">暂无播放列表</p>
            <button
              onClick={onClose}
              className="text-blue-600 hover:text-blue-800 active:text-blue-900 text-sm touch-manipulation"
            >
              去创建播放列表
            </button>
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {playlists.map((playlist) => (
              <button
                key={playlist.id}
                onClick={() => handleAddToPlaylist(playlist.id)}
                disabled={adding}
                className="w-full text-left p-3 border border-gray-200 rounded-md hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">{playlist.title}</span>
                      {playlist.isPublic && (
                        <span className="bg-green-100 text-green-800 text-xs px-1 py-0.5 rounded">
                          公开
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {playlist.items.length} 个音频
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 active:bg-gray-400 touch-manipulation text-sm"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}