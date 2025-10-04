/**
 * 前端缓存工具
 * 用于缓存API响应，减少重复请求
 */

interface CacheItem {
  data: any;
  timestamp: number;
  ttl: number; // 生存时间（毫秒）
}

class FrontendCache {
  private cache = new Map<string, CacheItem>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 默认5分钟

  /**
   * 设置缓存
   */
  set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });

    // 清理过期缓存
    this.cleanup();
  }

  /**
   * 获取缓存
   */
  get(key: string): any | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // 检查是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 清理过期缓存
   */
  private cleanup(): void {
    const now = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * 带缓存的fetch包装器
   */
  async fetchWithCache(
    url: string, 
    options: RequestInit = {}, 
    ttl: number = this.DEFAULT_TTL
  ): Promise<any> {
    const cacheKey = `fetch:${url}:${JSON.stringify(options)}`;
    
    // 尝试从缓存获取
    const cached = this.get(cacheKey);
    if (cached) {
      console.log(`📦 缓存命中: ${url}`);
      return cached;
    }

    try {
      // 发起请求
      console.log(`🌐 发起请求: ${url}`);
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // 存入缓存
      this.set(cacheKey, data, ttl);
      
      return data;
    } catch (error) {
      console.error(`请求失败 ${url}:`, error);
      throw error;
    }
  }
}

// 导出单例实例
export const cache = new FrontendCache();

// 常用缓存键
export const CACHE_KEYS = {
  CATEGORIES: 'categories',
  RECENT_AUDIOS: 'recent-audios',
  TOP_CHARTS: 'top-charts',
  AUDIO_LIST: 'audio-list',
  USER_SESSION: 'user-session'
} as const;

// 常用TTL配置
export const CACHE_TTL = {
  SHORT: 1 * 60 * 1000,      // 1分钟
  MEDIUM: 5 * 60 * 1000,     // 5分钟
  LONG: 15 * 60 * 1000,      // 15分钟
  VERY_LONG: 60 * 60 * 1000  // 1小时
} as const;
