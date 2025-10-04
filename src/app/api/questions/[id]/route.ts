import { NextRequest, NextResponse } from 'next/server';
import { getQuestionWithAnswers, deleteQuestion, readQuestions } from '@/lib/questions';
import { ApiResponse, DatabaseErrorHandler } from '@/lib/api-response';
import { withSecurity } from '@/lib/secureApiWrapper';

// GET - 获取单个问题详情 - 公开访问
export const GET = withSecurity(
  async (request: NextRequest) => {
    try {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop() as string;
      const question = getQuestionWithAnswers(id);
      
      if (!question) {
        return ApiResponse.notFound('问题不存在');
      }

      return ApiResponse.success(question);
    } catch (error) {
      return DatabaseErrorHandler.handle(error, 'Error fetching question');
    }
  }, { requireAuth: false, enableRateLimit: true, allowedMethods: ['GET'] }
);

// DELETE - 删除问题 - 需要用户认证
export const DELETE = withSecurity(
  async (request: NextRequest) => {
    try {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop() as string;
      
      const questions = readQuestions();
      const question = questions.find(q => q.id === id);
      
      if (!question) {
        return ApiResponse.notFound('问题不存在');
      }
      
      // 只有问题作者或管理员可以删除
      const userId = request.headers.get('x-user-id') as string;
      const userRole = (request.headers.get('x-user-role') || '').toLowerCase();
      if (question.userId !== userId && userRole !== 'admin') {
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
  }, { requireAuth: true, requireCSRF: true, enableRateLimit: true, allowedMethods: ['DELETE'] }
);