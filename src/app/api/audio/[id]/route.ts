import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { z } from 'zod';
import CategoryService from '@/lib/categoryService';
import { validateCategorySelection } from '@/lib/categoryValidation';

// Schema for validating the update data (cleaned - no compatibility support)
const audioUpdateSchema = z.object({
  title: z.string().min(1, "标题不能为空"),
  description: z.string().optional(),
  
  // 分类字段
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  
  tags: z.array(z.string()).optional(),
  speaker: z.string().optional(),
  recordingDate: z.string().datetime().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  coverImage: z.string().url().optional()
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

// GET: Fetch a single audio file by ID (cleaned - no subject field)
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    console.log('🎵 Fetching audio with ID (clean mode):', id);
    
    // Query with category joins
    const query = `
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
        a.status,
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

    // 构建响应数据（移除 subject 字段）
    const responseData = {
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

    console.log('✅ Audio found (clean mode):', audio.title);
    return NextResponse.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    return handleError(error, '获取音频详情失败');
  }
}

// PUT: Update an audio file's details (cleaned - no compatibility support)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // 验证请求数据
    const validation = audioUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_DATA',
          message: '请求数据无效',
          details: validation.error.flatten()
        }
      }, { status: 400 });
    }
    
    const { 
      title, 
      description, 
      categoryId, 
      subcategoryId, 
      tags, 
      speaker, 
      recordingDate,
      status,
      coverImage
    } = validation.data;

    // 检查音频是否存在
    const checkQuery = 'SELECT id FROM audios WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '音频不存在'
        }
      }, { status: 404 });
    }

    // 验证分类选择的一致性
    if (categoryId || subcategoryId) {
      const categories = await CategoryService.getCategories();
      const selectionValidation = validateCategorySelection(
        { categoryId, subcategoryId },
        categories
      );

      if (!selectionValidation.isValid) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'INVALID_CATEGORY_SELECTION',
            message: selectionValidation.errors[0].message
          }
        }, { status: 400 });
      }
    }

    // 构建更新查询
    const updateFields: string[] = [];
    const updateParams: any[] = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updateFields.push(`title = $${paramIndex++}`);
      updateParams.push(title);
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateParams.push(description);
    }

    if (categoryId !== undefined) {
      updateFields.push(`category_id = $${paramIndex++}`);
      updateParams.push(categoryId);
    }

    if (subcategoryId !== undefined) {
      updateFields.push(`subcategory_id = $${paramIndex++}`);
      updateParams.push(subcategoryId);
    }

    // Category fields only - no legacy field support

    if (tags !== undefined) {
      updateFields.push(`tags = $${paramIndex++}`);
      updateParams.push(JSON.stringify(tags));
    }

    if (speaker !== undefined) {
      updateFields.push(`speaker = $${paramIndex++}`);
      updateParams.push(speaker);
    }

    if (recordingDate !== undefined) {
      updateFields.push(`"recordingDate" = $${paramIndex++}`);
      updateParams.push(recordingDate);
    }

    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      updateParams.push(status);
    }

    if (coverImage !== undefined) {
      updateFields.push(`"coverImage" = $${paramIndex++}`);
      updateParams.push(coverImage);
    }

    if (updateFields.length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NO_CHANGES',
          message: '没有需要更新的字段'
        }
      }, { status: 400 });
    }

    // 添加更新时间
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateParams.push(id);

    const updateQuery = `
      UPDATE audios 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    console.log('🔄 Executing clean update query:', updateQuery);
    console.log('Update params:', updateParams);

    const updateResult = await db.query(updateQuery, updateParams);
    
    if (updateResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: '更新失败'
        }
      }, { status: 500 });
    }

    // 获取更新后的完整音频信息（包含分类信息）
    const getUpdatedQuery = `
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
      WHERE a.id = $1
    `;

    const updatedResult = await db.query(getUpdatedQuery, [id]);
    const updatedAudio = updatedResult.rows[0];

    // 处理 tags 字段
    let normalizedTags: string[] = [];
    if (updatedAudio.tags && typeof updatedAudio.tags === 'string') {
      try {
        normalizedTags = JSON.parse(updatedAudio.tags);
        if (!Array.isArray(normalizedTags)) normalizedTags = [];
      } catch (e) {
        normalizedTags = [];
      }
    } else if (Array.isArray(updatedAudio.tags)) {
      normalizedTags = updatedAudio.tags;
    }

    const responseData = {
      id: updatedAudio.id,
      title: updatedAudio.title,
      description: updatedAudio.description,
      url: updatedAudio.url,
      filename: updatedAudio.filename,
      uploadDate: updatedAudio.uploadDate,
      categoryId: updatedAudio.category_id,
      subcategoryId: updatedAudio.subcategory_id,
      tags: normalizedTags,
      speaker: updatedAudio.speaker,
      recordingDate: updatedAudio.recordingDate,
      duration: updatedAudio.duration,
      coverImage: updatedAudio.coverImage,
      status: updatedAudio.status,
      category: updatedAudio.category_name ? {
        id: updatedAudio.category_id,
        name: updatedAudio.category_name,
        color: updatedAudio.category_color,
        icon: updatedAudio.category_icon
      } : undefined,
      subcategory: updatedAudio.subcategory_name ? {
        id: updatedAudio.subcategory_id,
        name: updatedAudio.subcategory_name
      } : undefined
    };

    console.log('✅ Audio updated successfully (clean mode)');
    return NextResponse.json({
      success: true,
      data: responseData,
      message: '音频更新成功'
    });

  } catch (error) {
    return handleError(error, '更新音频失败');
  }
}

// DELETE: Delete an audio file (enhanced with better error handling)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // 获取音频文件信息
    const getAudioQuery = 'SELECT url, filename FROM audios WHERE id = $1';
    const audioResult = await db.query(getAudioQuery, [id]);
    
    if (audioResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '音频不存在'
        }
      }, { status: 404 });
    }

    const audio = audioResult.rows[0];

    // 删除数据库记录
    const deleteQuery = 'DELETE FROM audios WHERE id = $1';
    const deleteResult = await db.query(deleteQuery, [id]);

    if (deleteResult.rowCount === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: '删除失败'
        }
      }, { status: 500 });
    }

    // 尝试删除文件系统中的文件
    if (audio.url) {
      try {
        const { unlink } = await import('fs/promises');
        const { join } = await import('path');
        const filePath = join(process.cwd(), 'public', audio.url);
        await unlink(filePath);
        console.log(`Successfully deleted file: ${filePath}`);
      } catch (fileError) {
        console.warn(`Database record for audio ${id} deleted, but failed to delete file: ${audio.url}`, fileError);
        // 不返回错误，因为主要资源（数据库记录）已删除
      }
    }

    console.log('✅ Audio deleted successfully (clean mode)');
    return NextResponse.json({
      success: true,
      message: '音频删除成功'
    });
  } catch (error) {
    return handleError(error, '删除音频失败');
  }
}