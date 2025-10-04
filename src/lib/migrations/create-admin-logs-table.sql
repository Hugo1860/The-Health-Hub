-- 创建管理员日志表
CREATE TABLE IF NOT EXISTS admin_logs (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error', 'debug')),
  message TEXT NOT NULL,
  source TEXT NOT NULL,
  user_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  method TEXT,
  url TEXT,
  status_code INTEGER,
  response_time INTEGER,
  metadata TEXT, -- JSON格式的元数据
  created_at TEXT NOT NULL,
  
  -- 外键约束
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_logs_level ON admin_logs(level);
CREATE INDEX IF NOT EXISTS idx_admin_logs_source ON admin_logs(source);
CREATE INDEX IF NOT EXISTS idx_admin_logs_user_id ON admin_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_ip_address ON admin_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_admin_logs_level_created_at ON admin_logs(level, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_logs_source_created_at ON admin_logs(source, created_at);

-- 插入一些示例数据
INSERT OR IGNORE INTO admin_logs (
  id, level, message, source, user_id, ip_address, 
  user_agent, method, url, status_code, response_time, 
  metadata, created_at
) VALUES 
(
  'log_sample_1',
  'info',
  '管理员登录成功',
  'auth',
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
  '192.168.1.100',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'POST',
  '/api/auth/signin',
  200,
  150,
  '{"email": "admin@example.com", "success": true}',
  datetime('now', '-1 hour')
),
(
  'log_sample_2',
  'warn',
  '多次登录失败尝试',
  'security',
  NULL,
  '192.168.1.200',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'POST',
  '/api/auth/signin',
  401,
  100,
  '{"attempts": 5, "blocked": false, "email": "unknown@example.com"}',
  datetime('now', '-30 minutes')
),
(
  'log_sample_3',
  'info',
  '管理员操作: 创建新音频',
  'admin',
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
  '192.168.1.100',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'POST',
  '/api/admin/simple-audio',
  201,
  2500,
  '{"action": "create_audio", "title": "新音频文件", "filename": "audio_sample.mp3"}',
  datetime('now', '-15 minutes')
),
(
  'log_sample_4',
  'error',
  '系统错误: 数据库连接失败',
  'system',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  '{"context": "database_connection", "error": "Connection timeout after 30s"}',
  datetime('now', '-10 minutes')
),
(
  'log_sample_5',
  'info',
  '文件上传成功: cover_image.jpg',
  'file',
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
  '192.168.1.100',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'POST',
  '/api/upload-cover',
  200,
  1200,
  '{"operation": "upload", "filename": "cover_image.jpg", "size": 245760, "success": true}',
  datetime('now', '-5 minutes')
);