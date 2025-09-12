import { NextRequest, NextResponse } from 'next/server';
import { deleteCategory, batchDeleteCategories } from '@/lib/categoryDeleteSimple';
import { getAllCategories } from '@/lib/categoryQueriesFixed';

export async function GET() {
  try {
    // 获取所有分类
    const categories = await getAllCategories();
    
    return NextResponse.json({
      success: true,
      message: '简化删除服务正常',
      data: {
        categoriesCount: categories.length,
        testCategories: categories.filter(c => c.name.includes('测试')).length
      }
    });
  } catch (error) {
    console.error('简化删除服务测试失败:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : '服务测试失败'
      }
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, categoryId, categoryIds } = await request.json();
    
    switch (action) {
      case 'delete-single':
        if (!categoryId) {
          return NextResponse.json({
            success: false,
            error: { message: '缺少分类ID' }
          }, { status: 400 });
        }
        
        await deleteCategory(categoryId, { force: true });
        
        return NextResponse.json({
          success: true,
          message: '单个删除成功'
        });
        
      case 'delete-batch':
        if (!categoryIds || !Array.isArray(categoryIds)) {
          return NextResponse.json({
            success: false,
            error: { message: '缺少分类ID列表' }
          }, { status: 400 });
        }
        
        const result = await batchDeleteCategories(categoryIds, { force: true });
        
        return NextResponse.json({
          success: true,
          message: '批量删除完成',
          data: result
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: { message: '不支持的操作' }
        }, { status: 400 });
    }
  } catch (error) {
    console.error('删除操作失败:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : '删除失败'
      }
    }, { status: 500 });
  }
}