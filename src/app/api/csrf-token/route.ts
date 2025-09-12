import { NextRequest, NextResponse } from 'next/server';
import { generateCSRFToken } from '@/lib/csrf';
import { ApiResponse, DatabaseErrorHandler } from '@/lib/api-response';
import { authMiddleware } from '@/lib/auth-middleware';

// GET - 获取CSRF令牌 - 需要用户认证
export const GET = authMiddleware.user(
  async (request: NextRequest, context) => {
    try {
      // 生成CSRF token
      const csrfToken = generateCSRFToken(context.user!.id);
      
      return ApiResponse.success({
        csrfToken,
        timestamp: Date.now()
      });
      
    } catch (error) {
      return DatabaseErrorHandler.handle(error as Error, 'CSRF token generation error');
    }
  }
)