'use client';

import { useEffect, useRef } from 'react';
import { logMetric, logError } from '../lib/errorLogger';

interface PerformanceMonitorProps {
  componentName: string;
  children: React.ReactNode;
  trackRender?: boolean;
  trackMount?: boolean;
  trackUpdate?: boolean;
}

export default function PerformanceMonitor({
  componentName,
  children,
  trackRender = true,
  trackMount = true,
  trackUpdate = false
}: PerformanceMonitorProps) {
  const mountTimeRef = useRef<number>(0);
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef<number>(0);

  useEffect(() => {
    // 组件挂载时间
    if (trackMount) {
      const mountTime = Date.now();
      if (mountTimeRef.current) {
        const mountDuration = mountTime - mountTimeRef.current;
        logMetric(`${componentName}_mount_time`, mountDuration, 'ms', {
          component: componentName,
          type: 'mount'
        });
      }
    }

    return () => {
      // 组件卸载
      logMetric(`${componentName}_unmount`, Date.now(), 'timestamp', {
        component: componentName,
        type: 'unmount',
        renderCount: renderCountRef.current
      });
    };
  }, [componentName, trackMount]);

  useEffect(() => {
    // 组件更新时间
    if (trackUpdate && renderCountRef.current > 0) {
      const updateTime = Date.now();
      if (lastRenderTimeRef.current) {
        const updateDuration = updateTime - lastRenderTimeRef.current;
        logMetric(`${componentName}_update_time`, updateDuration, 'ms', {
          component: componentName,
          type: 'update',
          renderCount: renderCountRef.current
        });
      }
      lastRenderTimeRef.current = updateTime;
    }
  });

  // 记录渲染
  if (trackRender) {
    const renderStart = performance.now();
    renderCountRef.current++;
    
    // 使用 setTimeout 来测量渲染完成时间
    setTimeout(() => {
      const renderEnd = performance.now();
      const renderDuration = renderEnd - renderStart;
      
      logMetric(`${componentName}_render_time`, renderDuration, 'ms', {
        component: componentName,
        type: 'render',
        renderCount: renderCountRef.current
      });
    }, 0);
  }

  // 设置挂载开始时间
  if (!mountTimeRef.current) {
    mountTimeRef.current = Date.now();
  }

  return <>{children}</>;
}

// HOC 版本
export function withPerformanceMonitor<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';
  
  const MonitoredComponent = (props: P) => {
    return (
      <PerformanceMonitor componentName={displayName}>
        <WrappedComponent {...props} />
      </PerformanceMonitor>
    );
  };

  MonitoredComponent.displayName = `withPerformanceMonitor(${displayName})`;
  return MonitoredComponent;
}

// Hook 版本
export function usePerformanceMonitor(componentName: string) {
  const mountTimeRef = useRef<number>(0);
  const renderCountRef = useRef(0);

  useEffect(() => {
    const mountTime = Date.now();
    if (mountTimeRef.current) {
      const mountDuration = mountTime - mountTimeRef.current;
      logMetric(`${componentName}_mount_time`, mountDuration, 'ms', {
        component: componentName,
        type: 'mount'
      });
    }

    return () => {
      logMetric(`${componentName}_unmount`, Date.now(), 'timestamp', {
        component: componentName,
        type: 'unmount',
        renderCount: renderCountRef.current
      });
    };
  }, [componentName]);

  const trackRender = () => {
    renderCountRef.current++;
    const renderStart = performance.now();
    
    return () => {
      const renderEnd = performance.now();
      const renderDuration = renderEnd - renderStart;
      
      logMetric(`${componentName}_render_time`, renderDuration, 'ms', {
        component: componentName,
        type: 'render',
        renderCount: renderCountRef.current
      });
    };
  };

  if (!mountTimeRef.current) {
    mountTimeRef.current = Date.now();
  }

  return { trackRender };
}