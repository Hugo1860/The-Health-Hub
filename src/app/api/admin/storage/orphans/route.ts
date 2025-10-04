import { NextRequest, NextResponse } from 'next/server';
import { withSecurity } from '@/lib/secureApiWrapper';
import { ANTD_ADMIN_PERMISSIONS } from '@/lib/server-permissions';
import { promises as fs } from 'fs';
import path from 'path';
import db from '@/lib/db';

// 获取孤儿文件列表的处理函数
async function handleGetOrphans(request: NextRequest) {
  try {

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const audiosDir = path.join(uploadsDir, 'audios');
    const coversDir = path.join(uploadsDir, 'covers');

    // 获取数据库中的文件记录
    const audioRecordsResult = await db.query(
      'SELECT url, cover_image_url FROM audios WHERE status = ?',
      ['active']
    );
    const audioRecords = audioRecordsResult.rows || [];

    // 提取所有数据库中引用的文件路径
    const referencedFiles = new Set<string>();
    for (const record of audioRecords) {
      if (record.url) {
        // 从 URL 中提取文件路径
        const audioPath = record.url.replace(/^\//, '');
        referencedFiles.add(audioPath);
      }
      if (record.cover_image_url) {
        const coverPath = record.cover_image_url.replace(/^\//, '');
        referencedFiles.add(coverPath);
      }
    }

    // 扫描文件系统
    const orphanFiles: Array<{
      path: string;
      size: number;
      type: 'audio' | 'cover';
      mtime: string;
    }> = [];

    // 递归扫描目录
    async function scanDirectory(dir: string, type: 'audio' | 'cover') {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            // 跳过特殊目录
            if (entry.name === 'temp' || entry.name === 'trash' || entry.name === 'thumbnails') {
              continue;
            }
            await scanDirectory(fullPath, type);
          } else if (entry.isFile()) {
            // 跳过特殊文件
            if (entry.name === '.DS_Store' || entry.name === '.gitkeep' || entry.name.endsWith('.json')) {
              continue;
            }

            // 获取相对于 public 的路径
            const relativePath = fullPath.replace(path.join(process.cwd(), 'public'), '');
            const urlPath = relativePath.replace(/\\/g, '/');

            // 检查是否在数据库中被引用
            if (!referencedFiles.has(urlPath) && !referencedFiles.has(urlPath.substring(1))) {
              const stats = await fs.stat(fullPath);
              orphanFiles.push({
                path: urlPath,
                size: stats.size,
                type,
                mtime: stats.mtime.toISOString()
              });
            }
          }
        }
      } catch (error) {
        console.error(`扫描目录失败 ${dir}:`, error);
      }
    }

    // 扫描音频和封面目录
    const dirExists = async (dir: string) => {
      try {
        await fs.access(dir);
        return true;
      } catch {
        return false;
      }
    };

    if (await dirExists(audiosDir)) {
      await scanDirectory(audiosDir, 'audio');
    }
    if (await dirExists(coversDir)) {
      await scanDirectory(coversDir, 'cover');
    }

    return NextResponse.json({
      success: true,
      orphans: orphanFiles,
      count: orphanFiles.length,
      totalSize: orphanFiles.reduce((sum, f) => sum + f.size, 0)
    });

  } catch (error) {
    console.error('检测孤儿文件失败:', error);
    return NextResponse.json(
      { error: '检测孤儿文件失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

// 导出带安全包装的处理函数
export const GET = withSecurity(handleGetOrphans, {
  requireAuth: true,
  requiredPermissions: [ANTD_ADMIN_PERMISSIONS.MANAGE_RESOURCES],
  enableRateLimit: true,
  rateLimitMax: 10,
  rateLimitWindow: 60000,
});

