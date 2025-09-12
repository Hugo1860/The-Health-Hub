import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// POST: Upload cover image for audio
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: audioId } = await params;
  
  try {
    // 检查管理员权限
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }
    
    const user = session.user as any;
    if (user.role !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Admin privileges required'
      }, { status: 403 });
    }

    // 检查音频是否存在
    const audioStmt = db.prepare('SELECT id, ""coverImage"" FROM audios WHERE id = ?');
    const audio = await audioStmt.get(audioId) as any;
    
    if (!audio) {
      return NextResponse.json({
        success: false,
        error: 'Audio not found'
      }, { status: 404 });
    }

    // 解析表单数据
    const formData = await request.formData();
    const file = formData.get('"coverImage"') as File;
    
    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No image file provided'
      }, { status: 400 });
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid file type. Allowed: JPEG, PNG, WebP'
      }, { status: 400 });
    }

    // 验证文件大小 (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: 'File size too large. Maximum: 5MB'
      }, { status: 400 });
    }

    // 创建上传目录
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'covers');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // 生成文件名
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `${audioId}-${timestamp}.${extension}`;
    const filepath = join(uploadDir, filename);
    const publicUrl = `/uploads/covers/${filename}`;

    // 删除旧的封面图片
    if (audio.coverImage) {
      try {
        const oldFilePath = join(process.cwd(), 'public', audio.coverImage);
        if (existsSync(oldFilePath)) {
          await unlink(oldFilePath);
        }
      } catch (error) {
        console.warn('Failed to delete old cover image:', error);
      }
    }

    // 保存新文件
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // 更新数据库
    const updateStmt = db.prepare('UPDATE audios SET ""coverImage"" = ? WHERE id = ?');
    const result = await updateStmt.run(publicUrl, audioId);

    if (result.changes === 0) {
      // 如果数据库更新失败，删除已上传的文件
      try {
        await unlink(filepath);
      } catch (error) {
        console.warn('Failed to cleanup uploaded file:', error);
      }
      
      return NextResponse.json({
        success: false,
        error: 'Failed to update database'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Cover image uploaded successfully',
      coverImageUrl: publicUrl
    });

  } catch (error) {
    console.error('Cover image upload error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE: Remove cover image
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: audioId } = await params;
  
  try {
    // 检查管理员权限
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }
    
    const user = session.user as any;
    if (user.role !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Admin privileges required'
      }, { status: 403 });
    }

    // 获取当前封面图片信息
    const audioStmt = db.prepare('SELECT id, ""coverImage"" FROM audios WHERE id = ?');
    const audio = await audioStmt.get(audioId) as any;
    
    if (!audio) {
      return NextResponse.json({
        success: false,
        error: 'Audio not found'
      }, { status: 404 });
    }

    if (!audio.coverImage) {
      return NextResponse.json({
        success: false,
        error: 'No cover image to remove'
      }, { status: 400 });
    }

    // 删除文件
    try {
      const filePath = join(process.cwd(), 'public', audio.coverImage);
      if (existsSync(filePath)) {
        await unlink(filePath);
      }
    } catch (error) {
      console.warn('Failed to delete cover image file:', error);
    }

    // 更新数据库
    const updateStmt = db.prepare('UPDATE audios SET ""coverImage"" = NULL WHERE id = ?');
    const result = await updateStmt.run(audioId);

    if (result.changes === 0) {
      return NextResponse.json({
        success: false,
        error: 'Failed to update database'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Cover image removed successfully'
    });

  } catch (error) {
    console.error('Cover image removal error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}