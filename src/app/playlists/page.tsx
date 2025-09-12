'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import Link from 'next/link'
import DeleteConfirmModal from '../../components/DeleteConfirmModal'

interface Playlist {
  id: string
  title: string
  description: string
  createdBy: string
  createdAt: string
  isPublic: boolean
  items: any[]
}

export default function PlaylistsPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newPlaylist, setNewPlaylist] = useState({
    title: '',
    description: '',
    isPublic: false
  })
  const [isCreating, setIsCreating] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    playlist: Playlist | null
  }>({ isOpen: false, playlist: null })
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/signin')
      return
    }

    if (user) {
      fetchPlaylists()
    }
  }, [user, isLoading, router])

  const fetchPlaylists = async () => {
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

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPlaylist.title) return

    setIsCreating(true)
    try {
      const response = await fetch('/api/playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newPlaylist)
      })

      if (response.ok) {
        await fetchPlaylists()
        setNewPlaylist({ title: '', description: '', isPublic: false })
        setShowCreateForm(false)
      } else {
        const data = await response.json()
        alert(data.error || '创建失败')
      }
    } catch (error) {
      alert('创建失败，请稍后重试')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeletePlaylist = (playlist: Playlist) => {
    setDeleteModal({ isOpen: true, playlist })
  }

  const confirmDelete = async () => {
    if (!deleteModal.playlist) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/playlists/${deleteModal.playlist.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchPlaylists()
        setDeleteModal({ isOpen: false, playlist: null })
      } else {
        const data = await response.json()
        alert(data.error || '删除失败')
      }
    } catch (error) {
      alert('删除失败，请稍后重试')
    } finally {
      setIsDeleting(false)
    }
  }

  const cancelDelete = () => {
    setDeleteModal({ isOpen: false, playlist: null })
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-0">我的播放列表</h1>
            <div className="flex gap-2">
              <Link
                href="/"
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 active:bg-gray-400 touch-manipulation text-sm"
              >
                返回首页
              </Link>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 active:bg-blue-800 touch-manipulation text-sm"
              >
                {showCreateForm ? '取消' : '创建播放列表'}
              </button>
            </div>
          </div>

          {/* 创建播放列表表单 */}
          {showCreateForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h2 className="text-lg font-semibold mb-4">创建新播放列表</h2>
              <form onSubmit={handleCreatePlaylist} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    播放列表标题 *
                  </label>
                  <input
                    type="text"
                    value={newPlaylist.title}
                    onChange={(e) => setNewPlaylist(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    描述
                  </label>
                  <textarea
                    value={newPlaylist.description}
                    onChange={(e) => setNewPlaylist(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={newPlaylist.isPublic}
                    onChange={(e) => setNewPlaylist(prev => ({ ...prev, isPublic: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700">
                    公开播放列表
                  </label>
                </div>
                
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 touch-manipulation text-sm"
                  >
                    {isCreating ? '创建中...' : '创建'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 active:bg-gray-400 touch-manipulation text-sm"
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 播放列表列表 */}
          {playlists.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">暂无播放列表</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="text-blue-600 hover:text-blue-800 active:text-blue-900 touch-manipulation"
              >
                创建第一个播放列表
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {playlists.map((playlist) => (
                <div key={playlist.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">{playlist.title}</h3>
                        {playlist.isPublic && (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                            公开
                          </span>
                        )}
                        {playlist.createdBy !== user.id && (
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                            他人创建
                          </span>
                        )}
                      </div>
                      
                      {playlist.description && (
                        <p className="text-gray-600 text-sm mb-2">{playlist.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{playlist.items.length} 个音频</span>
                        <span>创建于 {new Date(playlist.createdAt).toLocaleDateString('zh-CN')}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Link
                        href={`/playlists/${playlist.id}`}
                        className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 active:bg-blue-800 touch-manipulation"
                      >
                        查看
                      </Link>
                      
                      {playlist.createdBy === user.id && (
                        <button
                          onClick={() => handleDeletePlaylist(playlist)}
                          className="bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 active:bg-red-800 touch-manipulation"
                        >
                          删除
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 删除确认模态框 */}
          <DeleteConfirmModal
            isOpen={deleteModal.isOpen}
            title="确认删除播放列表"
            message={`您确定要删除播放列表 "${deleteModal.playlist?.title}" 吗？此操作无法撤销。`}
            onConfirm={confirmDelete}
            onCancel={cancelDelete}
            isDeleting={isDeleting}
          />
        </div>
      </div>
    </div>
  )
}