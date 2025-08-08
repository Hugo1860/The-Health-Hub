import { NextRequest, NextResponse } from 'next/server';
import { intelligentPreloader } from '@/lib/IntelligentPreloader';
import { networkMonitor } from '@/lib/NetworkMonitor';
import { userBehaviorAnalyzer } from '@/lib/UserBehaviorAnalyzer';
import { z } from 'zod';

// 预加载请求验证schema
const preloadRequestSchema = z.object({
  currentAudioId: z.string().min(1, 'Current audio ID is required'),
  userId: z.string().optional(),
  playHistory: z.array(z.string()).optional().default([]),
  currentPlaylist: z.array(z.object({
    id: z.string(),
    title: z.string().optional(),
    subject: z.string().optional(),
    tags: z.string().optional()
  })).optional().default([]),
  userPreferences: z.object({
    preferredGenres: z.array(z.string()).optional(),
    preferredDuration: z.object({
      min: z.number(),
      max: z.number()
    }).optional()
  }).optional().default({}),
  deviceType: z.enum(['desktop', 'mobile', 'tablet']).optional().default('desktop'),
  batteryLevel: z.number().min(0).max(100).optional()
});

// 用户行为记录schema
const behaviorSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  sessionId: z.string().min(1, 'Session ID is required'),
  action: z.enum(['play', 'pause', 'skip', 'seek', 'complete', 'like', 'share']),
  audioId: z.string().min(1, 'Audio ID is required'),
  position: z.number().optional(),
  duration: z.number().optional(),
  context: z.object({
    source: z.enum(['playlist', 'search', 'recommendation', 'direct']).optional(),
    previousAudioId: z.string().optional(),
    playlistId: z.string().optional(),
    searchQuery: z.string().optional()
  }).optional()
});

// 智能预加载
export async function POST(request: NextRequest) {
  const startTime = performance.now();
  
  try {
    const body = await request.json();
    
    // 验证请求参数
    const validation = preloadRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request parameters',
        details: validation.error.flatten()
      }, { status: 400 });
    }

    const {
      currentAudioId,
      userId,
      playHistory,
      currentPlaylist,
      userPreferences,
      deviceType,
      batteryLevel
    } = validation.data;

    // 检查网络状况
    const networkMetrics = networkMonitor.getCurrentMetrics();
    if (!networkMonitor.isSuitableForPreloading()) {
      return NextResponse.json({
        success: false,
        message: 'Network conditions not suitable for preloading',
        networkMetrics,
        meta: {
          executionTime: Math.round(performance.now() - startTime),
          timestamp: new Date().toISOString()
        }
      });
    }

    // 确定时间段
    const currentHour = new Date().getHours();
    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    if (currentHour >= 6 && currentHour < 12) {
      timeOfDay = 'morning';
    } else if (currentHour >= 12 && currentHour < 18) {
      timeOfDay = 'afternoon';
    } else if (currentHour >= 18 && currentHour < 22) {
      timeOfDay = 'evening';
    } else {
      timeOfDay = 'night';
    }

    // 构建预加载上下文
    const preloadContext = {
      currentAudioId,
      userId,
      playHistory,
      currentPlaylist,
      userPreferences,
      networkQuality: networkMetrics.quality as 'high' | 'medium' | 'low',
      deviceType,
      timeOfDay,
      batteryLevel
    };

    // 执行智能预加载
    await intelligentPreloader.preloadIntelligently(preloadContext);

    // 获取预加载统计
    const preloadStats = intelligentPreloader.getPreloadStats();

    const endTime = performance.now();
    const executionTime = Math.round(endTime - startTime);

    return NextResponse.json({
      success: true,
      message: 'Intelligent preloading completed',
      data: {
        preloadStats,
        networkMetrics,
        context: {
          timeOfDay,
          deviceType,
          networkQuality: networkMetrics.quality
        }
      },
      meta: {
        executionTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const endTime = performance.now();
    const executionTime = Math.round(endTime - startTime);
    
    console.error('Intelligent preloading failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Preloading failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      meta: {
        executionTime,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

// 记录用户行为
export async function PUT(request: NextRequest) {
  const startTime = performance.now();
  
  try {
    const body = await request.json();
    
    // 验证请求参数
    const validation = behaviorSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid behavior data',
        details: validation.error.flatten()
      }, { status: 400 });
    }

    const behaviorData = validation.data;
    
    // 记录用户行为
    const behavior = {
      ...behaviorData,
      timestamp: Date.now()
    };
    
    userBehaviorAnalyzer.recordBehavior(behavior);

    // 如果是访问预加载的音频，记录命中
    if (behavior.action === 'play') {
      intelligentPreloader.recordAccess(behavior.audioId);
    }

    const endTime = performance.now();
    const executionTime = Math.round(endTime - startTime);

    return NextResponse.json({
      success: true,
      message: 'User behavior recorded',
      meta: {
        executionTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const endTime = performance.now();
    const executionTime = Math.round(endTime - startTime);
    
    console.error('Failed to record user behavior:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to record behavior',
      details: error instanceof Error ? error.message : 'Unknown error',
      meta: {
        executionTime,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

// 获取预加载统计和网络状况
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const includeNetworkTest = searchParams.get('networkTest') === 'true';

    // 获取预加载统计
    const preloadStats = intelligentPreloader.getPreloadStats();
    
    // 获取网络指标
    let networkMetrics = networkMonitor.getCurrentMetrics();
    
    // 如果请求网络测试，执行实时测试
    if (includeNetworkTest) {
      networkMetrics = await networkMonitor.performNetworkTest();
    }

    // 获取网络推荐策略
    const recommendedStrategy = networkMonitor.getRecommendedPreloadStrategy();

    // 获取用户行为分析（如果提供了userId）
    let userAnalytics = null;
    if (userId) {
      const listeningPattern = userBehaviorAnalyzer.getListeningPattern(userId);
      const recentBehaviors = userBehaviorAnalyzer.getBehaviorHistory(userId, 50);
      
      userAnalytics = {
        listeningPattern,
        recentBehaviorCount: recentBehaviors.length,
        lastActivity: recentBehaviors.length > 0 
          ? new Date(Math.max(...recentBehaviors.map(b => b.timestamp))).toISOString()
          : null
      };
    }

    // 获取系统分析统计
    const systemStats = userBehaviorAnalyzer.getAnalyticsStats();

    return NextResponse.json({
      success: true,
      data: {
        preloadStats,
        networkMetrics,
        recommendedStrategy,
        userAnalytics,
        systemStats,
        recommendations: {
          preloadingEnabled: networkMonitor.isSuitableForPreloading(),
          maxConcurrentPreloads: recommendedStrategy.maxConcurrent,
          recommendedChunkSize: recommendedStrategy.chunkSize,
          networkQuality: networkMetrics.quality
        }
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Failed to get preload status:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get preload status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// 清理预加载缓存
export async function DELETE() {
  try {
    // 清理预加载缓存
    intelligentPreloader.clearAll();
    
    // 清理过期的用户行为数据
    userBehaviorAnalyzer.cleanupExpiredData();

    return NextResponse.json({
      success: true,
      message: 'Preload cache and expired data cleared',
      meta: {
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Failed to clear preload cache:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to clear cache',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}