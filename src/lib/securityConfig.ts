// 安全配置文件
export const SECURITY_CONFIG = {
  // 速率限制配置
  RATE_LIMITS: {
    // 一般API请求
    DEFAULT: {
      max: 100,
      window: 60000, // 1分钟
    },
    // 上传文件
    UPLOAD: {
      max: 10,
      window: 60000,
    },
    // 用户认证
    AUTH: {
      max: 5,
      window: 300000, // 5分钟
    },
    // 评论发布
    COMMENT: {
      max: 20,
      window: 60000,
    },
    // 搜索请求
    SEARCH: {
      max: 50,
      window: 60000,
    },
  },

  // 文件上传限制
  FILE_UPLOAD: {
    // 音频文件
    AUDIO: {
      maxSize: 100 * 1024 * 1024, // 100MB
      allowedTypes: ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a'],
      allowedExtensions: ['.mp3', '.wav', '.m4a'],
    },
    // 图片文件
    IMAGE: {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
    },
    // 文档文件
    DOCUMENT: {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['application/pdf', 'text/plain'],
      allowedExtensions: ['.pdf', '.txt'],
    },
  },

  // 输入验证限制
  INPUT_LIMITS: {
    // 文本字段长度限制
    TEXT: {
      title: { min: 1, max: 200 },
      description: { min: 0, max: 2000 },
      comment: { min: 1, max: 1000 },
      username: { min: 3, max: 30 },
      email: { min: 5, max: 100 },
      password: { min: 8, max: 128 },
      tag: { min: 1, max: 50 },
      subject: { min: 1, max: 100 },
    },
    // 数组长度限制
    ARRAY: {
      tags: { max: 10 },
      files: { max: 10 },
    },
  },

  // 安全头配置
  SECURITY_HEADERS: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  },

  // CSRF配置
  CSRF: {
    tokenExpiry: 3600000, // 1小时
    cleanupInterval: 300000, // 5分钟清理一次
  },

  // 密码策略
  PASSWORD_POLICY: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
  },

  // 会话配置
  SESSION: {
    maxAge: 24 * 60 * 60, // 24小时（秒）
    updateAge: 60 * 60, // 1小时更新一次（秒）
  },

  // 日志配置
  LOGGING: {
    logSecurityEvents: true,
    logFailedAttempts: true,
    logRateLimitExceeded: true,
    maxLogEntries: 10000,
  },

  // IP白名单（管理员功能）
  IP_WHITELIST: {
    enabled: false,
    allowedIPs: [] as string[],
  },

  // 内容安全策略
  CONTENT_SECURITY: {
    // HTML净化允许的标签
    allowedHtmlTags: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'blockquote'],
    // HTML净化允许的属性
    allowedHtmlAttributes: ['href', 'target', 'title'],
    // 允许的URL协议
    allowedProtocols: ['http:', 'https:', 'mailto:'],
  },

  // 错误处理配置
  ERROR_HANDLING: {
    // 是否在生产环境中显示详细错误信息
    showDetailedErrors: process.env.NODE_ENV !== 'production',
    // 错误日志级别
    logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
  },
};

// 根据环境调整配置
if (process.env.NODE_ENV === 'development') {
  // 开发环境下放宽一些限制
  SECURITY_CONFIG.RATE_LIMITS.DEFAULT.max = 1000;
  SECURITY_CONFIG.RATE_LIMITS.UPLOAD.max = 50;
  SECURITY_CONFIG.INPUT_LIMITS.TEXT.comment.max = 5000;
}

// 导出特定配置的便捷函数
export const getRateLimitConfig = (type: keyof typeof SECURITY_CONFIG.RATE_LIMITS) => {
  return SECURITY_CONFIG.RATE_LIMITS[type] || SECURITY_CONFIG.RATE_LIMITS.DEFAULT;
};

export const getFileUploadConfig = (type: keyof typeof SECURITY_CONFIG.FILE_UPLOAD) => {
  return SECURITY_CONFIG.FILE_UPLOAD[type];
};

export const getInputLimitConfig = (field: string) => {
  return SECURITY_CONFIG.INPUT_LIMITS.TEXT[field as keyof typeof SECURITY_CONFIG.INPUT_LIMITS.TEXT];
};

// 验证IP是否在白名单中
export const isIPWhitelisted = (ip: string): boolean => {
  if (!SECURITY_CONFIG.IP_WHITELIST.enabled) {
    return true;
  }
  return SECURITY_CONFIG.IP_WHITELIST.allowedIPs.includes(ip);
};

// 生成内容安全策略头
export const generateCSPHeader = (): string => {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  
  return csp.join('; ');
};