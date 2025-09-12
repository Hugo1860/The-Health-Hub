import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 测试会话验证')
    
    // 获取会话
    const session = await getServerSession(authOptions)
    console.log('📋 会话信息:', session)
    
    return NextResponse.json({
      success: true,
      data: {
        hasSession: !!session,
        user: session?.user || null,
        sessionData: session
      }
    })
    
  } catch (error) {
    console.error('❌ 会话测试失败:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}