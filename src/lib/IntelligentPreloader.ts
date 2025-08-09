import { optimizedDb } from './OptimizedDatabase';

export interface PreloadStrategy {
  name: string;
  priority: number;
  enabled: boolean;
  maxItems: number;
  condition: (context: PreloadContext) => boolean;
  getItems: (context: PreloadContext) => Promise<string[]>;
}

export interface PreloadContext {
  currentAudioId: string;
  userId?: string;
  playHistory: string[];
  currentPlaylist: any[];
  userPreferences: any;
  networkQuality: 'high' | 'medium' | 'low';
  deviceType: 'desktop' | 'mobile' | 'tablet';
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  batteryLevel?: number;
}

export interface PreloadItem {
  audioId: string;
  priority: number;
  strategy: string;
  estimatedSize: number;
  preloadedAt: number;
  accessCount: number;
  lastAccessed: number;
}

export interface NetworkCondition {
  speed: number; // Mbps
  latency: number; // ms
  stability: number; // 0-1
  type: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
}

export class IntelligentPreloader {
  private static instance: IntelligentPreloader;
  private preloadedItems: Map<string, PreloadItem> = new Map();
  private preloadQueue: Set<string> = new Set();
  private strategies: PreloadStrategy[] = [];
  private maxCacheSize = 100 * 1024 * 1024; // 100MB
  private currentCacheSize = 0;
  private networkCondition: NetworkCondition = {
    speed: 5,
    latency: 50,
    stability: 0.8,
    type: 'wifi'
  };

  static getInstance(): IntelligentPreloader {
    if (!IntelligentPreloader.instance) {
      IntelligentPreloader.instance = new IntelligentPreloader();
    }
    return IntelligentPreloader.instance;
  }

  constructor() {
    this.initializeStrategies();
    this.startNetworkMonitoring();
    this.startCleanupScheduler();
  }

  /**
   * 初始化预加载策略
   */
  private initializeStrategies(): void {
    this.strategies = [
      // 策略1: 顺序预加载（播放列表中的下一首）
      {
        name: 'sequential',
        priority: 10,
        enabled: true,
        maxItems: 2,
        condition: (context) => context.currentPlaylist.length > 1,
        getItems: async (context) => {
          const currentIndex = context.currentPlaylist.findIndex(
            audio => audio.id === context.currentAudioId
          );
          const items = [];
          
          // 下一首
          if (currentIndex < context.currentPlaylist.length - 1) {
            items.push(context.currentPlaylist[currentIndex + 1].id);
          }
          
          // 下下首（如果网络条件好）
          if (this.networkCondition.speed > 5 && currentIndex < context.currentPlaylist.length - 2) {
            items.push(context.currentPlaylist[currentIndex + 2].id);
          }
          
          return items;
        }
      },

      // 策略2: 基于播放历史的预测预加载
      {
        name: 'history_based',
        priority: 8,
        enabled: true,
        maxItems: 3,
        condition: (context) => context.playHistory.length >= 3,
        getItems: async (context) => {
          // 分析播放历史，找出经常一起播放的音频
          const recommendations = await this.getHistoryBasedRecommendations(
            context.currentAudioId,
            context.playHistory,
            context.userId
          );
          return recommendations.slice(0, 3);
        }
      },

      // 策略3: 相似内容预加载
      {
        name: 'similar_content',
        priority: 6,
        enabled: true,
        maxItems: 2,
        condition: (context) => true,
        getItems: async (context) => {
          const currentAudio = context.currentPlaylist.find(
            audio => audio.id === context.currentAudioId
          );
          if (!currentAudio) return [];

          // 查找相同主题或标签的音频
          const similarAudios = await optimizedDb.query(
            `SELECT id FROM audios 
             WHERE (subject = ? OR tags LIKE ?) 
             AND id != ? 
             ORDER BY uploadDate DESC 
             LIMIT 3`,
            [currentAudio.subject, `%${currentAudio.tags}%`, context.currentAudioId],
            { useCache: true, cacheTTL: 600000 }
          );

          return similarAudios.map((audio: any) => audio.id);
        }
      },

      // 策略4: 热门内容预加载
      {
        name: 'popular_content',
        priority: 4,
        enabled: true,
        maxItems: 2,
        condition: (context) => this.networkCondition.speed > 3,
        getItems: async (context) => {
          const popularAudios = await optimizedDb.getPopularAudios(5);
          return popularAudios
            .filter(audio => audio.id !== context.currentAudioId)
            .slice(0, 2)
            .map(audio => audio.id);
        }
      },

      // 策略5: 时间段相关预加载
      {
        name: 'time_based',
        priority: 3,
        enabled: true,
        maxItems: 1,
        condition: (context) => context.timeOfDay !== undefined,
        getItems: async (context) => {
          // 根据时间段推荐内容
          const timeBasedQuery = this.getTimeBasedQuery(context.timeOfDay);
          if (!timeBasedQuery) return [];

          const timeBasedAudios = await optimizedDb.query(
            timeBasedQuery,
            [],
            { useCache: true, cacheTTL: 1800000 } // 30分钟缓存
          );

          return timeBasedAudios
            .filter((audio: any) => audio.id !== context.currentAudioId)
            .slice(0, 1)
            .map((audio: any) => audio.id);
        }
      }
    ];
  }

