'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import StarRating from './StarRating'

interface Comment {
  id: string
  audioId: string
  userId: string
  username: string
  content: string
  createdAt: string
  updatedAt?: string
  parentId?: string
}

interface CommentWithReplies extends Comment {
  replies: CommentWithReplies[]
}

interface Rating {
  audioId: string
  averageRating: number
  totalRatings: number
  distribution: { [key: number]: number }
}

interface CommentSectionProps {
  audioId: string
  audioTitle: string
}

export default function CommentSection({ audioId, audioTitle }: CommentSectionProps) {
  const { user } = useAuth()
  
  const [comments, setComments] = useState<Comment[]>([])
  const [rating, setRating] = useState<Rating | null>(null)
  const [userRating, setUserRating] = useState<number>(0)
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchComments()
    fetchRating()
    if (user) {
      fetchUserRating()
    }
  }, [audioId, user])

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/comments?audioId=${audioId}`)
      if (response.ok) {
        const data = await response.json()
        setComments(data.comments || [])
      }
    } catch (error) {
      console.error('获取评论失败:', error)
    }
  }

  const fetchRating = async () => {
    try {
      const response = await fetch(`/api/ratings?audioId=${audioId}`)
      if (response.ok) {
        const data = await response.json()
        setRating(data)
      }
    } catch (error) {
      console.error('获取评分失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserRating = async () => {
    try {
      const response = await fetch('/api/ratings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ audioId })
      })
      if (response.ok) {
        const data = await response.json()
        setUserRating(data.userRating || 0)
      }
    } catch (error) {
      console.error('获取用户评分失败:', error)
    }
  }

  const handleRatingChange = async (newRating: number) => {
    if (!user) {
      alert('请先登录')
      return
    }

    try {
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ audioId, value: newRating })
      })

      if (response.ok) {
        setUserRating(newRating)
        await fetchRating() // 刷新评分统计
      } else {
        const data = await response.json()
        alert(data.error || '评分失败')
      }
    } catch (error) {
      alert('评分失败，请稍后重试')
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      alert('请先登录')
      return
    }

    if (!newComment.trim()) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audioId,
          content: newComment.trim()
        })
      })

      if (response.ok) {
        setNewComment('')
        await fetchComments()
      } else {
        const data = await response.json()
        alert(data.error || '发布评论失败')
      }
    } catch (error) {
      alert('发布评论失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitReply = async (parentId: string) => {
    if (!user || !replyContent.trim()) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audioId,
          content: replyContent.trim(),
          parentId
        })
      })

      if (response.ok) {
        setReplyTo(null)
        setReplyContent('')
        await fetchComments()
      } else {
        const data = await response.json()
        alert(data.error || '回复失败')
      }
    } catch (error) {
      alert('回复失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: editContent.trim()
        })
      })

      if (response.ok) {
        setEditingComment(null)
        setEditContent('')
        await fetchComments()
      } else {
        const data = await response.json()
        alert(data.error || '更新评论失败')
      }
    } catch (error) {
      alert('更新评论失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('确定要删除这条评论吗？')) return

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchComments()
      } else {
        const data = await response.json()
        alert(data.error || '删除评论失败')
      }
    } catch (error) {
      alert('删除评论失败，请稍后重试')
    }
  }

  const startEdit = (comment: Comment) => {
    setEditingComment(comment.id)
    setEditContent(comment.content)
  }

  const cancelEdit = () => {
    setEditingComment(null)
    setEditContent('')
  }

  const startReply = (commentId: string) => {
    setReplyTo(commentId)
    setReplyContent('')
  }

  const cancelReply = () => {
    setReplyTo(null)
    setReplyContent('')
  }

  // 组织评论为树形结构
  const organizeComments = (comments: Comment[]): CommentWithReplies[] => {
    const commentMap = new Map<string, CommentWithReplies>()
    const rootComments: CommentWithReplies[] = []

    // 初始化所有评论
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] })
    })

    // 组织父子关系
    comments.forEach(comment => {
      const commentWithReplies = commentMap.get(comment.id)!
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId)
        if (parent) {
          parent.replies.push(commentWithReplies)
        }
      } else {
        rootComments.push(commentWithReplies)
      }
    })

    return rootComments
  }

  const organizedComments = organizeComments(comments)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) {
      return '刚刚'
    } else if (diffInHours < 24) {
      return `${diffInHours}小时前`
    } else if (diffInHours < 24 * 7) {
      return `${Math.floor(diffInHours / 24)}天前`
    } else {
      return date.toLocaleDateString('zh-CN')
    }
  }

  const renderComment = (comment: CommentWithReplies, isReply = false) => (
    <div key={comment.id} className={`${isReply ? 'ml-8 mt-4' : 'mb-6'}`}>
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {comment.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <span className="font-medium text-gray-900">{comment.username}</span>
              <span className="text-xs text-gray-500 ml-2">
                {formatDate(comment.createdAt)}
                {comment.updatedAt && ' (已编辑)'}
              </span>
            </div>
          </div>
          
          {user && (user.id === comment.userId || (user as any).role === 'admin') && (
            <div className="flex gap-2">
              {user.id === comment.userId && (
                <button
                  onClick={() => startEdit(comment)}
                  className="text-xs text-blue-600 hover:text-blue-800 touch-manipulation"
                >
                  编辑
                </button>
              )}
              <button
                onClick={() => handleDeleteComment(comment.id)}
                className="text-xs text-red-600 hover:text-red-800 touch-manipulation"
              >
                删除
              </button>
            </div>
          )}
        </div>
        
        {editingComment === comment.id ? (
          <div className="space-y-3">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              maxLength={1000}
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleEditComment(comment.id)}
                disabled={submitting || !editContent.trim()}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50 touch-manipulation"
              >
                {submitting ? '保存中...' : '保存'}
              </button>
              <button
                onClick={cancelEdit}
                className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-300 touch-manipulation"
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-gray-800 mb-3 whitespace-pre-wrap">{comment.content}</p>
            
            {user && !isReply && (
              <button
                onClick={() => startReply(comment.id)}
                className="text-xs text-blue-600 hover:text-blue-800 touch-manipulation"
              >
                回复
              </button>
            )}
          </>
        )}
        
        {replyTo === comment.id && (
          <div className="mt-4 space-y-3">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="写下你的回复..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              maxLength={1000}
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleSubmitReply(comment.id)}
                disabled={submitting || !replyContent.trim()}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50 touch-manipulation"
              >
                {submitting ? '回复中...' : '回复'}
              </button>
              <button
                onClick={cancelReply}
                className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-300 touch-manipulation"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>
      
      {comment.replies.map(reply => renderComment(reply, true))}
    </div>
  )

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-sm text-gray-600">加载中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 评分区域 */}
      <div className="bg-white rounded-lg p-4 border">
        <h3 className="text-lg font-semibold mb-4">评分与评价</h3>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">您的评分:</span>
            <StarRating
              rating={userRating}
              onRatingChange={handleRatingChange}
              readonly={!user}
              size="lg"
            />
            {!user && (
              <span className="text-xs text-gray-500">登录后可评分</span>
            )}
          </div>
          
          {rating && rating.totalRatings > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <StarRating
                  rating={rating.averageRating}
                  readonly
                  showValue
                />
              </div>
              <span className="text-sm text-gray-500">
                ({rating.totalRatings} 人评分)
              </span>
            </div>
          )}
        </div>
        
        {rating && rating.totalRatings > 0 && (
          <div className="text-xs text-gray-500">
            <div className="grid grid-cols-5 gap-2">
              {[5, 4, 3, 2, 1].map(star => (
                <div key={star} className="flex items-center gap-1">
                  <span>{star}星</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full"
                      style={{
                        width: `${rating.totalRatings > 0 ? (rating.distribution[star] / rating.totalRatings) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                  <span>{rating.distribution[star]}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 评论区域 */}
      <div className="bg-white rounded-lg p-4 border">
        <h3 className="text-lg font-semibold mb-4">
          评论 ({comments.length})
        </h3>
        
        {/* 发表评论 */}
        {user ? (
          <form onSubmit={handleSubmitComment} className="mb-6">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="分享你对这个音频的看法..."
              className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={4}
              maxLength={1000}
            />
            <div className="flex justify-between items-center mt-3">
              <span className="text-xs text-gray-500">
                {newComment.length}/1000
              </span>
              <button
                type="submit"
                disabled={submitting || !newComment.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 touch-manipulation"
              >
                {submitting ? '发布中...' : '发布评论'}
              </button>
            </div>
          </form>
        ) : (
          <div className="mb-6 p-4 bg-gray-50 rounded-md text-center">
            <p className="text-gray-600">登录后可发表评论</p>
          </div>
        )}
        
        {/* 评论列表 */}
        {organizedComments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>暂无评论，来发表第一条评论吧！</p>
          </div>
        ) : (
          <div>
            {organizedComments.map(comment => renderComment(comment))}
          </div>
        )}
      </div>
    </div>
  )
}