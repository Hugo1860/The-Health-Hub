import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getQuestionWithAnswers, deleteQuestion, readQuestions } from '@/lib/questions';

// GET - 获取单个问题详情
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const question = getQuestionWithAnswers(params.id);
    
    if (!question) {
      return NextResponse.json(
        { error: '问题不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json(question);
  } catch (error) {
    console.error('Error fetching question:', error);
    return NextResponse.json(
      { error: '获取问题失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除问题
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

    const questions = readQuestions();
    const question = questions.find(q => q.id === params.id);
    
    if (!question) {
      return NextResponse.json(
        { error: '问题不存在' },
        { status: 404 }
      );
    }
    
    // 只有问题作者或管理员可以删除
    if (question.userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: '无权限删除此问题' },
        { status: 403 }
      );
    }

    const success = deleteQuestion(params.id);
    
    if (!success) {
      return NextResponse.json(
        { error: '删除问题失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: '问题已删除' });
  } catch (error) {
    console.error('Error deleting question:', error);
    return NextResponse.json(
      { error: '删除问题失败' },
      { status: 500 }
    );
  }
}