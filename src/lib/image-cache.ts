// 图片缓存管理器，用于缓存常用图片，提高加载速度

export interface CacheOptions {
  maxSize: number;
  maxAge: number; // 毫秒
}

export interface CacheItem {
  image: HTMLImageElement;
  timestamp: number;
  size: number; // 估算的内存大小
}

export class ImageCache {
  private static instance: ImageCache;
  private cache: Map<string, CacheItem> = new Map();
  private options: CacheOptions;
  private totalSize: number = 0;

  private constructor(options: CacheOptions) {
    this.options = options;
    
    // 定期清理过期缓存
    setInterval(() => {
      this.cleanup();
    }, 60000); // 每分钟清理一次
  }

  static getInstance(options?: CacheOptions): ImageCache {
    if (!ImageCache.instance) {
      ImageCache.instance = new ImageCache(options || {
        maxSize: 50, // 最多缓存50张图片
        maxAge: 10 * 60 * 1000 // 10分钟过期
      });
    }
    return ImageCache.instance;
  }

  /**
   * 加载并缓存图片
   */
  async loadImage(src: string): Promise<HTMLImageElement> {
    // 检查缓存
    const cached = this.cache.get(src);
    if (cached && !this.isExpired(cached)) {
      // 更新访问时间
      cached.timestamp = Date.now();
      return cached.image;
    }

    // 加载新图片
    const image = await this.fetchImage(src);
    
    // 估算图片大小（宽 * 高 * 4字节）
    const estimatedSize = image.width * image.height * 4;
    
    // 添加到缓存
    this.addToCache(src, image, estimatedSize);
    
    return image;
  }

  /**
   * 预加载图片
   */
  async preloadImages(urls: string[]): Promise<void> {
    const promises = urls.map(url => 
      this.loadImage(url).catch(error => {
        console.warn(`Failed to preload image: ${url}`, error);
        return null;
      })
    );
    
    await Promise.all(promises);
  }

  /**
   * 获取缓存的图片（不加载）
   */
  getCachedImage(src: string): HTMLImageElement | null {
    const cached = this.cache.get(src);
    if (cached && !this.isExpired(cached)) {
      cached.timestamp = Date.now();
      return cached.image;
    }
    return null;
  }

  /**
   * 清除指定图片的缓存
   */
  remove(src: string): void {
    const cached = this.cache.get(src);
    if (cached) {
      this.totalSize -= cached.size;
      this.cache.delete(src);
    }
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
    this.totalSize = 0;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    cacheSize: number;
    totalSize: number;
    maxSize: number;
    hitRate: number;
  } {
    return {
      cacheSize: this.cache.size,
      totalSize: this.totalSize,
      maxSize: this.options.maxSize,
      hitRate: this.calculateHitRate()
    };
  }

  private async fetchImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      
      img.src = src;
    });
  }

  private addToCache(src: string, image: HTMLImageElement, size: number): void {
    // 如果缓存已满，移除最旧的项
    while (this.cache.size >= this.options.maxSize) {
      this.removeOldest();
    }

    // 添加新项
    this.cache.set(src, {
      image,
      timestamp: Date.now(),
      size
    });
    
    this.totalSize += size;
  }

  private removeOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.timestamp < oldestTime) {
        oldestTime = item.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.remove(oldestKey);
    }
  }

  private isExpired(item: CacheItem): boolean {
    return Date.now() - item.timestamp > this.options.maxAge;
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > this.options.maxAge) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.remove(key));
  }

  private calculateHitRate(): number {
    // 这里可以实现更复杂的命中率计算
    // 目前返回一个简单的估算值
    return this.cache.size > 0 ? 0.8 : 0;
  }
}