import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { withSecurity, withSecurityAndValidation } from '@/lib/secureApiWrapper'
import { commentSchema, sanitizeText, sanitizeHtml, isValidUUID } from '@/lib/validation'
import { z } from 'zod'

const DATA_DIR = join(process.cwd(), 'data')
const COMMENTS_FILE = join(DATA_DIR, 'comments.json')

interface Comment {
  id: string
  audioId: string
  userId: string
  username: string
  content: string
  createdAt: string
  updatedAt?: string
  parentId?: string // 用于回复功能
}

// 确保数据结构存在
async function ensureDataStructure() {
  try {
    await mkdir(DATA_DIR, { recursive: true })
  } catch (error) {
    // 目录已存在
  }
  
  try {
    await readFile(COMMENTS_FILE, 'utf-8')
  } catch (error) {
    // 如果文件不存在，创建空数组
    await writeFile(COMMENTS_FILE, JSON.stringify([], null, 2))
  }
}

// 获取所有评论
async function getComments(): Promise<Comment[]> {
  await ensureDataStructure()
  const data = await readFile(COMMENTS_FILE, 'utf-8')
  return JSON.parse(data)
}

// 保存评论
async function saveComments(comments: Comment[]): Promise<void> {
  await writeFile(COMMENTS_FILE, JSON.stringify(comments, null, 2))
}

// 生成评论ID
function generateCommentId(): string {
  return 'comment-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11)
}

// GET请求验证模式
const getCommentsSchema = z.object({
  audioId: z.string().uuid('无效的音频ID'),
})

// 获取评论列表
export const GET = withSecurityAndValidation(
  async (request: NextRequest, validatedData: { audioId: string }) => {
    try {
      const { audioId } = validatedData
      
      const comments = await getComments()
      
      // 过滤指定音频的评论并净化内容
      const audioComments = comments
        .filter(comment => comment.audioId === audioId)
        .map(comment => ({
          ...comment,
          content: sanitizeHtml(comment.content || ''),
          username: sanitizeText(comment.username || ''),
        }))
      
      // 按创建时间排序，最新的在前
      audioComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      
      return NextResponse.json({ comments: audioComments })
      
    } catch (error) {
      console.error('Get comments error:', error)
      return NextResponse.json(
        { error: { code: 'FETCH_ERROR', message: '获取评论失败' } },
        { status: 500 }
      )
    }
  },
  getCommentsSchema,
  {
    requireAuth: false,
    enableRateLimit: true,
    rateLimitMax: 100,
    rateLimitWindow: 60000,
    allowedMethods: ['GET'],
  }
)

// 创建评论
export const POST = withSecurityAndValidation(
  async (request: NextRequest, validatedData: { audioId: string; content: string; parentId?: string }) => {
    try {
      const session = await getServerSession()
      
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: { code: 'UNAUTHORIZED', message: '未授权访问' } },
          { status: 401 }
        )
      }
      
      const { audioId, content, parentId } = validatedData
      
      // 验证父评论ID（如果提供）
      if (parentId && !isValidUUID(parentId)) {
        return NextResponse.json({
          error: { code: 'INVALID_PARENT_ID', message: '无效的父评论ID' }
        }, { status: 400 })
      }
      
      const comments = await getComments()
      
      // 如果是回复，检查父评论是否存在
      if (parentId) {
        const parentComment = comments.find(c => c.id === parentId)
        if (!parentComment) {
          return NextResponse.json(
            { error: { code: 'PARENT_NOT_FOUND', message: '父评论不存在' } },
            { status: 404 }
          )
        }
        
        // 确保父评论属于同一个音频
        if (parentComment.audioId !== audioId) {
          return NextResponse.json(
            { error: { code: 'INVALID_REPLY', message: '无效的回复' } },
            { status: 400 }
          )
        }
      }
      
      // 净化内容
      const sanitizedContent = sanitizeHtml(content)
      const sanitizedUsername = sanitizeText(session.user.name || 'Anonymous')
      
      // 创建新评论
      const newComment: Comment = {
        id: generateCommentId(),
        audioId,
        userId: session.user.id,
        username: sanitizedUsername,
        content: sanitizedContent,
        createdAt: new Date().toISOString(),
        parentId: parentId || undefined
      }
      
      comments.push(newComment)
      await saveComments(comments)
      
      return NextResponse.json({
        message: '评论发布成功',
        comment: newComment
      }, { status: 201 })
      
    } catch (error) {
      console.error('Create comment error:', error)
      return NextResponse.json(
        { error: { code: 'CREATE_ERROR', message: '发布评论失败' } },
        { status: 500 }
      )
    }
  },
  commentSchema,
  {
    requireAuth: true,
    enableRateLimit: true,
    rateLimitMax: 20,
    rateLimitWindow: 60000,
    requireCSRF: true,
    allowedMethods: ['POST'],
  }
)