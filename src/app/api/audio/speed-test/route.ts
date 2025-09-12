import { NextRequest, NextResponse } from 'next/server';

// 增强的速度测试端点
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sizeParam = searchParams.get('size');
    const size = sizeParam ? parseInt(sizeParam) : 1024;
    
    // 限制测试数据大小（防止滥用）
    const maxSize = 100 * 1024; // 100KB
    const testSize = Math.min(Math.max(size, 1024), maxSize);
    
    // 生成测试数据
    const testData = 'x'.repeat(testSize);
    
    return NextResponse.json({
      success: true,
      data: testData,
      timestamp: Date.now(),
      size: testSize,
      serverTime: performance.now()
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Speed test error:', error);
    return NextResponse.json(
      { error: 'Speed test failed' },
      { status: 500 }
    );
  }
}

// HEAD请求用于延迟测试
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Server-Time': performance.now().toString()
    }
  });
}