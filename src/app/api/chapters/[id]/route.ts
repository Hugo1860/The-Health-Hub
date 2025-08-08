import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateChapter, deleteChapter, readChapters } from '@/lib/chapters';

// PUT - 更新章节
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: '需要管理员权限' },
        { status: 403 }
      );
    }

    const updates = await request.json();
    
    // 验证更新数据
    if (updates.startTime !== undefined && (typeof updates.startTime !== 'number' || updates.startTime < 0)) {
      return NextResponse.json(
        { error: '开始时间格式错误' },
        { status: 400 }
      );
    }

    if (updates.endTime !== undefined && updates.startTime !== undefined && updates.endTime <= updates.startTime) {
      return NextResponse.json(
        { error: '结束时间必须大于开始时间' },
        { status: 400 }
      );
    }

    const success = updateChapter(params.id, updates);
    
    if (!success) {
      return NextResponse.json(
        { error: '章节不存在' },
        { status: 404 }
      );
    }

    // 返回更新后的章节
    const chapters = readChapters();
    const updatedChapter = chapters.find(c => c.id === params.id);

    return NextResponse.json(updatedChapter);
  } catch (error) {
    console.error('Error updating chapter:', error);
    return NextResponse.json(
      { error: '更新章节失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除章节
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: '需要管理员权限' },
        { status: 403 }
      );
    }

    const success = deleteChapter(params.id);
    
    if (!success) {
      return NextResponse.json(
        { error: '章节不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: '章节已删除' });
  } catch (error) {
    console.error('Error deleting chapter:', error);
    return NextResponse.json(
      { error: '删除章节失败' },
      { status: 500 }
    );
  }
}