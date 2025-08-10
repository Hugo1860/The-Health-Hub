'use client';

import { useState, useEffect, ReactNode } from 'react';
import { Spin } from 'antd';

interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
  showLoading?: boolean;
}

/**
 * ClientOnly 组件用于解决 SSR 水合不匹配问题
 * 只在客户端渲染子组件，避免服务端和客户端渲染差异
 */
export default function ClientOnly({ 
  children, 
  fallback = null, 
  showLoading = false 
}: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // 服务端渲染时返回 fallback 或 null
  if (!hasMounted) {
    if (showLoading) {
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100px' 
        }}>
          <Spin size="small" />
        </div>
      );
    }
    return <>{fallback}</>;
  }

  // 客户端渲染时返回实际内容
  return <>{children}</>;
}