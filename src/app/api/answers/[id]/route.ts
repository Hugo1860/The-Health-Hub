import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readAnswers, readQuestions, markBestAnswer, unmarkBestAnswer, deleteAnswer } from '@/lib/questions';

// PUT - 更新答案（主要用于标记为最佳答案）
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const { isAccepted } = await request.json();
    
    const answers = readAnswers();
    const answer = answers.find(a => a.id === params.id);
    
    if (!answer) {
      return NextResponse.json(
        { error: '答案不存在' },
        { status: 404 }
      );
    }
    
    // 检查权限：只有问题作者可以标记最佳答案
    const questions = readQuestions();
    const question = questions.find(q => q.id === answer.questionId);
    
    if (!question) {
      return NextResponse.json(
        { error: '相关问题不存在' },
        { status: 404 }
      );
    }

    if (question.userId !== session.user.id) {
      return NextResponse.json(
        { error: '只有问题作者可以标记最佳答案' },
        { status: 403 }
      );
    }

    let success = false;
    if (isAccepted) {
      success = markBestAnswer(params.id);
    } else {
      success = unmarkBestAnswer(params.id);
    }

    if (!success) {
      return NextResponse.json(
        { error: '更新答案失败' },
        { status: 500 }
      );
    }

    // 返回更新后的答案
    const updatedAnswers = readAnswers();
    const updatedAnswer = updatedAnswers.find(a => a.id === params.id);

    return NextResponse.json(updatedAnswer);
  } catch (error) {
    console.error('Error updating answer:', error);
    return NextResponse.json(
      { error: '更新答案失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除答案
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const answers = readAnswers();
    const answer = answers.find(a => a.id === params.id);
    
    if (!answer) {
      return NextResponse.json(
        { error: '答案不存在' },
        { status: 404 }
      );
    }
    
    // 只有答案作者或管理员可以删除
    if (answer.userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: '无权限删除此答案' },
        { status: 403 }
      );
    }

    const success = deleteAnswer(params.id);
    
    if (!success) {
      return NextResponse.json(
        { error: '删除答案失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: '答案已删除' });
  } catch (error) {
    console.error('Error deleting answer:', error);
    return NextResponse.json(
      { error: '删除答案失败' },
      { status: 500 }
    );
  }
}