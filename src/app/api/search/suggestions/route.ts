import { NextRequest, NextResponse } from 'next/server';
import { apiMiddleware } from '@/lib/api-middleware';
import { ApiErrors } from '@/lib/api-error-handler';
import SearchOptimizer from '@/lib/search-optimizer';

export const GET = apiMiddleware.public(async (req, context) => {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('q') || '';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '5'), 10);

    if (!query.trim() || query.length < 2) {
      return NextResponse.json({
        success: true,
        data: {
          titles: [],
          speakers: [],
          categories: []
        },
        meta: {
          requestId: context.requestId,
          timestamp: new Date().toISOString(),
          query: query
        }
      });
    }

    const searchOptimizer = new SearchOptimizer();
    const suggestions = await searchOptimizer.getSearchSuggestions(query, limit);

    return NextResponse.json({
      success: true,
      data: suggestions,
      meta: {
        requestId: context.requestId,
        timestamp: new Date().toISOString(),
        query: query,
        limit: limit
      }
    });

  } catch (error) {
    console.error('Search suggestions API error:', error);
    throw ApiErrors.INTERNAL_SERVER_ERROR(
      'Search suggestions failed',
      { originalError: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
});