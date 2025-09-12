import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  console.log('=== Check Session API Called ===');
  
  try {
    // 获取所有请求头
    const headers = Object.fromEntries(request.headers.entries());
    console.log('Request headers:', headers);
    
    // 检查cookies
    const cookies = request.headers.get('cookie');
    console.log('Cookies:', cookies);
    
    // 获取会话
    const session = await getServerSession(authOptions);
    console.log('Session from getServerSession:', session);
    
    return NextResponse.json({
      success: true,
      hasSession: !!session,
      session: session ? {
        user: session.user,
        expires: session.expires
      } : null,
      debug: {
        hasCookies: !!cookies,
        cookieCount: cookies ? cookies.split(';').length : 0,
        userAgent: headers['user-agent'],
        referer: headers['referer']
      }
    });
    
  } catch (error) {
    console.error('Check session error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}