  /**
   * 智能预加载主函数
   */
  async preloadIntelligently(context: PreloadContext): Promise<void> {
    try {
      // 更新网络状况
      await this.updateNetworkCondition();

      // 根据设备和网络条件调整策略
      this.adjustStrategiesForConditions(context);

      // 收集所有策略的预加载项目
      const preloadCandidates: Array<{
        audioId: string;
        priority: number;
        strategy: string;
      }> = [];

      for (const strategy of this.strategies) {
        if (!strategy.enabled || !strategy.condition(context)) {
          continue;
        }

        try {
          const items = await strategy.getItems(context);
          for (const audioId of items.slice(0, strategy.maxItems)) {
            if (!this.preloadedItems.has(audioId) && !this.preloadQueue.has(audioId)) {
              preloadCandidates.push({
                audioId,
                priority: strategy.priority,
                strategy: strategy.name
              });
            }
          }
        } catch (error) {
          console.error(`Strategy ${strategy.name} failed:`, error);
        }
      }

      // 按优先级排序
      preloadCandidates.sort((a, b) => b.priority - a.priority);

      // 执行预加载
      const maxConcurrentPreloads = this.getMaxConcurrentPreloads();
      const itemsToPreload = preloadCandidates.slice(0, maxConcurrentPreloads);

      await Promise.allSettled(
        itemsToPreload.map(item => this.preloadAudio(item))
      );

    } catch (error) {
      console.error('Intelligent preloading failed:', error);
    }
  }

  /**
   * 预加载单个音频
   */
  private async preloadAudio(item: {
    audioId: string;
    priority: number;
    strategy: string;
  }): Promise<void> {
    if (this.preloadQueue.has(item.audioId)) {
      return;
    }

    this.preloadQueue.add(item.audioId);

    try {
      // 获取音频信息
      const audioInfo = await optimizedDb.getAudioById(item.audioId);
      if (!audioInfo) {
        return;
      }

      // 在服务器端环境中跳过实际的网络请求
      if (typeof window === 'undefined') {
        console.log(`Would preload audio ${item.audioId} using ${item.strategy} strategy (server-side)`);
        return;
      }

      // 根据网络条件决定预加载大小
      const preloadSize = this.getPreloadSize();
      const url = `/api/audio/stream/${item.audioId}`;

      const response = await fetch(url, {
        headers: {
          'Range': `bytes=0-${preloadSize - 1}`,
        },
      });

      if (response.ok) {
        const buffer = await response.arrayBuffer();
        
        // 检查缓存空间
        if (this.currentCacheSize + buffer.byteLength > this.maxCacheSize) {
          this.evictLeastUseful();
        }

        // 添加到缓存
        const preloadItem: PreloadItem = {
          audioId: item.audioId,
          priority: item.priority,
          strategy: item.strategy,
          estimatedSize: buffer.byteLength,
          preloadedAt: Date.now(),
          accessCount: 0,
          lastAccessed: 0
        };

        this.preloadedItems.set(item.audioId, preloadItem);
        this.currentCacheSize += buffer.byteLength;

        console.log(`Preloaded audio ${item.audioId} using ${item.strategy} strategy`);
      }

    } catch (error) {
      console.error(`Failed to preload audio ${item.audioId}:`, error);
    } finally {
      this.preloadQueue.delete(item.audioId);
    }
  }

