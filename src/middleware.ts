import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    const pathname = request.nextUrl.pathname.toLowerCase()

    // 允许访问的白名单（仅保留必要入口）
    const allowed = (
      pathname === '/' ||
      pathname === '/favicon.ico' ||
      pathname === '/robots.txt' ||
      pathname === '/sitemap.xml' ||
      pathname === '/manifest.json' ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/uploads') ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/_vercel')
    )

    // 显式阻止测试/调试路径
    const isTestOrDebug = (
      /^\/(test|debug)(-|\/)/.test(pathname) ||
      /^\/test-/.test(pathname) ||
      /^\/debug-/.test(pathname) ||
      /^\/api\/(test|debug)(-|\/)/.test(pathname) ||
      /^\/api\/test-/.test(pathname) ||
      /^\/api\/debug-/.test(pathname)
    )

    if (isTestOrDebug) {
      return new NextResponse('Not Found', { status: 404 })
    }

    if (!allowed) {
      return new NextResponse('Not Found', { status: 404 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}


