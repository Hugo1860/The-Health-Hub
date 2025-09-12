import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import CategoryService from '@/lib/categoryService';

// 验证请求 schema
const validateRequestSchema = z.object({
  type: z.enum(['hierarchy', 'selection', 'name']),
  data: z.any() // 根据类型动态验证
});

// 名称验证 schema
const nameValidationSchema = z.object({
  name: z.string().min(1),
  parentId: z.string().optional(),
  excludeId: z.string().optional()
});

// 选择验证 schema
const selectionValidationSchema = z.object({
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional()
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

// POST - 验证分类相关数据
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证基础请求结构
    const validation = validateRequestSchema.safeParse(body);
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

    const { type, data } = validation.data;

    let result;

    switch (type) {
      case 'hierarchy':
        // 验证分类层级结构
        result = await CategoryService.validateHierarchy();
        break;

      case 'selection':
        // 验证分类选择
        const selectionValidation = selectionValidationSchema.safeParse(data);
        if (!selectionValidation.success) {
          return NextResponse.json({
            success: false,
            error: {
              code: 'INVALID_DATA',
              message: '选择数据无效',
              details: selectionValidation.error.flatten()
            }
          }, { status: 400 });
        }

        result = await CategoryService.validateSelection(selectionValidation.data);
        break;

      case 'name':
        // 验证分类名称可用性
        const nameValidation = nameValidationSchema.safeParse(data);
        if (!nameValidation.success) {
          return NextResponse.json({
            success: false,
            error: {
              code: 'INVALID_DATA',
              message: '名称验证数据无效',
              details: nameValidation.error.flatten()
            }
          }, { status: 400 });
        }

        const { name, parentId, excludeId } = nameValidation.data;
        const isAvailable = await CategoryService.isCategoryNameAvailable(name, parentId, excludeId);
        
        result = {
          isValid: isAvailable,
          errors: isAvailable ? [] : [{
            code: 'DUPLICATE_NAME' as any,
            message: '分类名称已存在'
          }]
        };
        break;

      default:
        return NextResponse.json({
          success: false,
          error: {
            code: 'INVALID_TYPE',
            message: '不支持的验证类型'
          }
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    return handleError(error, '验证分类数据失败');
  }
}