import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import CategoryService from '@/lib/categoryService';
import { CategoryLevel, CategoryListResponse } from '@/types/category';

// 搜索参数验证 schema
const searchQuerySchema = z.object({
  q: z.string().min(1, '搜索关键词不能为空'),
  includeInactive: z.coerce.boolean().default(false),
  level: z.coerce.number().int().min(1).max(2).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20)
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

// GET - 搜索分类
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const queryParams = Object.fromEntries(searchParams.entries());

    // 验证查询参数
    const validation = searchQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_PARAMS',
          message: '查询参数无效',
          details: validation.error.flatten()
        }
      }, { status: 400 });
    }

    const { q: searchTerm, includeInactive, level, limit } = validation.data;

    // 搜索分类
    const categories = await CategoryService.searchCategories(searchTerm, {
      includeInactive,
      level: level as CategoryLevel,
      limit
    });

    const response: CategoryListResponse = {
      success: true,
      data: categories,
      total: categories.length
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleError(error, '搜索分类失败');
  }
}