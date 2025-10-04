/**
 * 缓存优化器
 * 提供内存缓存、Redis缓存（可选）和智能缓存策略
 */

export interface CacheOptions {
  ttl?: number; // 生存时间（秒）
  maxSize?: number; // 最大缓存条目数
  strategy?: 'lru' | 'lfu' | 'fifo'; // 缓存淘汰策略
}

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

export class CacheOptimizer {
  private static instance: CacheOptimizer;
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL = 300; // 5分钟
  private readonly maxSize = 1000;
  private readonly cleanupInterval = 60000; // 1分钟

  constructor() {
    // 定期清理过期缓存
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  static getInstance(): CacheOptimizer {
    if (!CacheOptimizer.instance) {
      CacheOptimizer.instance = new CacheOptimizer();
    }
    return CacheOptimizer.instance;
  }

  /**
   * 设置缓存
   */
  set<T>(key: string, value: T, options: CacheOptions = {}): void {
    const ttl = options.ttl || this.defaultTTL;
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl: ttl * 1000, // 转换为毫秒
      hits: 0
    };

    this.cache.set(key, entry);

    // 如果超过最大大小，清理最少使用的条目
    if (this.cache.size > (options.maxSize || this.maxSize)) {
      this.evictLeastUsed();
    }
  }

  /**
   * 获取缓存
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // 增加命中次数
    entry.hits++;
    
    return entry.value as T;
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
   * 检查缓存是否存在且未过期
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 获取或设置缓存（如果不存在则执行函数并缓存结果）
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, options);
    
    return value;
  }

  /**
   * 批量获取缓存
   */
  mget<T>(keys: string[]): Array<T | null> {
    return keys.map(key => this.get<T>(key));
  }

  /**
   * 批量设置缓存
   */
  mset<T>(entries: Array<{ key: string; value: T; options?: CacheOptions }>): void {
    entries.forEach(({ key, value, options }) => {
      this.set(key, value, options);
    });
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    size: number;
    hitRate: number;
    memoryUsage: number;
    topKeys: Array<{ key: string; hits: number }>;
  } {
    const entries = Array.from(this.cache.entries());
    const totalHits = entries.reduce((sum, [, entry]) => sum + entry.hits, 0);
    const totalRequests = totalHits + entries.length; // 简化计算

    // 计算内存使用量（估算）
    const memoryUsage = entries.reduce((sum, [key, entry]) => {
      return sum + key.length * 2 + JSON.stringify(entry.value).length * 2;
    }, 0);

    // 获取最热门的键
    const topKeys = entries
      .map(([key, entry]) => ({ key, hits: entry.hits }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 10);

    return {
      size: this.cache.size,
      hitRate: totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0,
      memoryUsage,
      topKeys
    };
  }

  /**
   * 清理过期缓存
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      console.log(`Cache cleanup: removed ${keysToDelete.length} expired entries`);
    }
  }

  /**
   * 淘汰最少使用的缓存条目
   */
  private evictLeastUsed(): void {
    let leastUsedKey: string | null = null;
    let leastHits = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.hits < leastHits) {
        leastHits = entry.hits;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
    }
  }

  /**
   * 生成缓存键
   */
  static generateKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`;
  }

  /**
   * 缓存装饰器
   */
  static cached<T extends (...args: any[]) => Promise<any>>(
    keyGenerator: (...args: Parameters<T>) => string,
    options: CacheOptions = {}
  ) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
      const method = descriptor.value;
      const cache = CacheOptimizer.getInstance();

      descriptor.value = async function (...args: Parameters<T>) {
        const key = keyGenerator(...args);
        
        return cache.getOrSet(
          key,
          () => method.apply(this, args),
          options
        );
      };

      return descriptor;
    };
  }
}

// 预定义的缓存键生成器
export const CacheKeys = {
  audio: (id: string) => CacheOptimizer.generateKey('audio', id),
  audioList: (page: number, limit: number, filters?: string) => 
    CacheOptimizer.generateKey('audio_list', page, limit, filters || 'none'),
  category: (id: string) => CacheOptimizer.generateKey('category', id),
  categoryList: () => CacheOptimizer.generateKey('category_list'),
  user: (id: string) => CacheOptimizer.generateKey('user', id),
  search: (query: string, filters?: string) => 
    CacheOptimizer.generateKey('search', query, filters || 'none'),
  stats: (type: string, period: string) => 
    CacheOptimizer.generateKey('stats', type, period)
};

export default CacheOptimizer;