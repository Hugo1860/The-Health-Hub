import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// 简化的查询参数验证
const simpleQuerySchema = z.object({
  format: z.enum(['tree', 'flat']).default('flat'),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

// GET - 简化的分类列表获取
export async function GET(request: NextRequest) {
  try {
    console.log('🎯 Simple categories API called');
    
    const searchParams = request.nextUrl.searchParams;
    const queryParams = Object.fromEntries(searchParams.entries());

    // 验证查询参数
    const validation = simpleQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      console.error('Validation failed:', validation.error);
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_PARAMS',
          message: '查询参数无效',
          details: validation.error.flatten()
        }
      }, { status: 400 });
    }

    const { format, limit } = validation.data;
    
    // 直接查询数据库，不使用复杂的服务层
    const db = (await import('@/lib/db')).default;
    
    console.log('📋 Executing simple database query...');
    
    const query = `
      SELECT 
        id,
        name,
        description,
        color,
        icon,
        parent_id,
        level,
        sort_order,
        is_active,
        created_at,
        updated_at
      FROM categories 
      WHERE is_active = true
      ORDER BY level ASC, sort_order ASC, name ASC
      LIMIT $1
    `;

    const result = await db.query(query, [limit]);
    
    console.log(`Found ${result.rows.length} categories`);
    
    // 转换数据格式
    const categories = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      color: row.color,
      icon: row.icon,
      parentId: row.parent_id,
      level: row.level,
      sortOrder: row.sort_order,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      audioCount: 0 // 简化版本不计算音频数量
    }));

    if (format === 'tree') {
      // 简单的树形结构构建
      const level1Categories = categories.filter(cat => cat.level === 1);
      const level2Categories = categories.filter(cat => cat.level === 2);
      
      const tree = level1Categories.map(parent => ({
        ...parent,
        children: level2Categories.filter(child => child.parentId === parent.id)
      }));
      
      return NextResponse.json({
        success: true,
        data: tree,
        total: tree.length
      });
    } else {
      // 扁平结构
      return NextResponse.json({
        success: true,
        data: categories,
        total: categories.length
      });
    }

  } catch (error) {
    console.error('❌ Simple categories API error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 });
  }
}

// POST - 简化的分类创建
export async function POST(request: NextRequest) {
  try {
    console.log('📝 Simple category creation called');
    
    const body = await request.json();
    
    // 简单验证
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_DATA',
          message: '分类名称不能为空'
        }
      }, { status: 400 });
    }

    const db = (await import('@/lib/db')).default;
    
    // 生成简单的ID
    const categoryId = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 确定层级
    const level = body.parentId ? 2 : 1;
    
    // 插入数据库
    const insertQuery = `
      INSERT INTO categories (
        id, name, description, color, icon, parent_id, level, 
        sort_order, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const insertParams = [
      categoryId,
      body.name,
      body.description || null,
      body.color || '#6b7280',
      body.icon || '📂',
      body.parentId || null,
      level,
      0, // sortOrder
      true // isActive
    ];

    const result = await db.query(insertQuery, insertParams);
    const newCategory = result.rows[0];
    
    console.log('✅ Category created:', newCategory.id);

    return NextResponse.json({
      success: true,
      data: {
        id: newCategory.id,
        name: newCategory.name,
        description: newCategory.description,
        color: newCategory.color,
        icon: newCategory.icon,
        parentId: newCategory.parent_id,
        level: newCategory.level,
        sortOrder: newCategory.sort_order,
        isActive: newCategory.is_active,
        createdAt: newCategory.created_at,
        updatedAt: newCategory.updated_at
      },
      message: '分类创建成功'
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Simple category creation error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 });
  }
}