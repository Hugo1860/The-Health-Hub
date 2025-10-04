import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    console.log('🎵 Simple Upload API called');
    
    const formData = await request.formData();
    
    // 获取表单数据
    const title = formData.get('title') as string;
    const description = formData.get('description') as string || '';
    const speaker = formData.get('speaker') as string || '';
    const status = formData.get('status') as string || 'draft';
    const categoryId = formData.get('categoryId') as string;
    const subcategoryId = formData.get('subcategoryId') as string;
    
    // 获取文件
    const audioFile = formData.get('audioFile') as File;
    const coverImageFile = formData.get('"coverImage"') as File;
    
    if (!title) {
      return NextResponse.json({
        success: false,
        error: { message: '标题不能为空' }
      }, { status: 400 });
    }
    
    if (!audioFile) {
      return NextResponse.json({
        success: false,
        error: { message: '请选择音频文件' }
      }, { status: 400 });
    }
    
    if (!categoryId) {
      return NextResponse.json({
        success: false,
        error: { message: '请选择分类' }
      }, { status: 400 });
    }
    
    // 生成唯一ID
    const audioId = randomUUID();
    
    // 处理音频文件上传
    let audioUrl = '';
    let filename = '';
    
    if (audioFile && audioFile.size > 0) {
      const bytes = await audioFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // 生成文件名
      const fileExtension = audioFile.name.split('.').pop() || 'mp3';
      filename = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
      
      // 确保上传目录存在
      const uploadDir = join(process.cwd(), 'public', 'uploads', 'audios');
      try {
        await mkdir(uploadDir, { recursive: true });
      } catch (error) {
        // 目录可能已存在，忽略错误
      }
      
      // 保存文件
      const filePath = join(uploadDir, filename);
      await writeFile(filePath, buffer);
      
      audioUrl = `/uploads/audios/${filename}`;
      console.log('音频文件保存成功:', audioUrl);
    }
    
    // 处理封面图片上传
    let coverImageUrl = '';
    
    if (coverImageFile && coverImageFile.size > 0) {
      const bytes = await coverImageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // 生成文件名
      const fileExtension = coverImageFile.name.split('.').pop() || 'jpg';
      const coverFilename = `cover_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
      
      // 确保上传目录存在
      const uploadDir = join(process.cwd(), 'public', 'uploads', 'covers');
      try {
        await mkdir(uploadDir, { recursive: true });
      } catch (error) {
        // 目录可能已存在，忽略错误
      }
      
      // 保存文件
      const filePath = join(uploadDir, coverFilename);
      await writeFile(filePath, buffer);
      
      coverImageUrl = `/uploads/covers/${coverFilename}`;
      console.log('封面图片保存成功:', coverImageUrl);
    }
    
    // 保存到数据库
    const insertQuery = `
      INSERT INTO audios (
        id, title, description, filename, url, "coverImage", 
        category_id, subcategory_id, speaker, upload_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    
    const values = [
      audioId,
      title,
      description,
      filename,
      audioUrl,
      coverImageUrl,
      categoryId,
      subcategoryId || null,
      speaker
    ];
    
    console.log('插入数据库:', values);
    
    const result = await db.query(insertQuery, values);
    const newAudio = result.rows[0];
    
    console.log('音频创建成功:', newAudio.id);
    
    return NextResponse.json({
      success: true,
      data: {
        id: newAudio.id,
        title: newAudio.title,
        url: newAudio.url,
        coverImage: newAudio.coverImage
      },
      message: '音频上传成功'
    });
    
  } catch (error) {
    console.error('上传音频失败:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : '上传失败'
      }
    }, { status: 500 });
  }
}