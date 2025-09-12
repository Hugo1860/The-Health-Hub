import { NextRequest, NextResponse } from 'next/server';
import CategoryService from '@/lib/categoryService';

export async function GET() {
  try {
    // 测试获取分类列表
    const categories = await CategoryService.getCategories();
    
    return NextResponse.json({
      success: true,
      message: '分类服务正常',
      data: {
        categoriesCount: categories.length,
        sampleCategories: categories.slice(0, 3)
      }
    });
  } catch (error) {
    console.error('分类服务测试失败:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : '分类服务测试失败'
      }
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json();
    
    switch (action) {
      case 'create':
        const createResult = await CategoryService.createCategory({
          name: `测试分类-${Date.now()}`,
          description: '用于测试的分类'
        });
        
        return NextResponse.json({
          success: true,
          message: '创建测试成功',
          data: createResult
        });
        
      case 'delete':
        if (!data.categoryId) {
          return NextResponse.json({
            success: false,
            error: { message: '缺少分类ID' }
          }, { status: 400 });
        }
        
        const deleteResult = await CategoryService.deleteCategory(data.categoryId, {
          force: true
        });
        
        return NextResponse.json({
          success: true,
          message: '删除测试成功',
          data: deleteResult
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: { message: '不支持的操作' }
        }, { status: 400 });
    }
  } catch (error) {
    console.error('分类操作测试失败:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : '操作失败'
      }
    }, { status: 500 });
  }
}