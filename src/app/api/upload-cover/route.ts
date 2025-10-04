import { NextRequest, NextResponse } from 'next/server';
import { withSecurity } from '@/lib/secureApiWrapper';
import { ANTD_ADMIN_PERMISSIONS } from '@/lib/server-permissions';
import { DatabaseErrorHandler } from '@/lib/api-response';
import AudioUploadOptimizer from '@/lib/audio-upload-optimizer';

export const POST = withSecurity(
  async (request: NextRequest) => {
    try {
      console.log('=== Cover Image Upload API Called ===');
      
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
  }, { requireAuth: true, requiredPermissions: [ANTD_ADMIN_PERMISSIONS.EDIT_AUDIO], requireCSRF: true, enableRateLimit: true, allowedMethods: ['POST'] }
);