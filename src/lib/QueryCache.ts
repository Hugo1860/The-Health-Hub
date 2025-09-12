import { LRUCache } from 'lru-cache';

export interface CacheOptions {
  maxSize: number;
  ttl: number; // Time to live in milliseconds
  maxAge?: number; // Deprecated, use ttl
  updateAgeOnGet?: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
  maxSize: number;
  hitRate: number;
}

export interface CacheItem<T> {
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

export class QueryCache {
  private cache: LRUCache<string, CacheItem<any>>;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    size: 0,
    maxSize: 0,
    hitRate: 0
  };

  private cleanupInterval: NodeJS.Timeout;

  constructor(options: CacheOptions = { maxSize: 1000, ttl: 300000 }) {
    this.cache = new LRUCache({
      max: options.maxSize,
      ttl: options.ttl,
      updateAgeOnGet: options.updateAgeOnGet ?? true,
      dispose: (value, key) => {
        this.stats.deletes++;
        this.updateStats();
      }
    });

    this.stats.maxSize = options.maxSize;

    // 启动清理定时器
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // 每分钟清理一次

    // 优雅关闭处理
    process.on('SIGINT', () => this.close());
    process.on('SIGTERM', () => this.close());
  }

  /**
   * 生成缓存键
   */
  generateKey(query: string, params: any[] = []): string {
    // 标准化查询字符串
    const normalizedQuery = query
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

    // 创建参数的哈希
    const paramsHash = this.hashParams(params);
    
    return `${this.hashString(normalizedQuery)}_${paramsHash}`;
  }

  /**
   * 获取缓存值
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (item) {
      // 检查是否过期
      if (this.isExpired(item)) {
        this.cache.delete(key);
        this.stats.misses++;
        this.updateStats();
        return null;
      }

      // 更新访问统计
      item.accessCount++;
      item.lastAccessed = Date.now();
      
      this.stats.hits++;
      this.updateStats();
      return item.value;
    }

    this.stats.misses++;
    this.updateStats();
    return null;
  }

  /**
   * 设置缓存值
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const item: CacheItem<T> = {
      value,
      timestamp: Date.now(),
      ttl: ttl ?? 300000, // 默认5分钟
      accessCount: 0,
      lastAccessed: Date.now()
    };

    this.cache.set(key, item);
    this.stats.sets++;
    this.updateStats();
  }

  /**
   * 删除缓存值
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
      this.updateStats();
    }
    return deleted;
  }

  /**
   * 检查缓存是否存在
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (item && !this.isExpired(item)) {
      return true;
    }
    
    if (item && this.isExpired(item)) {
      this.cache.delete(key);
    }
    
    return false;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.resetStats();
  }

  /**
   * 缓存装饰器方法
   */
  async cached<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // 尝试从缓存获取
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // 缓存未命中，执行获取函数
    try {
      const result = await fetchFn();
      this.set(key, result, ttl);
      return result;
    } catch (error) {
      // 如果获取失败，不缓存错误结果
      throw error;
    }
  }

  /**
   * 批量失效缓存
   */
  invalidatePattern(pattern: string): number {
    let deletedCount = 0;
    const regex = new RegExp(pattern);

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    this.stats.deletes += deletedCount;
    this.updateStats();
    return deletedCount;
  }

  /**
   * 预热缓存
   */
  async warmup<T>(
    entries: Array<{
      key: string;
      fetchFn: () => Promise<T>;
      ttl?: number;
    }>
  ): Promise<void> {
    const promises = entries.map(async ({ key, fetchFn, ttl }) => {
      try {
        const value = await fetchFn();
        this.set(key, value, ttl);
      } catch (error) {
        console.error(`Failed to warmup cache for key ${key}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    return {
      ...this.stats,
      hitRate: this.stats.hits + this.stats.misses > 0 
        ? this.stats.hits / (this.stats.hits + this.stats.misses) 
        : 0
    };
  }

  /**
   * 获取缓存健康状态
   */
  getHealthStatus(): {
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const stats = this.getStats();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // 检查命中率
    if (stats.hitRate < 0.5 && stats.hits + stats.misses > 100) {
      issues.push(`Low cache hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
      recommendations.push('Review caching strategy and TTL settings');
    }

    // 检查缓存大小
    const utilizationRate = stats.size / stats.maxSize;
    if (utilizationRate > 0.9) {
      issues.push(`High cache utilization: ${(utilizationRate * 100).toFixed(1)}%`);
      recommendations.push('Consider increasing cache size');
    }

    // 检查缓存效率
    if (stats.sets > stats.hits * 2 && stats.sets > 100) {
      issues.push('High cache churn rate detected');
      recommendations.push('Review TTL settings and access patterns');
    }

    return {
      healthy: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * 获取热门缓存键
   */
  getHotKeys(limit: number = 10): Array<{
    key: string;
    accessCount: number;
    lastAccessed: string;
  }> {
    const entries: Array<{
      key: string;
      accessCount: number;
      lastAccessed: string;
    }> = [];

    for (const [key, item] of this.cache.entries()) {
      entries.push({
        key,
        accessCount: item.accessCount,
        lastAccessed: new Date(item.lastAccessed).toISOString()
      });
    }

    return entries
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);
  }

  /**
   * 检查项目是否过期
   */
  private isExpired(item: CacheItem<any>): boolean {
    return Date.now() - item.timestamp > item.ttl;
  }

  /**
   * 清理过期项目
   */
  private cleanup(): void {
    let cleanedCount = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item)) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  /**
   * 更新统计信息
   */
  private updateStats(): void {
    this.stats.size = this.cache.size;
  }

  /**
   * 重置统计信息
   */
  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0,
      maxSize: this.stats.maxSize,
      hitRate: 0
    };
  }

  /**
   * 字符串哈希函数
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash.toString(36);
  }

  /**
   * 参数哈希函数
   */
  private hashParams(params: any[]): string {
    if (params.length === 0) return '';
    
    const paramString = JSON.stringify(params);
    return this.hashString(paramString);
  }

  /**
   * 关闭缓存
   */
  close(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
    console.log('Query cache closed');
  }
}

// 创建全局查询缓存实例
export const queryCache = new QueryCache({
  maxSize: 1000,
  ttl: 300000, // 5分钟
  updateAgeOnGet: true
});

// 音频相关查询的专用缓存
export const audioQueryCache = new QueryCache({
  maxSize: 500,
  ttl: 600000, // 10分钟，音频数据变化较少
  updateAgeOnGet: true
});

// 用户相关查询的专用缓存
export const userQueryCache = new QueryCache({
  maxSize: 200,
  ttl: 180000, // 3分钟，用户数据变化较频繁
  updateAgeOnGet: true
});