/**
 * 兼容性管理 API
 * 
 * 提供数据同步、一致性检查和兼容性管理功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import DataSyncService from '@/lib/dataSyncService';
import CategoryCompatibilityAdapter from '@/lib/categoryCompatibility';
import CategoryService from '@/lib/categoryService';

// 请求验证 schema
const syncRequestSchema = z.object({
  action: z.enum(['sync', 'check', 'fix', 'cleanup', 'report']),
  audioIds: z.array(z.string()).optional(),
  batchSize: z.number().int().min(1).max(1000).default(100)
});

/**
 * GET /api/admin/compatibility - 获取兼容性状态
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'report';

    const syncService = DataSyncService.getInstance();

    switch (action) {
      case 'check':
        // 检查数据一致性
        const consistencyReport = await syncService.checkDataConsistency();
        return NextResponse.json({
          success: true,
          data: consistencyReport
        });

      case 'report':
        // 生成完整报告
        const fullReport = await syncService.generateSyncReport();
        return NextResponse.json({
          success: true,
          data: fullReport
        });

      default:
        return NextResponse.json({
          success: false,
          error: '不支持的操作'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('获取兼容性状态失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '获取状态失败'
    }, { status: 500 });
  }
}

/**
 * POST /api/admin/compatibility - 执行兼容性操作
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证请求数据
    const validation = syncRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: '请求参数无效',
        details: validation.error.flatten()
      }, { status: 400 });
    }

    const { action, audioIds, batchSize } = validation.data;
    const syncService = DataSyncService.getInstance();

    switch (action) {
      case 'sync':
        // 同步数据字段
        const syncResult = await syncService.batchSyncAudioFields(audioIds, batchSize);
        return NextResponse.json({
          success: syncResult.success,
          data: syncResult,
          message: `同步完成: 处理 ${syncResult.processed}, 更新 ${syncResult.updated}, 错误 ${syncResult.errors}`
        });

      case 'check':
        // 检查数据一致性
        const checkResult = await syncService.checkDataConsistency();
        return NextResponse.json({
          success: true,
          data: checkResult,
          message: `检查完成: ${checkResult.consistent}/${checkResult.totalAudios} 一致`
        });

      case 'fix':
        // 修复数据不一致
        const fixResult = await syncService.fixDataInconsistency(audioIds);
        return NextResponse.json({
          success: fixResult.success,
          data: fixResult,
          message: `修复完成: 处理 ${fixResult.processed}, 更新 ${fixResult.updated}, 错误 ${fixResult.errors}`
        });

      case 'cleanup':
        // 清理孤立引用
        const cleanupResult = await syncService.cleanupOrphanedReferences();
        return NextResponse.json({
          success: cleanupResult.success,
          data: cleanupResult,
          message: `清理完成: 清理 ${cleanupResult.cleaned} 个孤立引用`
        });

      case 'report':
        // 生成报告
        const reportResult = await syncService.generateSyncReport();
        return NextResponse.json({
          success: true,
          data: reportResult,
          message: '报告生成完成'
        });

      default:
        return NextResponse.json({
          success: false,
          error: '不支持的操作'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('执行兼容性操作失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '操作失败'
    }, { status: 500 });
  }
}

/**
 * PUT /api/admin/compatibility - 批量更新兼容性设置
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { audios } = body;

    if (!Array.isArray(audios)) {
      return NextResponse.json({
        success: false,
        error: '音频数据必须是数组'
      }, { status: 400 });
    }

    // 获取分类数据
    const categories = await CategoryService.getCategories({ includeInactive: true });

    // 批量修复数据
    const { fixed, errors } = CategoryCompatibilityAdapter.batchFixDataInconsistency(
      audios,
      categories
    );

    return NextResponse.json({
      success: errors.length === 0,
      data: {
        fixed: fixed.length,
        errors: errors.length,
        details: errors
      },
      message: `批量更新完成: 修复 ${fixed.length}, 错误 ${errors.length}`
    });

  } catch (error) {
    console.error('批量更新兼容性设置失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '批量更新失败'
    }, { status: 500 });
  }
}