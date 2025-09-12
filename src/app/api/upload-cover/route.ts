import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/auth-middleware';
import { DatabaseErrorHandler } from '@/lib/api-response';
import AudioUploadOptimizer from '@/lib/audio-upload-optimizer';

export const POST = authMiddleware.admin(
  async (request: NextRequest, context) => {
    try {
      console.log('=== Cover Image Upload API Called ===');
      console.log('Admin user:', context.user!.email);
      
      const formData = await request.formData();
      const coverImageFile = formData.get('coverImage') as File;

      if (!coverImageFile || coverImageFile.size === 0) {
        return NextResponse.json({
          success: false,
          error: { message: 'No cover image file provided' }
        }, { status: 400 });
      }

      // 创建上传优化器
      const uploader = new AudioUploadOptimizer();

      // 验证封面图片
      const imageValidation = uploader.validateImageFile(coverImageFile);
      if (!imageValidation.valid) {
        return NextResponse.json({
          success: false,
          error: { message: imageValidation.error }
        }, { status: 400 });
      }

      // 生成安全的文件名
      const imageFilename = uploader.generateSafeFileName(coverImageFile.name, 'cover_');
      
      // 保存封面图片
      const imageResult = await uploader.saveCoverImage(coverImageFile, imageFilename);
      
      console.log('Cover image uploaded successfully:', imageFilename);
      
      return NextResponse.json({
        success: true,
        data: {
          filename: imageFilename,
          url: imageResult.url,
          path: imageResult.path,
          size: imageResult.size
        },
        message: '封面图片上传成功'
      });

    } catch (error) {
      console.error('=== Cover Image Upload Error ===', error);
      return DatabaseErrorHandler.handle(error as Error, 'Cover image upload failed');
    }
  }
);