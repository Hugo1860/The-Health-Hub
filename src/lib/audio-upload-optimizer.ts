/**
 * 音频上传优化器
 * 提供文件验证、进度跟踪、错误处理等功能
 */

import { writeFile, mkdir, stat } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// 支持的音频格式
export const SUPPORTED_AUDIO_FORMATS = [
  'mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'
];

// 支持的图片格式
export const SUPPORTED_IMAGE_FORMATS = [
  'jpg', 'jpeg', 'png', 'webp'
];

// 文件大小限制 (50MB for audio, 5MB for images)
export const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;  // 5MB

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  fileInfo?: {
    name: string;
    size: number;
    type: string;
    extension: string;
  };
}

export interface UploadProgress {
  stage: 'validation' | 'processing' | 'saving' | 'database' | 'complete';
  progress: number; // 0-100
  message: string;
  error?: string;
}

export class AudioUploadOptimizer {
  private onProgress?: (progress: UploadProgress) => void;

  constructor(onProgress?: (progress: UploadProgress) => void) {
    this.onProgress = onProgress;
  }

  private updateProgress(stage: UploadProgress['stage'], progress: number, message: string, error?: string) {
    if (this.onProgress) {
      this.onProgress({ stage, progress, message, error });
    }
  }

  /**
   * 验证音频文件
   */
  validateAudioFile(file: File): FileValidationResult {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    
    if (!SUPPORTED_AUDIO_FORMATS.includes(extension)) {
      return {
        valid: false,
        error: `不支持的音频格式: ${extension}. 支持的格式: ${SUPPORTED_AUDIO_FORMATS.join(', ')}`
      };
    }

    if (file.size > MAX_AUDIO_SIZE) {
      return {
        valid: false,
        error: `音频文件过大: ${(file.size / 1024 / 1024).toFixed(2)}MB. 最大支持: ${MAX_AUDIO_SIZE / 1024 / 1024}MB`
      };
    }

    if (file.size === 0) {
      return {
        valid: false,
        error: '音频文件为空'
      };
    }

    return {
      valid: true,
      fileInfo: {
        name: file.name,
        size: file.size,
        type: file.type,
        extension
      }
    };
  }

  /**
   * 验证封面图片文件
   */
  validateImageFile(file: File): FileValidationResult {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    
    if (!SUPPORTED_IMAGE_FORMATS.includes(extension)) {
      return {
        valid: false,
        error: `不支持的图片格式: ${extension}. 支持的格式: ${SUPPORTED_IMAGE_FORMATS.join(', ')}`
      };
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return {
        valid: false,
        error: `图片文件过大: ${(file.size / 1024 / 1024).toFixed(2)}MB. 最大支持: ${MAX_IMAGE_SIZE / 1024 / 1024}MB`
      };
    }

    return {
      valid: true,
      fileInfo: {
        name: file.name,
        size: file.size,
        type: file.type,
        extension
      }
    };
  }

  /**
   * 生成安全的文件名
   */
  generateSafeFileName(originalName: string, prefix: string = ''): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop()?.toLowerCase() || '';
    const baseName = originalName.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
    
    return `${prefix}${baseName}_${timestamp}_${randomSuffix}.${extension}`;
  }

  /**
   * 确保上传目录存在
   */
  async ensureUploadDirectories(): Promise<{ uploadsDir: string; coversDir: string }> {
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    const coversDir = join(process.cwd(), 'public', 'uploads', 'covers');
    
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }
    if (!existsSync(coversDir)) {
      await mkdir(coversDir, { recursive: true });
    }

    return { uploadsDir, coversDir };
  }

  /**
   * 保存音频文件
   */
  async saveAudioFile(file: File, fileName: string): Promise<{ path: string; url: string; size: number }> {
    this.updateProgress('processing', 25, '处理音频文件...');

    const { uploadsDir } = await this.ensureUploadDirectories();
    const filePath = join(uploadsDir, fileName);
    const fileUrl = `/uploads/${fileName}`;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      this.updateProgress('saving', 50, '保存音频文件...');
      await writeFile(filePath, buffer);

      // 验证文件是否成功保存
      const stats = await stat(filePath);
      if (stats.size !== file.size) {
        throw new Error('文件保存不完整');
      }

      this.updateProgress('saving', 75, '音频文件保存完成');

      return {
        path: filePath,
        url: fileUrl,
        size: stats.size
      };
    } catch (error) {
      this.updateProgress('saving', 0, '音频文件保存失败', error instanceof Error ? error.message : '未知错误');
      throw error;
    }
  }

  /**
   * 保存封面图片文件
   */
  async saveCoverImage(file: File, fileName: string): Promise<{ path: string; url: string; size: number }> {
    this.updateProgress('processing', 60, '处理封面图片...');

    const { coversDir } = await this.ensureUploadDirectories();
    const filePath = join(coversDir, fileName);
    const fileUrl = `/uploads/covers/${fileName}`;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      await writeFile(filePath, buffer);

      // 验证文件是否成功保存
      const stats = await stat(filePath);
      if (stats.size !== file.size) {
        throw new Error('封面图片保存不完整');
      }

      this.updateProgress('processing', 70, '封面图片保存完成');

      return {
        path: filePath,
        url: fileUrl,
        size: stats.size
      };
    } catch (error) {
      this.updateProgress('processing', 0, '封面图片保存失败', error instanceof Error ? error.message : '未知错误');
      throw error;
    }
  }

  /**
   * 获取音频文件的元数据（简化版本）
   */
  async getAudioMetadata(file: File): Promise<{
    duration?: number;
    bitrate?: number;
    sampleRate?: number;
    channels?: number;
  }> {
    // 这里可以集成音频元数据解析库，如 music-metadata
    // 目前返回基本信息
    return {
      duration: 0, // 可以通过音频解析库获取
      bitrate: 0,
      sampleRate: 0,
      channels: 0
    };
  }

  /**
   * 清理失败的上传文件
   */
  async cleanupFailedUpload(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        if (existsSync(filePath)) {
          const { unlink } = await import('fs/promises');
          await unlink(filePath);
        }
      } catch (error) {
        console.error(`Failed to cleanup file: ${filePath}`, error);
      }
    }
  }
}

export default AudioUploadOptimizer;