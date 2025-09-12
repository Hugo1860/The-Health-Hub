'use client';

import React from 'react';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { usePathname } from 'next/navigation';

const AntdRegistryWrapper = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  
  // 只在管理后台和认证页面使用 Ant Design Registry
  const shouldUseAntd = pathname?.startsWith('/admin') || pathname?.startsWith('/auth');
  
  if (shouldUseAntd) {
    return <AntdRegistry>{children}</AntdRegistry>;
  }
  
  // 对于其他页面，直接返回 children
  return <>{children}</>;
};

export default AntdRegistryWrapper;