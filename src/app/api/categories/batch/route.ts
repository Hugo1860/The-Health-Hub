import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import CategoryService from '@/lib/categoryService';

// 批量操作请求验证 schema
const batchOperationSchema = z.object({
  operation: z.enum(['activate', 'deactivate', 'delete', 'move']),
  categoryIds: z.array(z.string().min(1)).min(1, '至少需要选择一个分类'),
  targetParentId: z.string().optional() // 用于移动操作
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

// POST - 批量操作分类
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证请求数据
    const validation = batchOperationSchema.safeParse(body);
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

    const { operation, categoryIds, targetParentId } = validation.data;

    let result;

    switch (operation) {
      case 'activate':
        result = await CategoryService.batchUpdateCategoryStatus(categoryIds, true);
        break;

      case 'deactivate':
        result = await CategoryService.batchUpdateCategoryStatus(categoryIds, false);
        break;

      case 'delete':
        // 获取查询参数
        const searchParams = request.nextUrl.searchParams;
        const force = searchParams.get('force') === 'true';
        const cascade = searchParams.get('cascade') === 'true';
        
        // 使用批量删除方法
        result = await CategoryService.batchDeleteCategories(categoryIds, { force, cascade });
        break;

      case 'move':
        if (!targetParentId) {
          return NextResponse.json({
            success: false,
            error: {
              code: 'INVALID_DATA',
              message: '移动操作需要指定目标父分类'
            }
          }, { status: 400 });
        }

        // 批量移动需要逐个处理
        const moveResults = [];
        for (const categoryId of categoryIds) {
          const moveResult = await CategoryService.moveCategory(categoryId, targetParentId);
          moveResults.push({ categoryId, result: moveResult });
        }

        const failedMoves = moveResults.filter(r => !r.result.success);
        if (failedMoves.length > 0) {
          return NextResponse.json({
            success: false,
            error: {
              code: 'BATCH_MOVE_FAILED',
              message: `${failedMoves.length} 个分类移动失败`,
              details: failedMoves
            }
          }, { status: 400 });
        }

        result = {
          success: true,
          message: `成功移动 ${categoryIds.length} 个分类`
        };
        break;

      default:
        return NextResponse.json({
          success: false,
          error: {
            code: 'INVALID_OPERATION',
            message: '不支持的操作类型'
          }
        }, { status: 400 });
    }

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    return handleError(error, '批量操作分类失败');
  }
}