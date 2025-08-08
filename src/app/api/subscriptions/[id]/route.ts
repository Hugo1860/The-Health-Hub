import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { cancelSubscription } from '@/lib/subscriptions';

// DELETE - 取消订阅
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

    const success = cancelSubscription(params.id, session.user.id!);
    
    if (!success) {
      return NextResponse.json(
        { error: '订阅不存在或已取消' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: '订阅已取消' });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return NextResponse.json(
      { error: '取消订阅失败' },
      { status: 500 }
    );
  }
}