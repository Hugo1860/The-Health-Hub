import React, { useEffect, useRef, useCallback, useState } from 'react';

export interface RenderMetrics {
  renderCount: number;
  averageRenderTime: number;
  lastRenderTime: number;
  totalRenderTime: number;
  slowRenders: number;
  memoryUsage?: number;
  componentName?: string;
}

export interface PerformanceThresholds {
  slowRenderThreshold: number; // ms
  memoryWarningThreshold: number; // MB
  maxRenderCount: number;
}

const defaultThresholds: PerformanceThresholds = {
  slowRenderThreshold: 16, // 60fps = 16.67ms per frame
  memoryWarningThreshold: 50, // 50MB
  maxRenderCount: 1000
};

export function useRenderPerformance(
  componentName?: string,
  thresholds: Partial<PerformanceThresholds> = {}
) {
  const finalThresholds = { ...defaultThresholds, ...thresholds };
  const metricsRef = useRef<RenderMetrics>({
    renderCount: 0,
    averageRenderTime: 0,
    lastRenderTime: 0,
    totalRenderTime: 0,
    slowRenders: 0,
    componentName
  });
  
  const renderStartTimeRef = useRef<number>(0);
  const [metrics, setMetrics] = useState<RenderMetrics>(metricsRef.current);
  const warningsRef = useRef<Set<string>>(new Set());

  // 开始渲染计时
  const startRender = useCallback(() => {
    renderStartTimeRef.current = performance.now();
  }, []);

  // 结束渲染计时
  const endRender = useCallback(() => {
    const endTime = performance.now();
    const renderTime = endTime - renderStartTimeRef.current;
    
    const current = metricsRef.current;
    current.renderCount++;
    current.lastRenderTime = renderTime;
    current.totalRenderTime += renderTime;
    current.averageRenderTime = current.totalRenderTime / current.renderCount;
    
    if (renderTime > finalThresholds.slowRenderThreshold) {
      current.slowRenders++;
      
      // 警告慢渲染
      const warningKey = `slow-render-${componentName}`;
      if (!warningsRef.current.has(warningKey)) {
        console.warn(
          `🐌 Slow render detected in ${componentName || 'component'}: ${renderTime.toFixed(2)}ms`,
          { renderTime, threshold: finalThresholds.slowRenderThreshold }
        );
        warningsRef.current.add(warningKey);
      }
    }

    // 检查内存使用情况
    if ('memory' in performance) {
      const memoryInfo = (performance as any).memory;
      current.memoryUsage = Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024);
      
      if (current.memoryUsage > finalThresholds.memoryWarningThreshold) {
        const warningKey = `memory-warning-${componentName}`;
        if (!warningsRef.current.has(warningKey)) {
          console.warn(
            `🧠 High memory usage in ${componentName || 'component'}: ${current.memoryUsage}MB`,
            { memoryUsage: current.memoryUsage, threshold: finalThresholds.memoryWarningThreshold }
          );
          warningsRef.current.add(warningKey);
        }
      }
    }

    // 检查渲染次数
    if (current.renderCount > finalThresholds.maxRenderCount) {
      const warningKey = `render-count-warning-${componentName}`;
      if (!warningsRef.current.has(warningKey)) {
        console.warn(
          `🔄 High render count in ${componentName || 'component'}: ${current.renderCount}`,
          { renderCount: current.renderCount, threshold: finalThresholds.maxRenderCount }
        );
        warningsRef.current.add(warningKey);
      }
    }

    setMetrics({ ...current });
  }, [componentName, finalThresholds]);

  // 重置指标
  const resetMetrics = useCallback(() => {
    metricsRef.current = {
      renderCount: 0,
      averageRenderTime: 0,
      lastRenderTime: 0,
      totalRenderTime: 0,
      slowRenders: 0,
      memoryUsage: metricsRef.current.memoryUsage,
      componentName
    };
    setMetrics({ ...metricsRef.current });
    warningsRef.current.clear();
  }, [componentName]);

  // 获取性能报告
  const getPerformanceReport = useCallback(() => {
    const current = metricsRef.current;
    const slowRenderRate = current.renderCount > 0 ? (current.slowRenders / current.renderCount) * 100 : 0;
    
    return {
      ...current,
      slowRenderRate: parseFloat(slowRenderRate.toFixed(2)),
      performanceScore: calculatePerformanceScore(current, finalThresholds),
      recommendations: generateRecommendations(current, finalThresholds)
    };
  }, [finalThresholds]);

  // 在每次渲染时自动计时
  useEffect(() => {
    startRender();
    return () => {
      endRender();
    };
  });

  return {
    metrics,
    startRender,
    endRender,
    resetMetrics,
    getPerformanceReport
  };
}

