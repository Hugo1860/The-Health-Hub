import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('Test admin API called');
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    
    // 获取会话信息
    const session = await getServerSession(authOptions);
    console.log('Session from getServerSession:', JSON.stringify(session, null, 2));
    
    if (!session) {
      console.log('No session found');
      return NextResponse.json({
        success: false,
        error: 'No session found',
        authenticated: false,
        debug: {
          hasSession: false,
          sessionData: null
        }
      }, { status: 401 });
    }
    
    const user = session.user as any;
    console.log('User from session:', JSON.stringify(user, null, 2));
    
    const isAdmin = user?.role && ['admin', 'moderator', 'editor'].includes(user.role);
    console.log('Is admin check:', {
      userRole: user?.role,
      validRoles: ['admin', 'moderator', 'editor'],
      isAdmin
    });
    
    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status
      },
      isAdmin,
      debug: {
        hasSession: true,
        sessionKeys: Object.keys(session),
        userKeys: Object.keys(user || {}),
        roleCheck: {
          userRole: user?.role,
          validRoles: ['admin', 'moderator', 'editor'],
          includes: ['admin', 'moderator', 'editor'].includes(user?.role)
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Test admin API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}