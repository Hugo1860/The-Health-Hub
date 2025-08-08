export interface NetworkMetrics {
  speed: number; // Mbps
  latency: number; // ms
  jitter: number; // ms
  packetLoss: number; // percentage
  bandwidth: number; // bytes/s
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  type: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
}

export interface NetworkEvent {
  type: 'online' | 'offline' | 'change';
  timestamp: number;
  metrics: NetworkMetrics;
}

export class NetworkMonitor {
  private static instance: NetworkMonitor;
  private metrics: NetworkMetrics;
  private listeners: Array<(event: NetworkEvent) => void> = [];
  private testHistory: Array<{ timestamp: number; latency: number; success: boolean }> = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  static getInstance(): NetworkMonitor {
    if (!NetworkMonitor.instance) {
      NetworkMonitor.instance = new NetworkMonitor();
    }
    return NetworkMonitor.instance;
  }

  constructor() {
    this.metrics = {
      speed: 5,
      latency: 100,
      jitter: 10,
      packetLoss: 0,
      bandwidth: 0,
      quality: 'good',
      type: 'unknown',
      effectiveType: 'unknown'
    };

    this.initializeNetworkDetection();
    this.setupEventListeners();
  }

  /**
   * 初始化网络检测
   */
  private initializeNetworkDetection(): void {
    // 检查是否在浏览器环境中
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      // 服务器端环境，使用默认值
      return;
    }

