import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

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

// GET: Fetch a single audio file by ID
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    console.log('🎵 Fetching audio with ID (fixed mode):', id);
    
    // Query with category joins using correct field names
    const query = `
      SELECT 
        a.id,
        a.title,
        a.description,
        a.url,
        a.filename,
        a.""uploadDate"",
        a.category_id,
        a.subcategory_id,
        a.tags,
        a.speaker,
        a.""recordingDate"",
        a.duration,
        a.""coverImage"",
        'published' as status,
        c1.name as category_name,
        c1.color as category_color,
        c1.icon as category_icon,
        c2.name as subcategory_name
      FROM audios a
      LEFT JOIN categories c1 ON a.category_id = c1.id
      LEFT JOIN categories c2 ON a.subcategory_id = c2.id
      WHERE a.id = $1
    `;

    const result = await db.query(query, [id]);
    const audio = result.rows[0];

    if (!audio) {
      console.log('Audio not found:', id);
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '音频不存在'
        }
      }, { status: 404 });
    }

    // 处理 tags 字段
    let normalizedTags: string[] = [];
    if (audio.tags && typeof audio.tags === 'string') {
      try {
        normalizedTags = JSON.parse(audio.tags);
        if (!Array.isArray(normalizedTags)) normalizedTags = [];
      } catch (e) {
        console.error(`Failed to parse tags for audio ${id}:`, audio.tags);
        normalizedTags = [];
      }
    } else if (Array.isArray(audio.tags)) {
      normalizedTags = audio.tags;
    }

    // 构建响应数据
    const responseData = {
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

    console.log('✅ Audio found (fixed mode):', audio.title);
    return NextResponse.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    return handleError(error, '获取音频详情失败');
  }
}