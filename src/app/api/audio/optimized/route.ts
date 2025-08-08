import { NextRequest, NextResponse } from 'next/server';
import { optimizedDb } from '@/lib/OptimizedDatabase';
import { audioQueryOptimizer } from '@/lib/QueryOptimizationMiddleware';
import { z } from 'zod';

// Schema for validating query parameters
const audioQuerySchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['uploadDate', 'title', 'duration', 'averageRating']).default('uploadDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  useCache: z.coerce.boolean().default(true),
});

export async function GET(request: NextRequest) {
  const startTime = performance.now();
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const queryParams = Object.fromEntries(searchParams.entries());

    // Validate query parameters
    const validation = audioQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid query parameters', 
        details: validation.error.flatten() 
      }, { status: 400 });
    }

    const { category, search, sortBy, sortOrder, useCache } = validation.data;

    if (search) {
      // 使用优化的搜索功能
      const result = await audioQueryOptimizer.optimizeSearchQuery('audios', request, {
        enableCache: useCache,
        cacheTTL: 300000 // 5分钟缓存
      });
      
      return audioQueryOptimizer.wrapApiResponse(result);
    } else if (category) {
      // 按分类查询
      const baseQuery = `
        SELECT 
          a.*,
          AVG(r.rating) as averageRating,
          COUNT(r.id) as ratingCount,
          COUNT(c.id) as commentCount
        FROM audios a
        LEFT JOIN ratings r ON a.id = r.audioId
        LEFT JOIN comments c ON a.id = c.audioId
        WHERE a.subject = ?
        GROUP BY a.id
      `;

      const result = await audioQueryOptimizer.optimizePaginatedQuery(
        baseQuery, 
        [category], 
        request,
        {
          enableCache: useCache,
          cacheTTL: 600000 // 10分钟缓存
        }
      );
      
      return audioQueryOptimizer.wrapApiResponse(result);
    } else {
      // 获取所有音频
      const baseQuery = `
        SELECT 
          a.*,
          AVG(r.rating) as averageRating,
          COUNT(r.id) as ratingCount,
          COUNT(c.id) as commentCount
        FROM audios a
        LEFT JOIN ratings r ON a.id = r.audioId
        LEFT JOIN comments c ON a.id = c.audioId
        GROUP BY a.id
      `;

      const result = await audioQueryOptimizer.optimizePaginatedQuery(
        baseQuery, 
        [], 
        request,
        {
          enableCache: useCache,
          cacheTTL: 600000 // 10分钟缓存
        }
      );
      
      return audioQueryOptimizer.wrapApiResponse(result);
    }

  } catch (error) {
    return audioQueryOptimizer.handleError(error, startTime);
  }
}

// 获取热门音频
export async function POST(request: NextRequest) {
  const startTime = performance.now();
  
  try {
    const body = await request.json();
    const { limit = 10, useCache = true } = body;

    const popularAudios = await optimizedDb.getPopularAudios(limit);

    const endTime = performance.now();
    const executionTime = Math.round(endTime - startTime);

    return NextResponse.json({
      success: true,
      data: popularAudios,
      meta: {
        executionTime,
        cached: useCache,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const endTime = performance.now();
    const executionTime = Math.round(endTime - startTime);
    
    console.error('Popular audios API failed:', error);
    
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch popular audios',
      details: error instanceof Error ? error.message : 'Unknown error',
      meta: {
        executionTime,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}