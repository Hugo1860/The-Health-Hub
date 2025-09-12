import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import CategoryService from '@/lib/categoryService';
import { CategoryReorderRequest } from '@/types/category';

// 重新排序请求验证 schema
const reorderRequestSchema = z.object({
  requests: z.array(z.object({
    categoryId: z.string().min(1, '分类ID不能为空'),
    newSortOrder: z.number().int().min(0, '排序顺序不能为负数'),
    parentId: z.string().optional()
  })).min(1, '至少需要一个排序请求')
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

// POST - 批量重新排序分类
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证请求数据
    const validation = reorderRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_DATA',
          message: '请求数据无效',
          details: validation.error.flatten()
        }
      }, { status: 400 });
    }

    const { requests } = validation.data;

    // 验证所有分类是否存在
    for (const req of requests) {
      const category = await CategoryService.getCategoryById(req.categoryId);
      if (!category) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `分类 ${req.categoryId} 不存在`
          }
        }, { status: 404 });
      }
    }

    // 执行重新排序
    const result = await CategoryService.reorderCategories(requests);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    return handleError(error, '重新排序分类失败');
  }
}