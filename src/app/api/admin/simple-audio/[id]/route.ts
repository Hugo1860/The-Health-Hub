import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import logger from '@/lib/logger';
import { withSecurity } from '@/lib/secureApiWrapper';
import { ANTD_ADMIN_PERMISSIONS } from '@/lib/adminApiUtils';

// GET - 获取单个音频
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    logger.debug('获取音频详情:', id);
    
    const query = `
      SELECT
        a.id,
        a.title,
        a.description,
        a.filename,
        a.url,
        a.cover_image,
        a.upload_date,
        a.subject,
        a.tags,
        a.size,
        a.duration,
        a.speaker,
        a.recording_date,
        a.category_id,
        a.subcategory_id,
        a.status,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon,
        sc.name as subcategory_name
      FROM audios a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN categories sc ON a.subcategory_id = sc.id
      WHERE a.id = ?
    `;

    const db = getDatabase();
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: { message: '音频不存在' }
      }, { status: 404 });
    }
    
    const audio = result.rows[0];
    
    // 格式化返回数据
    const formattedAudio = {
      ...audio,
      category: audio.category_name ? {
        id: audio.category_id,
        name: audio.category_name,
        color: audio.category_color,
        icon: audio.category_icon
      } : null,
      subcategory: audio.subcategory_name ? {
        id: audio.subcategory_id,
        name: audio.subcategory_name
      } : null
    };

    // 清理不需要的字段
    delete formattedAudio.category_name;
    delete formattedAudio.category_color;
    delete formattedAudio.category_icon;
    delete formattedAudio.subcategory_name;
    
    return NextResponse.json({
      success: true,
      audio: formattedAudio
    });
    
  } catch (error) {
    logger.error('获取音频详情失败:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : '获取音频详情失败'
      }
    }, { status: 500 });
  }
}

// PUT - 更新音频
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    logger.info('=== 开始更新音频 ===', { id, body });
    
    const {
      title,
      description,
      speaker,
      status,
      coverImage,
      categoryId,
      subcategoryId
    } = body;
    
    if (!title) {
      logger.warn('音频标题为空');
      return NextResponse.json({
        success: false,
        error: { message: '标题不能为空' }
      }, { status: 400 });
    }
    
    // 处理 cover_image：如果为空字符串则设为 null
    const coverImageValue = coverImage && coverImage.trim() !== '' ? coverImage : null;
    
    logger.debug('处理后的 cover_image 值:', coverImageValue);
    
    const updateQuery = `
      UPDATE audios
      SET
        title = ?,
        description = ?,
        speaker = ?,
        cover_image = ?,
        category_id = ?,
        subcategory_id = ?,
        status = ?
      WHERE id = ?
    `;

    const values = [
      title,
      description || null,
      speaker || null,
      coverImageValue,
      categoryId || null,
      subcategoryId || null,
      status || 'published',
      id
    ];

    logger.debug('SQL 更新参数:', { query: updateQuery, values });

    const db = getDatabase();
    await db.query(updateQuery, values);
    
    logger.info('音频更新成功，重新获取数据');
    
    // 更新成功后，重新获取音频数据
    const selectQuery = `
      SELECT
        a.id,
        a.title,
        a.description,
        a.filename,
        a.url,
        a.cover_image,
        a.upload_date,
        a.subject,
        a.tags,
        a.size,
        a.duration,
        a.speaker,
        a.recording_date,
        a.category_id,
        a.subcategory_id,
        a.status
      FROM audios a
      WHERE a.id = ?
    `;
    
    const selectResult = await db.query(selectQuery, [id]);
    
    if (selectResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: { message: '音频不存在' }
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: selectResult.rows[0],
      message: '音频更新成功'
    });
    
  } catch (error) {
    logger.error('=== 更新音频失败 ===', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error
    });
    
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : '更新音频失败',
        details: error instanceof Error ? error.stack : undefined
      }
    }, { status: 500 });
  }
}

// DELETE - 删除音频
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    logger.info('删除音频:', id);
    
    const deleteQuery = 'DELETE FROM audios WHERE id = ?';
    const db = getDatabase();
    const result = await db.query(deleteQuery, [id]);
    // MySQL 适配层对非 SELECT 返回 { rows: [], rowCount }
    if ((result.rowCount ?? 0) === 0) {
      return NextResponse.json({
        success: false,
        error: { message: '音频不存在' }
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      message: '音频删除成功'
    });
    
  } catch (error) {
    logger.error('删除音频失败:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : '删除音频失败'
      }
    }, { status: 500 });
  }
}