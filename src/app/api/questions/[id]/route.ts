import { NextRequest, NextResponse } from 'next/server';
import { getQuestionWithAnswers, deleteQuestion, readQuestions } from '@/lib/questions';
import { ApiResponse, DatabaseErrorHandler } from '@/lib/api-response';
import { authMiddleware } from '@/lib/auth-middleware';

// GET - 获取单个问题详情 - 公开访问
export const GET = authMiddleware.public(
  async (request: NextRequest, context, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      const question = getQuestionWithAnswers(id);
      
      if (!question) {
        return ApiResponse.notFound('问题不存在');
      }

      return ApiResponse.success(question);
    } catch (error) {
      return DatabaseErrorHandler.handle(error, 'Error fetching question');
    }
  }
);

// DELETE - 删除问题 - 需要用户认证
export const DELETE = authMiddleware.user(
  async (request: NextRequest, context, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      
      const questions = readQuestions();
      const question = questions.find(q => q.id === id);
      
      if (!question) {
        return ApiResponse.notFound('问题不存在');
      }
      
      // 只有问题作者或管理员可以删除
      if (question.userId !== context.user!.id && context.user!.role !== 'admin') {
        return ApiResponse.forbidden('无权限删除此问题');
      }

      const success = deleteQuestion(id);
      
      if (!success) {
        return ApiResponse.internalError('删除问题失败');
      }

      return ApiResponse.success(null, '问题已删除');
    } catch (error) {
      return DatabaseErrorHandler.handle(error, 'Error deleting question');
    }
  }
);