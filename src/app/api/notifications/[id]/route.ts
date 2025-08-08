import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { markNotificationAsRead, deleteNotification } from '@/lib/subscriptions';

// PUT - 标记单个通知为已读
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const success = markNotificationAsRead(params.id, session.user.id!);
    
    if (!success) {
      return NextResponse.json(
        { error: '通知不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: '通知已标记为已读' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { error: '标记通知失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除通知
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const success = deleteNotification(params.id, session.user.id!);
    
    if (!success) {
      return NextResponse.json(
        { error: '通知不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: '通知已删除' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { error: '删除通知失败' },
      { status: 500 }
    );
  }
}