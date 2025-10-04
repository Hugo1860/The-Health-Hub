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
    // 会话刷新配置
    refetchInterval: 5 * 60, // 5分钟自动刷新一次
    refetchOnWindowFocus: true, // ✅ 启用窗口焦点时的自动刷新（重要！）
    refetchWhenOffline: false, // 离线时不刷新
    // 当 session 即将过期时（剩余 5 分钟），自动刷新
    keepAlive: 5 * 60, // 5分钟
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
