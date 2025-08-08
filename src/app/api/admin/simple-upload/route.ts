import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  console.log('=== Simple Admin Upload API Called ===');
  
  try {
    // 检查管理员权限
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({
        success: false,
        error: 'No authentication found'
      }, { status: 401 });
    }
    
    const user = session.user as any;
    const isAdmin = user.role === 'admin';
    
    if (!isAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Admin role required'
      }, { status: 403 });
    }
    
    console.log('Admin access granted for user:', user.email);
    
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
      return NextResponse.json({
        success: false,
        error: 'Title and subject are required'
      }, { status: 400 });
    }
    
    if (!audioFile) {
      return NextResponse.json({
        success: false,
        error: 'Audio file is required'
      }, { status: 400 });
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
      return NextResponse.json({
        success: false,
        error: `Invalid file type. File type: ${audioFile.type}, Extension: ${fileExt}. Only audio files are allowed.`
      }, { status: 400 });
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
    const existing = existingCheck.get(audioId);
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
          uploadDate, subject, tags, speaker, recordingDate, size, duration
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = insertStmt.run(
        metadata.id,
        metadata.title,
        metadata.description,
        metadata.filename,
        metadata.url,
        null, // coverImage
        metadata.uploadDate,
        metadata.subject,
        metadata.tags,
        metadata.speaker,
        metadata.recordingDate,
        metadata.size,
        metadata.duration
      );
      
      console.log('Database insert result:', {
        changes: result.changes,
        lastInsertRowid: result.lastInsertRowid
      });
      
      if (result.changes === 0) {
        throw new Error('No rows were inserted');
      }
      
      console.log('Audio saved to database successfully');
    } catch (dbError) {
      console.error('Database save error:', dbError);
      console.error('Database error details:', {
        message: dbError instanceof Error ? dbError.message : 'Unknown error',
        code: (dbError as any)?.code,
        errno: (dbError as any)?.errno
      });
      
      return NextResponse.json({
        success: false,
        error: 'Failed to save to database',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error',
        metadata: metadata
      }, { status: 500 });
    }
    
    // 返回成功响应
    return NextResponse.json({
      success: true,
      message: 'Audio uploaded successfully',
      audio: {
        ...metadata,
        tags: tags // 返回解析后的标签数组
      }
    });
    
  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}