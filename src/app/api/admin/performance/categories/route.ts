/**
 * 分类性能监控 API
 * 
 * 提供分类查询性能统计和缓存管理功能
 */

import { NextRequest, NextResponse } from 'next/server';
import CategoryQueryOptimizer from '@/lib/categoryQueryOptimizer';
import CategoryCacheManager from '@/lib/categoryCacheManager';

/**
 * GET /api/admin/performance/categories - 获取性能统计
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'stats';

    switch (action) {
      case 'stats':
        // 获取性能统计
        const optimizerStats = CategoryQueryOptimizer.getPerformanceStats();
        const cacheManagerStats = CategoryCacheManager.getCacheStats();
        const cacheHealth = CategoryCacheManager.checkCacheHealth();

        return NextResponse.json({
          success: true,
          data: {
            optimizer: optimizerStats,
            cacheManager: cacheManagerStats,
            cacheHealth,
            timestamp: new Date().toISOString()
          }
        });

      case 'cache-info':
        // 获取缓存信息
        const cacheInfo = {
          optimizer: CategoryQueryOptimizer.getPerformanceStats().cache,
          cacheManager: CategoryCacheManager.getCacheStats(),
          health: CategoryCacheManager.checkCacheHealth()
        };

        return NextResponse.json({
          success: true,
          data: cacheInfo
        });

      default:
        return NextResponse.json({
          success: false,
          error: '不支持的操作'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('获取性能统计失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '获取性能统计失败'
    }, { status: 500 });
  }
}

/**
 * POST /api/admin/performance/categories - 执行性能操作
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, config } = body;

    switch (action) {
      case 'warmup-cache':
        // 预热缓存
        await CategoryQueryOptimizer.warmupCache();
        
        return NextResponse.json({
          success: true,
          message: '缓存预热完成'
        });

      case 'clear-cache':
        // 清除缓存
        const pattern = body.pattern;
        CategoryQueryOptimizer.clearCache(pattern);
        
        if (!pattern) {
          CategoryCacheManager.clearAllCache();
        }

        return NextResponse.json({
          success: true,
          message: pattern ? `清除匹配 "${pattern}" 的缓存` : '清除所有缓存'
        });

      case 'configure-cache':
        // 配置缓存
        if (config) {
          CategoryQueryOptimizer.configureCaching(config);
          
          return NextResponse.json({
            success: true,
            message: '缓存配置已更新'
          });
        } else {
          return NextResponse.json({
            success: false,
            error: '缺少配置参数'
          }, { status: 400 });
        }

      case 'benchmark':
        // 性能基准测试
        const benchmarkResults = await runPerformanceBenchmark();
        
        return NextResponse.json({
          success: true,
          data: benchmarkResults,
          message: '性能基准测试完成'
        });

      default:
        return NextResponse.json({
          success: false,
          error: '不支持的操作'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('执行性能操作失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '操作失败'
    }, { status: 500 });
  }
}

/**
 * 运行性能基准测试
 */
async function runPerformanceBenchmark() {
  const results = {
    categoryTree: { cold: 0, warm: 0 },
    categoriesList: { cold: 0, warm: 0 },
    categoryStats: { cold: 0, warm: 0 },
    search: { cold: 0, warm: 0 }
  };

  try {
    // 清除缓存以测试冷启动性能
    CategoryQueryOptimizer.clearCache();

    // 测试分类树查询（冷缓存）
    const treeStart = Date.now();
    await CategoryQueryOptimizer.getCategoryTreeOptimized(true);
    results.categoryTree.cold = Date.now() - treeStart;

    // 测试分类树查询（热缓存）
    const treeWarmStart = Date.now();
    await CategoryQueryOptimizer.getCategoryTreeOptimized(true);
    results.categoryTree.warm = Date.now() - treeWarmStart;

    // 测试分类列表查询（冷缓存）
    CategoryQueryOptimizer.clearCache('categories');
    const listStart = Date.now();
    await CategoryQueryOptimizer.getCategoriesOptimized({ includeCount: true });
    results.categoriesList.cold = Date.now() - listStart;

    // 测试分类列表查询（热缓存）
    const listWarmStart = Date.now();
    await CategoryQueryOptimizer.getCategoriesOptimized({ includeCount: true });
    results.categoriesList.warm = Date.now() - listWarmStart;

    // 测试统计查询（冷缓存）
    CategoryQueryOptimizer.clearCache('categoryStats');
    const statsStart = Date.now();
    await CategoryQueryOptimizer.getCategoryStatsOptimized();
    results.categoryStats.cold = Date.now() - statsStart;

    // 测试统计查询（热缓存）
    const statsWarmStart = Date.now();
    await CategoryQueryOptimizer.getCategoryStatsOptimized();
    results.categoryStats.warm = Date.now() - statsWarmStart;

    // 测试搜索查询（冷缓存）
    CategoryQueryOptimizer.clearCache('searchCategories');
    const searchStart = Date.now();
    await CategoryQueryOptimizer.searchCategoriesOptimized('心血管', { limit: 10 });
    results.search.cold = Date.now() - searchStart;

    // 测试搜索查询（热缓存）
    const searchWarmStart = Date.now();
    await CategoryQueryOptimizer.searchCategoriesOptimized('心血管', { limit: 10 });
    results.search.warm = Date.now() - searchWarmStart;

  } catch (error) {
    console.error('性能基准测试失败:', error);
  }

  return {
    results,
    summary: {
      averageColdTime: Object.values(results).reduce((sum, r) => sum + r.cold, 0) / Object.keys(results).length,
      averageWarmTime: Object.values(results).reduce((sum, r) => sum + r.warm, 0) / Object.keys(results).length,
      cacheEfficiency: Object.values(results).map(r => r.cold > 0 ? (r.cold - r.warm) / r.cold : 0),
      timestamp: new Date().toISOString()
    }
  };
}