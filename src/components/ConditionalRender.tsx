'use client';

import { useState, useEffect, ReactNode } from 'react';

interface ConditionalRenderProps {
  condition: () => boolean;
  children: ReactNode;
  fallback?: ReactNode;
  serverFallback?: ReactNode;
}

/**
 * ConditionalRender 组件用于处理需要在客户端检查条件的渲染
 * 避免服务端和客户端条件判断结果不一致导致的水合问题
 */
export default function ConditionalRender({ 
  condition, 
  children, 
  fallback = null,
  serverFallback = null
}: ConditionalRenderProps) {
  const [shouldRender, setShouldRender] = useState<boolean | null>(null);

  useEffect(() => {
    // 在客户端执行条件检查
    try {
      setShouldRender(condition());
    } catch (error) {
      console.warn('ConditionalRender condition check failed:', error);
      setShouldRender(false);
    }
  }, [condition]);

  // 服务端渲染时返回服务端 fallback
  if (shouldRender === null) {
    return <>{serverFallback}</>;
  }

  // 客户端根据条件返回内容
  return shouldRender ? <>{children}</> : <>{fallback}</>;
}