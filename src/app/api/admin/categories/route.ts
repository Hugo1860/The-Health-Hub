import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { ApiResponse, DatabaseErrorHandler } from '@/lib/api-response';
import { authMiddleware } from '@/lib/auth-middleware';

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

// 管理员获取分类列表 - 需要管理员权限
export const GET = authMiddleware.admin(
  async (request: NextRequest, context) => {
    try {
      console.log('Admin categories API called by:', context.user!.email);
      
      const categories = await getCategories();
      
      return ApiResponse.success(categories);
      
    } catch (error) {
      return DatabaseErrorHandler.handle(error as Error, 'Admin categories API error');
    }
  }
)