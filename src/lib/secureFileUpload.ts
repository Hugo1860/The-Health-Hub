import { NextRequest } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { validateFileUpload, validateImageUpload, sanitizePath } from './validation';

// 允许的文件类型和对应的扩展名
const ALLOWED_AUDIO_TYPES = {
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
  'audio/mp3': '.mp3',
  'audio/m4a': '.m4a',
};

const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

// 生成安全的文件名
const generateSecureFilename = (originalName: string, mimeType: string): string => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  
  // 获取文件扩展名
  let extension = '';
  if (ALLOWED_AUDIO_TYPES[mimeType as keyof typeof ALLOWED_AUDIO_TYPES]) {
    extension = ALLOWED_AUDIO_TYPES[mimeType as keyof typeof ALLOWED_AUDIO_TYPES];
  } else if (ALLOWED_IMAGE_TYPES[mimeType as keyof typeof ALLOWED_IMAGE_TYPES]) {
    extension = ALLOWED_IMAGE_TYPES[mimeType as keyof typeof ALLOWED_IMAGE_TYPES];
  }
  
  // 清理原始文件名（只保留字母数字和中文）
  const cleanName = originalName
    .replace(/\.[^/.]+$/, '') // 移除扩展名
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_') // 替换特殊字符
    .substring(0, 50); // 限制长度
  
  return `${cleanName}_${timestamp}_${randomString}${extension}`;
};

// 检查文件头部魔数（防止文件类型伪造）
const validateFileSignature = (buffer: ArrayBuffer, mimeType: string): boolean => {
  const bytes = new Uint8Array(buffer.slice(0, 12));
  
  switch (mimeType) {
    case 'audio/mpeg':
    case 'audio/mp3':
      // MP3文件通常以ID3标签开始或直接是帧同步
      return (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) || // ID3
             (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0); // Frame sync
    
    case 'audio/wav':
      // WAV文件头：RIFF....WAVE
      return bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
             bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45;
    
    case 'audio/m4a':
      // M4A文件通常以ftyp开始
      return bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70;
    
    case 'image/jpeg':
      // JPEG文件头：FF D8 FF
      return bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
    
    case 'image/png':
      // PNG文件头：89 50 4E 47 0D 0A 1A 0A
      return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
             bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A;
    
    case 'image/webp':
      // WebP文件头：RIFF....WEBP
      return bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
             bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
    
    default:
      return false;
  }
};

// 安全的文件上传处理
export const secureFileUpload = async (
  file: File,
  uploadDir: string,
  fileType: 'audio' | 'image' = 'audio'
): Promise<{ filename: string; path: string; size: number }> => {
  try {
    // 验证文件
    if (fileType === 'audio') {
      validateFileUpload(file);
    } else {
      validateImageUpload(file);
    }

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();
    
    // 验证文件签名
    if (!validateFileSignature(arrayBuffer, file.type)) {
      throw new Error('文件类型验证失败，可能是伪造的文件类型。');
    }

    // 生成安全的文件名
    const secureFilename = generateSecureFilename(file.name, file.type);
    
    // 清理和验证上传目录路径
    const cleanUploadDir = sanitizePath(uploadDir);
    const uploadPath = path.join(process.cwd(), 'public', cleanUploadDir);
    
    // 确保上传目录存在
    if (!existsSync(uploadPath)) {
      await mkdir(uploadPath, { recursive: true });
    }
    
    // 构建完整文件路径
    const filePath = path.join(uploadPath, secureFilename);
    
    // 检查文件是否已存在（防止覆盖）
    if (existsSync(filePath)) {
      throw new Error('文件已存在，请重新上传。');
    }
    
    // 写入文件
    await writeFile(filePath, Buffer.from(arrayBuffer));
    
    // 返回文件信息
    return {
      filename: secureFilename,
      path: `/${cleanUploadDir}/${secureFilename}`,
      size: file.size,
    };
  } catch (error) {
    console.error('Secure file upload error:', error);
    throw error;
  }
};

// 批量文件上传处理
export const secureMultipleFileUpload = async (
  files: File[],
  uploadDir: string,
  fileType: 'audio' | 'image' = 'audio'
): Promise<Array<{ filename: string; path: string; size: number; originalName: string }>> => {
  const results = [];
  
  for (const file of files) {
    try {
      const result = await secureFileUpload(file, uploadDir, fileType);
      results.push({
        ...result,
        originalName: file.name,
      });
    } catch (error) {
      console.error(`Failed to upload file ${file.name}:`, error);
      throw new Error(`上传文件 ${file.name} 失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }
  
  return results;
};

// 从请求中安全地提取文件
export const extractFilesFromRequest = async (
  req: NextRequest,
  fieldName: string = 'files'
): Promise<File[]> => {
  try {
    const formData = await req.formData();
    const files: File[] = [];
    
    // 获取单个文件或多个文件
    const fileEntries = formData.getAll(fieldName);
    
    for (const entry of fileEntries) {
      if (entry instanceof File) {
        files.push(entry);
      }
    }
    
    if (files.length === 0) {
      throw new Error('未找到上传的文件。');
    }
    
    // 限制同时上传的文件数量
    if (files.length > 10) {
      throw new Error('一次最多只能上传10个文件。');
    }
    
    return files;
  } catch (error) {
    console.error('Extract files from request error:', error);
    throw error;
  }
};

// 清理临时文件的工具函数
export const cleanupTempFiles = async (filePaths: string[]): Promise<void> => {
  const { unlink } = await import('fs/promises');
  
  for (const filePath of filePaths) {
    try {
      await unlink(filePath);
    } catch (error) {
      console.error(`Failed to cleanup temp file ${filePath}:`, error);
    }
  }
};