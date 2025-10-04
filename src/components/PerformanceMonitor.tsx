'use client';

import { useEffect, useState } from 'react';

interface PerformanceMetrics {
  FCP: number; // First Contentful Paint
  LCP: number; // Largest Contentful Paint
  FID: number; // First Input Delay
  CLS: number; // Cumulative Layout Shift
  TTFB: number; // Time to First Byte
  totalLoadTime: number;
}

interface PerformanceMonitorProps {
  children: React.ReactNode;
  onMetrics?: (metrics: PerformanceMetrics) => void;
}

export default function PerformanceMonitor({ children, onMetrics }: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 等待页面加载完成
    const measurePerformance = () => {
      // 使用 Performance API 测量关键指标
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');
      const layoutShiftEntries = performance.getEntriesByType('layout-shift');

      // 计算各个指标
      const FCP = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;
      const LCP = 0; // LCP 需要观察器来测量
      const TTFB = navigation.responseStart - navigation.requestStart;

      // 累计布局偏移 (CLS)
      let CLS = 0;
      layoutShiftEntries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          CLS += entry.value;
        }
      });

      // 总加载时间
      const totalLoadTime = navigation.loadEventEnd - navigation.navigationStart;

      const performanceMetrics: PerformanceMetrics = {
        FCP,
        LCP,
        FID: 0, // FID 需要事件监听器
        CLS: Math.round(CLS * 1000) / 1000,
        TTFB,
        totalLoadTime
      };

      setMetrics(performanceMetrics);

      // 输出性能报告
      console.log('🚀 性能指标报告:');
      console.log(`📊 首字节时间 (TTFB): ${TTFB.toFixed(2)}ms`);
      console.log(`🎨 首次内容绘制 (FCP): ${FCP.toFixed(2)}ms`);
      console.log(`📐 累计布局偏移 (CLS): ${performanceMetrics.CLS}`);
      console.log(`⏱️ 总加载时间: ${totalLoadTime.toFixed(2)}ms`);

      // 性能评分
      const score = calculatePerformanceScore(performanceMetrics);
      console.log(`🏆 性能评分: ${score}/100`);

      onMetrics?.(performanceMetrics);

      // 存储到本地存储用于分析
      try {
        const history = JSON.parse(localStorage.getItem('performance_history') || '[]');
        history.push({
          timestamp: new Date().toISOString(),
          ...performanceMetrics,
          userAgent: navigator.userAgent.substring(0, 100)
        });

        // 只保留最近10次记录
        if (history.length > 10) {
          history.splice(0, history.length - 10);
        }

        localStorage.setItem('performance_history', JSON.stringify(history));
      } catch (error) {
        console.warn('无法存储性能历史:', error);
      }
    };

    // 延迟执行以确保所有资源都加载完成
    const timer = setTimeout(measurePerformance, 2000);

    // 键盘快捷键显示性能面板
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'P') {
        setIsVisible(!isVisible);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onMetrics]);

  const calculatePerformanceScore = (metrics: PerformanceMetrics): number => {
    let score = 100;

    // TTFB 评分 (目标: < 600ms)
    if (metrics.TTFB > 600) score -= 20;
    else if (metrics.TTFB > 300) score -= 10;

    // FCP 评分 (目标: < 1800ms)
    if (metrics.FCP > 1800) score -= 25;
    else if (metrics.FCP > 1200) score -= 15;
    else if (metrics.FCP > 800) score -= 5;

    // CLS 评分 (目标: < 0.1)
    if (metrics.CLS > 0.1) score -= 25;
    else if (metrics.CLS > 0.05) score -= 15;

    // 总加载时间评分 (目标: < 3000ms)
    if (metrics.totalLoadTime > 3000) score -= 30;
    else if (metrics.totalLoadTime > 2000) score -= 20;
    else if (metrics.totalLoadTime > 1500) score -= 10;

    return Math.max(0, Math.min(100, score));
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#52c41a';
    if (score >= 70) return '#faad14';
    return '#ff4d4f';
  };

  const formatTime = (time: number) => {
    return time < 1000 ? `${Math.round(time)}ms` : `${(time / 1000).toFixed(2)}s`;
  };

  return (
    <>
      {children}

      {/* 性能面板 - Ctrl+Shift+P 显示 */}
      {isVisible && metrics && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          background: 'rgba(0, 0, 0, 0.9)',
          color: 'white',
          padding: 16,
          borderRadius: 8,
          fontSize: 12,
          zIndex: 9999,
          maxWidth: 300,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{ marginBottom: 12, fontWeight: 'bold' }}>
            🚀 性能指标
            <button
              onClick={() => setIsVisible(false)}
              style={{
                float: 'right',
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: 16
              }}
            >
              ×
            </button>
          </div>

          <div style={{ marginBottom: 8 }}>
            <span>🏆 评分: </span>
            <span style={{ color: getScoreColor(calculatePerformanceScore(metrics)) }}>
              {calculatePerformanceScore(metrics)}/100
            </span>
          </div>

          <div style={{ marginBottom: 8 }}>
            <span>📊 TTFB: </span>
            <span>{formatTime(metrics.TTFB)}</span>
          </div>

          <div style={{ marginBottom: 8 }}>
            <span>🎨 FCP: </span>
            <span>{formatTime(metrics.FCP)}</span>
          </div>

          <div style={{ marginBottom: 8 }}>
            <span>📐 CLS: </span>
            <span>{metrics.CLS}</span>
          </div>

          <div style={{ marginBottom: 8 }}>
            <span>⏱️ 总时间: </span>
            <span>{formatTime(metrics.totalLoadTime)}</span>
          </div>

          <div style={{ fontSize: 10, color: '#ccc', marginTop: 12 }}>
            Ctrl+Shift+P 切换显示
          </div>
        </div>
      )}
    </>
  );
}