import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getQuestionsWithAnswers, createQuestion } from '@/lib/questions';

// GET - 获取问题列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const audioId = searchParams.get('audioId') || undefined;
    
    const questions = getQuestionsWithAnswers(audioId);
    
    return NextResponse.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json(
      { error: '获取问题失败' },
      { status: 500 }
    );
  }
}

// POST - 创建新问题
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const { audioId, title, content } = await request.json();
    
    if (!audioId || !title || !content) {
      return NextResponse.json(
        { error: '请填写完整信息' },
        { status: 400 }
      );
    }

    const newQuestion = createQuestion({
      audioId,
      userId: session.user.id!,
      username: session.user.name!,
      title,
      content
    });

    return NextResponse.json(newQuestion, { status: 201 });
  } catch (error) {
    console.error('Error creating question:', error);
    return NextResponse.json(
      { error: '创建问题失败' },
      { status: 500 }
    );
  }
}