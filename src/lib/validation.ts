import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';

// 输入验证模式
export const audioUploadSchema = z.object({
  title: z.string()
    .min(1, '标题不能为空')
    .max(200, '标题不能超过200个字符')
    .regex(/^[^<>\"'&]*$/, '标题包含非法字符'),
  description: z.string()
    .max(2000, '描述不能超过2000个字符'),
  subject: z.string()
    .min(1, '主题不能为空')
    .max(100, '主题不能超过100个字符'),
  speaker: z.string()
    .max(100, '演讲者名称不能超过100个字符'),
  tags: z.array(z.string().max(50, '标签不能超过50个字符')).optional(),
});

export const userRegistrationSchema = z.object({
  username: z.string()
    .min(3, '用户名至少3个字符')
    .max(30, '用户名不能超过30个字符')
    .regex(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, '用户名只能包含字母、数字、下划线和中文'),
  email: z.string()
    .email('请输入有效的邮箱地址')
    .max(100, '邮箱地址不能超过100个字符'),
  password: z.string()
    .min(8, '密码至少8个字符')
    .max(128, '密码不能超过128个字符')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '密码必须包含大小写字母和数字'),
});

export const commentSchema = z.object({
  content: z.string()
    .min(1, '评论内容不能为空')
    .max(1000, '评论内容不能超过1000个字符'),
  audioId: z.string().uuid('无效的音频ID'),
  parentId: z.string().uuid('无效的父评论ID').optional(),
});

export const questionSchema = z.object({
  title: z.string()
    .min(5, '问题标题至少5个字符')
    .max(200, '问题标题不能超过200个字符'),
  content: z.string()
    .min(10, '问题内容至少10个字符')
    .max(2000, '问题内容不能超过2000个字符'),
  audioId: z.string().uuid('无效的音频ID'),
});

// 文件上传验证
export const validateFileUpload = (file: File) => {
  const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a'];
  const maxSize = 100 * 1024 * 1024; // 100MB

  if (!allowedTypes.includes(file.type)) {
    throw new Error('不支持的文件类型。请上传MP3、WAV或M4A格式的音频文件。');
  }

  if (file.size > maxSize) {
    throw new Error('文件大小不能超过100MB。');
  }

  // 检查文件名
  const filename = file.name;
  if (!/^[a-zA-Z0-9._\-\u4e00-\u9fa5\s]+$/.test(filename)) {
    throw new Error('文件名包含非法字符。');
  }

  return true;
};

// 图片文件验证
export const validateImageUpload = (file: File) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(file.type)) {
    throw new Error('不支持的图片类型。请上传JPEG、PNG或WebP格式的图片。');
  }

  if (file.size > maxSize) {
    throw new Error('图片大小不能超过5MB。');
  }

  return true;
};

// HTML内容净化
export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target'],
    ALLOW_DATA_ATTR: false,
  });
};

// 文本内容净化（移除HTML标签）
export const sanitizeText = (text: string): string => {
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
};

// SQL注入防护（虽然我们使用JSON文件，但为未来数据库迁移做准备）
export const escapeString = (str: string): string => {
  return str.replace(/'/g, "''").replace(/\\/g, '\\\\');
};

// 路径遍历攻击防护
export const sanitizePath = (path: string): string => {
  // 移除危险字符和路径遍历尝试
  return path
    .replace(/\.\./g, '')
    .replace(/[<>:"|?*]/g, '')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/');
};

// 验证UUID格式
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// 验证邮箱格式
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// 速率限制检查（简单实现）
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export const checkRateLimit = (identifier: string, maxRequests: number = 10, windowMs: number = 60000): boolean => {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
};

// 清理过期的速率限制记录
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((record, key) => {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  });
}, 60000); // 每分钟清理一次