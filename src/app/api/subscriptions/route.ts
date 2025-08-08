import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserSubscriptions, createSubscription } from '@/lib/subscriptions';

// GET - 获取用户的订阅列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const subscriptions = getUserSubscriptions(session.user.id!);
    
    return NextResponse.json(subscriptions);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json(
      { error: '获取订阅失败' },
      { status: 500 }
    );
  }
}

// POST - 创建新订阅
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const { type, value, notificationMethod } = await request.json();
    
    if (!type || !notificationMethod) {
      return NextResponse.json(
        { error: '请填写完整信息' },
        { status: 400 }
      );
    }

    // 验证订阅类型
    const validTypes = ['all', 'subject', 'tag', 'speaker'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: '无效的订阅类型' },
        { status: 400 }
      );
    }

    // 验证通知方式
    const validMethods = ['email', 'inApp', 'both'];
    if (!validMethods.includes(notificationMethod)) {
      return NextResponse.json(
        { error: '无效的通知方式' },
        { status: 400 }
      );
    }

    // 如果不是订阅全部，需要提供具体值
    if (type !== 'all' && !value) {
      return NextResponse.json(
        { error: '请提供订阅的具体内容' },
        { status: 400 }
      );
    }

    const newSubscription = createSubscription({
      userId: session.user.id!,
      type,
      value: type === 'all' ? undefined : value,
      notificationMethod,
      isActive: true
    });

    return NextResponse.json(newSubscription, { status: 201 });
  } catch (error) {
    console.error('Error creating subscription:', error);
    
    if (error instanceof Error && error.message === '订阅已存在') {
      return NextResponse.json(
        { error: '订阅已存在' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: '创建订阅失败' },
      { status: 500 }
    );
  }
}