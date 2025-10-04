import { NextRequest } from 'next/server';
import { withSecurity } from '@/lib/secureApiWrapper';
import { AuthResponseBuilder } from '@/lib/auth-response-builder';
import { getQuestionsWithAnswers, createQuestion } from '@/lib/questions';

// GET - 获取问题列表 - 公开访问
export const GET = withSecurity(
  async (request: NextRequest) => {
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
      return AuthResponseBuilder.fromError(error instanceof Error ? error : String(error));
    }
  }, { requireAuth: false, enableRateLimit: true, allowedMethods: ['GET'] }
)

// POST - 创建新问题
export const POST = withSecurity(
  async (request: NextRequest) => {
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

      const userId = request.headers.get('x-user-id') as string;
      const userName = request.headers.get('x-user-name') as string | null;
      const newQuestion = createQuestion({
        audioId,
        userId,
        username: userName || '用户',
        title: title.trim(),
        content: content.trim()
      });

      return AuthResponseBuilder.created({
        message: '问题创建成功',
        question: newQuestion
      });
    } catch (error) {
      console.error('Error creating question:', error);
      return AuthResponseBuilder.fromError(error instanceof Error ? error : String(error));
    }
  }, { requireAuth: true, requireCSRF: true, enableRateLimit: true, rateLimitMax: 5, rateLimitWindow: 60000, allowedMethods: ['POST'] }
)