'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'

export default function SessionProvider({
  children,
  session
}: {
  children: React.ReactNode
  session: any
}) {
  return (
    <NextAuthSessionProvider 
      session={session}
      // 启用 session 自动刷新和保持
      refetchInterval={5 * 60} // 每5分钟自动刷新
      refetchOnWindowFocus={true} // 窗口获得焦点时刷新（重要！）
      refetchWhenOffline={false} // 离线时不刷新
    >
      {children}
    </NextAuthSessionProvider>
  )
}