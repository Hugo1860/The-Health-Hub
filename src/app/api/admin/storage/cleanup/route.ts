import { NextRequest, NextResponse } from 'next/server';
import { withSecurity } from '@/lib/secureApiWrapper';
import { ANTD_ADMIN_PERMISSIONS } from '@/lib/server-permissions';
import { promises as fs } from 'fs';
import path from 'path';

// 清理孤儿文件（移动到回收站）的处理函数
async function handleCleanup(request: NextRequest) {
  try {

    const body = await request.json();
    const { orphans } = body;

    if (!Array.isArray(orphans) || orphans.length === 0) {
      return NextResponse.json({ error: '无效的孤儿文件列表' }, { status: 400 });
    }

    const publicDir = path.join(process.cwd(), 'public');
    const trashDir = path.join(publicDir, 'uploads', 'trash');

    // 确保回收站目录存在
    await fs.mkdir(path.join(trashDir, 'audios'), { recursive: true });
    await fs.mkdir(path.join(trashDir, 'covers'), { recursive: true });

    let cleanedCount = 0;
    const errors: string[] = [];

    for (const orphan of orphans) {
      try {
        const sourcePath = path.join(publicDir, orphan.path);
        const fileName = path.basename(orphan.path);
        const destDir = path.join(trashDir, orphan.type === 'audio' ? 'audios' : 'covers');
        const destPath = path.join(destDir, fileName);

        // 如果目标文件已存在，添加时间戳
        let finalDestPath = destPath;
        try {
          await fs.access(finalDestPath);
          const timestamp = Date.now();
          const ext = path.extname(fileName);
          const base = path.basename(fileName, ext);
          finalDestPath = path.join(destDir, `${base}_${timestamp}${ext}`);
        } catch {
          // 文件不存在，使用原路径
        }

        // 移动文件到回收站
        await fs.rename(sourcePath, finalDestPath);
        cleanedCount++;
      } catch (error) {
        console.error(`移动文件失败 ${orphan.path}:`, error);
        errors.push(`${orphan.path}: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }

    return NextResponse.json({
      success: true,
      cleaned: cleanedCount,
      total: orphans.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('清理孤儿文件失败:', error);
    return NextResponse.json(
      { error: '清理孤儿文件失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

// 导出带安全包装的处理函数
export const POST = withSecurity(handleCleanup, {
  requireAuth: true,
  requiredPermissions: [ANTD_ADMIN_PERMISSIONS.MANAGE_RESOURCES],
  enableRateLimit: true,
  rateLimitMax: 5,
  rateLimitWindow: 60000,
  allowedMethods: ['POST'],
});

