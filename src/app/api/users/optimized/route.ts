import { NextRequest, NextResponse } from 'next/server';
import { optimizedDb } from '@/lib/OptimizedDatabase';
import { userQueryOptimizer } from '@/lib/QueryOptimizationMiddleware';
import { userQueryCache } from '@/lib/QueryCache';
import { z } from 'zod';

// Schema for validating query parameters
const userQuerySchema = z.object({
  search: z.string().optional(),
  role: z.enum(['admin', 'user']).optional(),
  status: z.enum(['active', 'inactive', 'banned']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'lastLogin', 'username', 'email']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  useCache: z.coerce.boolean().default(true),
});

export async function GET(request: NextRequest) {
  const startTime = performance.now();
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const queryParams = Object.fromEntries(searchParams.entries());

    // Validate query parameters
    const validation = userQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid query parameters', 
        details: validation.error.flatten() 
      }, { status: 400 });
    }

    const { search, role, status, useCache } = validation.data;

    if (search) {
      // 使用优化的搜索功能
      const result = await userQueryOptimizer.optimizeSearchQuery('users', request, {
        enableCache: useCache,
        cacheTTL: 180000 // 3分钟缓存
      });
      
      return userQueryOptimizer.wrapApiResponse(result);
    } else {
      // 构建查询条件
      let baseQuery = `
        SELECT 
          id, username, email, role, status, createdAt, lastLogin,
          (SELECT COUNT(*) FROM comments WHERE userId = users.id) as commentCount,
          (SELECT COUNT(*) FROM ratings WHERE userId = users.id) as ratingCount
        FROM users
      `;
      
      const whereClauses = [];
      const params = [];

      if (role) {
        whereClauses.push('role = ?');
        params.push(role);
      }

      if (status) {
        whereClauses.push('status = ?');
        params.push(status);
      }

      if (whereClauses.length > 0) {
        baseQuery += ` WHERE ${whereClauses.join(' AND ')}`;
      }

      const result = await userQueryOptimizer.optimizePaginatedQuery(
        baseQuery, 
        params, 
        request,
        {
          enableCache: useCache,
          cacheTTL: 180000 // 3分钟缓存
        }
      );
      
      return userQueryOptimizer.wrapApiResponse(result);
    }

  } catch (error) {
    return userQueryOptimizer.handleError(error, startTime);
  }
}

// 获取用户统计信息
export async function POST(request: NextRequest) {
  const startTime = performance.now();
  
  try {
    const body = await request.json();
    const { useCache = true } = body;

    const cacheKey = 'user_statistics';
    const cacheTTL = 300000; // 5分钟缓存

    const stats = await userQueryCache.cached(
      cacheKey,
      async () => {
        // 获取用户统计信息
        const totalUsers = await optimizedDb.queryOne<{ count: number }>(
          'SELECT COUNT(*) as count FROM users',
          [],
          { useCache: false }
        );

        const activeUsers = await optimizedDb.queryOne<{ count: number }>(
          'SELECT COUNT(*) as count FROM users WHERE status = ?',
          ['active'],
          { useCache: false }
        );

        const adminUsers = await optimizedDb.queryOne<{ count: number }>(
          'SELECT COUNT(*) as count FROM users WHERE role = ?',
          ['admin'],
          { useCache: false }
        );

        const recentUsers = await optimizedDb.query<any>(
          'SELECT COUNT(*) as count FROM users WHERE createdAt > datetime("now", "-7 days")',
          [],
          { useCache: false }
        );

        const topCommenters = await optimizedDb.query<any>(
          `SELECT 
            u.id, u.username, u.email,
            COUNT(c.id) as commentCount
          FROM users u
          LEFT JOIN comments c ON u.id = c.userId
          GROUP BY u.id
          ORDER BY commentCount DESC
          LIMIT 10`,
          [],
          { useCache: false }
        );

        return {
          totalUsers: totalUsers?.count || 0,
          activeUsers: activeUsers?.count || 0,
          adminUsers: adminUsers?.count || 0,
          recentUsers: recentUsers[0]?.count || 0,
          topCommenters
        };
      },
      useCache ? cacheTTL : undefined
    );

    const endTime = performance.now();
    const executionTime = Math.round(endTime - startTime);

    return NextResponse.json({
      success: true,
      data: stats,
      meta: {
        executionTime,
        cached: useCache,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const endTime = performance.now();
    const executionTime = Math.round(endTime - startTime);
    
    console.error('User statistics API failed:', error);
    
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch user statistics',
      details: error instanceof Error ? error.message : 'Unknown error',
      meta: {
        executionTime,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}