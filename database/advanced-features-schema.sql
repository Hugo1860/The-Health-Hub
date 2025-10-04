-- Advanced Features Database Schema for Health Hub
-- Includes: Subscriptions, Advanced Playlists, Learning Progress, User Behavior, Social Features

-- 用户订阅表
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  subscription_type ENUM('category', 'speaker', 'user', 'playlist') NOT NULL,
  target_id VARCHAR(255) NOT NULL, -- category_id, speaker_name, user_id, or playlist_id
  target_name VARCHAR(255), -- for display purposes
  notification_enabled BOOLEAN DEFAULT TRUE,
  notification_frequency ENUM('immediate', 'daily', 'weekly') DEFAULT 'immediate',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_subscription (user_id, subscription_type, target_id),
  INDEX idx_user_subscriptions (user_id),
  INDEX idx_target_subscriptions (subscription_type, target_id)
);

-- 通知队列表
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  type ENUM('new_audio', 'new_comment', 'new_follower', 'playlist_update', 'system') NOT NULL,
  title VARCHAR(500) NOT NULL,
  message TEXT,
  data JSON, -- 额外数据如audio_id, user_id等
  read_at TIMESTAMP NULL,
  sent_at TIMESTAMP NULL,
  delivery_method ENUM('in_app', 'email', 'push') DEFAULT 'in_app',
  priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  INDEX idx_user_notifications (user_id, created_at),
  INDEX idx_unread_notifications (user_id, read_at),
  INDEX idx_notification_type (type, created_at)
);

-- 高级播放列表表
CREATE TABLE IF NOT EXISTS playlists (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cover_image VARCHAR(1000),
  is_public BOOLEAN DEFAULT FALSE,
  is_collaborative BOOLEAN DEFAULT FALSE,
  total_duration INT DEFAULT 0, -- 总时长（秒）
  audio_count INT DEFAULT 0,
  play_count INT DEFAULT 0,
  like_count INT DEFAULT 0,
  tags JSON, -- 播放列表标签
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_playlists (user_id, created_at),
  INDEX idx_public_playlists (is_public, created_at),
  INDEX idx_playlist_stats (play_count, like_count)
);

-- 播放列表音频关联表
CREATE TABLE IF NOT EXISTS playlist_items (
  id VARCHAR(255) PRIMARY KEY,
  playlist_id VARCHAR(255) NOT NULL,
  audio_id VARCHAR(255) NOT NULL,
  position INT NOT NULL,
  added_by VARCHAR(255), -- 添加者用户ID（协作播放列表）
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  personal_note TEXT, -- 个人笔记
  UNIQUE KEY unique_playlist_audio (playlist_id, audio_id),
  INDEX idx_playlist_items (playlist_id, position),
  INDEX idx_audio_playlists (audio_id)
);

-- 学习进度跟踪表
CREATE TABLE IF NOT EXISTS learning_progress (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  audio_id VARCHAR(255) NOT NULL,
  progress_percentage DECIMAL(5,2) DEFAULT 0.00, -- 0.00-100.00
  last_position INT DEFAULT 0, -- 最后播放位置（秒）
  total_listen_time INT DEFAULT 0, -- 总听取时间（秒）
  completion_status ENUM('not_started', 'in_progress', 'completed', 'bookmarked') DEFAULT 'not_started',
  first_played_at TIMESTAMP NULL,
  last_played_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  notes TEXT, -- 用户学习笔记
  rating TINYINT, -- 1-5星评分
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_audio_progress (user_id, audio_id),
  INDEX idx_user_progress (user_id, last_played_at),
  INDEX idx_audio_progress (audio_id, completion_status),
  INDEX idx_completion_stats (completion_status, completed_at)
);

-- 用户行为分析表
CREATE TABLE IF NOT EXISTS user_behavior_events (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(255),
  session_id VARCHAR(255),
  event_type ENUM('page_view', 'audio_play', 'audio_pause', 'audio_seek', 'search', 'filter', 'like', 'share', 'comment', 'playlist_create', 'follow') NOT NULL,
  event_data JSON, -- 事件详细数据
  page_url VARCHAR(1000),
  referrer VARCHAR(1000),
  user_agent TEXT,
  ip_address VARCHAR(45),
  device_type ENUM('desktop', 'mobile', 'tablet') DEFAULT 'desktop',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_events (user_id, created_at),
  INDEX idx_session_events (session_id, created_at),
  INDEX idx_event_type (event_type, created_at),
  INDEX idx_behavior_analysis (user_id, event_type, created_at)
);

