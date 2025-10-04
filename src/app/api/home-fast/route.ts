import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { z } from 'zod';

// 极简的音频数据类型，用于首页快速加载
type HomeAudioItem = {
  id: string;
  title: string;
  description?: string;
  url?: string;
  filename?: string;
  uploadDate: string;
  categoryId?: string;
  subcategoryId?: string;
  speaker?: string;
  duration?: number;
  coverImage?: string;
  status: string;
  category?: {
    id?: string;
    name: string;
    color?: string;
    icon?: string;
  };
  subcategory?: {
    id?: string;
    name: string;
  };
};

// Schema for validating query parameters
const homeQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(8),
  sortBy: z.enum(['uploadDate', 'title', 'duration']).default('uploadDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  includeCategories: z.coerce.boolean().default(true)
});

export async function GET(request: NextRequest) {
  try {
    console.log('🏠 Home Fast API called');

    const searchParams = request.nextUrl.searchParams;
    const queryParams = Object.fromEntries(searchParams.entries());

    // Validate query parameters
    const validation = homeQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_PARAMS',
          message: '查询参数无效',
          details: validation.error.flatten()
        }
      }, { status: 400 });
    }

    const { limit, sortBy, sortOrder, includeCategories } = validation.data;

    // 极简查询 - 只获取首页需要的基本字段
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
        a.speaker,
        a.duration,
        a.cover_image,
        'published' as status
    `;

    const params: (string | number)[] = [];

    // 条件性地添加分类联表，只在需要时联表
    if (includeCategories) {
      baseQuery += `,
        c1.name as category_name,
        c1.color as category_color,
        c1.icon as category_icon,
        c2.name as subcategory_name
      FROM audios a
      LEFT JOIN categories c1 ON a.category_id = c1.id
      LEFT JOIN categories c2 ON a.subcategory_id = c2.id`;
    } else {
      baseQuery += ` FROM audios a`;
    }

    // 添加排序
    baseQuery += ` ORDER BY a.${sortBy === 'uploadDate' ? 'upload_date' : sortBy} ${sortOrder.toUpperCase()}`;

    // 添加限制
    baseQuery += ` LIMIT ?`;
    params.push(limit);

    console.log('⚡ Executing optimized home query:', baseQuery);
    console.log('⚡ Query params:', params);

    // 使用统一的数据库接口
    const db = getDatabase();
    const result = await db.query(baseQuery, params);
    const audios = result.rows as any[];
    
    console.log('⚡ Query result:', audios.length, 'rows');

    console.log(`✅ Found ${audios.length} audios for home page`);

    // 极简的数据处理
    const processedAudios: HomeAudioItem[] = audios.map((audio) => {
      // 快速处理 tags 字段
      let tags: string[] = [];
      if (typeof audio.tags === 'string' && audio.tags) {
        try {
          tags = JSON.parse(audio.tags);
          if (!Array.isArray(tags)) tags = [];
        } catch {
          tags = [];
        }
      } else if (Array.isArray(audio.tags)) {
        tags = audio.tags;
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
        tags,
        speaker: audio.speaker,
        duration: audio.duration,
        coverImage: audio.cover_image,
        status: audio.status,
        // 分类信息
        ...(includeCategories && {
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
        })
      };
    });

    const response = {
      success: true,
      data: processedAudios,
      meta: {
        totalItems: processedAudios.length,
        fetchedAt: new Date().toISOString()
      }
    };

    console.log('🚀 Returning optimized home response');
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Home Fast API error:', error);
    const errorMessage = error instanceof Error ? error.message : '获取首页数据失败';
    const errorStack = error instanceof Error ? error.stack : String(error);
    
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack
    });
    
    return NextResponse.json({
      success: false,
      error: {
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorStack : undefined
      }
    }, { status: 500 });
  }
}
