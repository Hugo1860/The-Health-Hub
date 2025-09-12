// 音频缓存管理器
class AudioCacheManager {
  private cache: Map<string, ArrayBuffer> = new Map();
  private preloadQueue: Set<string> = new Set();
  private maxCacheSize = 50 * 1024 * 1024; // 50MB 最大缓存大小
  private currentCacheSize = 0;

  // 预加载音频
  async preloadAudio(audioId: string, url: string): Promise<void> {
    if (this.cache.has(audioId) || this.preloadQueue.has(audioId)) {
      return;
    }

    this.preloadQueue.add(audioId);

    try {
      const response = await fetch(url, {
        headers: {
          'Range': 'bytes=0-1048576', // 预加载前1MB
        },
      });

      if (response.ok) {
        const buffer = await response.arrayBuffer();
        this.addToCache(audioId, buffer);
      }
    } catch (error) {
      console.error('预加载音频失败:', error);
    } finally {
      this.preloadQueue.delete(audioId);
    }
  }

  // 添加到缓存
  private addToCache(audioId: string, buffer: ArrayBuffer): void {
    const bufferSize = buffer.byteLength;

    // 检查缓存大小限制
    while (this.currentCacheSize + bufferSize > this.maxCacheSize && this.cache.size > 0) {
      this.evictOldest();
    }

    this.cache.set(audioId, buffer);
    this.currentCacheSize += bufferSize;
  }

  // 移除最旧的缓存项
  private evictOldest(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      const buffer = this.cache.get(firstKey);
      if (buffer) {
        this.currentCacheSize -= buffer.byteLength;
      }
      this.cache.delete(firstKey);
    }
  }

  // 获取缓存的音频
  getCachedAudio(audioId: string): ArrayBuffer | null {
    return this.cache.get(audioId) || null;
  }

  // 清除缓存
  clearCache(): void {
    this.cache.clear();
    this.currentCacheSize = 0;
  }

  // 获取缓存统计信息
  getCacheStats(): { size: number; count: number; maxSize: number } {
    return {
      size: this.currentCacheSize,
      count: this.cache.size,
      maxSize: this.maxCacheSize,
    };
  }
}

// 创建全局实例
export const audioCacheManager = new AudioCacheManager();

// 音频预加载策略
export class AudioPreloader {
  private static instance: AudioPreloader;
  private preloadedAudios: Set<string> = new Set();

  static getInstance(): AudioPreloader {
    if (!AudioPreloader.instance) {
      AudioPreloader.instance = new AudioPreloader();
    }
    return AudioPreloader.instance;
  }

  // 预加载相关音频
  async preloadRelatedAudios(currentAudioId: string, audioList: any[]): Promise<void> {
    // 找到当前音频的索引
    const currentIndex = audioList.findIndex(audio => audio.id === currentAudioId);
    if (currentIndex === -1) return;

    // 预加载下一首和上一首音频
    const toPreload = [];
    
    if (currentIndex > 0) {
      toPreload.push(audioList[currentIndex - 1]);
    }
    
    if (currentIndex < audioList.length - 1) {
      toPreload.push(audioList[currentIndex + 1]);
    }

    // 预加载同一主题的其他音频（最多3个）
    const sameSubjectAudios = audioList
      .filter(audio => 
        audio.subject === audioList[currentIndex].subject && 
        audio.id !== currentAudioId
      )
      .slice(0, 3);
    
    toPreload.push(...sameSubjectAudios);

    // 执行预加载
    for (const audio of toPreload) {
      if (!this.preloadedAudios.has(audio.id)) {
        this.preloadedAudios.add(audio.id);
        audioCacheManager.preloadAudio(audio.id, `/api/audio/stream/${audio.id}`);
      }
    }
  }

  // 清除预加载标记
  clearPreloadedMarks(): void {
    this.preloadedAudios.clear();
  }
}

// 自适应比特率管理器
export class AdaptiveBitrateManager {
  private connectionSpeed: number = 1; // Mbps
  private lastSpeedTest: number = 0;
  private speedTestInterval = 30000; // 30秒测试一次

  // 测试网络速度
  async testConnectionSpeed(): Promise<number> {
    const now = Date.now();
    if (now - this.lastSpeedTest < this.speedTestInterval) {
      return this.connectionSpeed;
    }

    try {
      const startTime = performance.now();
      const response = await fetch('/api/audio/speed-test', {
        method: 'HEAD',
        cache: 'no-cache',
      });
      const endTime = performance.now();

      if (response.ok) {
        const duration = endTime - startTime;
        // 简单的速度估算（这里可以根据实际情况调整）
        this.connectionSpeed = duration < 100 ? 10 : duration < 500 ? 5 : 1;
        this.lastSpeedTest = now;
      }
    } catch (error) {
      console.error('网络速度测试失败:', error);
    }

    return this.connectionSpeed;
  }

  // 获取推荐的音频质量
  getRecommendedQuality(): 'high' | 'medium' | 'low' {
    if (this.connectionSpeed >= 5) return 'high';
    if (this.connectionSpeed >= 2) return 'medium';
    return 'low';
  }

  // 获取推荐的缓冲区大小
  getRecommendedBufferSize(): number {
    if (this.connectionSpeed >= 5) return 10; // 10秒
    if (this.connectionSpeed >= 2) return 5;  // 5秒
    return 3; // 3秒
  }
}