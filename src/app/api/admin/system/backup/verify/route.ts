import { NextRequest, NextResponse } from 'next/server';
import { withSecurityAndValidation } from '@/lib/secureApiWrapper';
import { verifyAdminOperation, logAdminOperation } from '@/lib/adminAuth';
import { verifyBackup } from '@/lib/systemMaintenance';
import { z } from 'zod';

// 验证备份验证模式
const verifyBackupSchema = z.object({
  backupId: z.string().min(1, '备份ID不能为空'),
});

// 验证备份完整性
export const POST = withSecurityAndValidation(
  async (request: NextRequest, validatedData: z.infer<typeof verifyBackupSchema>) => {
    try {
      // 验证管理员权限
      const permissionCheck = await verifyAdminOperation(request, 'BACKUP_DATA');
      if (!permissionCheck.isAllowed) {
        return NextResponse.json(
          { error: { code: 'PERMISSION_DENIED', message: permissionCheck.error } },
          { status: 403 }
        );
      }

      const { backupId } = validatedData;

      const verificationResult = await verifyBackup(backupId);

      // 记录管理员操作
      await logAdminOperation(request, 'VERIFY_BACKUP', {
        backupId,
        isValid: verificationResult.isValid,
        missingFilesCount: verificationResult.missingFiles.length,
        errorsCount: verificationResult.errors.length,
      });

      return NextResponse.json({
        message: '备份验证完成',
        verification: verificationResult,
      });

    } catch (error) {
      console.error('Verify backup error:', error);
      return NextResponse.json(
        { error: { code: 'VERIFY_ERROR', message: '验证备份失败' } },
        { status: 500 }
      );
    }
  },
  verifyBackupSchema,
  {
    requireAuth: true,
    requireAdmin: true,
    enableRateLimit: true,
    rateLimitMax: 10,
    rateLimitWindow: 60000,
    requireCSRF: true,
    allowedMethods: ['POST'],
  }
);