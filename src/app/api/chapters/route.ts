import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAudioChapters, createChapter } from '@/lib/chapters';

// GET - 获取音频的章节列表
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

    const chapters = getAudioChapters(audioId);
    
    return NextResponse.json(chapters);
  } catch (error) {
    console.error('Error fetching chapters:', error);
    return NextResponse.json(
      { error: '获取章节失败' },
      { status: 500 }
    );
  }
}

// POST - 创建新章节
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: '需要管理员权限' },
        { status: 403 }
      );
    }

    const { audioId, title, description, startTime, endTime, order } = await request.json();
    
    if (!audioId || !title || startTime === undefined || order === undefined) {
      return NextResponse.json(
        { error: '请填写完整信息' },
        { status: 400 }
      );
    }

    // 验证时间格式
    if (typeof startTime !== 'number' || startTime < 0) {
      return NextResponse.json(
        { error: '开始时间格式错误' },
        { status: 400 }
      );
    }

    if (endTime !== undefined && (typeof endTime !== 'number' || endTime <= startTime)) {
      return NextResponse.json(
        { error: '结束时间必须大于开始时间' },
        { status: 400 }
      );
    }

    const newChapter = createChapter({
      audioId,
      title,
      description,
      startTime,
      endTime,
      order
    });

    return NextResponse.json(newChapter, { status: 201 });
  } catch (error) {
    console.error('Error creating chapter:', error);
    return NextResponse.json(
      { error: '创建章节失败' },
      { status: 500 }
    );
  }
}