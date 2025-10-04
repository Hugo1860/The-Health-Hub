import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import db from '@/lib/db';
import { existsSync } from 'fs';
import { ApiResponse, DatabaseErrorHandler } from '@/lib/api-response';
import { withSecurity } from '@/lib/secureApiWrapper';
import { ANTD_ADMIN_PERMISSIONS } from '@/hooks/useAntdAdminAuth';

// POST - 管理员上传音频文件 - 需要管理员权限
export const POST = withSecurity(
  async (request: NextRequest) => {
    console.log('=== Simple Admin Upload API Called ===');
    console.log('Request method:', request.method);
    console.log('Request URL:', request.url);
    console.log('Admin simple upload');
    
    try {
    
    // 获取表单数据
    const formData = await request.formData();
    console.log('FormData received');
    
    // 打印所有FormData键值对用于调试
    console.log('FormData entries:');
    const entries = Array.from(formData.entries());
    for (const [key, value] of entries) {
      if (value && typeof value === 'object' && 'name' in value && 'type' in value && 'size' in value) {
        console.log(`${key}: File(${(value as any).name}, ${(value as any).type}, ${(value as any).size} bytes)`);
      } else {
        console.log(`${key}: ${value}`);
      }
    }
    
    // 提取表单字段
    const title = formData.get('title') as string;
    const description = formData.get('description') as string || '';
    const subject = formData.get('subject') as string;
    const speaker = formData.get('speaker') as string || '';
    const tagsString = formData.get('tags') as string || '';
    const audioFile = formData.get('audio') as File;
    
    console.log('Form fields:', { title, description, subject, speaker, tagsString });
    console.log('Audio file:', audioFile ? {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size
    } : 'No file');
    
    // 验证必填字段
    if (!title || !subject) {
      return ApiResponse.badRequest('Title and subject are required', {
        required: ['title', 'subject']
      });
    }
    
    if (!audioFile) {
      return ApiResponse.badRequest('Audio file is required', {
        field: 'audioFile'
      });
    }
    
    // 验证文件类型
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/mp4'];
    const fileExt = audioFile.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'mp4'];
    
    console.log('File type validation:', {
      fileName: audioFile.name,
      fileType: audioFile.type,
      fileExtension: fileExt,
      allowedTypes,
      allowedExtensions
    });
    
    // 检查MIME类型或文件扩展名
    const isValidType = allowedTypes.includes(audioFile.type) || 
                       (fileExt && allowedExtensions.includes(fileExt));
    
    if (!isValidType) {
      return ApiResponse.badRequest('Invalid file type. Only audio files are allowed.', {
        fileType: audioFile.type,
        fileExtension: fileExt,
        allowedTypes,
        allowedExtensions
      });
    }
    
    // 创建上传目录
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
    
    // 生成文件名
    const timestamp = Date.now();
    const fileExtension = audioFile.name.split('.').pop() || 'mp3';
    const filename = `audio_${timestamp}.${fileExtension}`;
    const filePath = join(uploadDir, filename);
    const publicUrl = `/uploads/${filename}`;
    
    console.log('Saving file to:', filePath);
    
    // 保存文件
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);
    
    console.log('File saved successfully');
    
    // 处理标签
    let tags: string[] = [];
    if (tagsString) {
      try {
        // 尝试解析JSON格式的标签
        tags = JSON.parse(tagsString);
      } catch {
        // 如果不是JSON，按逗号分割
        tags = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag);
      }
    }
    
    // 创建音频元数据
    const audioId = timestamp.toString();
    const uploadDate = new Date().toISOString();
    const metadata = {
      id: audioId,
      title,
      description,
      filename,
      url: publicUrl,
      uploadDate,
      subject,
      tags: JSON.stringify(tags),
      speaker,
      recordingDate: uploadDate,
      size: buffer.length,
      duration: 0 // 暂时设为0，后续可以添加音频时长检测
    };
    
    console.log('Saving to database:', metadata);
    
    // 检查ID是否已存在
    const existingCheck = db.prepare('SELECT id FROM audios WHERE id = ?');
    const existing = await existingCheck.get(audioId);
    if (existing) {
      console.log('ID conflict detected, generating new ID');
      const newId = `${timestamp}_${Math.random().toString(36).substring(2, 11)}`;
      metadata.id = newId;
      console.log('New ID generated:', newId);
    }
    
    // 保存到数据库
    try {
      const insertStmt = db.prepare(`
        INSERT INTO audios (
          id, title, description, filename, url, coverImage,
          upload_date, subject, tags, speaker, recording_date, size, duration
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = await insertStmt.run(
        metadata.id,
        metadata.title,
        metadata.description,
        metadata.filename,
        metadata.url,
        null, // "coverImage"
        metadata.uploadDate,
        metadata.subject,
        metadata.tags,
        metadata.speaker,
        metadata.recordingDate,
        metadata.size,
        metadata.duration
      );
      
      console.log('Database insert result:', {
        changes: result.changes
      });
      
      if (result.changes === 0) {
        throw new Error('No rows were inserted');
      }
      
      console.log('Audio saved to database successfully');
    } catch (dbError) {
      console.error('Database save error:', dbError);
      return DatabaseErrorHandler.handle(dbError as Error, 'Failed to save audio to database');
    }
    
    // 返回成功响应
    return ApiResponse.created({
      ...metadata,
      tags: tags // 返回解析后的标签数组
    }, 'Audio uploaded successfully');
    
  } catch (error) {
    console.error('Upload API error:', error);
    return DatabaseErrorHandler.handle(error as Error, 'Audio upload failed');
  }
  }, { requireAuth: true, requiredPermissions: [ANTD_ADMIN_PERMISSIONS.UPLOAD_AUDIO, ANTD_ADMIN_PERMISSIONS.EDIT_AUDIO] }
)

// GET - 测试API可访问性 - 需要管理员权限
export const GET = withSecurity(
  async (request: NextRequest) => {
    console.log('=== Simple Admin Upload API GET Called ===');
    
    try {
      return ApiResponse.success({
        message: 'Upload API is accessible',
        status: 'ok'
      });
      
    } catch (error) {
      return DatabaseErrorHandler.handle(error as Error, 'Upload API GET error');
    }
  }, { requireAuth: true, requiredPermissions: [ANTD_ADMIN_PERMISSIONS.UPLOAD_AUDIO] }
)