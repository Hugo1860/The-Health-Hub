import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET: 获取相关音频推荐
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '5');

    console.log('🔍 获取相关音频推荐:', id);

    // 首先获取当前音频的信息
    const currentAudioQuery = `
      SELECT subject, tags, category_id, subcategory_id
      FROM audios 
      WHERE id = $1
    `;
    
    const currentAudioResult = await db.query(currentAudioQuery, [id]);
    
    if (currentAudioResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '音频不存在'
        }
      }, { status: 404 });
    }

    const currentAudio = currentAudioResult.rows[0];
    
    // 构建相关音频查询
    // 优先级：1. 相同分类 2. 相同主题 3. 相似标签
    let relatedQuery = `
      SELECT DISTINCT
        a.id,
        a.title,
        a.description,
        a.url,
        a.filename,
        a.upload_date,
        a.duration,
        a.cover_image,
        a.speaker,
        a.subject,
        a.category_id,
        a.subcategory_id,
        c1.name as category_name,
        c1.color as category_color,
        c1.icon as category_icon,
        c2.name as subcategory_name,
        -- 计算相关性分数
        (
          CASE 
            WHEN a.category_id = $2 THEN 3
            WHEN a.subcategory_id = $3 THEN 2
            WHEN a.subject = $4 THEN 1
            ELSE 0
          END
        ) as relevance_score
      FROM audios a
      LEFT JOIN categories c1 ON a.category_id = c1.id
      LEFT JOIN categories c2 ON a.subcategory_id = c2.id
      WHERE a.id != $1 
        AND a.status = 'published'
        AND (
          a.category_id = $2 
          OR a.subcategory_id = $3
          OR a.subject = $4
        )
      ORDER BY relevance_score DESC, a.upload_date DESC
      LIMIT $5
    `;

    const queryParams = [
      id,
      currentAudio.category_id,
      currentAudio.subcategory_id,
      currentAudio.subject,
      limit
    ];

    const relatedResult = await db.query(relatedQuery, queryParams);

    // 如果相关音频不足，补充一些最新的音频
    if (relatedResult.rows.length < limit) {
      const remainingLimit = limit - relatedResult.rows.length;
      const existingIds = relatedResult.rows.map(row => row.id);
      
      const additionalQuery = `
        SELECT 
          a.id,
          a.title,
          a.description,
          a.url,
          a.filename,
          a.upload_date,
          a.duration,
          a.cover_image,
          a.speaker,
          a.subject,
          a.category_id,
          a.subcategory_id,
          c1.name as category_name,
          c1.color as category_color,
          c1.icon as category_icon,
          c2.name as subcategory_name,
          0 as relevance_score
        FROM audios a
        LEFT JOIN categories c1 ON a.category_id = c1.id
        LEFT JOIN categories c2 ON a.subcategory_id = c2.id
        WHERE a.id != $1 
          AND a.status = 'published'
          ${existingIds.length > 0 ? `AND a.id NOT IN (${existingIds.map((_, i) => `$${i + 2}`).join(', ')})` : ''}
        ORDER BY a.upload_date DESC
        LIMIT $${existingIds.length + 2}
      `;

      const additionalParams = [id, ...existingIds, remainingLimit];
      const additionalResult = await db.query(additionalQuery, additionalParams);
      
      // 合并结果
      relatedResult.rows.push(...additionalResult.rows);
    }

    // 处理标签字段
    const relatedAudios = relatedResult.rows.map(row => {
      let normalizedTags: string[] = [];
      if (row.tags && typeof row.tags === 'string') {
        try {
          normalizedTags = JSON.parse(row.tags);
          if (!Array.isArray(normalizedTags)) normalizedTags = [];
        } catch (e) {
          normalizedTags = [];
        }
      } else if (Array.isArray(row.tags)) {
        normalizedTags = row.tags;
      }

      return {
        id: row.id,
        title: row.title,
        description: row.description,
        url: row.url,
        filename: row.filename,
        uploadDate: row.upload_date,
        duration: row.duration,
        coverImage: row.cover_image,
        speaker: row.speaker,
        subject: row.subject,
        categoryId: row.category_id,
        subcategoryId: row.subcategory_id,
        tags: normalizedTags,
        category: row.category_name ? {
          id: row.category_id,
          name: row.category_name,
          color: row.category_color,
          icon: row.category_icon
        } : undefined,
        subcategory: row.subcategory_name ? {
          id: row.subcategory_id,
          name: row.subcategory_name
        } : undefined,
        relevanceScore: row.relevance_score
      };
    });

    console.log(`✅ 找到 ${relatedAudios.length} 个相关音频`);

    return NextResponse.json({
      success: true,
      data: relatedAudios
    });

  } catch (error) {
    console.error('获取相关音频失败:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取相关音频失败'
      }
    }, { status: 500 });
  }
}