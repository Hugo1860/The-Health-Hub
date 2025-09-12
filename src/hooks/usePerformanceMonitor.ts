import { useState, useEffect, useRef } from 'react';

export interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  renderTime: number;
  loadTime: number;
  networkSpeed: number;
}

export interface PerformanceMonitorOptions {
  enableFPSMonitoring?: boolean;
  enableMemoryMonitoring?: boolean;
  enableRenderTimeMonitoring?: boolean;
  enableNetworkMonitoring?: boolean;
  reportInterval?: number;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

export function usePerformanceMonitor(options: PerformanceMonitorOptions = {}) {
  const {
    enableFPSMonitoring = true,
    enableMemoryMonitoring = true,
    enableRenderTimeMonitoring = true,
    enableNetworkMonitoring = true,
    reportInterval = 1000,
    onMetricsUpdate,
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    memoryUsage: 0,
    renderTime: 0,
    loadTime: 0,
    networkSpeed: 0,
  });

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const renderStartTimeRef = useRef(0);

  // FPS 监控
  useEffect(() => {
    if (!enableFPSMonitoring) return;

    let animationId: number;
    
    const measureFPS = () => {
      frameCountRef.current++;
      const currentTime = performance.now();
      
      if (currentTime - lastTimeRef.current >= reportInterval) {
        const fps = Math.round((frameCountRef.current * 1000) / (currentTime - lastTimeRef.current));
        
        setMetrics(prev => {
          const newMetrics = { ...prev, fps };
          onMetricsUpdate?.(newMetrics);
          return newMetrics;
        });
        
        frameCountRef.current = 0;
        lastTimeRef.current = currentTime;
      }
      
      animationId = requestAnimationFrame(measureFPS);
    };

    animationId = requestAnimationFrame(measureFPS);
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [enableFPSMonitoring, reportInterval, onMetricsUpdate]);

  // 内存使用监控
  useEffect(() => {
    if (!enableMemoryMonitoring) return;

    const measureMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const memoryUsage = Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100);
        
        setMetrics(prev => {
          const newMetrics = { ...prev, memoryUsage };
          onMetricsUpdate?.(newMetrics);
          return newMetrics;
        });
      }
    };

    measureMemory();
    const interval = setInterval(measureMemory, reportInterval);

    return () => clearInterval(interval);
  }, [enableMemoryMonitoring, reportInterval, onMetricsUpdate]);

  // 渲染时间监控
  useEffect(() => {
    if (!enableRenderTimeMonitoring) return;

    const observer = new MutationObserver(() => {
      if (renderStartTimeRef.current > 0) {
        const renderTime = performance.now() - renderStartTimeRef.current;
        
        setMetrics(prev => {
          const newMetrics = { ...prev, renderTime: Math.round(renderTime) };
          onMetricsUpdate?.(newMetrics);
          return newMetrics;
        });
        
        renderStartTimeRef.current = 0;
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [enableRenderTimeMonitoring, onMetricsUpdate]);

  // 网络速度监控 - 大幅减少测试频率
  useEffect(() => {
    if (!enableNetworkMonitoring || process.env.NODE_ENV !== 'development') return;

    let networkTestCount = 0;
    const maxNetworkTests = 3; // 最多只测试3次

    const measureNetworkSpeed = async () => {
      // 避免过度测试
      if (networkTestCount >= maxNetworkTests) {
        return;
      }

      try {
        const startTime = performance.now();
        const response = await fetch('/api/audio/speed-test', {
          method: 'GET',
          cache: 'no-cache',
        });
        
        if (response.ok) {
          const endTime = performance.now();
          const duration = endTime - startTime;
          const bytes = 1024; // 1KB 测试数据
          const bitsPerSecond = (bytes * 8) / (duration / 1000);
          const mbps = bitsPerSecond / 1000000;
          
          setMetrics(prev => {
            const newMetrics = { ...prev, networkSpeed: Math.round(mbps * 100) / 100 };
            onMetricsUpdate?.(newMetrics);
            return newMetrics;
          });
          
          networkTestCount++;
        }
      } catch (error) {
        console.warn('Network speed test failed:', error);
      }
    };

    // 初始测试（延迟3秒启动，避免页面加载时的干扰）
    const initialDelay = setTimeout(() => {
      measureNetworkSpeed();
    }, 3000);
    
    // 减少测试频率：每5分钟最多测试一次，且总共不超过3次
    const interval = setInterval(() => {
      if (networkTestCount < maxNetworkTests) {
        measureNetworkSpeed();
      } else {
        clearInterval(interval);
      }
    }, 300000); // 每5分钟测试一次

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [enableNetworkMonitoring, onMetricsUpdate]);

  // 页面加载时间监控
  useEffect(() => {
    const handleLoad = () => {
      const loadTime = performance.now();
      setMetrics(prev => {
        const newMetrics = { ...prev, loadTime: Math.round(loadTime) };
        onMetricsUpdate?.(newMetrics);
        return newMetrics;
      });
    };

    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, [onMetricsUpdate]);

  // 手动触发渲染时间测量
  const startRenderTimeTracking = () => {
    renderStartTimeRef.current = performance.now();
  };

  return {
    metrics,
    startRenderTimeTracking,
  };
}

// 性能警告Hook
export function usePerformanceWarnings(thresholds: {
  maxFPS?: number;
  minFPS?: number;
  maxMemoryUsage?: number;
  maxRenderTime?: number;
  minNetworkSpeed?: number;
} = {}) {
  const {
    maxFPS = 60,
    minFPS = 30,
    maxMemoryUsage = 100, // MB
    maxRenderTime = 16, // ms (60fps = 16.67ms per frame)
    minNetworkSpeed = 1, // Mbps
  } = thresholds;

  const [warnings, setWarnings] = useState<string[]>([]);

  const { metrics } = usePerformanceMonitor({
    reportInterval: 5000, // 增加到5秒间隔
    enableNetworkMonitoring: process.env.NODE_ENV === 'development', // 只在开发环境启用
    onMetricsUpdate: (newMetrics) => {
      const newWarnings: string[] = [];

      if (newMetrics.fps > 0 && newMetrics.fps < minFPS) {
        newWarnings.push(`低帧率警告: ${newMetrics.fps} FPS (建议 > ${minFPS})`);
      }

      if (newMetrics.memoryUsage > maxMemoryUsage) {
        newWarnings.push(`内存使用过高: ${newMetrics.memoryUsage} MB (建议 < ${maxMemoryUsage} MB)`);
      }

      if (newMetrics.renderTime > maxRenderTime) {
        newWarnings.push(`渲染时间过长: ${newMetrics.renderTime.toFixed(2)} ms (建议 < ${maxRenderTime} ms)`);
      }

      if (newMetrics.networkSpeed > 0 && newMetrics.networkSpeed < minNetworkSpeed) {
        newWarnings.push(`网络速度较慢: ${newMetrics.networkSpeed} Mbps (建议 > ${minNetworkSpeed} Mbps)`);
      }

      setWarnings(newWarnings);
    },
  });

  return {
    metrics,
    warnings,
    hasWarnings: warnings.length > 0,
  };
}