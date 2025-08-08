// Logo 图片检查 API

import { NextRequest, NextResponse } from 'next/server'
import { existsSync } from 'fs'
import { join } from 'path'

export async function GET(request: NextRequest) {
  try {
    const logoPath = join(process.cwd(), 'public', 'uploads', 'logo.jpg')
    const logoExists = existsSync(logoPath)
    
    return NextResponse.json({
      success: true,
      data: {
        logoExists,
        logoPath: '/uploads/logo.jpg',
        message: logoExists ? 'Logo文件存在' : 'Logo文件不存在'
      }
    })
  } catch (error) {
    console.error('检查logo文件失败:', error)
    return NextResponse.json({
      success: false,
      error: {
        message: '检查logo文件失败',
        details: error instanceof Error ? error.message : '未知错误'
      }
    }, { status: 500 })
  }
}