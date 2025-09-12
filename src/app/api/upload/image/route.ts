import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// 图片上传API端点
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: '没有上传文件'
        }
      }, { status: 400 });
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: '不支持的文件类型，请上传图片文件（JPEG、PNG、GIF、WebP）'
        }
      }, { status: 400 });
    }

    // 验证文件大小（限制5MB）
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: '文件过大，请上传小于5MB的图片'
        }
      }, { status: 400 });
    }

    // 创建上传目录
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'images');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // 生成唯一文件名
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileName = `image_${timestamp}_${randomString}.${fileExtension}`;
    const filePath = join(uploadDir, fileName);

    // 保存文件
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // 返回文件信息
    const fileUrl = `/uploads/images/${fileName}`;
    
    return NextResponse.json({
      success: true,
      data: {
        url: fileUrl,
        fileName: fileName,
        originalName: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString()
      },
      meta: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });

  } catch (error) {
    console.error('图片上传失败:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'UPLOAD_FAILED',
        message: '图片上传失败',
        details: error instanceof Error ? error.message : '未知错误'
      }
    }, { status: 500 });
  }
}
