import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { triggerNotifications } from '@/lib/subscriptions';
import { withSecurity } from '@/lib/secureApiWrapper';
import { secureFileUpload } from '@/lib/secureFileUpload';
import { validateFileUpload, sanitizeText, sanitizeHtml } from '@/lib/validation';
import { z } from 'zod';
import db from '@/lib/db';

// 上传表单验证模式
const uploadFormSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200, '标题不能超过200个字符'),
  description: z.string().max(2000, '描述不能超过2000个字符').optional(),
  
  // 分类字段
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  
  tags: z.string().optional(),
  speaker: z.string().optional(), recordingDate: z.string().optional(),
  status: z.enum(['draft', 'published']).default('published')
});

export const POST = withSecurity(
  async (request: NextRequest) => {
    try {
      console.log('🎵 Clean Upload API called (compatibility mode removed)');
      const formData = await request.formData();
      console.log('FormData received, keys:', Array.from(formData.keys()));
      
      // 提取表单数据
      const formFields = {
        title: formData.get('title') as string,
        description: formData.get('description') as string || '',
        categoryId: formData.get('categoryId') as string || undefined,
        subcategoryId: formData.get('subcategoryId') as string || undefined,
        tags: formData.get('tags') as string || '',
        speaker: formData.get('speaker') as string || '',
        recordingDate: formData.get('recordingDate') as string || undefined,
        status: (formData.get('status') as string) || 'published'
      };

      console.log('Form fields (clean):', formFields);

      // 验证表单数据
      const validation = uploadFormSchema.safeParse(formFields);
      if (!validation.success) {
        console.error('Form validation failed:', validation.error);
        return NextResponse.json({
          success: false,
          error: {
            code: 'INVALID_FORM_DATA',
            message: '表单数据无效',
            details: validation.error.flatten()
          }
        }, { status: 400 });
      }

      const validatedData = validation.data;

      // 工具：规范化日期为 MySQL DATETIME 格式
      const toMySqlDateTime = (value?: string | null): string | null => {
        if (!value) return null;
        const d = new Date(value);
        if (isNaN(d.getTime())) return null;
        const pad = (n: number) => n.toString().padStart(2, '0');
        const yyyy = d.getFullYear();
        const MM = pad(d.getMonth() + 1);
        const dd = pad(d.getDate());
        const hh = pad(d.getHours());
        const mm = pad(d.getMinutes());
        const ss = pad(d.getSeconds());
        return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}`;
      };

      // 验证分类选择的一致性
      if (validatedData.categoryId || validatedData.subcategoryId) {
        console.log('Validating category selection:', {
          categoryId: validatedData.categoryId,
          subcategoryId: validatedData.subcategoryId
        });
        
        try {
          const CategoryService = (await import('@/lib/categoryService')).default;
          const categories = await CategoryService.getCategories();
          console.log('Loaded categories for validation:', categories.length);
          
          const { validateCategorySelection } = await import('@/lib/categoryValidation');
          const selectionValidation = validateCategorySelection(
            { 
              categoryId: validatedData.categoryId, 
              subcategoryId: validatedData.subcategoryId 
            },
            categories
          );

          if (!selectionValidation.isValid) {
            console.error('Category selection validation failed:', selectionValidation.errors);
            return NextResponse.json({
              success: false,
              error: {
                code: 'INVALID_CATEGORY_SELECTION',
                message: selectionValidation.errors[0].message
              }
            }, { status: 400 });
          }
          
          console.log('Category selection validation passed');
        } catch (error) {
          console.error('Category validation failed with error:', error);
          return NextResponse.json({
            success: false,
            error: {
              code: 'CATEGORY_VALIDATION_ERROR',
              message: '分类验证失败',
              details: error instanceof Error ? error.message : '未知错误'
            }
          }, { status: 500 });
        }
      }

      // 提取并验证文件
      const files: File[] = [];
      
      // 从formData中提取音频文件
      const audioFile = formData.get('audioFile') as File;
      if (audioFile && audioFile instanceof File && audioFile.size > 0) {
        files.push(audioFile);
      }
      
      // 也检查其他可能的文件字段名
      const fileField = formData.get('file') as File;
      if (fileField && fileField instanceof File && fileField.size > 0) {
        files.push(fileField);
      }
      
      console.log(`Extracted ${files.length} files`);

      if (files.length === 0) {
        console.error('No valid audio file found in form data');
        return NextResponse.json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: '请选择要上传的音频文件'
          }
        }, { status: 400 });
      }

      const file = files[0];
      console.log('Processing file:', file.name, 'Size:', file.size);

      // 验证文件
      console.log('Validating file:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      try {
        // 使用专门的文件验证函数
        validateFileUpload(file);
        console.log('File validation passed');
      } catch (error) {
        console.error('File validation failed:', error);
        return NextResponse.json({
          success: false,
          error: {
            code: 'INVALID_FILE',
            message: error instanceof Error ? error.message : '文件验证失败'
          }
        }, { status: 400 });
      }

      // 安全文件上传
      console.log('Starting secure file upload for:', file.name, 'Type:', file.type, 'Size:', file.size);
      const uploadResult = await secureFileUpload(file, 'uploads/audios', 'audio');
      console.log('File uploaded successfully:', uploadResult);

      // 清理和验证文本数据
      const sanitizedTitle = sanitizeText(validatedData.title);
      const sanitizedDescription = sanitizeHtml(validatedData.description || '');
      const sanitizedSpeaker = sanitizeText(validatedData.speaker || '');

      // 处理标签
      const sanitizedTags = validatedData.tags
        ? validatedData.tags
            .split(',')
            .map(tag => sanitizeText(tag.trim()))
            .filter(tag => tag.length > 0)
            .slice(0, 10) // 限制标签数量
        : [];

      // 生成音频ID
      const audioId = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 准备数据库插入数据（清理版，移除 subject 字段）
      const audioData = {
        id: audioId,
        title: sanitizedTitle,
        description: sanitizedDescription,
        filename: uploadResult.filename,
        url: uploadResult.path, // 使用 path 作为 url
        coverImage: null, // 暂时设为 null，后续可以添加封面上传功能
        // uploadDate 由 SQL 层使用 CURRENT_TIMESTAMP 生成
        
        // 分类字段
        categoryId: validatedData.categoryId || null,
        subcategoryId: validatedData.subcategoryId || null,
        
        tags: JSON.stringify(sanitizedTags),
        size: uploadResult.size,
        duration: null, // 暂时设为 null，后续可以添加音频时长检测
        speaker: sanitizedSpeaker,
        recordingDate: toMySqlDateTime(validatedData.recordingDate || null),
        status: validatedData.status
      };

      console.log('Inserting audio data (clean):', audioData);

      // 插入数据库（统一 snake_case 字段，包含可空的分类外键）
      const insertQuery = `
        INSERT INTO audios (
          id, title, description, filename, url,
          upload_date, category_id, subcategory_id,
          tags, size, duration, speaker, recording_date, status
        ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING *
      `;

      const insertParams = [
        audioData.id,
        audioData.title,
        audioData.description,
        audioData.filename,
        audioData.url,
        audioData.categoryId,
        audioData.subcategoryId,
        audioData.tags,
        audioData.size,
        audioData.duration,
        audioData.speaker,
        audioData.recordingDate,
        audioData.status
      ];

      const result = await db.query(insertQuery, insertParams);
      const insertedAudio = result.rows[0];

      console.log('✅ Audio inserted successfully (clean mode):', insertedAudio.id);

      // 触发通知（如果音频是已发布状态）
      if (audioData.status === 'published') {
        try {
          await triggerNotifications('new_audio', {
            audioId: audioData.id,
            title: audioData.title,
            categoryId: audioData.categoryId,
            subcategoryId: audioData.subcategoryId
          });
          console.log('Notifications triggered for new audio');
        } catch (notificationError) {
          console.error('Failed to trigger notifications:', notificationError);
          // 不影响主流程
        }
      }

      // 获取完整的音频信息（包含分类信息）
      const getAudioQuery = `
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
          a.status,
          c1.name as category_name,
          c1.color as category_color,
          c1.icon as category_icon,
          c2.name as subcategory_name
        FROM audios a
        LEFT JOIN categories c1 ON a.category_id = c1.id
        LEFT JOIN categories c2 ON a.subcategory_id = c2.id
        WHERE a.id = ?
      `;

      const audioResult = await db.query(getAudioQuery, [audioData.id]);
      const fullAudio = audioResult.rows[0];

      // 处理 tags 字段
      let normalizedTags: string[] = [];
      if (fullAudio.tags && typeof fullAudio.tags === 'string') {
        try {
          normalizedTags = JSON.parse(fullAudio.tags);
          if (!Array.isArray(normalizedTags)) normalizedTags = [];
        } catch (e) {
          normalizedTags = [];
        }
      }

      const responseData = {
        id: fullAudio.id,
        title: fullAudio.title,
        description: fullAudio.description,
        url: fullAudio.url,
        filename: fullAudio.filename,
        uploadDate: fullAudio.upload_date,
        categoryId: fullAudio.category_id,
        subcategoryId: fullAudio.subcategory_id,
        tags: normalizedTags,
        speaker: fullAudio.speaker,
        recordingDate: fullAudio.recording_date,
        duration: fullAudio.duration,
        status: fullAudio.status,
        category: fullAudio.category_name ? {
          id: fullAudio.category_id,
          name: fullAudio.category_name,
          color: fullAudio.category_color,
          icon: fullAudio.category_icon
        } : undefined,
        subcategory: fullAudio.subcategory_name ? {
          id: fullAudio.subcategory_id,
          name: fullAudio.subcategory_name
        } : undefined
      };

      console.log('✅ Upload completed successfully (clean mode)');
      return NextResponse.json({
        success: true,
        data: responseData,
        message: '音频上传成功'
      }, { status: 201 });

    } catch (error) {
      console.error('Upload failed with error:', error);
      
      // 提供更详细的错误信息用于调试
      const errorDetails = {
        message: error instanceof Error ? error.message : '未知错误',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      };
      
      console.error('Error details:', errorDetails);
      
      // 根据错误类型返回不同的状态码
      let statusCode = 500;
      let errorCode = 'UPLOAD_FAILED';
      
      if (error instanceof Error) {
        if (error.message.includes('文件类型') || error.message.includes('文件格式')) {
          statusCode = 400;
          errorCode = 'INVALID_FILE_TYPE';
        } else if (error.message.includes('文件大小') || error.message.includes('too large')) {
          statusCode = 400;
          errorCode = 'FILE_TOO_LARGE';
        } else if (error.message.includes('数据库') || error.message.includes('database')) {
          errorCode = 'DATABASE_ERROR';
        }
      }
      
      return NextResponse.json({
        success: false,
        error: {
          code: errorCode,
          message: error instanceof Error ? error.message : '上传失败',
          details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
        }
      }, { status: statusCode });
    }
  },
  {
    requireAuth: true,
    requireAdmin: false,
    rateLimitKey: 'upload'
  }
);