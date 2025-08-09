import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Database row type for audios table
type AudioRow = {
  id: string;
  title: string;
  description?: string;
  url?: string;
  filename?: string;
  uploadDate: string;
  subject?: string;
  tags?: string[] | string | null;
  speaker?: string;
  recordingDate?: string;
  duration?: number;
  coverImage?: string;
  averageRating?: number;
  ratingCount?: number;
  commentCount?: number;
};

// Schema for validating query parameters
const audioQuerySchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['uploadDate', 'title', 'duration']).default('uploadDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export async function GET(request: NextRequest) {
  try {
    console.log('Audio API called');
    
    // 这是一个公共API，游客可以访问音频列表
    // 不需要权限检查，所有用户都可以查看音频内容
    
    const searchParams = request.nextUrl.searchParams;
    const queryParams = Object.fromEntries(searchParams.entries());

    // Validate query parameters
    const validation = audioQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      console.error('Validation failed:', validation.error);
      return NextResponse.json({ error: 'Invalid query parameters', details: validation.error.flatten() }, { status: 400 });
    }

    const { category, search, page, limit, sortBy, sortOrder } = validation.data;
    const offset = (page - 1) * limit;

    // Build the query dynamically
    let baseQuery = 'SELECT * FROM audios';
    let countQuery = 'SELECT COUNT(*) as total FROM audios';
    const whereClauses = [];
    const params: (string | number)[] = [];
    const countParams: (string | number)[] = [];

    if (category) {
      whereClauses.push('subject = ?');
      params.push(category);
      countParams.push(category);
    }

    if (search) {
      whereClauses.push('(title LIKE ? OR description LIKE ? OR tags LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (whereClauses.length > 0) {
      const whereString = ` WHERE ${whereClauses.join(' AND ')}`;
      baseQuery += whereString;
      countQuery += whereString;
    }
    
    // Add sorting
    baseQuery += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;

    // Add pagination
    baseQuery += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    console.log('Executing query:', baseQuery, 'with params:', params);

    // Execute queries
    const getAudiosStmt = db.prepare(baseQuery);
    const getTotalStmt = db.prepare(countQuery);

    const audios = getAudiosStmt.all(params) as AudioRow[];
    const { total: totalItems } = getTotalStmt.get(countParams) as { total: number };

    console.log(`Found ${audios.length} audios, total: ${totalItems}`);

    // 处理 tags 字段 - 确保它是数组格式，并避免在非对象上展开
    const processedAudios = audios.map((audio) => {
      let normalizedTags: string[] = [];
      if (Array.isArray(audio.tags)) {
        normalizedTags = audio.tags as string[];
      } else if (typeof audio.tags === 'string') {
        try {
          normalizedTags = JSON.parse(audio.tags || '[]');
          if (!Array.isArray(normalizedTags)) normalizedTags = [];
        } catch {
          normalizedTags = [];
        }
      }

      const { tags: _ignored, ...rest } = audio as Record<string, unknown>;
      return { ...(rest as object), tags: normalizedTags } as Record<string, unknown> & { tags: string[] };
    });

    const totalPages = Math.ceil(totalItems / limit);

    const response = {
      data: processedAudios,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    };

    console.log('Returning response:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Failed to fetch audios:', error);
    
    // 更详细的错误处理
    if (error && typeof error === 'object' && 'code' in error) {
      // 提取更安全的错误消息
      const errorMessage = error instanceof Error
        ? error.message
        : typeof (error as any)?.message === 'string'
          ? (error as any).message
          : 'Database query failed';

      if ((error as any).code === 'SQLITE_ERROR') {
        return NextResponse.json({ 
          error: { 
            code: 'DATABASE_ERROR',
            message: 'Database query failed',
            details: errorMessage
          } 
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({ 
      error: { 
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error'
      } 
    }, { status: 500 });
  }
}
