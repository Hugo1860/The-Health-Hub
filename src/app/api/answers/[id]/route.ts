import { NextRequest, NextResponse } from 'next/server';
import { readAnswers, readQuestions, markBestAnswer, unmarkBestAnswer, deleteAnswer } from '@/lib/questions';
import { ApiResponse, DatabaseErrorHandler } from '@/lib/api-response';
import { authMiddleware } from '@/lib/auth-middleware';

// PUT - 更新答案（主要用于标记为最佳答案） - 需要用户认证
export const PUT = authMiddleware.user(
  async (request: NextRequest, context, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      const { isAccepted } = await request.json();
      
      const answers = readAnswers();
      const answer = answers.find(a => a.id === id);
      
      if (!answer) {
        return ApiResponse.notFound('答案不存在');
      }
      
      // 检查权限：只有问题作者可以标记最佳答案
      const questions = readQuestions();
      const question = questions.find(q => q.id === answer.questionId);
      
      if (!question) {
        return ApiResponse.notFound('相关问题不存在');
      }

      if (question.userId !== context.user!.id) {
        return ApiResponse.forbidden('只有问题作者可以标记最佳答案');
      }

      let success = false;
      if (isAccepted) {
        success = markBestAnswer(id);
      } else {
        success = unmarkBestAnswer(id);
      }

      if (!success) {
        return ApiResponse.internalError('更新答案失败');
      }

      // 返回更新后的答案
      const updatedAnswers = readAnswers();
      const updatedAnswer = updatedAnswers.find(a => a.id === id);

      return ApiResponse.success(updatedAnswer);
    } catch (error) {
      return DatabaseErrorHandler.handle(error, 'Error updating answer');
    }
  }
);

// DELETE - 删除答案 - 需要用户认证
export const DELETE = authMiddleware.user(
  async (request: NextRequest, context, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      
      const answers = readAnswers();
      const answer = answers.find(a => a.id === id);
      
      if (!answer) {
        return ApiResponse.notFound('答案不存在');
      }
      
      // 只有答案作者或管理员可以删除
      if (answer.userId !== context.user!.id && context.user!.role !== 'admin') {
        return ApiResponse.forbidden('无权限删除此答案');
      }

      const success = deleteAnswer(id);
      
      if (!success) {
        return ApiResponse.internalError('删除答案失败');
      }

      return ApiResponse.success(null, '答案已删除');
    } catch (error) {
      return DatabaseErrorHandler.handle(error, 'Error deleting answer');
    }
  }
);