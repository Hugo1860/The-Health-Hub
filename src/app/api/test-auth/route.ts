import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDatabase } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('=== 测试认证 ===');

    // 尝试获取 NextAuth 会话
    const session = await getServerSession(authOptions);

    console.log('NextAuth 会话:', session?.user);

    // 尝试从数据库获取用户信息
    let userFromDb = null;
    if (session?.user?.id) {
      const db = getDatabase();
      const result = await db.query('SELECT id, username, email, role, status FROM users WHERE id = ?', [session.user.id]);
      userFromDb = result.rows && result.rows[0];
      console.log('数据库用户:', userFromDb);
    }

    // 获取请求头信息
    const headers = {
      userId: request.headers.get('x-user-id'),
      userEmail: request.headers.get('x-user-email'),
      userRole: request.headers.get('x-user-role')
    };

    console.log('请求头信息:', headers);

    return NextResponse.json({
      success: true,
      session: session ? {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: (session.user as any).role,
        status: (session.user as any).status
      } : null,
      databaseUser: userFromDb,
      headers: headers,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('认证测试失败:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '认证测试失败'
    }, { status: 500 });
  }
}
