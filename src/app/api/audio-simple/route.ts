import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('🎵 Simple Audio API called');
    
    // 简单查询，不使用复杂的JOIN
    const query = `
      SELECT 
        id,
        title,
        description,
        url,
        filename,
        "uploadDate",
        category_id,
        subcategory_id,
        tags,
        speaker,
        "recordingDate",
        duration,
        "coverImage",
        status
      FROM audios 
      WHERE status = 'published'
      ORDER BY "uploadDate" DESC 
      LIMIT 10
    `;
    
    console.log('Executing simple query:', query);
    
    const result = await db.query(query);
    console.log('Query result:', result.rows.length, 'rows');
    
    const audios = result.rows.map((audio: any) => {
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
        status: audio.status
      };
    });

    return NextResponse.json({
      success: true,
      data: audios,
      total: audios.length
    });

  } catch (error) {
    console.error('❌ Simple Audio API error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }
    }, { status: 500 });
  }
}