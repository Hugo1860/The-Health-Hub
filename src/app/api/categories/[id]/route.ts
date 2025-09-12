import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import CategoryService from '@/lib/categoryService';
import { CategoryOperationResult } from '@/types/category';

// 更新分类请求验证 schema
const updateCategorySchema = z.object({
  name: z.string().min(1, '分类名称不能为空').max(100, '分类名称不能超过100个字符').optional(),
  description: z.string().max(500, '分类描述不能超过500个字符').optional(),
  parentId: z.string().nullable().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, '颜色格式不正确').optional(),
  icon: z.string().max(10, '图标不能超过10个字符').optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional()
});

// 辅助函数：处理错误响应
function handleError(error: unknown, defaultMessage: string) {
  console.error(defaultMessage, error);
  
  const errorMessage = error instanceof Error ? error.message : defaultMessage;
  
  return NextResponse.json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: errorMessage
    }
  }, { status: 500 });
}

// GET - 获取单个分类
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const category = await CategoryService.getCategoryById(id);

    if (!category) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '分类不存在'
        }
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: category
    });
  } catch (error) {
    return handleError(error, '获取分类详情失败');
  }
}

// PUT - 更新分类
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    console.log('更新分类API - ID:', id, '请求数据:', body);
    
    // 验证请求数据
    const validation = updateCategorySchema.safeParse(body);
    if (!validation.success) {
      console.error('API验证失败:', validation.error);
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_DATA',
          message: '请求数据无效',
          details: validation.error.flatten()
        }
      }, { status: 400 });
    }

    const updateData = validation.data;

    // 更新分类
    const result = await CategoryService.updateCategory(id, updateData);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      const statusCode = result.error?.code === 'NOT_FOUND' ? 404 : 400;
      return NextResponse.json(result, { status: statusCode });
    }
  } catch (error) {
    return handleError(error, '更新分类失败');
  }
}

// DELETE - 删除分类
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const force = searchParams.get('force') === 'true';
    const cascade = searchParams.get('cascade') === 'true';

    // 删除分类
    const result = await CategoryService.deleteCategory(id, { force, cascade });

    if (result.success) {
      return NextResponse.json(result);
    } else {
      const statusCode = result.error?.code === 'NOT_FOUND' ? 404 : 400;
      return NextResponse.json(result, { status: statusCode });
    }
  } catch (error) {
    return handleError(error, '删除分类失败');
  }
}