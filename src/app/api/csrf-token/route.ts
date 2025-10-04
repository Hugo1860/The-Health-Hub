import { NextRequest, NextResponse } from 'next/server';
import { generateCSRFToken } from '@/lib/csrf';
import { ApiResponse, DatabaseErrorHandler } from '@/lib/api-response';
import { withSecurity } from '@/lib/secureApiWrapper';

// GET - 获取CSRF令牌 - 需要用户认证
export const GET = withSecurity(
  async (request: NextRequest) => {
    try {
      // 生成CSRF token
      const userId = request.headers.get('x-user-id') as string;
      const csrfToken = generateCSRFToken(userId);
      
      return ApiResponse.success({
        csrfToken,
        timestamp: Date.now()
      });
      
    } catch (error) {
      return DatabaseErrorHandler.handle(error as Error, 'CSRF token generation error');
    }
  }, { requireAuth: true, enableRateLimit: true, allowedMethods: ['GET'] }
)