  /**
   * 基于播放历史的推荐
   */
  private async getHistoryBasedRecommendations(
    currentAudioId: string,
    playHistory: string[],
    userId?: string
  ): Promise<string[]> {
    if (playHistory.length < 3) return [];

    try {
      // 分析播放历史中的模式
      const recentHistory = playHistory.slice(-10); // 最近10首
      const coOccurrenceMap = new Map<string, number>();

      // 计算共现频率
      for (let i = 0; i < recentHistory.length - 1; i++) {
        const current = recentHistory[i];
        const next = recentHistory[i + 1];
        
        if (current === currentAudioId) {
          coOccurrenceMap.set(next, (coOccurrenceMap.get(next) || 0) + 1);
        }
      }

      // 按频率排序
      const recommendations = Array.from(coOccurrenceMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([audioId]) => audioId);

      return recommendations;

    } catch (error) {
      console.error('Failed to get history-based recommendations:', error);
      return [];
    }
  }

  /**
   * 获取时间段相关查询
   */
  private getTimeBasedQuery(timeOfDay: string): string | null {
    const queries = {
      morning: `
        SELECT id FROM audios 
        WHERE subject IN ('健康', '医学基础', '养生') 
        ORDER BY RANDOM() 
        LIMIT 3
      `,
      afternoon: `
        SELECT id FROM audios 
        WHERE subject IN ('临床医学', '专业知识') 
        ORDER BY RANDOM() 
        LIMIT 3
      `,
      evening: `
        SELECT id FROM audios 
        WHERE subject IN ('医学故事', '健康科普') 
        ORDER BY RANDOM() 
        LIMIT 3
      `,
      night: `
        SELECT id FROM audios 
        WHERE subject IN ('放松', '冥想', '睡眠') 
        ORDER BY RANDOM() 
        LIMIT 3
      `
    };

    return queries[timeOfDay as keyof typeof queries] || null;
  }

  /**
   * 根据条件调整策略
   */
  private adjustStrategiesForConditions(context: PreloadContext): void {
    // 移动设备优化
    if (context.deviceType === 'mobile') {
      // 减少预加载项目数量
      this.strategies.forEach(strategy => {
        strategy.maxItems = Math.max(1, Math.floor(strategy.maxItems / 2));
      });

      // 如果电池电量低，禁用低优先级策略
      if (context.batteryLevel && context.batteryLevel < 20) {
        this.strategies.forEach(strategy => {
          if (strategy.priority < 6) {
            strategy.enabled = false;
          }
        });
      }
    }

    // 网络条件优化
    if (this.networkCondition.speed < 2) {
      // 低速网络，只启用最高优先级策略
      this.strategies.forEach(strategy => {
        strategy.enabled = strategy.priority >= 8;
      });
    } else if (this.networkCondition.speed < 5) {
      // 中速网络，禁用低优先级策略
      this.strategies.forEach(strategy => {
        strategy.enabled = strategy.priority >= 4;
      });
    }
  }

  /**
   * 更新网络状况
   */
  private async updateNetworkCondition(): Promise<void> {
    try {
      // 在服务器端环境中跳过网络测试
      if (typeof window === 'undefined') {
        return;
      }

      const startTime = performance.now();
      const response = await fetch('/api/audio/speed-test', {
        method: 'HEAD',
        cache: 'no-cache',
      });
      const endTime = performance.now();

      if (response.ok) {
        const latency = endTime - startTime;
        
        // 估算网络速度
        let speed = 5; // 默认中等速度
        if (latency < 50) {
          speed = 10; // 高速
        } else if (latency < 200) {
          speed = 5; // 中速
        } else {
          speed = 1; // 低速
        }

        this.networkCondition = {
          speed,
          latency,
          stability: this.calculateNetworkStability(),
          type: this.detectNetworkType()
        };
      }
    } catch (error) {
      console.error('Failed to update network condition:', error);
    }
  }

