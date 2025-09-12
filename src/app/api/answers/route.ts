import { NextRequest } from 'next/server';
import { authMiddleware } from '@/lib/auth-middleware';
import { AuthResponseBuilder } from '@/lib/auth-response-builder';
import { readAnswers, createAnswer } from '@/lib/questions';

// GET - 获取答案列表 - 公开访问
export const GET = authMiddleware.public(
  async (request: NextRequest, context) => {
    try {
      const { searchParams } = new URL(request.url);
      const questionId = searchParams.get('questionId');
      
      const answers = readAnswers();
      
      // 如果指定了questionId，只返回该问题的答案
      const filteredAnswers = questionId 
        ? answers.filter(a => a.questionId === questionId)
        : answers;
      
      return AuthResponseBuilder.success({
        answers: filteredAnswers,
        total: filteredAnswers.length,
        questionId
      });
    } catch (error) {
      console.error('Error fetching answers:', error);
      return AuthResponseBuilder.fromError(error);
    }
  }
)

// POST - 创建新答案
export const POST = authMiddleware.userWithRateLimit(
  async (request: NextRequest, context) => {
    try {
      const { questionId, content } = await request.json();
      
      // 验证输入
      const errors: Record<string, string[]> = {};
      
      if (!questionId) {
        errors.questionId = ['问题ID是必填项'];
      }
      
      if (!content) {
        errors.content = ['答案内容是必填项'];
      } else if (content.length < 10 || content.length > 5000) {
        errors.content = ['答案内容长度必须在10-5000个字符之间'];
      }
      
      if (Object.keys(errors).length > 0) {
        return AuthResponseBuilder.validationError(
          '输入验证失败',
          errors
        );
      }

      const newAnswer = createAnswer({
        questionId,
        userId: context.user!.id,
        username: context.user!.name || context.user!.email,
        content: content.trim()
      });

      return AuthResponseBuilder.created({
        message: '答案创建成功',
        answer: newAnswer
      });
    } catch (error) {
      console.error('Error creating answer:', error);
      return AuthResponseBuilder.fromError(error);
    }
  },
  10, // 每分钟最多10个答案
  60000
)