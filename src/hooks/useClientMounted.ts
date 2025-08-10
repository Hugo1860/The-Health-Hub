'use client';

import { useState, useEffect } from 'react';

/**
 * useClientMounted Hook 用于检测组件是否已在客户端挂载
 * 用于解决 SSR 水合不匹配问题
 * 
 * @returns {boolean} 是否已在客户端挂载
 */
export function useClientMounted(): boolean {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  return hasMounted;
}

/**
 * useIsClient Hook 用于检测当前是否在客户端环境
 * 
 * @returns {boolean} 是否在客户端环境
 */
export function useIsClient(): boolean {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(typeof window !== 'undefined');
  }, []);

  return isClient;
}