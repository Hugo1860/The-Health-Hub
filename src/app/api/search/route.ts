import { NextRequest, NextResponse } from 'next/server';
import { apiMiddleware } from '@/lib/api-middleware';
import { ApiErrors } from '@/lib/api-error-handler';
import SearchOptimizer from '@/lib/search-optimizer';

export const GET = apiMiddleware.public(async (req, context) => {
  try {
    const url = new URL(req.url);
    const searchParams = url.searchParams;

    // 解析搜索参数
    const options = {
      query: searchParams.get('q') || '',
      category: searchParams.get('category') || undefined,
      speaker: searchParams.get('speaker') || undefined,
      status: searchParams.get('status') || 'published',
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      sortBy: (searchParams.get('sortBy') as any) || 'relevance',
      sortOrder: (searchParams.get('sortOrder') as any) || 'desc',
      limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100), // 最大100条
      offset: Math.max(parseInt(searchParams.get('offset') || '0'), 0)
    };

    console.log('Search request:', options);

    const searchOptimizer = new SearchOptimizer();
    const results = await searchOptimizer.searchAudios(options);

    return NextResponse.json({
      success: true,
      data: results,
      meta: {
        requestId: context.requestId,
        timestamp: new Date().toISOString(),
        query: options.query,
        total: results.total,
        returned: results.items.length,
        hasMore: results.hasMore,
        searchTime: results.searchTime
      }
    });

  } catch (error) {
    console.error('Search API error:', error);
    throw ApiErrors.INTERNAL_SERVER_ERROR(
      'Search failed',
      { originalError: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
});