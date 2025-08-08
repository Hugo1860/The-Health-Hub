import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile } from 'fs/promises';
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

// 读取分类数据
async function getCategories(): Promise<Category[]> {
  try {
    if (!existsSync(CATEGORIES_FILE)) {
      return [];
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
  await writeFile(CATEGORIES_FILE, JSON.stringify(categories, null, 2));
}

// PUT - 更新分类
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    const categoryIndex = categories.findIndex(cat => cat.id === id);

    if (categoryIndex === -1) {
      return NextResponse.json(
        { error: '分类不存在' },
        { status: 404 }
      );
    }

    // 检查分类名称是否与其他分类重复
    const existingCategory = categories.find(cat => cat.name === name && cat.id !== id);
    if (existingCategory) {
      return NextResponse.json(
        { error: '分类名称已存在' },
        { status: 400 }
      );
    }

    // 更新分类
    categories[categoryIndex] = {
      ...categories[categoryIndex],
      name,
      description: description || '',
      color: color || categories[categoryIndex].color,
      icon: icon || categories[categoryIndex].icon,
      updatedAt: new Date().toISOString()
    };

    await saveCategories(categories);

    return NextResponse.json(categories[categoryIndex]);
  } catch (error) {
    console.error('更新分类失败:', error);
    return NextResponse.json(
      { error: '更新分类失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除分类
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const categories = await getCategories();
    const categoryIndex = categories.findIndex(cat => cat.id === id);

    if (categoryIndex === -1) {
      return NextResponse.json(
        { error: '分类不存在' },
        { status: 404 }
      );
    }

    // 不允许删除默认分类
    const defaultCategories = ['cardiology', 'neurology', 'internal-medicine', 'surgery', 'pediatrics', 'other'];
    if (defaultCategories.includes(id)) {
      return NextResponse.json(
        { error: '不能删除默认分类' },
        { status: 400 }
      );
    }

    categories.splice(categoryIndex, 1);
    await saveCategories(categories);

    return NextResponse.json({ message: '分类删除成功' });
  } catch (error) {
    console.error('删除分类失败:', error);
    return NextResponse.json(
      { error: '删除分类失败' },
      { status: 500 }
    );
  }
}