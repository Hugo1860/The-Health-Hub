'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface FavoriteButtonProps {
  audioId: string
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  onFavoriteChange?: (isFavorited: boolean) => void
}

export default function FavoriteButton({
  audioId,
  size = 'md',
  showText = true,
  onFavoriteChange
}: FavoriteButtonProps) {
  const { user } = useAuth()
  const [isFavorited, setIsFavorited] = useState(false)
  const [loading, setLoading] = useState(false)

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  const buttonSizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2 text-base'
  }

  useEffect(() => {
    if (user && audioId) {
      checkFavoriteStatus()
    }
  }, [user, audioId])

  const checkFavoriteStatus = async () => {
    try {
      const response = await fetch(`/api/favorites?audioId=${audioId}`)
      if (response.ok) {
        const data = await response.json()
        setIsFavorited(data.isFavorited)
      }
    } catch (error) {
      console.error('检查收藏状态失败:', error)
    }
  }

  const handleToggleFavorite = async () => {
    if (!user) {
      alert('请先登录')
      return
    }

    setLoading(true)
    try {
      if (isFavorited) {
        // 取消收藏
        const response = await fetch(`/api/favorites?audioId=${audioId}`, {
          method: 'DELETE'
        })

        if (response.ok) {
          setIsFavorited(false)
          onFavoriteChange?.(false)
        } else {
          const data = await response.json()
          alert(data.error || '取消收藏失败')
        }
      } else {
        // 添加收藏
        const response = await fetch('/api/favorites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ audioId })
        })

        if (response.ok) {
          setIsFavorited(true)
          onFavoriteChange?.(true)
        } else {
          const data = await response.json()
          alert(data.error || '收藏失败')
        }
      }
    } catch (error) {
      alert('操作失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return null
  }

  return (
    <button
      onClick={handleToggleFavorite}
      disabled={loading}
      className={`
        ${buttonSizeClasses[size]}
        ${isFavorited 
          ? 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800' 
          : 'bg-gray-200 text-gray-700 hover:bg-gray-300 active:bg-gray-400'
        }
        rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation
        flex items-center gap-2
      `}
      title={isFavorited ? '取消收藏' : '收藏'}
    >
      <svg
        className={`${sizeClasses[size]} transition-transform ${loading ? 'animate-pulse' : ''}`}
        fill={isFavorited ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      
      {showText && (
        <span>
          {loading ? '处理中...' : (isFavorited ? '已收藏' : '收藏')}
        </span>
      )}
    </button>
  )
}