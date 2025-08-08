import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

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

// 更新评论
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
    
    const { content } = await request.json()
    
    // 验证输入
    if (!content) {
      return NextResponse.json(
        { error: '评论内容是必填项' },
        { status: 400 }
      )
    }
    
    if (content.trim().length === 0) {
      return NextResponse.json(
        { error: '评论内容不能为空' },
        { status: 400 }
      )
    }
    
    if (content.length > 1000) {
      return NextResponse.json(
        { error: '评论内容不能超过1000字符' },
        { status: 400 }
      )
    }
    
    const comments = await getComments()
    const commentIndex = comments.findIndex(c => c.id === id)
    
    if (commentIndex === -1) {
      return NextResponse.json(
        { error: '评论不存在' },
        { status: 404 }
      )
    }
    
    const comment = comments[commentIndex]
    
    // 检查权限：只有评论作者可以编辑
    if (comment.userId !== session.user.id) {
      return NextResponse.json(
        { error: '权限不足' },
        { status: 403 }
      )
    }
    
    // 更新评论
    const updatedComment = {
      ...comment,
      content: content.trim(),
      updatedAt: new Date().toISOString()
    }
    
    comments[commentIndex] = updatedComment
    await saveComments(comments)
    
    return NextResponse.json({
      message: '评论更新成功',
      comment: updatedComment
    })
    
  } catch (error) {
    console.error('Update comment error:', error)
    return NextResponse.json(
      { error: '更新评论失败' },
      { status: 500 }
    )
  }
}

// 删除评论
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
    
    const comments = await getComments()
    const commentIndex = comments.findIndex(c => c.id === id)
    
    if (commentIndex === -1) {
      return NextResponse.json(
        { error: '评论不存在' },
        { status: 404 }
      )
    }
    
    const comment = comments[commentIndex]
    
    // 检查权限：评论作者或管理员可以删除
    const isOwner = comment.userId === session.user.id
    const isAdmin = (session.user as any).role === 'admin'
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: '权限不足' },
        { status: 403 }
      )
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
    
    return NextResponse.json({
      message: '评论删除成功'
    })
    
  } catch (error) {
    console.error('Delete comment error:', error)
    return NextResponse.json(
      { error: '删除评论失败' },
      { status: 500 }
    )
  }
}