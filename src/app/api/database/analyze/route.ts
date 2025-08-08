import { NextRequest, NextResponse } from 'next/server';
import { queryAnalyzer } from '@/lib/QueryAnalyzer';
import { z } from 'zod';

// 验证请求体的schema
const analyzeRequestSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  params: z.array(z.any()).optional().default([]),
  iterations: z.number().int().min(1).max(10).optional().default(3),
  useCache: z.boolean().optional().default(true)
});

export async function POST(request: NextRequest) {
  const startTime = performance.now();
  
  try {
    const body = await request.json();
    
    // 验证请求参数
    const validation = analyzeRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request parameters',
        details: validation.error.flatten()
      }, { status: 400 });
    }

    const { query, params, iterations, useCache } = validation.data;

    // 安全检查：只允许 SELECT 查询
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery.startsWith('select')) {
      return NextResponse.json({
        success: false,
        error: 'Only SELECT queries are allowed for analysis'
      }, { status: 400 });
    }

    // 执行查询分析
    const analysis = await queryAnalyzer.analyzeQuery(query, params, {
      useCache,
      iterations
    });

    // 生成优化建议
    const optimizationSuggestions = queryAnalyzer.generateOptimizationSuggestions(analysis);

    const endTime = performance.now();
    const totalTime = Math.round(endTime - startTime);

    return NextResponse.json({
      success: true,
      data: {
        analysis,
        optimizationSuggestions,
        cacheStats: queryAnalyzer.getCacheStats()
      },
      meta: {
        analysisTime: totalTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const endTime = performance.now();
    const totalTime = Math.round(endTime - startTime);
    
    console.error('Query analysis failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Query analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      meta: {
        analysisTime: totalTime,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

// 获取预定义的查询分析示例
export async function GET() {
  try {
    const examples = [
      {
        name: 'Audio Search Query',
        description: 'Search for audio content with text matching',
        query: `
          SELECT a.*, AVG(r.rating) as averageRating, COUNT(r.id) as ratingCount
          FROM audios a
          LEFT JOIN ratings r ON a.id = r.audioId
          WHERE a.title LIKE ? OR a.description LIKE ? OR a.subject LIKE ?
          GROUP BY a.id
          ORDER BY a.uploadDate DESC
          LIMIT 10
        `,
        params: ['%医学%', '%医学%', '%医学%']
      },
      {
        name: 'User Activity Summary',
        description: 'Get users with their activity statistics',
        query: `
          SELECT 
            u.id, u.username, u.email, u.role, u.status,
            COUNT(DISTINCT c.id) as commentCount,
            COUNT(DISTINCT r.id) as ratingCount,
            AVG(r.rating) as averageRating
          FROM users u
          LEFT JOIN comments c ON u.id = c.userId
          LEFT JOIN ratings r ON u.id = r.userId
          GROUP BY u.id
          ORDER BY commentCount DESC, ratingCount DESC
          LIMIT 20
        `,
        params: []
      },
      {
        name: 'Popular Audio Content',
        description: 'Find most popular audio content based on ratings and comments',
        query: `
          SELECT 
            a.*,
            AVG(r.rating) as averageRating,
            COUNT(DISTINCT r.id) as ratingCount,
            COUNT(DISTINCT c.id) as commentCount,
            (AVG(r.rating) * COUNT(DISTINCT r.id) + COUNT(DISTINCT c.id)) as popularityScore
          FROM audios a
          LEFT JOIN ratings r ON a.id = r.audioId
          LEFT JOIN comments c ON a.id = c.audioId
          GROUP BY a.id
          HAVING ratingCount > 0 OR commentCount > 0
          ORDER BY popularityScore DESC, a.uploadDate DESC
          LIMIT 10
        `,
        params: []
      },
      {
        name: 'Recent User Activity',
        description: 'Get recent user activities across the platform',
        query: `
          SELECT 
            'comment' as activity_type,
            c.userId,
            u.username,
            c.audioId,
            a.title as audio_title,
            c.createdAt
          FROM comments c
          JOIN users u ON c.userId = u.id
          JOIN audios a ON c.audioId = a.id
          WHERE c.createdAt > datetime('now', '-7 days')
          
          UNION ALL
          
          SELECT 
            'rating' as activity_type,
            r.userId,
            u.username,
            r.audioId,
            a.title as audio_title,
            r.createdAt
          FROM ratings r
          JOIN users u ON r.userId = u.id
          JOIN audios a ON r.audioId = a.id
          WHERE r.createdAt > datetime('now', '-7 days')
          
          ORDER BY createdAt DESC
          LIMIT 50
        `,
        params: []
      }
    ];

    return NextResponse.json({
      success: true,
      data: {
        examples,
        instructions: {
          usage: 'POST to this endpoint with query and optional params',
          limitations: 'Only SELECT queries are allowed',
          parameters: {
            query: 'SQL SELECT query to analyze (required)',
            params: 'Array of parameters for the query (optional)',
            iterations: 'Number of test iterations (1-10, default: 3)',
            useCache: 'Whether to use analysis cache (default: true)'
          }
        }
      }
    });

  } catch (error) {
    console.error('Failed to get query analysis examples:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve examples'
    }, { status: 500 });
  }
}

// 清理分析缓存
export async function DELETE() {
  try {
    queryAnalyzer.clearCache();
    
    return NextResponse.json({
      success: true,
      message: 'Query analysis cache cleared',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to clear analysis cache:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to clear cache'
    }, { status: 500 });
  }
}