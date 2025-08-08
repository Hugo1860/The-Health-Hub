import { NextRequest, NextResponse } from 'next/server';
import { withSecurity, withSecurityAndValidation } from '@/lib/secureApiWrapper';
import { verifyAdminOperation, logAdminOperation } from '@/lib/adminAuth';
import { 
  createFullBackup, 
  createDataBackup, 
  getBackups, 
  deleteBackup,
  cleanupOldBackups,
  verifyBackup 
} from '@/lib/systemMaintenance';
import { z } from 'zod';

// 获取备份列表
export const GET = withSecurity(
  async (request: NextRequest) => {
    try {
      // 验证管理员权限
      const permissionCheck = await verifyAdminOperation(request, 'BACKUP_DATA');
      if (!permissionCheck.isAllowed) {
        return NextResponse.json(
          { error: { code: 'PERMISSION_DENIED', message: permissionCheck.error || '权限不足' } },
          { status: 403 }
        );
      }

      // 添加超时保护
      const backupsPromise = getBackups();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('获取备份列表超时')), 5000); // 5秒超时
      });

      const backups = await Promise.race([backupsPromise, timeoutPromise]) as any;

      // 记录管理员操作（异步，不阻塞响应）
      logAdminOperation(request, 'VIEW_BACKUPS', {
        backupCount: Array.isArray(backups) ? backups.length : 0,
      }).catch(error => {
        console.error('Failed to log admin operation:', error);
      });

      return NextResponse.json({
        backups: Array.isArray(backups) ? backups : [],
        total: Array.isArray(backups) ? backups.length : 0,
      });

    } catch (error) {
      console.error('Get backups error:', error);
      
      const errorMessage = error instanceof Error ? error.message : '获取备份列表失败';
      
      return NextResponse.json(
        { 
          error: { 
            code: 'FETCH_ERROR', 
            message: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error : undefined
          } 
        },
        { status: 500 }
      );
    }
  },
  {
    requireAuth: true,
    requireAdmin: true,
    enableRateLimit: true,
    rateLimitMax: 20,
    rateLimitWindow: 60000,
    allowedMethods: ['GET'],
  }
);

// 创建备份验证模式
const createBackupSchema = z.object({
  type: z.enum(['full', 'data']).default('data'),
  description: z.string().max(200, '描述不能超过200个字符').optional(),
});

// 创建备份
export const POST = withSecurityAndValidation(
  async (request: NextRequest, validatedData: z.infer<typeof createBackupSchema>) => {
    try {
      // 验证管理员权限
      const permissionCheck = await verifyAdminOperation(request, 'BACKUP_DATA');
      if (!permissionCheck.isAllowed) {
        return NextResponse.json(
          { error: { code: 'PERMISSION_DENIED', message: permissionCheck.error } },
          { status: 403 }
        );
      }

      const { type, description } = validatedData;

      let backup;
      if (type === 'full') {
        backup = await createFullBackup(description);
      } else {
        backup = await createDataBackup(description);
      }

      // 记录管理员操作
      await logAdminOperation(request, 'CREATE_BACKUP', {
        backupId: backup.id,
        backupType: backup.type,
        backupSize: backup.size,
        fileCount: backup.files.length,
      });

      return NextResponse.json({
        message: '备份创建成功',
        backup,
      }, { status: 201 });

    } catch (error) {
      console.error('Create backup error:', error);
      
      // 记录失败的备份操作
      await logAdminOperation(request, 'CREATE_BACKUP_FAILED', {
        error: error instanceof Error ? error.message : 'Unknown error',
      }, false);
      
      return NextResponse.json(
        { error: { code: 'CREATE_ERROR', message: error instanceof Error ? error.message : '创建备份失败' } },
        { status: 500 }
      );
    }
  },
  createBackupSchema,
  {
    requireAuth: true,
    requireAdmin: true,
    enableRateLimit: true,
    rateLimitMax: 5,
    rateLimitWindow: 300000, // 5分钟内最多5次
    requireCSRF: true,
    allowedMethods: ['POST'],
  }
);

// 删除备份验证模式
const deleteBackupSchema = z.object({
  backupId: z.string().min(1, '备份ID不能为空'),
});

// 删除备份
export const DELETE = withSecurityAndValidation(
  async (request: NextRequest, validatedData: z.infer<typeof deleteBackupSchema>) => {
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

      await deleteBackup(backupId);

      // 记录管理员操作
      await logAdminOperation(request, 'DELETE_BACKUP', {
        backupId,
      });

      return NextResponse.json({
        message: '备份删除成功',
        backupId,
      });

    } catch (error) {
      console.error('Delete backup error:', error);
      return NextResponse.json(
        { error: { code: 'DELETE_ERROR', message: error instanceof Error ? error.message : '删除备份失败' } },
        { status: 500 }
      );
    }
  },
  deleteBackupSchema,
  {
    requireAuth: true,
    requireAdmin: true,
    enableRateLimit: true,
    rateLimitMax: 10,
    rateLimitWindow: 60000,
    requireCSRF: true,
    allowedMethods: ['DELETE'],
  }
);