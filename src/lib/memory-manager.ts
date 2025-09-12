// 内存管理器，用于监控和管理内存使用

export interface MemoryStats {
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
  jsHeapSizeLimit?: number;
  estimatedImageMemory: number;
  canvasCount: number;
  blobUrls: number;
}

export class MemoryManager {
  private static instance: MemoryManager;
  private blobUrls: Set<string> = new Set();
  private canvasRefs: WeakSet<HTMLCanvasElement> = new WeakSet();
  private imageMemoryEstimate: number = 0;

  private constructor() {
    // 监听页面卸载，清理资源
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.cleanup();
      });

      // 定期检查内存使用情况
      setInterval(() => {
        this.checkMemoryUsage();
      }, 30000); // 每30秒检查一次
    }
  }

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * 注册 Blob URL，用于后续清理
   */
  registerBlobUrl(url: string): void {
    this.blobUrls.add(url);
  }

  /**
   * 清理指定的 Blob URL
   */
  cleanupBlobUrl(url: string): void {
    if (this.blobUrls.has(url)) {
      try {
        URL.revokeObjectURL(url);
        this.blobUrls.delete(url);
      } catch (error) {
        console.warn('Failed to revoke blob URL:', error);
      }
    }
  }

  /**
   * 清理所有 Blob URLs
   */
  cleanupAllBlobUrls(): void {
    for (const url of this.blobUrls) {
      try {
        URL.revokeObjectURL(url);
      } catch (error) {
        console.warn('Failed to revoke blob URL:', error);
      }
    }
    this.blobUrls.clear();
  }

  /**
   * 注册 Canvas 元素
   */
  registerCanvas(canvas: HTMLCanvasElement): void {
    this.canvasRefs.add(canvas);
  }

  /**
   * 估算图片内存使用
   */
  addImageMemory(width: number, height: number, channels: number = 4): void {
    this.imageMemoryEstimate += width * height * channels;
  }

  /**
   * 减少图片内存估算
   */
  removeImageMemory(width: number, height: number, channels: number = 4): void {
    this.imageMemoryEstimate -= width * height * channels;
    if (this.imageMemoryEstimate < 0) {
      this.imageMemoryEstimate = 0;
    }
  }

  /**
   * 获取内存统计信息
   */
  getMemoryStats(): MemoryStats {
    const stats: MemoryStats = {
      estimatedImageMemory: this.imageMemoryEstimate,
      canvasCount: 0, // WeakSet 无法获取大小
      blobUrls: this.blobUrls.size
    };

    // 如果支持 performance.memory API
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      stats.usedJSHeapSize = memory.usedJSHeapSize;
      stats.totalJSHeapSize = memory.totalJSHeapSize;
      stats.jsHeapSizeLimit = memory.jsHeapSizeLimit;
    }

    return stats;
  }

  /**
   * 检查内存使用情况并在必要时清理
   */
  checkMemoryUsage(): void {
    const stats = this.getMemoryStats();
    
    // 如果内存使用过高，触发清理
    if (stats.usedJSHeapSize && stats.jsHeapSizeLimit) {
      const usageRatio = stats.usedJSHeapSize / stats.jsHeapSizeLimit;
      
      if (usageRatio > 0.8) { // 使用超过80%
        console.warn('High memory usage detected, triggering cleanup');
        this.forceCleanup();
      }
    }

    // 如果 Blob URLs 过多，清理一些
    if (this.blobUrls.size > 20) {
      console.warn('Too many blob URLs, cleaning up oldest ones');
      this.cleanupOldBlobUrls();
    }
  }

  /**
   * 强制清理内存
   */
  forceCleanup(): void {
    // 清理 Blob URLs
    this.cleanupAllBlobUrls();
    
    // 触发垃圾回收（如果可用）
    if (typeof window !== 'undefined' && (window as any).gc) {
      try {
        (window as any).gc();
      } catch (error) {
        console.warn('Manual GC failed:', error);
      }
    }

    // 重置图片内存估算
    this.imageMemoryEstimate = 0;
  }

  /**
   * 清理旧的 Blob URLs（保留最新的10个）
   */
  private cleanupOldBlobUrls(): void {
    const urls = Array.from(this.blobUrls);
    const toCleanup = urls.slice(0, -10); // 保留最后10个
    
    toCleanup.forEach(url => {
      this.cleanupBlobUrl(url);
    });
  }

  /**
   * 完全清理所有资源
   */
  cleanup(): void {
    this.cleanupAllBlobUrls();
    this.imageMemoryEstimate = 0;
  }

  /**
   * 获取内存使用建议
   */
  getMemoryRecommendations(): string[] {
    const stats = this.getMemoryStats();
    const recommendations: string[] = [];

    if (stats.blobUrls > 10) {
      recommendations.push('考虑清理不再使用的图片资源');
    }

    if (stats.estimatedImageMemory > 100 * 1024 * 1024) { // 100MB
      recommendations.push('图片内存使用较高，建议优化图片尺寸');
    }

    if (stats.usedJSHeapSize && stats.jsHeapSizeLimit) {
      const usageRatio = stats.usedJSHeapSize / stats.jsHeapSizeLimit;
      if (usageRatio > 0.7) {
        recommendations.push('内存使用较高，建议关闭不必要的标签页');
      }
    }

    return recommendations;
  }
}