-- 用户关注关系表
CREATE TABLE IF NOT EXISTS user_follows (
  id VARCHAR(255) PRIMARY KEY,
  follower_id VARCHAR(255) NOT NULL, -- 关注者
  following_id VARCHAR(255) NOT NULL, -- 被关注者
  follow_type ENUM('user', 'speaker', 'category') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_follow (follower_id, following_id, follow_type),
  INDEX idx_follower (follower_id, created_at),
  INDEX idx_following (following_id, created_at),
  INDEX idx_follow_type (follow_type, created_at)
);

-- 用户活动动态表
CREATE TABLE IF NOT EXISTS user_activities (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  activity_type ENUM('played_audio', 'created_playlist', 'liked_audio', 'commented', 'followed_user', 'shared_content') NOT NULL,
  target_type ENUM('audio', 'playlist', 'user', 'comment') NOT NULL,
  target_id VARCHAR(255) NOT NULL,
  activity_data JSON, -- 活动详细信息
  is_public BOOLEAN DEFAULT TRUE, -- 是否公开显示
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_activities (user_id, created_at),
  INDEX idx_public_activities (is_public, created_at),
  INDEX idx_activity_type (activity_type, created_at)
);

-- 音频点赞表
CREATE TABLE IF NOT EXISTS audio_likes (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  audio_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_audio_like (user_id, audio_id),
  INDEX idx_user_likes (user_id, created_at),
  INDEX idx_audio_likes (audio_id, created_at)
);

-- 播放列表点赞表
CREATE TABLE IF NOT EXISTS playlist_likes (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  playlist_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_playlist_like (user_id, playlist_id),
  INDEX idx_user_playlist_likes (user_id, created_at),
  INDEX idx_playlist_likes (playlist_id, created_at)
);

-- 分享记录表
CREATE TABLE IF NOT EXISTS content_shares (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  content_type ENUM('audio', 'playlist', 'category') NOT NULL,
  content_id VARCHAR(255) NOT NULL,
  share_method ENUM('link', 'social', 'email', 'qr_code') NOT NULL,
  share_platform VARCHAR(100), -- 微信、微博、QQ等
  share_data JSON, -- 分享的额外数据
  clicks INT DEFAULT 0, -- 分享链接点击次数
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_shares (user_id, created_at),
  INDEX idx_content_shares (content_type, content_id, created_at),
  INDEX idx_share_stats (share_method, created_at)
);

-- 学习成就表
CREATE TABLE IF NOT EXISTS user_achievements (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  achievement_type ENUM('listening_time', 'content_completion', 'social_engagement', 'knowledge_mastery') NOT NULL,
  achievement_name VARCHAR(255) NOT NULL,
  achievement_description TEXT,
  progress_current INT DEFAULT 0,
  progress_target INT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP NULL,
  badge_icon VARCHAR(50),
  badge_color VARCHAR(7),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_achievements (user_id, is_completed),
  INDEX idx_achievement_type (achievement_type, completed_at)
);

-- 用户学习统计表
CREATE TABLE IF NOT EXISTS user_learning_stats (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  total_listen_time INT DEFAULT 0, -- 当日总听取时间（秒）
  audios_completed INT DEFAULT 0, -- 当日完成音频数
  audios_started INT DEFAULT 0, -- 当日开始音频数
  categories_explored INT DEFAULT 0, -- 当日探索分类数
  notes_created INT DEFAULT 0, -- 当日创建笔记数
  social_interactions INT DEFAULT 0, -- 当日社交互动数
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_date_stats (user_id, date),
  INDEX idx_user_stats (user_id, date),
  INDEX idx_daily_stats (date)
);

-- 播放列表协作者表
CREATE TABLE IF NOT EXISTS playlist_collaborators (
  id VARCHAR(255) PRIMARY KEY,
  playlist_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  permission_level ENUM('view', 'add', 'edit', 'admin') DEFAULT 'add',
  invited_by VARCHAR(255) NOT NULL,
  invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP NULL,
  status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
  UNIQUE KEY unique_playlist_collaborator (playlist_id, user_id),
  INDEX idx_playlist_collaborators (playlist_id, status),
  INDEX idx_user_collaborations (user_id, status)
);
