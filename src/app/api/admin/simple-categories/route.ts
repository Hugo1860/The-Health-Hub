import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { DatabaseErrorHandler } from '@/lib/api-response';
import { authMiddleware } from '@/lib/auth-middleware';

// GET - 获取分类列表 - 需要管理员权限
export const GET = authMiddleware.admin(
  async (request: NextRequest, context) => {
    console.log('=== Simple Admin Categories API Called ===');
    console.log('Admin user:', context.user!.email);
    
    try {
      // 查询数据库
      console.log('Querying database for categories...');
      const stmt = db.prepare('SELECT * FROM categories ORDER BY name ASC');
      const categories = await stmt.all();
      console.log('Query result:', categories.length, 'categories found');
      
      console.log('Returning success response');
      return NextResponse.json({
        success: true,
        categories: categories,
        count: categories.length
      });
      
    } catch (error) {
      console.error('=== Categories API Error ===');
      return DatabaseErrorHandler.handle(error as Error, 'Simple categories API error');
    }
  }
)

// POST - 创建新分类 - 需要管理员权限
export const POST = authMiddleware.admin(
  async (request: NextRequest, context) => {
    console.log('=== Simple Admin Create Category API Called ===');
    console.log('Admin user:', context.user!.email);
    
    try {
      // 获取请求数据
      const body = await request.json();
      console.log('Request body:', body);
      
      const { name, description } = body;
      
      // 验证必填字段
      if (!name) {
        return NextResponse.json({
          success: false,
          error: {
            message: 'Category name is required',
            required: ['name']
          }
        }, { status: 400 });
      }
      
      // 检查分类名称是否已存在
      const checkStmt = db.prepare('SELECT id FROM categories WHERE name = ?');
      const existingCategory = await checkStmt.get(name);
      
      if (existingCategory) {
        return NextResponse.json({
          success: false,
          error: {
            message: 'Category name already exists',
            field: 'name'
          }
        }, { status: 400 });
      }
      
      // 生成ID和时间戳
      const categoryId = `cat-${Date.now()}`;
      const createdAt = new Date().toISOString();
      
      // 插入数据库
      console.log('Inserting into database...');
      const stmt = db.prepare(`
        INSERT INTO categories (
          id, name, description, created_at
        ) VALUES (?, ?, ?, ?)
      `);
      
      const info = await stmt.run(
        categoryId,
        name,
        description || '',
        createdAt
      );
      
      if (info.changes === 0) {
        return NextResponse.json({
          success: false,
          error: { message: 'Failed to create category record' }
        }, { status: 500 });
      }
      
      // 获取创建的记录
      const getStmt = db.prepare('SELECT * FROM categories WHERE id = ?');
      const createdCategory = await getStmt.get(categoryId) as any;
      
      console.log('Category created successfully:', createdCategory.name);
      return NextResponse.json({
        success: true,
        data: createdCategory,
        message: 'Category created successfully'
      }, { status: 201 });
      
    } catch (error) {
      console.error('=== Create Category API Error ===');
      return DatabaseErrorHandler.handle(error as Error, 'Create category API error');
    }
  }
)