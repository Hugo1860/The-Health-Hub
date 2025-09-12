import { NextRequest } from 'next/server';
import { authMiddleware } from '@/lib/auth-middleware';
import { AuthResponseBuilder } from '@/lib/auth-response-builder';
import { getQuestionsWithAnswers, createQuestion } from '@/lib/questions';

// GET - 获取问题列表 - 公开访问
export const GET = authMiddleware.public(
  async (request: NextRequest, context) => {
    try {
      const { searchParams } = new URL(request.url);
      const audioId = searchParams.get('audioId') || undefined;
      
      const questions = getQuestionsWithAnswers(audioId);
      
      return AuthResponseBuilder.success({
        questions,
        total: questions.length,
        audioId
      });
    } catch (error) {
      console.error('Error fetching questions:', error);
      return AuthResponseBuilder.fromError(error);
    }
  }
)

// POST - 创建新问题
export const POST = authMiddleware.userWithRateLimit(
  async (request: NextRequest, context) => {
    try {
      const { audioId, title, content } = await request.json();
      
      // 验证输入
      const errors: Record<string, string[]> = {};
      
      if (!audioId) {
        errors.audioId = ['音频ID是必填项'];
      }
      
      if (!title) {
        errors.title = ['问题标题是必填项'];
      } else if (title.length < 5 || title.length > 200) {
        errors.title = ['问题标题长度必须在5-200个字符之间'];
      }
      
      if (!content) {
        errors.content = ['问题内容是必填项'];
      } else if (content.length < 10 || content.length > 2000) {
        errors.content = ['问题内容长度必须在10-2000个字符之间'];
      }
      
      if (Object.keys(errors).length > 0) {
        return AuthResponseBuilder.validationError(
          '输入验证失败',
          errors
        );
      }

      const newQuestion = createQuestion({
        audioId,
        userId: context.user!.id,
        username: context.user!.name || context.user!.email,
        title: title.trim(),
        content: content.trim()
      });

      return AuthResponseBuilder.created({
        message: '问题创建成功',
        question: newQuestion
      });
    } catch (error) {
      console.error('Error creating question:', error);
      return AuthResponseBuilder.fromError(error);
    }
  },
  5, // 每分钟最多5个问题
  60000
)