import { NextRequest, NextResponse } from 'next/server';
import CategoryService from '@/lib/categoryService';

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

// GET - 获取分类统计信息
export async function GET(request: NextRequest) {
  try {
    // 获取基础统计信息
    const stats = await CategoryService.getCategoryStats();
    
    // 获取使用情况报告
    const usageReport = await CategoryService.getCategoryUsageReport();

    const response = {
      success: true,
      data: {
        stats,
        usage: usageReport
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleError(error, '获取分类统计失败');
  }
}