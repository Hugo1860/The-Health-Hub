'use client';

import { useState, useEffect, ReactNode } from 'react';

interface BrowserOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * BrowserOnly 组件用于只在浏览器环境中渲染的内容
 * 避免使用 window、document 等浏览器 API 时的 SSR 问题
 */
export default function BrowserOnly({ children, fallback = null }: BrowserOnlyProps) {
  const [isBrowser, setIsBrowser] = useState(false);

  useEffect(() => {
    // 确保在浏览器环境中
    if (typeof window !== 'undefined') {
      setIsBrowser(true);
    }
  }, []);

  if (!isBrowser) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}