import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { z } from 'zod';
import { AudioListResponse } from '@/types/audio';

// Database row type for audios table (cleaned - no compatibility fields)
type AudioRow = {
  id: string;
  title: string;
  description?: string;
  url?: string;
  filename?: string;
  "uploadDate": string;
  category_id?: string; // 一级分类ID
  subcategory_id?: string; // 二级分类ID
  tags?: string[] | string | null;
  speaker?: string;
  "recordingDate"?: string;
  duration?: number;
  "coverImage"?: string;
  status?: string;
  // 关联的分类信息
  category_name?: string;
  subcategory_name?: string;
  category_color?: string;
  category_icon?: string;
};

// Schema for validating query parameters (cleaned - no compatibility support)
const audioQuerySchema = z.object({
  // 分类筛选参数
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  categoryPath: z.string().optional(), // 格式: "categoryId/subcategoryId" 或 "categoryId"
  
  // 搜索和筛选
  search: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  speaker: z.string().optional(),
  hasTranscription: z.coerce.boolean().optional(),
  
  // 日期范围筛选
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  
  // 时长筛选
  minDuration: z.coerce.number().min(0).optional(),
  maxDuration: z.coerce.number().min(0).optional(),
  
  // 分页和排序
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['"uploadDate"', 'title', 'duration', 'rating', 'playCount']).default('"uploadDate"'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  
  // 其他选项
  includeStats: z.coerce.boolean().default(false)
});

// 辅助函数：处理错误响应
function handleError(error: unknown, defaultMessage: string) {
  console.error(defaultMessage, error);
  
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
    console.log('🎵 Clean Audio API called (compatibility mode removed)');
    
    const searchParams = request.nextUrl.searchParams;
    const queryParams = Object.fromEntries(searchParams.entries());

    // Validate query parameters
    const validation = audioQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      console.error('Validation failed:', validation.error);
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
      categoryPath,
      search,
      status,
      speaker,
      hasTranscription,
      dateFrom,
      dateTo,
      minDuration,
      maxDuration,
      page,
      limit,
      sortBy,
      sortOrder,
      includeStats
    } = validation.data;
    
    const offset = (page - 1) * limit;

    // 处理分类路径参数
    let resolvedCategoryId = categoryId;
    let resolvedSubcategoryId = subcategoryId;
    
    if (categoryPath) {
      const pathParts = categoryPath.split('/');
      resolvedCategoryId = pathParts[0];
      resolvedSubcategoryId = pathParts[1] || undefined;
    }

    // Build the query with category joins
    let baseQuery = `
      SELECT 
        a.id,
        a.title,
        a.description,
        a.url,
        a.filename,
        a."uploadDate",
        a.category_id,
        a.subcategory_id,
        a.tags,
        a.speaker,
        a."recordingDate",
        a.duration,
        a."coverImage",
        a.status,
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

    // 分类筛选（仅支持新的层级字段）
    if (resolvedCategoryId) {
      whereClauses.push(`a.category_id = $${paramIndex++}`);
      params.push(resolvedCategoryId);
      countParams.push(resolvedCategoryId);
    }
    
    if (resolvedSubcategoryId) {
      whereClauses.push(`a.subcategory_id = $${paramIndex++}`);
      params.push(resolvedSubcategoryId);
      countParams.push(resolvedSubcategoryId);
    }

    // 状态筛选
    if (status) {
      whereClauses.push(`a.status = $${paramIndex++}`);
      params.push(status);
      countParams.push(status);
    } else {
      // 默认只显示已发布的音频
      whereClauses.push(`a.status = $${paramIndex++}`);
      params.push('published');
      countParams.push('published');
    }

    // 演讲者筛选
    if (speaker) {
      whereClauses.push(`a.speaker ILIKE $${paramIndex++}`);
      params.push(`%${speaker}%`);
      countParams.push(`%${speaker}%`);
    }

    // 搜索功能（增强版，包含分类名称）
    if (search) {
      whereClauses.push(`(
        a.title ILIKE $${paramIndex} OR 
        a.description ILIKE $${paramIndex + 1} OR 
        a.tags::text ILIKE $${paramIndex + 2} OR
        a.speaker ILIKE $${paramIndex + 3} OR
        c1.name ILIKE $${paramIndex + 4} OR
        c2.name ILIKE $${paramIndex + 5}
      )`);
      const searchTerm = `%${search}%`;
      for (let i = 0; i < 6; i++) {
        params.push(searchTerm);
        countParams.push(searchTerm);
      }
      paramIndex += 6;
    }

    // 转录筛选
    if (hasTranscription !== undefined) {
      if (hasTranscription) {
        whereClauses.push(`EXISTS (SELECT 1 FROM transcriptions t WHERE t.audio_id = a.id AND t.status = 'completed')`);
      } else {
        whereClauses.push(`NOT EXISTS (SELECT 1 FROM transcriptions t WHERE t.audio_id = a.id AND t.status = 'completed')`);
      }
    }

    // 日期范围筛选
    if (dateFrom) {
      whereClauses.push(`a."uploadDate" >= $${paramIndex++}`);
      params.push(dateFrom);
      countParams.push(dateFrom);
    }
    
    if (dateTo) {
      whereClauses.push(`a."uploadDate" <= $${paramIndex++}`);
      params.push(dateTo);
      countParams.push(dateTo);
    }

    // 时长筛选
    if (minDuration !== undefined) {
      whereClauses.push(`a.duration >= $${paramIndex++}`);
      params.push(minDuration);
      countParams.push(minDuration);
    }
    
    if (maxDuration !== undefined) {
      whereClauses.push(`a.duration <= $${paramIndex++}`);
      params.push(maxDuration);
      countParams.push(maxDuration);
    }
    
    // 构建完整查询
    if (whereClauses.length > 0) {
      const whereString = ` WHERE ${whereClauses.join(' AND ')}`;
      baseQuery += whereString;
      countQuery += whereString;
    }
    
    // 添加排序
    const sortColumn = sortBy === '"uploadDate"' ? 'a."uploadDate"' : `a.${sortBy}`;
    baseQuery += ` ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}`;

    // 添加分页
    baseQuery += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    console.log('Executing clean query:', baseQuery);
    console.log('Query params:', params);

    // 执行查询
    const [audiosResult, totalResult] = await Promise.all([
      db.query(baseQuery, params),
      db.query(countQuery, countParams)
    ]);
    
    const audios = audiosResult.rows as AudioRow[];
    const totalItems = parseInt(totalResult.rows[0]?.total) || 0;

    console.log(`Found ${audios.length} audios, total: ${totalItems}`);

    // 处理音频数据（移除 subject 字段）
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
        filename: audio.filename, uploadDate: audio.uploadDate,
        categoryId: audio.category_id,
        subcategoryId: audio.subcategory_id,
        tags: normalizedTags,
        speaker: audio.speaker, recordingDate: audio.recordingDate,
        duration: audio.duration, coverImage: audio.coverImage,
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

    console.log('✅ Returning clean response (no compatibility mode)');
    return NextResponse.json(response);

  } catch (error) {
    return handleError(error, '获取音频列表失败');
  }
}