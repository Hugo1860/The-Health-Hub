import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Test Session API called');
    
    // 获取服务器端会话
    const session = await getServerSession(authOptions);
    
    // 获取请求头信息
    const headers = {
      'x-user-id': request.headers.get('x-user-id'),
      'x-user-role': request.headers.get('x-user-role'),
      'x-user-email': request.headers.get('x-user-email'),
      'authorization': request.headers.get('authorization'),
      'cookie': request.headers.get('cookie')?.substring(0, 200) + '...' // 只显示前200个字符
    };
    
    // 获取Cookie信息
    const cookies = request.cookies.getAll();
    
    console.log('📊 Test Session Debug Info:', {
      hasSession: !!session,
      sessionUser: session?.user,
      headers,
      cookieCount: cookies.length,
      cookieNames: cookies.map(c => c.name)
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
    console.error('❌ Test Session API error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Test session failed'
      }
    }, { status: 500 });
  }
}