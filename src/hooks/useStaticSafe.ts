'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { isStaticContext, withStaticSafety, StaticBoundaryChecker } from '../lib/static-boundary';

// 静态安全的 useState
export function useStaticSafeState<T>(
  initialValue: T,
  componentName?: string
): [T, (value: T | ((prev: T) => T)) => void] {
  const safeUseState = withStaticSafety(
    useState,
    [initialValue, () => {}] as any,
    'useState'
  );

  if (isStaticContext() && componentName) {
    StaticBoundaryChecker.reportViolation(
      componentName,
      'useState used in static context'
    );
  }

  return safeUseState(initialValue);
}

// 静态安全的 useEffect
export function useStaticSafeEffect(
  effect: () => void | (() => void),
  deps?: React.DependencyList,
  componentName?: string
): void {
  const safeUseEffect = withStaticSafety(
    useEffect,
    undefined,
    'useEffect'
  );

  if (isStaticContext() && componentName) {
    StaticBoundaryChecker.reportViolation(
      componentName,
      'useEffect used in static context'
    );
  }

  return safeUseEffect(effect, deps);
}

// 静态安全的 useCallback
export function useStaticSafeCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList,
  componentName?: string
): T {
  const safeUseCallback = withStaticSafety(
    useCallback,
    callback,
    'useCallback'
  );

  if (isStaticContext() && componentName) {
    StaticBoundaryChecker.reportViolation(
      componentName,
      'useCallback used in static context'
    );
  }

  return safeUseCallback(callback, deps);
}

// 静态安全的 useMemo
export function useStaticSafeMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  componentName?: string
): T {
  const safeUseMemo = withStaticSafety(
    useMemo,
    factory(),
    'useMemo'
  );

  if (isStaticContext() && componentName) {
    StaticBoundaryChecker.reportViolation(
      componentName,
      'useMemo used in static context'
    );
  }

  return safeUseMemo(factory, deps);
}

// 检查是否已挂载的 Hook
export function useClientMounted(componentName?: string): boolean {
  const [mounted, setMounted] = useStaticSafeState(false, componentName);

  useStaticSafeEffect(() => {
    setMounted(true);
  }, [], componentName);

  return mounted;
}

// 安全的本地存储 Hook
export function useStaticSafeLocalStorage<T>(
  key: string,
  defaultValue: T,
  componentName?: string
): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useStaticSafeState<T>(defaultValue, componentName);

  // 从 localStorage 读取值
  useStaticSafeEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const item = window.localStorage.getItem(key);
        if (item) {
          setStoredValue(JSON.parse(item));
        }
      }
    } catch (error) {
      console.warn(`useStaticSafeLocalStorage: Error reading ${key}:`, error);
      if (componentName) {
        StaticBoundaryChecker.reportViolation(
          componentName,
          `localStorage read error for key: ${key}`
        );
      }
    }
  }, [key], componentName);

  // 设置值到 localStorage
  const setValue = useStaticSafeCallback((value: T) => {
    try {
      setStoredValue(value);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.warn(`useStaticSafeLocalStorage: Error setting ${key}:`, error);
      if (componentName) {
        StaticBoundaryChecker.reportViolation(
          componentName,
          `localStorage write error for key: ${key}`
        );
      }
    }
  }, [key, setStoredValue], componentName);

  return [storedValue, setValue];
}

// 安全的媒体查询 Hook
export function useStaticSafeMediaQuery(
  query: string,
  defaultValue: boolean = false,
  componentName?: string
): boolean {
  const [matches, setMatches] = useStaticSafeState(defaultValue, componentName);

  useStaticSafeEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    try {
      const mediaQuery = window.matchMedia(query);
      setMatches(mediaQuery.matches);

      const handler = (event: MediaQueryListEvent) => {
        setMatches(event.matches);
      };

      // 使用新的 API 或回退到旧的 API
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
      } else {
        // 旧版本浏览器的回退
        mediaQuery.addListener(handler);
        return () => mediaQuery.removeListener(handler);
      }
    } catch (error) {
      console.warn(`useStaticSafeMediaQuery: Error with query ${query}:`, error);
      if (componentName) {
        StaticBoundaryChecker.reportViolation(
          componentName,
          `Media query error: ${query}`
        );
      }
    }
  }, [query], componentName);

  return matches;
}

// 安全的窗口尺寸 Hook
export function useStaticSafeWindowSize(componentName?: string): {
  width: number;
  height: number;
} {
  const [windowSize, setWindowSize] = useStaticSafeState(
    { width: 0, height: 0 },
    componentName
  );

  useStaticSafeEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // 设置初始值
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [], componentName);

  return windowSize;
}

// 安全的定时器 Hook
export function useStaticSafeInterval(
  callback: () => void,
  delay: number | null,
  componentName?: string
): void {
  useStaticSafeEffect(() => {
    if (delay === null || typeof window === 'undefined') {
      return;
    }

    try {
      const interval = setInterval(callback, delay);
      return () => clearInterval(interval);
    } catch (error) {
      console.warn('useStaticSafeInterval: Error setting interval:', error);
      if (componentName) {
        StaticBoundaryChecker.reportViolation(
          componentName,
          `Interval error with delay: ${delay}`
        );
      }
    }
  }, [callback, delay], componentName);
}

// 所有 Hook 已在上面单独导出，这里不需要重复导出