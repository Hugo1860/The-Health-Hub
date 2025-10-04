import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { z } from 'zod';
import { AudioListResponse } from '@/types/audio';
import logger from '@/lib/logger';

// Database row type for audios table
type AudioRow = {
  id: string;
  title: string;
  description?: string;
  url?: string;
  filename?: string;
  upload_date: string;
  category_id?: string;
  subcategory_id?: string;
  tags?: string[] | string | null;
  speaker?: string;
  recording_date?: string;
  duration?: number;
  cover_image?: string;
  status?: string;
  category_name?: string;
  subcategory_name?: string;
  category_color?: string;
  category_icon?: string;
};

// Schema for validating query parameters
const audioQuerySchema = z.object({
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  speaker: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['uploadDate', 'upload_date', 'title', 'duration']).default('uploadDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

function handleError(error: unknown, defaultMessage: string) {
  logger.error(defaultMessage, error);
  
  const errorMessage = error instanceof Error ? error.message : defaultMessage;
  
  return NextResponse.json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: errorMessage
    }
  }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    logger.info('🎵 Fixed Audio API called');
    
    const searchParams = request.nextUrl.searchParams;
    const queryParams = Object.fromEntries(searchParams.entries());

    // Validate query parameters
    const validation = audioQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      logger.warn('Validation failed:', validation.error);
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_PARAMS',
          message: '查询参数无效',
          details: validation.error.flatten()
        }
      }, { status: 400 });
    }

    const {
      categoryId,
      subcategoryId,
      search,
      status,
      speaker,
      page,
      limit,
      sortBy,
      sortOrder
    } = validation.data;
    
    const offset = (page - 1) * limit;

    // Build the query with category joins (optimized for home page)
    let baseQuery = `
      SELECT
        a.id,
        a.title,
        a.description,
        a.url,
        a.filename,
        a.upload_date,
        a.category_id,
        a.subcategory_id,
        a.tags,
        a.speaker,
        a.recording_date,
        a.duration,
        a.cover_image,
        'published' as status,
        c1.name as category_name,
        c1.color as category_color,
        c1.icon as category_icon,
        c2.name as subcategory_name
      FROM audios a
      LEFT JOIN categories c1 ON a.category_id = c1.id
      LEFT JOIN categories c2 ON a.subcategory_id = c2.id
    `;

    let countQuery = `
      SELECT COUNT(*) as total
      FROM audios a
      LEFT JOIN categories c1 ON a.category_id = c1.id
      LEFT JOIN categories c2 ON a.subcategory_id = c2.id
    `;
    
    const whereClauses = [];
    const params: (string | number)[] = [];
    const countParams: (string | number)[] = [];
    let paramIndex = 1;

    // 分类筛选
    if (categoryId) {
      whereClauses.push(`a.category_id = $${paramIndex++}`);
      params.push(categoryId);
      countParams.push(categoryId);
    }
    
    if (subcategoryId) {
      whereClauses.push(`a.subcategory_id = $${paramIndex++}`);
      params.push(subcategoryId);
      countParams.push(subcategoryId);
    }

    // 状态筛选 - 暂时跳过，因为表中没有status字段
    // if (status) {
    //   whereClauses.push(`a.status = $${paramIndex++}`);
    //   params.push(status);
    //   countParams.push(status);
    // }

    // 演讲者筛选
    if (speaker) {
      whereClauses.push(`a.speaker ILIKE $${paramIndex++}`);
      params.push(`%${speaker}%`);
      countParams.push(`%${speaker}%`);
    }

    // 搜索功能
    if (search) {
      whereClauses.push(`(
        a.title ILIKE $${paramIndex} OR 
        a.description ILIKE $${paramIndex + 1} OR 
        a.speaker ILIKE $${paramIndex + 2} OR
        c1.name ILIKE $${paramIndex + 3} OR
        c2.name ILIKE $${paramIndex + 4}
      )`);
      const searchTerm = `%${search}%`;
      for (let i = 0; i < 5; i++) {
        params.push(searchTerm);
        countParams.push(searchTerm);
      }
      paramIndex += 5;
    }
    
    // 构建完整查询
    if (whereClauses.length > 0) {
      const whereString = ` WHERE ${whereClauses.join(' AND ')}`;
      baseQuery += whereString;
      countQuery += whereString;
    }
    
    // 添加排序
    const sortColumn = (sortBy === 'upload_date' || sortBy === 'uploadDate') ? 'a.upload_date' : `a.${sortBy}`;
    baseQuery += ` ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}`;

    // 添加分页
    baseQuery += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    logger.debug('Executing fixed query:', baseQuery);
    logger.debug('Query params:', params);

    // 执行查询
    const [audiosResult, totalResult] = await Promise.all([
      db.query(baseQuery, params),
      db.query(countQuery, countParams)
    ]);
    
    const audios = audiosResult.rows as AudioRow[];
    const totalItems = parseInt(totalResult.rows[0]?.total) || 0;

    logger.info(`Found ${audios.length} audios, total: ${totalItems}`);

    // 处理音频数据
    const processedAudios = audios.map((audio) => {
      // 处理 tags 字段
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

      return {
        id: audio.id,
        title: audio.title,
        description: audio.description,
        url: audio.url,
        filename: audio.filename,
        uploadDate: audio.upload_date,
        categoryId: audio.category_id,
        subcategoryId: audio.subcategory_id,
        tags: normalizedTags,
        speaker: audio.speaker,
        recordingDate: audio.recording_date,
        duration: audio.duration,
        coverImage: audio.cover_image,
        status: audio.status,
        // 分类信息
        category: audio.category_name ? {
          id: audio.category_id,
          name: audio.category_name,
          color: audio.category_color,
          icon: audio.category_icon
        } : undefined,
        subcategory: audio.subcategory_name ? {
          id: audio.subcategory_id,
          name: audio.subcategory_name
        } : undefined
      };
    });

    const totalPages = Math.ceil(totalItems / limit);

    const response: AudioListResponse = {
      success: true,
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

    logger.debug('✅ Returning fixed response');
    return NextResponse.json(response);

  } catch (error) {
    return handleError(error, '获取音频列表失败');
  }
}