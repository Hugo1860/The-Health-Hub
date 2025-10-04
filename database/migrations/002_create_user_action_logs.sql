-- 创建用户操作日志表
CREATE TABLE IF NOT EXISTS user_action_logs (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255),
  action VARCHAR(50) NOT NULL COMMENT '操作类型: login, logout, register, view, play, favorite, comment, share, download',
  description TEXT COMMENT '操作描述',
  ip_address VARCHAR(45) COMMENT 'IP地址',
  user_agent TEXT COMMENT '用户代理信息',
  metadata JSON COMMENT '额外元数据',
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户操作日志表';

-- 为audios表添加play_count字段（如果不存在）
ALTER TABLE audios 
ADD COLUMN IF NOT EXISTS play_count INT DEFAULT 0 COMMENT '播放次数';

-- 为play_count字段添加索引
CREATE INDEX IF NOT EXISTS idx_play_count ON audios(play_count);

