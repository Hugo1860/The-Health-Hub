import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import CategoryService from '@/lib/categoryService';
import { CategoryTreeResponse } from '@/types/category';

// 查询参数验证 schema
const treeQuerySchema = z.object({
  includeCount: z.coerce.boolean().default(false),
  includeInactive: z.coerce.boolean().default(false)
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

// GET - 获取分类树结构
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const queryParams = Object.fromEntries(searchParams.entries());

    // 验证查询参数
    const validation = treeQuerySchema.safeParse(queryParams);
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

    const { includeCount, includeInactive } = validation.data;

    // 获取分类树
    const categoryTree = await CategoryService.getCategoryTree(includeCount);
    
    // 如果不包含非激活分类，过滤掉它们
    let filteredTree = categoryTree;
    if (!includeInactive) {
      filteredTree = categoryTree
        .filter(node => node.isActive)
        .map(node => ({
          ...node,
          children: node.children.filter(child => child.isActive)
        }));
    }

    // 获取统计信息
    const stats = includeCount ? await CategoryService.getCategoryStats() : undefined;

    const response: CategoryTreeResponse = {
      success: true,
      data: filteredTree,
      stats
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleError(error, '获取分类树失败');
  }
}