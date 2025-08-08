import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserNotifications, markAllNotificationsAsRead, getUnreadNotificationCount } from '@/lib/subscriptions';

// GET - 获取用户的通知列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    
    let notifications = getUserNotifications(
      session.user.id!, 
      limit ? parseInt(limit) : undefined
    );
    
    if (unreadOnly) {
      notifications = notifications.filter(notif => !notif.isRead);
    }
    
    const unreadCount = getUnreadNotificationCount(session.user.id!);
    
    return NextResponse.json({
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: '获取通知失败' },
      { status: 500 }
    );
  }
}

// PUT - 标记所有通知为已读
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const updatedCount = markAllNotificationsAsRead(session.user.id!);
    
    return NextResponse.json({ 
      message: `已标记 ${updatedCount} 条通知为已读`,
      updatedCount 
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json(
      { error: '标记通知失败' },
      { status: 500 }
    );
  }
}