// 计算性能评分
function calculatePerformanceScore(
  metrics: RenderMetrics,
  thresholds: PerformanceThresholds
): number {
  let score = 100;

  // 平均渲染时间评分
  if (metrics.averageRenderTime > thresholds.slowRenderThreshold * 2) {
    score -= 30;
  } else if (metrics.averageRenderTime > thresholds.slowRenderThreshold) {
    score -= 15;
  }

  // 慢渲染率评分
  const slowRenderRate = metrics.renderCount > 0 ? (metrics.slowRenders / metrics.renderCount) * 100 : 0;
  if (slowRenderRate > 20) {
    score -= 25;
  } else if (slowRenderRate > 10) {
    score -= 15;
  } else if (slowRenderRate > 5) {
    score -= 10;
  }

  // 内存使用评分
  if (metrics.memoryUsage) {
    if (metrics.memoryUsage > thresholds.memoryWarningThreshold * 2) {
      score -= 20;
    } else if (metrics.memoryUsage > thresholds.memoryWarningThreshold) {
      score -= 10;
    }
  }

  // 渲染次数评分
  if (metrics.renderCount > thresholds.maxRenderCount * 2) {
    score -= 15;
  } else if (metrics.renderCount > thresholds.maxRenderCount) {
    score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

// 生成优化建议
function generateRecommendations(
  metrics: RenderMetrics,
  thresholds: PerformanceThresholds
): string[] {
  const recommendations: string[] = [];

  if (metrics.averageRenderTime > thresholds.slowRenderThreshold) {
    recommendations.push('考虑使用 React.memo() 或 useMemo() 优化组件渲染');
  }

  const slowRenderRate = metrics.renderCount > 0 ? (metrics.slowRenders / metrics.renderCount) * 100 : 0;
  if (slowRenderRate > 10) {
    recommendations.push('检查是否有不必要的重渲染，使用 useCallback() 优化事件处理函数');
  }

  if (metrics.memoryUsage && metrics.memoryUsage > thresholds.memoryWarningThreshold) {
    recommendations.push('内存使用较高，检查是否有内存泄漏或大对象未释放');
  }

  if (metrics.renderCount > thresholds.maxRenderCount) {
    recommendations.push('渲染次数过多，检查组件是否有无限重渲染的问题');
  }

  if (recommendations.length === 0) {
    recommendations.push('组件性能良好，继续保持！');
  }

  return recommendations;
}

// 性能监控高阶组件
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string,
  thresholds?: Partial<PerformanceThresholds>
) {
  const PerformanceMonitoredComponent: React.FC<P> = (props) => {
    const { getPerformanceReport } = useRenderPerformance(
      componentName || Component.displayName || Component.name,
      thresholds
    );

    // 在开发环境中添加性能报告到 window 对象
    useEffect(() => {
      if (process.env.NODE_ENV === 'development') {
        const globalKey = `__PERFORMANCE_${componentName || Component.name}__`;
        (window as any)[globalKey] = getPerformanceReport;
      }
    }, [getPerformanceReport]);

    return <Component {...props} />;
  };

  PerformanceMonitoredComponent.displayName = `PerformanceMonitored(${Component.displayName || Component.name})`;
  return PerformanceMonitoredComponent;
}

// 内存泄漏检测Hook
export function useMemoryLeakDetection(componentName?: string) {
  const initialMemoryRef = useRef<number>(0);
  const checkIntervalRef = useRef<NodeJS.Timeout>();
  const [memoryTrend, setMemoryTrend] = useState<'stable' | 'increasing' | 'decreasing'>('stable');
  const memoryHistoryRef = useRef<number[]>([]);

  useEffect(() => {
    if ('memory' in performance) {
      const memoryInfo = (performance as any).memory;
      initialMemoryRef.current = memoryInfo.usedJSHeapSize;
      
      // 每5秒检查一次内存使用情况
      checkIntervalRef.current = setInterval(() => {
        const currentMemory = memoryInfo.usedJSHeapSize;
        memoryHistoryRef.current.push(currentMemory);
        
        // 保持最近10次的记录
        if (memoryHistoryRef.current.length > 10) {
          memoryHistoryRef.current = memoryHistoryRef.current.slice(-10);
        }
        
        // 分析内存趋势
        if (memoryHistoryRef.current.length >= 5) {
          const recent = memoryHistoryRef.current.slice(-5);
          const average = recent.reduce((a, b) => a + b, 0) / recent.length;
          const trend = recent[recent.length - 1] - recent[0];
          
          if (trend > average * 0.1) {
            setMemoryTrend('increasing');
            console.warn(
              `📈 Memory usage increasing in ${componentName || 'component'}`,
              { 
                current: Math.round(currentMemory / 1024 / 1024), 
                initial: Math.round(initialMemoryRef.current / 1024 / 1024),
                trend: Math.round(trend / 1024 / 1024)
              }
            );
          } else if (trend < -average * 0.1) {
            setMemoryTrend('decreasing');
          } else {
            setMemoryTrend('stable');
          }
        }
      }, 5000);
    }

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [componentName]);

  const getCurrentMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memoryInfo = (performance as any).memory;
      return {
        used: Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memoryInfo.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(memoryInfo.jsHeapSizeLimit / 1024 / 1024)
      };
    }
    return null;
  }, []);

  return {
    memoryTrend,
    getCurrentMemoryUsage
  };
}

export default useRenderPerformance;