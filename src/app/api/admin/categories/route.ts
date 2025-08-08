import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const CATEGORIES_FILE = join(process.cwd(), 'data', 'categories.json');

interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

// 确保数据目录存在
async function ensureDataDir() {
  const dataDir = join(process.cwd(), 'data');
  if (!existsSync(dataDir)) {
    await mkdir(dataDir, { recursive: true });
  }
}

// 读取分类数据
async function getCategories(): Promise<Category[]> {
  try {
    await ensureDataDir();
    if (!existsSync(CATEGORIES_FILE)) {
      // 创建默认分类
      const defaultCategories: Category[] = [
        {
          id: 'cardiology',
          name: '心血管',
          description: '心血管疾病相关内容',
          color: '#ef4444',
          icon: '❤️',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'neurology',
          name: '神经科',
          description: '神经系统疾病相关内容',
          color: '#8b5cf6',
          icon: '🧠',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'internal-medicine',
          name: '内科学',
          description: '内科疾病相关内容',
          color: '#10b981',
          icon: '🏥',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'surgery',
          name: '外科',
          description: '外科手术相关内容',
          color: '#f59e0b',
          icon: '🔬',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'pediatrics',
          name: '儿科',
          description: '儿童疾病相关内容',
          color: '#3b82f6',
          icon: '👶',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'other',
          name: '其他',
          description: '其他医学相关内容',
          color: '#6b7280',
          icon: '📚',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      await writeFile(CATEGORIES_FILE, JSON.stringify(defaultCategories, null, 2));
      return defaultCategories;
    }
    
    const data = await readFile(CATEGORIES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('读取分类数据失败:', error);
    return [];
  }
}

// 管理员获取分类列表
export async function GET(request: NextRequest) {
  try {
    console.log('Admin categories API called');
    
    // 检查管理员权限
    const session = await getServerSession(authOptions);
    console.log('Session:', session);
    
    if (!session?.user) {
      console.log('No session found');
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '需要登录才能访问'
        }
      }, { status: 401 });
    }
    
    const user = session.user as any;
    console.log('User:', user);
    
    const isAdmin = user?.role && ['admin', 'moderator', 'editor'].includes(user.role);
    console.log('Is admin:', isAdmin, 'Role:', user?.role);
    
    if (!isAdmin) {
      console.log('User is not admin');
      return NextResponse.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '需要管理员权限'
        }
      }, { status: 403 });
    }
    
    const categories = await getCategories();
    
    return NextResponse.json({
      success: true,
      data: categories
    });
    
  } catch (error) {
    console.error('Admin categories API error:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取分类列表失败',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 });
  }
}