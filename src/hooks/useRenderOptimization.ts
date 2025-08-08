import { useCallback, useMemo, useRef, useState, useEffect } from 'react';

// 防抖Hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// 节流Hook
export function useThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef<number>(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}

// 稳定的回调Hook
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef<T>(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  });

  return useCallback(((...args: any[]) => {
    return callbackRef.current(...args);
  }) as T, []);
}

// 深度比较的useMemo
export function useDeepMemo<T>(factory: () => T, deps: any[]): T {
  const ref = useRef<{ deps: any[]; value: T } | undefined>(undefined);

  if (!ref.current || !deepEqual(ref.current.deps, deps)) {
    ref.current = {
      deps,
      value: factory(),
    };
  }

  return ref.current.value;
}

// 深度相等比较
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  
  if (a == null || b == null) return false;
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }
  
  return false;
}

// 批量状态更新Hook
export function useBatchedUpdates() {
  const [updates, setUpdates] = useState<(() => void)[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const batchUpdate = useCallback((updateFn: () => void) => {
    setUpdates(prev => [...prev, updateFn]);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setUpdates(currentUpdates => {
        currentUpdates.forEach(fn => fn());
        return [];
      });
    }, 0);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return batchUpdate;
}

// 虚拟化列表优化Hook
export function useVirtualization(
  itemCount: number,
  itemHeight: number,
  containerHeight: number,
  scrollTop: number,
  overscan: number = 5
) {
  return useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      itemCount - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    const visibleItems = [];
    for (let i = startIndex; i <= endIndex; i++) {
      visibleItems.push({
        index: i,
        offsetY: i * itemHeight,
      });
    }
    
    return {
      startIndex,
      endIndex,
      visibleItems,
      totalHeight: itemCount * itemHeight,
    };
  }, [itemCount, itemHeight, containerHeight, scrollTop, overscan]);
}

// 组件重渲染追踪Hook
export function useRenderTracker(componentName: string, props?: Record<string, any>) {
  const renderCount = useRef(0);
  const prevProps = useRef<Record<string, any> | undefined>(undefined);

  renderCount.current++;

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${componentName}] 渲染次数: ${renderCount.current}`);
      
      if (props && prevProps.current) {
        const changedProps = Object.keys(props).filter(
          key => props[key] !== prevProps.current![key]
        );
        
        if (changedProps.length > 0) {
          console.log(`[${componentName}] 变化的props:`, changedProps);
        }
      }
      
      prevProps.current = props;
    }
  });

  return renderCount.current;
}

// 内存泄漏检测Hook
export function useMemoryLeakDetection(componentName: string) {
  const mountTime = useRef<number>(Date.now());
  const timers = useRef<Set<NodeJS.Timeout>>(new Set());
  const intervals = useRef<Set<NodeJS.Timeout>>(new Set());
  const listeners = useRef<Set<{ element: EventTarget; event: string; handler: EventListener }>>(new Set());

  // 包装setTimeout
  const safeSetTimeout = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      callback();
    }, delay);
    
    timers.current.add(timer);
    return timer;
  }, []);

  // 包装setInterval
  const safeSetInterval = useCallback((callback: () => void, delay: number) => {
    const interval = setInterval(callback, delay);
    intervals.current.add(interval);
    return interval;
  }, []);

  // 包装addEventListener
  const safeAddEventListener = useCallback((
    element: EventTarget,
    event: string,
    handler: EventListener,
    options?: boolean | AddEventListenerOptions
  ) => {
    element.addEventListener(event, handler, options);
    listeners.current.add({ element, event, handler });
  }, []);

  // 清理函数
  useEffect(() => {
    return () => {
      // 清理定时器
      timers.current.forEach(timer => clearTimeout(timer));
      intervals.current.forEach(interval => clearInterval(interval));
      
      // 清理事件监听器
      listeners.current.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
      });

      if (process.env.NODE_ENV === 'development') {
        const lifeTime = Date.now() - mountTime.current;
        console.log(`[${componentName}] 组件生命周期: ${lifeTime}ms`);
        
        if (timers.current.size > 0) {
          console.warn(`[${componentName}] 未清理的定时器: ${timers.current.size}`);
        }
        
        if (intervals.current.size > 0) {
          console.warn(`[${componentName}] 未清理的间隔器: ${intervals.current.size}`);
        }
        
        if (listeners.current.size > 0) {
          console.warn(`[${componentName}] 未清理的事件监听器: ${listeners.current.size}`);
        }
      }
    };
  }, [componentName]);

  return {
    safeSetTimeout,
    safeSetInterval,
    safeAddEventListener,
  };
}