    // 检测网络连接信息
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      if (connection) {
        this.updateFromNavigatorConnection(connection);
        
        // 监听网络变化
        connection.addEventListener('change', () => {
          this.updateFromNavigatorConnection(connection);
          this.notifyListeners('change');
        });
      }
    }

    // 初始网络测试
    this.performNetworkTest();
  }

  /**
   * 从Navigator Connection API更新信息
   */
  private updateFromNavigatorConnection(connection: any): void {
    if (connection.effectiveType) {
      this.metrics.effectiveType = connection.effectiveType;
    }

    if (connection.type) {
      this.metrics.type = connection.type;
    }

    if (connection.downlink) {
      this.metrics.speed = connection.downlink;
    }

    if (connection.rtt) {
      this.metrics.latency = connection.rtt;
    }

    // 根据effectiveType估算质量
    this.updateQualityFromEffectiveType();
  }

  /**
   * 根据effectiveType更新质量评估
   */
  private updateQualityFromEffectiveType(): void {
    switch (this.metrics.effectiveType) {
      case '4g':
        this.metrics.quality = 'excellent';
        this.metrics.speed = Math.max(this.metrics.speed, 10);
        break;
      case '3g':
        this.metrics.quality = 'good';
        this.metrics.speed = Math.max(this.metrics.speed, 2);
        break;
      case '2g':
        this.metrics.quality = 'fair';
        this.metrics.speed = Math.max(this.metrics.speed, 0.5);
        break;
      case 'slow-2g':
        this.metrics.quality = 'poor';
        this.metrics.speed = Math.max(this.metrics.speed, 0.1);
        break;
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 检查是否在浏览器环境中
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    // 在线/离线状态监听
    window.addEventListener('online', () => {
      this.notifyListeners('online');
      this.performNetworkTest();
    });

    window.addEventListener('offline', () => {
      this.metrics.quality = 'poor';
      this.metrics.speed = 0;
      this.notifyListeners('offline');
    });

    // 页面可见性变化时重新测试
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && navigator.onLine) {
        this.performNetworkTest();
      }
    });
  }

  /**
   * 执行网络测试
   */
  async performNetworkTest(): Promise<NetworkMetrics> {
    // 检查是否在浏览器环境中
    if (typeof navigator === 'undefined') {
      return this.metrics;
    }

    if (!navigator.onLine) {
      this.metrics.quality = 'poor';
      this.metrics.speed = 0;
      return this.metrics;
    }

    try {
      // 延迟测试
      const latencyResult = await this.testLatency();
      
      // 带宽测试
      const bandwidthResult = await this.testBandwidth();
      
      // 更新指标
      this.metrics.latency = latencyResult.latency;
      this.metrics.jitter = latencyResult.jitter;
      this.metrics.packetLoss = latencyResult.packetLoss;
      this.metrics.bandwidth = bandwidthResult.bandwidth;
      this.metrics.speed = bandwidthResult.speed;
      
      // 计算整体质量
      this.calculateOverallQuality();
      
      return this.metrics;

    } catch (error) {
      console.error('Network test failed:', error);
      this.metrics.quality = 'poor';
      return this.metrics;
    }
  }

  /**
   * 测试网络延迟
   */
  private async testLatency(): Promise<{
    latency: number;
    jitter: number;
    packetLoss: number;
  }> {
    const testCount = 5;
    const results: number[] = [];
    let successCount = 0;

    for (let i = 0; i < testCount; i++) {
      try {
        const startTime = performance.now();
        
        const response = await fetch('/api/audio/speed-test', {
          method: 'HEAD',
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        if (response.ok) {
          const endTime = performance.now();
          const latency = endTime - startTime;
          results.push(latency);
          successCount++;
          
          // 记录到历史
          this.testHistory.push({
            timestamp: Date.now(),
            latency,
            success: true
          });
        }
      } catch (error) {
        this.testHistory.push({
          timestamp: Date.now(),
          latency: 0,
          success: false
        });
      }

      // 测试间隔
      if (i < testCount - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // 清理旧历史记录
    const oneHourAgo = Date.now() - 3600000;
    this.testHistory = this.testHistory.filter(record => record.timestamp > oneHourAgo);

    if (results.length === 0) {
      return { latency: 1000, jitter: 100, packetLoss: 100 };
    }

    // 计算平均延迟
    const avgLatency = results.reduce((sum, val) => sum + val, 0) / results.length;
    
    // 计算抖动（标准差）
    const variance = results.reduce((sum, val) => sum + Math.pow(val - avgLatency, 2), 0) / results.length;
    const jitter = Math.sqrt(variance);
    
    // 计算丢包率
    const packetLoss = ((testCount - successCount) / testCount) * 100;

    return {
      latency: avgLatency,
      jitter,
      packetLoss
    };
  }

  /**
   * 测试带宽
   */
  private async testBandwidth(): Promise<{
    bandwidth: number;
    speed: number;
  }> {
    try {
      // 下载测试数据
      const testSizes = [1024, 5120, 10240]; // 1KB, 5KB, 10KB
      let bestSpeed = 0;

      for (const size of testSizes) {
        try {
          const startTime = performance.now();
          
          const response = await fetch(`/api/audio/speed-test?size=${size}`, {
            cache: 'no-cache'
          });

          if (response.ok) {
            const data = await response.arrayBuffer();
            const endTime = performance.now();
            
            const duration = (endTime - startTime) / 1000; // 转换为秒
            const bytesPerSecond = data.byteLength / duration;
            const mbps = (bytesPerSecond * 8) / (1024 * 1024); // 转换为Mbps
            
            bestSpeed = Math.max(bestSpeed, mbps);
          }
        } catch (error) {
          console.warn(`Bandwidth test failed for size ${size}:`, error);
        }
      }

      return {
        bandwidth: bestSpeed * 1024 * 1024 / 8, // 转换为bytes/s
        speed: bestSpeed
      };

    } catch (error) {
      console.error('Bandwidth test failed:', error);
      return { bandwidth: 0, speed: 1 }; // 默认1Mbps
    }
  }

  /**
   * 计算整体网络质量
   */
  private calculateOverallQuality(): void {
    let score = 100;

    // 延迟评分
    if (this.metrics.latency > 500) {
      score -= 40;
    } else if (this.metrics.latency > 200) {
      score -= 25;
    } else if (this.metrics.latency > 100) {
      score -= 15;
    } else if (this.metrics.latency > 50) {
      score -= 5;
    }

    // 速度评分
    if (this.metrics.speed < 0.5) {
      score -= 30;
    } else if (this.metrics.speed < 2) {
      score -= 20;
    } else if (this.metrics.speed < 5) {
      score -= 10;
    }

    // 抖动评分
    if (this.metrics.jitter > 100) {
      score -= 15;
    } else if (this.metrics.jitter > 50) {
      score -= 10;
    } else if (this.metrics.jitter > 20) {
      score -= 5;
    }

    // 丢包率评分
    if (this.metrics.packetLoss > 10) {
      score -= 20;
    } else if (this.metrics.packetLoss > 5) {
      score -= 10;
    } else if (this.metrics.packetLoss > 1) {
      score -= 5;
    }

    // 确定质量等级
    if (score >= 85) {
      this.metrics.quality = 'excellent';
    } else if (score >= 70) {
      this.metrics.quality = 'good';
    } else if (score >= 50) {
      this.metrics.quality = 'fair';
    } else {
      this.metrics.quality = 'poor';
    }
  }

  /**
   * 开始监控
   */
  startMonitoring(interval: number = 30000): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.performNetworkTest().then(() => {
        this.notifyListeners('change');
      });
    }, interval);
  }

  /**
   * 停止监控
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
  }

  /**
   * 添加事件监听器
   */
  addEventListener(callback: (event: NetworkEvent) => void): void {
    this.listeners.push(callback);
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(callback: (event: NetworkEvent) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 通知监听器
   */
  private notifyListeners(type: 'online' | 'offline' | 'change'): void {
    const event: NetworkEvent = {
      type,
      timestamp: Date.now(),
      metrics: { ...this.metrics }
    };

    this.listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Network event listener error:', error);
      }
    });
  }

  /**
   * 获取当前网络指标
   */
  getCurrentMetrics(): NetworkMetrics {
    return { ...this.metrics };
  }

  /**
   * 获取网络历史数据
   */
  getNetworkHistory(): Array<{ timestamp: number; latency: number; success: boolean }> {
    return [...this.testHistory];
  }

  /**
   * 判断是否适合预加载
   */
  isSuitableForPreloading(): boolean {
    // 在服务器端环境中，默认允许预加载
    if (typeof navigator === 'undefined') {
      return true;
    }

    return (
      navigator.onLine &&
      this.metrics.quality !== 'poor' &&
      this.metrics.speed >= 1 &&
      this.metrics.packetLoss < 10
    );
  }

  /**
   * 获取推荐的预加载策略
   */
  getRecommendedPreloadStrategy(): {
    maxConcurrent: number;
    chunkSize: number;
    priority: 'high' | 'medium' | 'low';
  } {
    if (this.metrics.quality === 'excellent') {
      return {
        maxConcurrent: 3,
        chunkSize: 2 * 1024 * 1024, // 2MB
        priority: 'high'
      };
    } else if (this.metrics.quality === 'good') {
      return {
        maxConcurrent: 2,
        chunkSize: 1 * 1024 * 1024, // 1MB
        priority: 'medium'
      };
    } else if (this.metrics.quality === 'fair') {
      return {
        maxConcurrent: 1,
        chunkSize: 512 * 1024, // 512KB
        priority: 'low'
      };
    } else {
      return {
        maxConcurrent: 0,
        chunkSize: 0,
        priority: 'low'
      };
    }
  }
}

// 创建全局实例
export const networkMonitor = NetworkMonitor.getInstance();