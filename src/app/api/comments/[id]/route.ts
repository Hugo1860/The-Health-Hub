import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { ApiResponse, DatabaseErrorHandler } from '@/lib/api-response'
import { withSecurity } from '@/lib/secureApiWrapper'

const COMMENTS_FILE = join(process.cwd(), 'data', 'comments.json')

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

// 获取所有评论
async function getComments(): Promise<Comment[]> {
  try {
    const data = await readFile(COMMENTS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    return []
  }
}

// 保存评论
async function saveComments(comments: Comment[]): Promise<void> {
  await writeFile(COMMENTS_FILE, JSON.stringify(comments, null, 2))
}

// 更新评论 - 需要用户认证
export const PUT = withSecurity(
  async (request: NextRequest) => {
    try {
      const url = new URL(request.url)
      const id = url.pathname.split('/').pop() as string
      const { content } = await request.json()
      
      // 验证输入
      if (!content) {
        return ApiResponse.badRequest('评论内容是必填项', {
          field: 'content',
          message: 'Content is required'
        });
      }
      
      if (content.trim().length === 0) {
        return ApiResponse.badRequest('评论内容不能为空', {
          field: 'content',
          message: 'Content cannot be empty'
        });
      }
      
      if (content.length > 1000) {
        return ApiResponse.badRequest('评论内容不能超过1000字符', {
          field: 'content',
          maxLength: 1000
        });
      }
      
      const comments = await getComments()
      const commentIndex = comments.findIndex(c => c.id === id)
      
      if (commentIndex === -1) {
        return ApiResponse.notFound('评论不存在')
      }
      
      const comment = comments[commentIndex]
      
      // 检查权限：只有评论作者可以编辑
      const userId = request.headers.get('x-user-id') as string
      if (comment.userId !== userId) {
        return ApiResponse.forbidden('权限不足')
      }
      
      // 更新评论
      const updatedComment = {
        ...comment,
        content: content.trim(),
        updatedAt: new Date().toISOString()
      }
      
      comments[commentIndex] = updatedComment
      await saveComments(comments)
      
      return ApiResponse.success(updatedComment, '评论更新成功')
      
    } catch (error) {
      return DatabaseErrorHandler.handle(error, 'Update comment error')
    }
  }, { requireAuth: true, requireCSRF: true, enableRateLimit: true, allowedMethods: ['PUT'] }
)

// 删除评论 - 需要用户认证
export const DELETE = withSecurity(
  async (request: NextRequest) => {
    try {
      const url = new URL(request.url)
      const id = url.pathname.split('/').pop() as string
      const comments = await getComments()
      const commentIndex = comments.findIndex(c => c.id === id)
      
      if (commentIndex === -1) {
        return ApiResponse.notFound('评论不存在')
      }
      
      const comment = comments[commentIndex]
      
      // 检查权限：评论作者或管理员可以删除
      const userId = request.headers.get('x-user-id') as string
      const isOwner = comment.userId === userId
      const isAdmin = (request.headers.get('x-user-role') || '').toLowerCase() === 'admin'
      
      if (!isOwner && !isAdmin) {
        return ApiResponse.forbidden('权限不足')
      }
      
      // 删除评论及其所有回复
      const commentsToDelete = [id]
      
      // 递归查找所有子评论
      const findChildComments = (parentId: string) => {
        const children = comments.filter(c => c.parentId === parentId)
        children.forEach(child => {
          commentsToDelete.push(child.id)
          findChildComments(child.id)
        })
      }
      
      findChildComments(id)
      
      // 删除所有相关评论
      const filteredComments = comments.filter(c => !commentsToDelete.includes(c.id))
      await saveComments(filteredComments)
      
      return ApiResponse.success(null, '评论删除成功')
      
    } catch (error) {
      return DatabaseErrorHandler.handle(error, 'Delete comment error')
    }
  }, { requireAuth: true, requireCSRF: true, enableRateLimit: true, allowedMethods: ['DELETE'] }
)