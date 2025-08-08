import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateCSRFToken } from '@/lib/csrf';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    // 生成CSRF token
    const csrfToken = generateCSRFToken(session.user.id);
    
    return NextResponse.json({
      csrfToken,
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('CSRF token generation error:', error);
    return NextResponse.json(
      { error: '生成CSRF令牌失败' },
      { status: 500 }
    );
  }
}