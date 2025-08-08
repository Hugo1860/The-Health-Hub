import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const CATEGORIES_FILE = join(process.cwd(), 'data', 'categories.json');

export async function GET(request: NextRequest) {
  console.log('=== Simple Admin Categories API Called ===');
  
  try {
    // 1. 获取会话
    console.log('1. Getting session...');
    const session = await getServerSession(authOptions);
    console.log('Session result:', session ? 'Found' : 'Not found');
    
    // 2. 检查是否有用户
    if (!session?.user) {
      console.log('2. No user in session');
      return NextResponse.json({
        success: false,
        error: 'No authentication found'
      }, { status: 401 });
    }
    
    // 3. 检查用户角色
    const user = session.user as any;
    console.log('3. User details:', {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status
    });
    
    const isAdmin = user.role === 'admin';
    console.log('4. Admin check:', { role: user.role, isAdmin });
    
    if (!isAdmin) {
      console.log('5. User is not admin');
      return NextResponse.json({
        success: false,
        error: 'Admin role required'
      }, { status: 403 });
    }
    
    // 5. 读取分类数据
    console.log('6. Reading categories...');
    let categories = [];
    
    try {
      if (existsSync(CATEGORIES_FILE)) {
        const data = await readFile(CATEGORIES_FILE, 'utf-8');
        categories = JSON.parse(data);
        console.log('7. Categories loaded:', categories.length, 'items');
      } else {
        console.log('7. Categories file not found, creating default...');
        // 创建默认分类
        categories = [
          {
            id: 'cardiology',
            name: '心血管',
            description: '心血管疾病相关内容',
            color: '#ef4444',
            icon: '❤️'
          },
          {
            id: 'neurology',
            name: '神经科',
            description: '神经系统疾病相关内容',
            color: '#8b5cf6',
            icon: '🧠'
          },
          {
            id: 'internal-medicine',
            name: '内科学',
            description: '内科疾病相关内容',
            color: '#10b981',
            icon: '🏥'
          },
          {
            id: 'surgery',
            name: '外科',
            description: '外科手术相关内容',
            color: '#f59e0b',
            icon: '🔬'
          },
          {
            id: 'pediatrics',
            name: '儿科',
            description: '儿童疾病相关内容',
            color: '#3b82f6',
            icon: '👶'
          },
          {
            id: 'other',
            name: '其他',
            description: '其他医学相关内容',
            color: '#6b7280',
            icon: '📚'
          }
        ];
        
        // 确保数据目录存在
        const dataDir = join(process.cwd(), 'data');
        if (!existsSync(dataDir)) {
          await mkdir(dataDir, { recursive: true });
        }
        
        await writeFile(CATEGORIES_FILE, JSON.stringify(categories, null, 2));
        console.log('8. Default categories created');
      }
    } catch (fileError) {
      console.error('File operation error:', fileError);
      // 返回默认分类
      categories = [
        { id: 'other', name: '其他', description: '其他医学相关内容', color: '#6b7280', icon: '📚' }
      ];
    }
    
    console.log('9. Returning success response');
    return NextResponse.json({
      success: true,
      data: categories,
      count: categories.length
    });
    
  } catch (error) {
    console.error('=== API Error ===');
    console.error('Error:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack');
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}