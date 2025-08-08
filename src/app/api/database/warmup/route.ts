import { NextResponse } from 'next/server';
import { optimizedDb } from '@/lib/OptimizedDatabase';

export async function POST() {
  try {
    console.log('Starting cache warmup...');
    const startTime = performance.now();
    
    // 预热缓存
    await optimizedDb.warmupCache();
    
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    
    console.log(`Cache warmup completed in ${duration}ms`);
    
    return NextResponse.json({
      success: true,
      message: 'Cache warmed up successfully',
      duration,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cache warmup failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Cache warmup failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // 获取缓存统计信息
    const stats = await optimizedDb.getStats();
    
    return NextResponse.json({
      success: true,
      data: {
        queryCache: stats.queryCache,
        audioCache: stats.audioCache,
        userCache: stats.userCache,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve cache statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}