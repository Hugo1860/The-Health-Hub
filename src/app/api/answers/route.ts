import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readAnswers, createAnswer } from '@/lib/questions';

// GET - 获取答案列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get('questionId');
    
    const answers = readAnswers();
    
    // 如果指定了questionId，只返回该问题的答案
    const filteredAnswers = questionId 
      ? answers.filter(a => a.questionId === questionId)
      : answers;
    
    return NextResponse.json(filteredAnswers);
  } catch (error) {
    console.error('Error fetching answers:', error);
    return NextResponse.json(
      { error: '获取答案失败' },
      { status: 500 }
    );
  }
}

// POST - 创建新答案
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const { questionId, content } = await request.json();
    
    if (!questionId || !content) {
      return NextResponse.json(
        { error: '请填写完整信息' },
        { status: 400 }
      );
    }

    const newAnswer = createAnswer({
      questionId,
      userId: session.user.id!,
      username: session.user.name!,
      content
    });

    return NextResponse.json(newAnswer, { status: 201 });
  } catch (error) {
    console.error('Error creating answer:', error);
    return NextResponse.json(
      { error: '创建答案失败' },
      { status: 500 }
    );
  }
}