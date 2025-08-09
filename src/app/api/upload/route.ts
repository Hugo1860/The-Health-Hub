import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { triggerNotifications } from '@/lib/subscriptions';
import { withSecurity } from '@/lib/secureApiWrapper';
import { secureFileUpload, extractFilesFromRequest } from '@/lib/secureFileUpload';
import { audioUploadSchema, sanitizeText, sanitizeHtml } from '@/lib/validation';
import { z } from 'zod';
import db from '@/lib/db';

// 上传表单验证模式
const uploadFormSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200, '标题不能超过200个字符'),
  description: z.string().max(2000, '描述不能超过2000个字符').optional(),
  subject: z.string().min(1, '主题不能为空').max(100, '主题不能超过100个字符'),
  tags: z.string().optional(),
});

export const POST = withSecurity(
  async (request: NextRequest) => {
    try {
      console.log('Upload API called');
      const formData = await request.formData();
      console.log('FormData received');
      
      // 提取表单数据
      const formFields = {
        title: formData.get('title') as string,
        description: formData.get('description') as string || '',
        subject: formData.get('subject') as string,
        tags: formData.get('tags') as string || '',
      };

      console.log('Form fields:', formFields);

      // 验证表单数据
      const validationResult = uploadFormSchema.safeParse(formFields);
      if (!validationResult.success) {
        console.log('Validation failed:', validationResult.error);
        const errors = validationResult.error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        return NextResponse.json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '输入数据验证失败',
            details: errors
          }
        }, { status: 400 });
      }

      const validatedData = validationResult.data;

      // 获取音频文件
      const audioFile = formData.get('audio') as File;
      if (!audioFile) {
        console.log('No audio file found');
        return NextResponse.json({
          error: { code: 'NO_FILE', message: '没有文件上传' }
        }, { status: 400 });
      }

      console.log('Audio file:', audioFile.name, audioFile.size, audioFile.type);

      // 安全上传音频文件
      const audioUploadResult = await secureFileUpload(audioFile, 'uploads', 'audio');
      console.log('Audio upload result:', audioUploadResult);

      // 处理封面图片（如果有）
      let coverImageUrl = '';
      const coverImageFile = formData.get('coverImage') as File;
      if (coverImageFile && coverImageFile.size > 0) {
        try {
          const imageUploadResult = await secureFileUpload(coverImageFile, 'uploads/covers', 'image');
          coverImageUrl = imageUploadResult.path;
          console.log('Cover image upload result:', imageUploadResult);
        } catch (error) {
          console.error('Cover image upload failed:', error);
          // 封面图片上传失败不影响音频上传
        }
      }

      // 净化和处理数据
      const sanitizedTitle = sanitizeText(validatedData.title);
      const sanitizedDescription = sanitizeHtml(validatedData.description || '');
      const sanitizedSubject = sanitizeText(validatedData.subject);
      const sanitizedTags = (validatedData.tags || '')
        .split(',')
        .map(tag => sanitizeText(tag.trim()))
        .filter(tag => tag && tag.length > 0)
        .slice(0, 10); // 限制标签数量

      // 获取音频时长
      const { getAudioDuration } = await import('@/lib/audioDuration');
      const { join } = await import('path');
      const filePath = join(process.cwd(), 'public', audioUploadResult.path);
      const duration = await getAudioDuration(filePath);

      // 创建音频元数据
      const metadata = {
        id: Date.now().toString(),
        title: sanitizedTitle,
        description: sanitizedDescription,
        filename: audioUploadResult.filename,
        url: audioUploadResult.path,
        coverImage: coverImageUrl || undefined,
        uploadDate: new Date().toISOString(),
        subject: sanitizedSubject,
        tags: sanitizedTags,
        size: audioUploadResult.size,
        duration: duration,
        speaker: formData.get('speaker') as string || '',
        recordingDate: new Date().toISOString(),
        chapters: [],
        relatedResources: []
      };

      console.log('Metadata created:', metadata);

      // 读取现有音频列表
      let audioList: any[] = [];
      try {
        const listPath = join(process.cwd(), 'public', 'uploads', 'audio-list.json');
        const { readFile: fsReadFile } = await import('fs/promises');
        const existingData = await fsReadFile(listPath, 'utf8').then(JSON.parse).catch(() => []);
        audioList = Array.isArray(existingData) ? existingData : [];
      } catch {
        audioList = [];
      }

      // 添加新音频到列表
      audioList.unshift(metadata);

      // 保存到数据库
      try {
        const insertStmt = db.prepare(`
          INSERT INTO audios (
            id, title, description, filename, url, coverImage, 
            uploadDate, subject, tags, size, duration, speaker, recordingDate
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        insertStmt.run(
          metadata.id,
          metadata.title,
          metadata.description,
          metadata.filename,
          metadata.url,
          metadata.coverImage || null,
          metadata.uploadDate,
          metadata.subject,
          JSON.stringify(metadata.tags),
          metadata.size,
          metadata.duration,
          metadata.speaker,
          metadata.recordingDate
        );
        console.log('Audio saved to database');
      } catch (dbError) {
        console.error('Database save error:', dbError);
        // 继续保存到JSON文件作为备份
      }

      // 保存更新后的列表（向后兼容）
      const listPath = join(process.cwd(), 'public', 'uploads', 'audio-list.json');
      await writeFile(listPath, JSON.stringify(audioList, null, 2));
      console.log('Audio list updated');

      // 触发订阅通知
      try {
        await triggerNotifications('audio', metadata);
      } catch (error) {
        console.error('Error triggering notifications:', error);
        // 不影响上传流程，只记录错误
      }

      console.log('Upload completed successfully');
      return NextResponse.json({ 
        success: true, 
        audio: metadata,
        message: '音频上传成功'
      });
    } catch (error) {
      console.error('Upload error:', error);
      
      if (error instanceof Error) {
        return NextResponse.json({
          error: {
            code: 'UPLOAD_ERROR',
            message: error.message
          }
        }, { status: 400 });
      }
      
      return NextResponse.json({
        error: {
          code: 'INTERNAL_ERROR',
          message: '上传失败，请重试'
        }
      }, { status: 500 });
    }
  },
  {
    requireAuth: true,
    enableRateLimit: true,
    rateLimitMax: 10,
    rateLimitWindow: 60000,
    requireCSRF: false, // 暂时禁用CSRF检查来调试
    allowedMethods: ['POST'],
  }
);

export const GET = withSecurity(
  async () => {
    try {
      const listPath = join(process.cwd(), 'public', 'uploads', 'audio-list.json');
      const audioList = await import('fs/promises').then(fs => 
        fs.readFile(listPath, 'utf8').then(JSON.parse).catch(() => [])
      );
      
      return NextResponse.json({ audioList: Array.isArray(audioList) ? audioList : [] });
    } catch (error) {
      console.error('读取音频列表错误:', error);
      return NextResponse.json({ 
        error: { code: 'READ_ERROR', message: '读取音频列表失败' },
        audioList: [] 
      });
    }
  },
  {
    requireAuth: false,
    enableRateLimit: true,
    rateLimitMax: 50,
    rateLimitWindow: 60000,
    allowedMethods: ['GET'],
  }
);