import { readFile, stat } from 'fs/promises';
import { createReadStream as createFileStream } from 'fs';
import { join } from 'path';
import { optimizedDb } from './OptimizedDatabase';

export interface AudioQuality {
  bitrate: number;
  sampleRate: number;
  channels: number;
  format: 'mp3' | 'aac' | 'opus' | 'wav';
  fileExtension: string;
}

export interface StreamingOptions {
  quality: 'auto' | 'high' | 'medium' | 'low';
  adaptiveBitrate: boolean;
  enableCompression: boolean;
  chunkSize: number;
  bufferSize: number;
  networkSpeed?: number; // Mbps
}

export interface AudioMetadata {
  id: string;
  title: string;
  duration: number;
  bitrate: number;
  sampleRate: number;
  channels: number;
  format: string;
  fileSize: number;
  filePath: string;
}

export class AudioStreamOptimizer {
  private static instance: AudioStreamOptimizer;
  private audioCache: Map<string, AudioMetadata> = new Map();
  private qualityProfiles: Map<string, AudioQuality> = new Map();

  static getInstance(): AudioStreamOptimizer {
    if (!AudioStreamOptimizer.instance) {
      AudioStreamOptimizer.instance = new AudioStreamOptimizer();
    }
    return AudioStreamOptimizer.instance;
  }

  constructor() {
    this.initializeQualityProfiles();
  }

  /**
   * 初始化音质配置文件
   */
  private initializeQualityProfiles(): void {
    this.qualityProfiles.set('high', {
      bitrate: 320,
      sampleRate: 44100,
      channels: 2,
      format: 'mp3',
      fileExtension: '.mp3'
    });

    this.qualityProfiles.set('medium', {
      bitrate: 192,
      sampleRate: 44100,
      channels: 2,
      format: 'mp3',
      fileExtension: '.mp3'
    });

    this.qualityProfiles.set('low', {
      bitrate: 128,
      sampleRate: 22050,
      channels: 1,
      format: 'mp3',
      fileExtension: '.mp3'
    });
  }

  /**
   * 获取音频元数据
   */
  async getAudioMetadata(audioId: string): Promise<AudioMetadata | null> {
    // 检查缓存
    if (this.audioCache.has(audioId)) {
      return this.audioCache.get(audioId)!;
    }

    try {
      // 从数据库获取音频信息
      const audioInfo = await optimizedDb.getAudioById(audioId);
      if (!audioInfo) {
        return null;
      }

      // 构建文件路径
      const filePath = join(process.cwd(), 'public', audioInfo.url);
      
      // 获取文件统计信息
      const stats = await stat(filePath);
      
      const metadata: AudioMetadata = {
        id: audioId,
        title: audioInfo.title,
        duration: audioInfo.duration || 0,
        bitrate: 192, // 默认比特率，实际应该从文件中读取
        sampleRate: 44100,
        channels: 2,
        format: 'mp3',
        fileSize: stats.size,
        filePath
      };

      // 缓存元数据
      this.audioCache.set(audioId, metadata);
      return metadata;

    } catch (error) {
      console.error('Failed to get audio metadata:', error);
      return null;
    }
  }

  /**
   * 根据网络状况选择最佳质量
   */
  selectOptimalQuality(
    requestedQuality: string,
    networkSpeed?: number,
    userAgent?: string
  ): AudioQuality {
    // 如果是自动质量选择
    if (requestedQuality === 'auto') {
      if (networkSpeed) {
        if (networkSpeed >= 5) {
          return this.qualityProfiles.get('high')!;
        } else if (networkSpeed >= 2) {
          return this.qualityProfiles.get('medium')!;
        } else {
          return this.qualityProfiles.get('low')!;
        }
      }

      // 基于User-Agent判断设备类型
      if (userAgent && /Mobi|Android/i.test(userAgent)) {
        return this.qualityProfiles.get('medium')!;
      }

      return this.qualityProfiles.get('high')!;
    }

    // 返回指定质量
    return this.qualityProfiles.get(requestedQuality) || this.qualityProfiles.get('medium')!;
  }

