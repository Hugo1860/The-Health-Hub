'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode, useMemo } from 'react';

interface OptimizedSessionProviderProps {
  children: ReactNode;
  session?: any;
}

export default function OptimizedSessionProvider({ 
  children, 
  session 
}: OptimizedSessionProviderProps) {
  // 使用 useMemo 优化 SessionProvider 的配置
  const sessionConfig = useMemo(() => ({
    // 减少会话检查频率，提高性能
    refetchInterval: 5 * 60, // 5分钟检查一次
    refetchOnWindowFocus: false, // 禁用窗口焦点时的自动刷新
    refetchWhenOffline: false, // 离线时不刷新
  }), []);

  return (
    <SessionProvider 
      session={session}
      {...sessionConfig}
    >
      {children}
    </SessionProvider>
  );
}
