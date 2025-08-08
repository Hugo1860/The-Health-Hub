import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
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

// 保存分类数据
async function saveCategories(categories: Category[]) {
  await ensureDataDir();
  await writeFile(CATEGORIES_FILE, JSON.stringify(categories, null, 2));
}

// GET - 获取所有分类
export async function GET() {
  try {
    const categories = await getCategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error('获取分类失败:', error);
    return NextResponse.json(
      { error: '获取分类失败' },
      { status: 500 }
    );
  }
}

// POST - 创建新分类
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, color, icon } = body;

    if (!name) {
      return NextResponse.json(
        { error: '分类名称不能为空' },
        { status: 400 }
      );
    }

    const categories = await getCategories();
    
    // 检查分类名称是否已存在
    if (categories.some(cat => cat.name === name)) {
      return NextResponse.json(
        { error: '分类名称已存在' },
        { status: 400 }
      );
    }

    const newCategory: Category = {
      id: `category-${Date.now()}`,
      name,
      description: description || '',
      color: color || '#6b7280',
      icon: icon || '📂',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    categories.push(newCategory);
    await saveCategories(categories);

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error('创建分类失败:', error);
    return NextResponse.json(
      { error: '创建分类失败' },
      { status: 500 }
    );
  }
}