import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET - 获取单个音频
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log('获取音频详情:', id);
    
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
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(DISTINCT r.id) as rating_count,
        COUNT(DISTINCT com.id) as comment_count,
        a.category_id as "categoryId",
        a.subcategory_id as "subcategoryId",
        a.status,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon,
        sc.name as subcategory_name
      FROM audios a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN categories sc ON a.subcategory_id = sc.id
      LEFT JOIN ratings r ON a.id = r.audio_id
      LEFT JOIN comments com ON a.id = com.audio_id
      WHERE a.id = $1
      GROUP BY a.id, a.title, a.description, a.filename, a.url, a.cover_image, 
               a.upload_date, a.subject, a.tags, a.size, a.duration, a.speaker, 
               a.recording_date, a.category_id, a.subcategory_id, a.status,
               c.name, c.color, c.icon, sc.name
    `;
    
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
        id: audio.categoryId,
        name: audio.category_name,
        color: audio.category_color,
        icon: audio.category_icon
      } : null,
      subcategory: audio.subcategory_name ? {
        id: audio.subcategoryId,
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
    console.error('获取音频详情失败:', error);
    
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
    
    console.log('更新音频:', id, body);
    
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
      return NextResponse.json({
        success: false,
        error: { message: '标题不能为空' }
      }, { status: 400 });
    }
    
    const updateQuery = `
      UPDATE audios 
      SET 
        title = $1,
        description = $2,
        speaker = $3,
        cover_image = $4,
        category_id = $5,
        subcategory_id = $6,
        status = $7
      WHERE id = $8
      RETURNING *
    `;
    
    const values = [
      title,
      description || '',
      speaker || '',
      coverImage || '',
      categoryId || null,
      subcategoryId || null,
      status || 'published',
      id
    ];
    
    const result = await db.query(updateQuery, values);
    
    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: { message: '音频不存在' }
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: '音频更新成功'
    });
    
  } catch (error) {
    console.error('更新音频失败:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : '更新音频失败'
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
    
    console.log('删除音频:', id);
    
    const deleteQuery = 'DELETE FROM audios WHERE id = $1 RETURNING *';
    const result = await db.query(deleteQuery, [id]);
    
    if (result.rows.length === 0) {
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
    console.error('删除音频失败:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : '删除音频失败'
      }
    }, { status: 500 });
  }
}