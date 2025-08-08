import { NextResponse } from 'next/server';
import { optimizedDb } from '@/lib/OptimizedDatabase';

export async function GET() {
  try {
    // 获取数据库统计信息
    const stats = await optimizedDb.getStats();
    
    // 获取健康状态
    const health = optimizedDb.getHealthStatus();
    
    // 执行一些性能测试查询
    const performanceTests = await runPerformanceTests();
    
    return NextResponse.json({
      success: true,
      data: {
        stats,
        health,
        performanceTests,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Failed to get database stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve database statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function runPerformanceTests() {
  const tests = [];
  
  try {
    // 测试1: 音频列表查询
    const start1 = performance.now();
    await optimizedDb.getAudios({ page: 1, limit: 10 });
    const end1 = performance.now();
    tests.push({
      name: 'Audio List Query',
      executionTime: Math.round(end1 - start1),
      status: 'success'
    });

    // 测试2: 音频搜索查询
    const start2 = performance.now();
    await optimizedDb.searchAudios('医学', { page: 1, limit: 10 });
    const end2 = performance.now();
    tests.push({
      name: 'Audio Search Query',
      executionTime: Math.round(end2 - start2),
      status: 'success'
    });

    // 测试3: 用户列表查询
    const start3 = performance.now();
    await optimizedDb.getUsers({ page: 1, limit: 10 });
    const end3 = performance.now();
    tests.push({
      name: 'User List Query',
      executionTime: Math.round(end3 - start3),
      status: 'success'
    });

    // 测试4: 热门音频查询
    const start4 = performance.now();
    await optimizedDb.getPopularAudios(5);
    const end4 = performance.now();
    tests.push({
      name: 'Popular Audios Query',
      executionTime: Math.round(end4 - start4),
      status: 'success'
    });

  } catch (error) {
    tests.push({
      name: 'Performance Test',
      executionTime: 0,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  return tests;
}