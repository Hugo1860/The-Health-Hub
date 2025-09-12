'use client';

import { useState, useEffect, ReactNode } from 'react';
import { Skeleton } from 'antd';

interface DynamicContentProps {
  children: ReactNode;
  loading?: boolean;
  skeleton?: ReactNode;
  minHeight?: number | string;
}

/**
 * DynamicContent 组件用于处理动态加载的内容
 * 提供加载状态和骨架屏，避免布局跳动
 */
export default function DynamicContent({ 
  children, 
  loading = false,
  skeleton,
  minHeight = 'auto'
}: DynamicContentProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 如果还在加载或者不是客户端，显示骨架屏
  if (!isClient || loading) {
    if (skeleton) {
      return <div style={{ minHeight }}>{skeleton}</div>;
    }
    
    return (
      <div style={{ minHeight }}>
        <Skeleton active paragraph={{ rows: 3 }} />
      </div>
    );
  }

  return <div style={{ minHeight }}>{children}</div>;
}