  /**
   * 创建优化的音频流
   */
  async createOptimizedStream(
    audioId: string,
    options: StreamingOptions,
    range?: { start: number; end: number }
  ): Promise<{
    stream: ReadableStream;
    headers: Record<string, string>;
    status: number;
  }> {
    const metadata = await this.getAudioMetadata(audioId);
    if (!metadata) {
      throw new Error('Audio not found');
    }

    // 选择最佳质量
    const quality = this.selectOptimalQuality(
      options.quality,
      options.networkSpeed
    );

    // 计算流参数
    const fileSize = metadata.fileSize;
    const start = range?.start || 0;
    const end = range?.end || fileSize - 1;
    const chunkSize = (end - start) + 1;

    // 创建文件流
    const fileStream = createFileStream(metadata.filePath, { start, end });

    // 转换为Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => {
          controller.enqueue(new Uint8Array(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        });

        fileStream.on('end', () => {
          controller.close();
        });

        fileStream.on('error', (error) => {
          controller.error(error);
        });
      },

      cancel() {
        fileStream.destroy();
      }
    });

    // 构建响应头
    const headers: Record<string, string> = {
      'Content-Type': this.getContentType(metadata.format),
      'Accept-Ranges': 'bytes',
      'Cache-Control': this.getCacheControl(options),
      'X-Audio-Quality': options.quality,
      'X-Audio-Bitrate': quality.bitrate.toString(),
      'X-Audio-Duration': metadata.duration.toString(),
    };

    // 如果是范围请求
    if (range) {
      headers['Content-Range'] = `bytes ${start}-${end}/${fileSize}`;
      headers['Content-Length'] = chunkSize.toString();
      return {
        stream: webStream,
        headers,
        status: 206
      };
    } else {
      headers['Content-Length'] = fileSize.toString();
      return {
        stream: webStream,
        headers,
        status: 200
      };
    }
  }

  /**
   * 获取内容类型
   */
  private getContentType(format: string): string {
    const contentTypes: Record<string, string> = {
      'mp3': 'audio/mpeg',
      'aac': 'audio/aac',
      'opus': 'audio/opus',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg'
    };

    return contentTypes[format] || 'audio/mpeg';
  }

  /**
   * 获取缓存控制头
   */
  private getCacheControl(options: StreamingOptions): string {
    if (options.quality === 'auto') {
      // 自动质量的内容缓存时间较短
      return 'public, max-age=3600'; // 1小时
    } else {
      // 固定质量的内容可以长时间缓存
      return 'public, max-age=31536000'; // 1年
    }
  }

  /**
   * 解析Range头
   */
  parseRangeHeader(rangeHeader: string, fileSize: number): { start: number; end: number } | null {
    if (!rangeHeader || !rangeHeader.startsWith('bytes=')) {
      return null;
    }

    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    // 验证范围
    if (isNaN(start) || start < 0 || start >= fileSize) {
      return null;
    }

    if (isNaN(end) || end < start || end >= fileSize) {
      return { start, end: fileSize - 1 };
    }

    return { start, end };
  }

  /**
   * 计算推荐的块大小
   */
  calculateOptimalChunkSize(networkSpeed?: number, quality?: string): number {
    const baseChunkSize = 64 * 1024; // 64KB

    if (!networkSpeed) {
      return baseChunkSize;
    }

    // 根据网络速度调整块大小
    if (networkSpeed >= 10) {
      return baseChunkSize * 4; // 256KB
    } else if (networkSpeed >= 5) {
      return baseChunkSize * 2; // 128KB
    } else if (networkSpeed >= 2) {
      return baseChunkSize; // 64KB
    } else {
      return baseChunkSize / 2; // 32KB
    }
  }

  /**
   * 获取音频流统计信息
   */
  getStreamingStats(): {
    totalStreams: number;
    cacheHits: number;
    averageQuality: string;
    popularFormats: Array<{ format: string; count: number }>;
  } {
    // 这里应该实现实际的统计逻辑
    return {
      totalStreams: 0,
      cacheHits: this.audioCache.size,
      averageQuality: 'medium',
      popularFormats: [
        { format: 'mp3', count: 100 },
        { format: 'aac', count: 20 }
      ]
    };
  }

  /**
   * 预热音频缓存
   */
  async warmupCache(audioIds: string[]): Promise<void> {
    const promises = audioIds.map(id => this.getAudioMetadata(id));
    await Promise.allSettled(promises);
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.audioCache.clear();
  }

  /**
   * 获取支持的音频格式
   */
  getSupportedFormats(): string[] {
    return Array.from(this.qualityProfiles.keys());
  }

  /**
   * 获取质量配置文件
   */
  getQualityProfile(quality: string): AudioQuality | null {
    return this.qualityProfiles.get(quality) || null;
  }
}

// 创建全局实例
export const audioStreamOptimizer = AudioStreamOptimizer.getInstance();