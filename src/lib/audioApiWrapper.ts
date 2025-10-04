import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { readFile } from 'fs/promises';
import { join } from 'path';

// 简化的音频API权限验证
export async function withAudioAuth(
  handler: (req: NextRequest, hasPermission: boolean, authMethod: string) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      console.log('🔐 Audio API权限验证...');

      // 获取请求头信息
      const userId = req.headers.get('x-user-id');
      const userRole = req.headers.get('x-user-role');

      console.log('📋 请求头:', { userId, userRole });

      // 尝试从NextAuth获取会话
      let session = null;
      let hasPermission = false;
      let authMethod = 'none';

      try {
        session = await getServerSession(authOptions);
        console.log('📊 NextAuth会话:', session?.user);

        if (session?.user && (session.user as any).role === 'admin') {
          hasPermission = true;
          authMethod = 'nextauth';
          console.log('✅ NextAuth权限验证通过');
        }
      } catch (error) {
        console.log('⚠️ NextAuth会话获取失败:', error);
      }

      // 如果NextAuth失败，尝试本地用户验证
      if (!hasPermission && userId && userRole === 'admin') {
        try {
          const usersFile = join(process.cwd(), 'data', 'users.json');
          const content = await readFile(usersFile, 'utf-8');
          const users = JSON.parse(content) as Array<{
            id: string;
            role?: string;
            status?: string;
          }>;

          const user = users.find(u => u.id === userId);
          if (user && user.role === 'admin') {
            hasPermission = true;
            authMethod = 'local';
            console.log('✅ 本地用户权限验证通过');
          }
        } catch (error) {
          console.log('⚠️ 本地用户验证失败:', error);
        }
      }

      console.log('🔍 权限验证结果:', { hasPermission, authMethod });

      // 调用处理器
      return await handler(req, hasPermission, authMethod);

    } catch (error) {
      console.error('Audio API权限验证错误:', error);

      return NextResponse.json({
        success: false,
        error: {
          message: '权限验证过程中发生错误'
        }
      }, { status: 500 });
    }
  };
}

// 简化的音频API处理包装器
export async function withSimpleAudioAuth(
  handler: (req: NextRequest, hasPermission: boolean, authMethod: string) => Promise<NextResponse>
) {
  return withAudioAuth(handler);
}
