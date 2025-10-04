/**
 * 存储统计 API
 * 提供存储空间使用情况的统计数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSecurity } from '@/lib/secureApiWrapper';
import { ANTD_ADMIN_PERMISSIONS } from '@/lib/server-permissions';
import { promises as fs } from 'fs';
import path from 'path';

interface StorageStats {
  totalSize: number;
  usedSize: number;
  availableSize: number;
  fileCount: number;
  breakdown: {
    audios: { size: number; count: number };
    covers: { size: number; count: number };
    documents: { size: number; count: number };
    trash: { size: number; count: number };
    other: { size: number; count: number };
  };
  usagePercent: number;
}

async function getDirectorySize(dirPath: string): Promise<{ size: number; count: number }> {
  let totalSize = 0;
  let fileCount = 0;

  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true });

    for (const file of files) {
      const filePath = path.join(dirPath, file.name);

      if (file.isDirectory()) {
        const subStats = await getDirectorySize(filePath);
        totalSize += subStats.size;
        fileCount += subStats.count;
      } else {
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
        fileCount++;
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
  }

  return { size: totalSize, count: fileCount };
}

async function getStorageStats(): Promise<StorageStats> {
  const uploadsDir = path.join(process.cwd(), 'public/uploads');
  
  // 获取各目录的统计
  const [audios, covers, documents, trash] = await Promise.all([
    getDirectorySize(path.join(uploadsDir, 'audios')),
    getDirectorySize(path.join(uploadsDir, 'covers')),
    getDirectorySize(path.join(uploadsDir, 'documents')),
    getDirectorySize(path.join(uploadsDir, 'trash')),
  ]);

  // 获取根目录的其他文件
  const totalStats = await getDirectorySize(uploadsDir);
  const knownSize = audios.size + covers.size + documents.size + trash.size;
  const knownCount = audios.count + covers.count + documents.count + trash.count;
  
  const other = {
    size: totalStats.size - knownSize,
    count: totalStats.count - knownCount
  };

  const usedSize = totalStats.size;
  
  // 假设总容量为 50GB (可配置)
  const totalSize = parseInt(process.env.STORAGE_MAX_SIZE || '53687091200'); // 50GB
  const availableSize = Math.max(0, totalSize - usedSize);
  const usagePercent = (usedSize / totalSize) * 100;

  return {
    totalSize,
    usedSize,
    availableSize,
    fileCount: totalStats.count,
    breakdown: {
      audios,
      covers,
      documents,
      trash,
      other
    },
    usagePercent
  };
}

export const GET = withSecurity(
  async (request: NextRequest) => {
    try {
      const stats = await getStorageStats();

      // 转换为前端期望的扁平化格式
      return NextResponse.json({
        totalSize: stats.usedSize,
        audioSize: stats.breakdown.audios.size,
        coverSize: stats.breakdown.covers.size,
        otherSize: stats.breakdown.other.size,
        audioCount: stats.breakdown.audios.count,
        coverCount: stats.breakdown.covers.count,
        otherCount: stats.breakdown.other.count,
        trashSize: stats.breakdown.trash.size,
        trashCount: stats.breakdown.trash.count,
        usagePercent: stats.usagePercent,
        maxSize: stats.totalSize,
        availableSize: stats.availableSize
      });
    } catch (error) {
      console.error('获取存储统计失败:', error);
      return NextResponse.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取存储统计失败',
          details: error instanceof Error ? error.message : '未知错误'
        }
      }, { status: 500 });
    }
  },
  {
    requireAuth: true,
    requiredPermissions: [ANTD_ADMIN_PERMISSIONS.MANAGE_RESOURCES],
    enableRateLimit: true,
    rateLimitMax: 30,
    rateLimitWindow: 60000
  }
);

