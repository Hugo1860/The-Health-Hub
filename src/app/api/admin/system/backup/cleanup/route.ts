import { NextRequest, NextResponse } from 'next/server';
import { withSecurityAndValidation } from '@/lib/secureApiWrapper';
import { verifyAdminOperation, logAdminOperation } from '@/lib/adminAuth';
import { cleanupOldBackups } from '@/lib/systemMaintenance';
import { z } from 'zod';

// 清理备份验证模式
const cleanupBackupsSchema = z.object({
  keepCount: z.number()
    .int('保留数量必须是整数')
    .min(1, '至少保留1个备份')
    .max(50, '最多保留50个备份')
    .default(10),
});

// 清理旧备份
export const POST = withSecurityAndValidation(
  async (request: NextRequest, validatedData: z.infer<typeof cleanupBackupsSchema>) => {
    try {
      // 验证管理员权限
      const permissionCheck = await verifyAdminOperation(request, 'BACKUP_DATA');
      if (!permissionCheck.isAllowed) {
        return NextResponse.json(
          { error: { code: 'PERMISSION_DENIED', message: permissionCheck.error } },
          { status: 403 }
        );
      }

      const { keepCount } = validatedData;

      const deletedCount = await cleanupOldBackups(keepCount);

      // 记录管理员操作
      await logAdminOperation(request, 'CLEANUP_BACKUPS', {
        keepCount,
        deletedCount,
      });

      return NextResponse.json({
        message: `清理完成，删除了 ${deletedCount} 个旧备份`,
        deletedCount,
        keepCount,
      });

    } catch (error) {
      console.error('Cleanup backups error:', error);
      return NextResponse.json(
        { error: { code: 'CLEANUP_ERROR', message: error instanceof Error ? error.message : '清理备份失败' } },
        { status: 500 }
      );
    }
  },
  cleanupBackupsSchema,
  {
    requireAuth: true,
    enableRateLimit: true,
    rateLimitMax: 5,
    rateLimitWindow: 300000, // 5分钟内最多5次
    requireCSRF: true,
    allowedMethods: ['POST'],
  }
);