import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DatabaseErrorHandler } from '@/lib/api-response';
import { withSecurity } from '@/lib/secureApiWrapper';
import { ANTD_ADMIN_PERMISSIONS } from '@/lib/server-permissions';

// GET - 获取分类列表 - 需要管理员权限
export const GET = withSecurity(
  async (request: NextRequest) => {
    console.log('=== Simple Admin Categories API Called ===');

    try {
      // 查询数据库
      console.log('Querying database for categories...');
      const db = getDatabase();
      const result = await db.query('SELECT * FROM categories ORDER BY name ASC');
      const categories = result.rows || [];
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
  }, { requireAuth: false, enableRateLimit: true }
)

// POST - 创建新分类 - 需要管理员权限
export const POST = withSecurity(
  async (request: NextRequest) => {
    console.log('=== Simple Admin Create Category API Called ===');

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

      // 查询数据库
      const db = getDatabase();

      // 检查分类名称是否已存在
      const checkResult = await db.query('SELECT id FROM categories WHERE name = ?', [name]);
      const existingCategory = checkResult.rows && checkResult.rows.length > 0;

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
      const insertResult = await db.query(
        'INSERT INTO categories (id, name, description, created_at) VALUES (?, ?, ?, ?)',
        [categoryId, name, description || '', createdAt]
      );

      console.log('Insert result:', insertResult);

      if (insertResult.rowCount === 0) {
        return NextResponse.json({
          success: false,
          error: { message: 'Failed to create category record' }
        }, { status: 500 });
      }

      // 获取创建的记录
      const getResult = await db.query('SELECT * FROM categories WHERE id = ?', [categoryId]);
      const createdCategory = getResult.rows && getResult.rows[0];

      console.log('Category created successfully:', createdCategory);
      return NextResponse.json({
        success: true,
        data: createdCategory,
        message: 'Category created successfully'
      }, { status: 201 });

    } catch (error) {
      console.error('=== Create Category API Error ===');
      return DatabaseErrorHandler.handle(error as Error, 'Create category API error');
    }
  }, { requireAuth: true, requiredPermissions: [ANTD_ADMIN_PERMISSIONS.MANAGE_CATEGORIES], requireCSRF: true, enableRateLimit: true, allowedMethods: ['POST'] }
)