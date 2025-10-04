import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    logger.info('🔍 Debug Session API called');
    
    // 获取服务器端会话
    const session = await getServerSession(authOptions);
    
    // 获取请求头信息
    const headers = {
      'x-user-id': request.headers.get('x-user-id'),
      'x-user-role': request.headers.get('x-user-role'),
      'x-user-email': request.headers.get('x-user-email'),
      'authorization': request.headers.get('authorization'),
      'cookie': request.headers.get('cookie')?.substring(0, 100) + '...' // 只显示前100个字符
    };
    
    // 获取Cookie信息
    const cookies = request.cookies.getAll();
    
    logger.debug('📊 Session Debug Info:', {
      hasSession: !!session,
      sessionUser: session?.user,
      headers,
      cookieCount: cookies.length
    });
    
    return NextResponse.json({
      success: true,
      debug: {
        hasSession: !!session,
        session: session ? {
          user: session.user,
          expires: session.expires
        } : null,
        headers,
        cookies: cookies.map(c => ({ name: c.name, hasValue: !!c.value })),
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('❌ Debug Session API error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Debug session failed'
      }
    }, { status: 500 });
  }
}
