import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
// Markers functionality removed

// GET - 获取音频的标记列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const audioId = searchParams.get('audioId');
    
    if (!audioId) {
      return NextResponse.json(
        { error: '缺少音频ID' },
        { status: 400 }
      );
    }

    // Markers functionality has been removed
    return NextResponse.json([]);
  } catch (error) {
    console.error('Error fetching markers:', error);
    return NextResponse.json(
      { error: '获取标记失败' },
      { status: 500 }
    );
  }
}

// POST - 创建新标记
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const { audioId, title, time, description, type } = await request.json();
    
    if (!audioId || !title || time === undefined || !type) {
      return NextResponse.json(
        { error: '请填写完整信息' },
        { status: 400 }
      );
    }

    // 验证时间格式
    if (typeof time !== 'number' || time < 0) {
      return NextResponse.json(
        { error: '时间格式错误' },
        { status: 400 }
      );
    }

    // 验证标记类型
    const validTypes = ['chapter', 'highlight', 'note'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: '无效的标记类型' },
        { status: 400 }
      );
    }

    // Markers functionality has been removed
    return NextResponse.json(
      { error: '标记功能暂时不可用' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error creating marker:', error);
    return NextResponse.json(
      { error: '创建标记失败' },
      { status: 500 }
    );
  }
}