  /**
   * 计算网络稳定性
   */
  private calculateNetworkStability(): number {
    // 简化的稳定性计算，实际应用中可以基于历史数据
    return Math.random() * 0.3 + 0.7; // 0.7-1.0
  }

  /**
   * 检测网络类型
   */
  private detectNetworkType(): 'wifi' | 'cellular' | 'ethernet' | 'unknown' {
    // 在浏览器中检测网络类型
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection.type) {
        return connection.type;
      }
    }
    return 'unknown';
  }

  /**
   * 获取预加载大小
   */
  private getPreloadSize(): number {
    const baseSizes = {
      high: 2 * 1024 * 1024,    // 2MB
      medium: 1 * 1024 * 1024,  // 1MB
      low: 512 * 1024           // 512KB
    };

    if (this.networkCondition.speed >= 5) return baseSizes.high;
    if (this.networkCondition.speed >= 2) return baseSizes.medium;
    return baseSizes.low;
  }

  /**
   * 获取最大并发预加载数
   */
  private getMaxConcurrentPreloads(): number {
    if (this.networkCondition.speed >= 5) return 3;
    if (this.networkCondition.speed >= 2) return 2;
    return 1;
  }

  /**
   * 淘汰最不有用的缓存项
   */
  private evictLeastUseful(): void {
    if (this.preloadedItems.size === 0) return;

    // 计算每个项目的有用性分数
    const items = Array.from(this.preloadedItems.entries()).map(([audioId, item]) => {
      const age = Date.now() - item.preloadedAt;
      const timeSinceLastAccess = item.lastAccessed > 0 ? Date.now() - item.lastAccessed : age;
      
      // 分数越低越不有用
      const score = (item.accessCount + 1) * item.priority / (age + timeSinceLastAccess);
      
      return { audioId, item, score };
    });

    // 按分数排序，移除分数最低的
    items.sort((a, b) => a.score - b.score);
    const toRemove = items.slice(0, Math.max(1, Math.floor(items.length * 0.3)));

    for (const { audioId, item } of toRemove) {
      this.preloadedItems.delete(audioId);
      this.currentCacheSize -= item.estimatedSize;
    }
  }

  /**
   * 启动网络监控
   */
  private startNetworkMonitoring(): void {
    // 每30秒更新一次网络状况
    setInterval(() => {
      this.updateNetworkCondition();
    }, 30000);
  }

  /**
   * 启动清理调度器
   */
  private startCleanupScheduler(): void {
    // 每5分钟清理一次过期项目
    setInterval(() => {
      this.cleanupExpiredItems();
    }, 300000);
  }

  /**
   * 清理过期项目
   */
  private cleanupExpiredItems(): void {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30分钟

    const entries = Array.from(this.preloadedItems.entries());
    for (const [audioId, item] of entries) {
      if (now - item.preloadedAt > maxAge && item.accessCount === 0) {
        this.preloadedItems.delete(audioId);
        this.currentCacheSize -= item.estimatedSize;
      }
    }
  }

  /**
   * 记录访问
   */
  recordAccess(audioId: string): void {
    const item = this.preloadedItems.get(audioId);
    if (item) {
      item.accessCount++;
      item.lastAccessed = Date.now();
    }
  }

  /**
   * 获取预加载统计
   */
  getPreloadStats(): {
    totalItems: number;
    totalSize: number;
    strategiesEnabled: number;
    networkCondition: NetworkCondition;
    hitRate: number;
  } {
    const totalHits = Array.from(this.preloadedItems.values())
      .reduce((sum, item) => sum + item.accessCount, 0);
    const totalItems = this.preloadedItems.size;

    return {
      totalItems,
      totalSize: this.currentCacheSize,
      strategiesEnabled: this.strategies.filter(s => s.enabled).length,
      networkCondition: this.networkCondition,
      hitRate: totalItems > 0 ? totalHits / totalItems : 0
    };
  }

  /**
   * 清除所有预加载项
   */
  clearAll(): void {
    this.preloadedItems.clear();
    this.preloadQueue.clear();
    this.currentCacheSize = 0;
  }
}

// 创建全局实例
export const intelligentPreloader = IntelligentPreloader.getInstance();