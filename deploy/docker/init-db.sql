-- PostgreSQL 初始化与导入前置脚本
-- 可重复执行：包含 DROP IF EXISTS 以便再次导入

-- 关闭外键以便清理与重建
SET session_replication_role = replica;

DROP TABLE IF EXISTS answers;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS markers;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS ratings;
DROP TABLE IF EXISTS related_resources;
DROP TABLE IF EXISTS slides;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS transcriptions;
DROP TABLE IF EXISTS audio_resume_states;
DROP TABLE IF EXISTS chapters;
DROP TABLE IF EXISTS audios;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

-- 用户
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NULL,
  last_login TIMESTAMPTZ NULL,
  preferences JSONB NULL
);

-- 分类
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NULL,
  color TEXT NULL,
  icon TEXT NULL,
  parent_id TEXT NULL REFERENCES categories(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS audios (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NULL,
  filename TEXT NOT NULL,
  url TEXT NOT NULL,
  cover_image TEXT NULL,
  upload_date TIMESTAMPTZ NULL,
  subject TEXT NULL,
  tags JSONB NULL,
  size BIGINT NULL,
  duration DOUBLE PRECISION NULL,
  speaker TEXT NULL,
  recording_date TIMESTAMPTZ NULL,
  status TEXT NULL,
  -- 播放次数（用于排行/点击数）
  play_count INTEGER NOT NULL DEFAULT 0,
  category_id TEXT NULL REFERENCES categories(id) ON DELETE SET NULL,
  subcategory_id TEXT NULL REFERENCES categories(id) ON DELETE SET NULL
);

-- 提问
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  audio_id TEXT NULL REFERENCES audios(id) ON DELETE SET NULL,
  user_id TEXT NULL REFERENCES users(id) ON DELETE SET NULL,
  username TEXT NULL,
  title TEXT NULL,
  content TEXT NULL,
  created_at TIMESTAMPTZ NULL
);

-- 回答
CREATE TABLE IF NOT EXISTS answers (
  id TEXT PRIMARY KEY,
  question_id TEXT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_id TEXT NULL REFERENCES users(id) ON DELETE SET NULL,
  username TEXT NULL,
  content TEXT NULL,
  created_at TIMESTAMPTZ NULL,
  is_accepted BOOLEAN NULL
);

-- 章节
CREATE TABLE IF NOT EXISTS chapters (
  id TEXT PRIMARY KEY,
  audio_id TEXT NULL REFERENCES audios(id) ON DELETE CASCADE,
  title TEXT NULL,
  description TEXT NULL,
  start_time DOUBLE PRECISION NULL,
  end_time DOUBLE PRECISION NULL,
  chapter_order INTEGER NULL,
  created_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  audio_id TEXT NULL REFERENCES audios(id) ON DELETE CASCADE,
  user_id TEXT NULL REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NULL,
  parent_id TEXT NULL,
  created_at TIMESTAMPTZ NULL,
  -- 审核相关字段：默认 pending，审核通过后设为 approved；拒绝为 rejected
  status TEXT NOT NULL DEFAULT 'pending',
  moderated_at TIMESTAMPTZ NULL,
  moderated_by TEXT NULL,
  moderation_reason TEXT NULL
);

-- 标记
CREATE TABLE IF NOT EXISTS markers (
  id TEXT PRIMARY KEY,
  audio_id TEXT NULL REFERENCES audios(id) ON DELETE CASCADE,
  title TEXT NULL,
  description TEXT NULL,
  time_position DOUBLE PRECISION NULL,
  marker_type TEXT NULL,
  created_by TEXT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NULL
);

-- 通知
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type TEXT NULL,
  title TEXT NULL,
  message TEXT NULL,
  related_id TEXT NULL,
  related_type TEXT NULL,
  is_read BOOLEAN NULL,
  created_at TIMESTAMPTZ NULL
);

-- 评分
CREATE TABLE IF NOT EXISTS ratings (
  id TEXT PRIMARY KEY,
  audio_id TEXT NULL REFERENCES audios(id) ON DELETE CASCADE,
  user_id TEXT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NULL,
  created_at TIMESTAMPTZ NULL
);

-- 相关资源
CREATE TABLE IF NOT EXISTS related_resources (
  id TEXT PRIMARY KEY,
  audio_id TEXT NULL REFERENCES audios(id) ON DELETE CASCADE,
  title TEXT NULL,
  url TEXT NULL,
  resource_type TEXT NULL,
  description TEXT NULL
);

-- 幻灯片
CREATE TABLE IF NOT EXISTS slides (
  id TEXT PRIMARY KEY,
  audio_id TEXT NULL REFERENCES audios(id) ON DELETE CASCADE,
  image_url TEXT NULL,
  timestamp_position DOUBLE PRECISION NULL,
  title TEXT NULL,
  description TEXT NULL
);

-- 订阅
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_type TEXT NULL,
  value TEXT NULL,
  notification_method TEXT NULL,
  created_at TIMESTAMPTZ NULL,
  is_active BOOLEAN NULL
);

-- 转写
CREATE TABLE IF NOT EXISTS transcriptions (
  id TEXT PRIMARY KEY,
  audio_id TEXT NULL REFERENCES audios(id) ON DELETE CASCADE,
  language TEXT NULL,
  full_text TEXT NULL,
  segments JSONB NULL,
  status TEXT NULL,
  created_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NULL,
  processing_time INTEGER NULL
);

-- 断点续传状态（用于流媒体续播）
CREATE TABLE IF NOT EXISTS audio_resume_states (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  audio_id TEXT NOT NULL REFERENCES audios(id) ON DELETE CASCADE,
  position DOUBLE PRECISION NOT NULL DEFAULT 0,
  session_id TEXT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, audio_id)
);

-- 索引（按需）
-- 统一后的 snake_case 索引
CREATE INDEX IF NOT EXISTS idx_questions_audio_id ON questions(audio_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);
CREATE INDEX IF NOT EXISTS idx_comments_audio_id ON comments(audio_id);
CREATE INDEX IF NOT EXISTS idx_markers_audio_id ON markers(audio_id);
CREATE INDEX IF NOT EXISTS idx_ratings_audio_id ON ratings(audio_id);

-- audios 表常用查询索引
CREATE INDEX IF NOT EXISTS idx_audios_upload_date ON audios(upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_audios_category ON audios(category_id);
CREATE INDEX IF NOT EXISTS idx_audios_subcategory ON audios(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_audios_categories ON audios(category_id, subcategory_id);

-- 恢复外键检查
SET session_replication_role = origin;


