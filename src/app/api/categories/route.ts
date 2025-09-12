import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import CategoryService from '@/lib/categoryService';
import {
  CategoryQueryParams,
  CategoryListResponse,
  CategoryTreeResponse,
  CategoryLevel
} from '@/types/category';

// 查询参数验证 schema
const categoryQuerySchema = z.object({
  format: z.enum(['tree', 'flat']).default('flat'),
  includeInactive: z.coerce.boolean().default(false),
  includeCount: z.coerce.boolean().default(false),
  parentId: z.string().optional(),
  level: z.coerce.number().int().min(1).max(2).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
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

// GET - 获取分类列表或分类树
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const queryParams = Object.fromEntries(searchParams.entries());

    // 验证查询参数
    const validation = categoryQuerySchema.safeParse(queryParams);
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

    const { format, includeInactive, includeCount, parentId, level, search, limit } = validation.data;

    // 构建查询参数
    const queryOptions: CategoryQueryParams = {
      format,
      includeInactive,
      includeCount,
      parentId,
      level: level as CategoryLevel
    };

    if (format === 'tree') {
      // 返回树形结构
      const categoryTree = await CategoryService.getCategoryTree(includeCount);
      
      // 获取统计信息
      const stats = includeCount ? await CategoryService.getCategoryStats() : undefined;
      
      const response: CategoryTreeResponse = {
        success: true,
        data: categoryTree,
        stats
      };
      
      return NextResponse.json(response);
    } else {
      // 返回扁平结构
      let categories;
      
      if (search) {
        // 搜索分类
        categories = await CategoryService.searchCategories(search, {
          includeInactive,
          level: level as CategoryLevel,
          limit
        });
      } else {
        // 获取所有分类
        categories = await CategoryService.getCategories(queryOptions);
      }
      
      // 获取统计信息
      const stats = includeCount ? await CategoryService.getCategoryStats() : undefined;
      
      const response: CategoryListResponse = {
        success: true,
        data: categories,
        total: categories.length,
        stats
      };
      
      return NextResponse.json(response);
    }
  } catch (error) {
    return handleError(error, '获取分类失败');
  }
}

// 创建分类请求验证 schema
const createCategorySchema = z.object({
  name: z.string().min(1, '分类名称不能为空').max(100, '分类名称不能超过100个字符'),
  description: z.string().max(500, '分类描述不能超过500个字符').optional(),
  parentId: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, '颜色格式不正确').optional(),
  icon: z.string().max(10, '图标不能超过10个字符').optional(),
  sortOrder: z.number().int().min(0).optional()
});

// POST - 创建新分类
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证请求数据
    const validation = createCategorySchema.safeParse(body);
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

    const categoryData = validation.data;

    // 创建分类
    const result = await CategoryService.createCategory(categoryData);

    if (result.success) {
      return NextResponse.json(result, { status: 201 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    return handleError(error, '创建分类失败');
  }
}