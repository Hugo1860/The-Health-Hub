-- PostgreSQL数据库架构
-- 健康中心应用数据库结构

-- 创建数据库（如果需要）
-- CREATE DATABASE health_hub;

-- 使用UUID扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 用户表
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'admin')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'inactive', 'banned')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    preferences JSONB DEFAULT '{
        "theme": "light",
        "autoplay": false,
        "defaultPlaybackRate": 1,
        "defaultVolume": 0.8
    }'::jsonb
);

-- 分类表
CREATE TABLE categories (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6b7280',
    icon VARCHAR(10) DEFAULT '📂',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 音频表
CREATE TABLE audios (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    filename VARCHAR(500) NOT NULL,
    url VARCHAR(1000) NOT NULL,
    cover_image VARCHAR(1000),
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    subject VARCHAR(255),
    tags TEXT,
    size BIGINT,
    duration REAL,
    speaker VARCHAR(255),
    recording_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    category_id VARCHAR(255),
    subcategory_id VARCHAR(255),
    CONSTRAINT fk_audios_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    CONSTRAINT fk_audios_subcategory FOREIGN KEY (subcategory_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- 问题表
CREATE TABLE questions (
    id VARCHAR(255) PRIMARY KEY,
    audio_id VARCHAR(255),
    user_id VARCHAR(255),
    username VARCHAR(255),
    title VARCHAR(500),
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (audio_id) REFERENCES audios(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 答案表
CREATE TABLE answers (
    id VARCHAR(255) PRIMARY KEY,
    question_id VARCHAR(255),
    user_id VARCHAR(255),
    username VARCHAR(255),
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_accepted BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 章节表
CREATE TABLE chapters (
    id VARCHAR(255) PRIMARY KEY,
    audio_id VARCHAR(255),
    title VARCHAR(500),
    description TEXT,
    start_time REAL,
    end_time REAL,
    chapter_order INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (audio_id) REFERENCES audios(id) ON DELETE CASCADE
);

-- 评论表
CREATE TABLE comments (
    id VARCHAR(255) PRIMARY KEY,
    audio_id VARCHAR(255),
    user_id VARCHAR(255),
    username VARCHAR(255),
    content TEXT,
    parent_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (audio_id) REFERENCES audios(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- 标记表
CREATE TABLE markers (
    id VARCHAR(255) PRIMARY KEY,
    audio_id VARCHAR(255),
    title VARCHAR(500),
    description TEXT,
    time_position REAL,
    marker_type VARCHAR(50) DEFAULT 'note',
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (audio_id) REFERENCES audios(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 通知表
CREATE TABLE notifications (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255),
    notification_type VARCHAR(100),
    title VARCHAR(500),
    message TEXT,
    related_id VARCHAR(255),
    related_type VARCHAR(100),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 评分表
CREATE TABLE ratings (
    id VARCHAR(255) PRIMARY KEY,
    audio_id VARCHAR(255),
    user_id VARCHAR(255),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (audio_id) REFERENCES audios(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(audio_id, user_id)
);

-- 收藏表
CREATE TABLE favorites (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    audio_id VARCHAR(255),
    user_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (audio_id) REFERENCES audios(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(audio_id, user_id)
);

-- 相关资源表
CREATE TABLE related_resources (
    id VARCHAR(255) PRIMARY KEY,
    audio_id VARCHAR(255),
    title VARCHAR(500),
    url VARCHAR(1000),
    resource_type VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (audio_id) REFERENCES audios(id) ON DELETE CASCADE
);

-- 幻灯片表
CREATE TABLE slides (
    id VARCHAR(255) PRIMARY KEY,
    audio_id VARCHAR(255),
    image_url VARCHAR(1000),
    timestamp_position REAL,
    title VARCHAR(500),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (audio_id) REFERENCES audios(id) ON DELETE CASCADE
);

-- 订阅表
CREATE TABLE subscriptions (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255),
    subscription_type VARCHAR(100),
    value VARCHAR(500),
    notification_method VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 转录表
CREATE TABLE transcriptions (
    id VARCHAR(255) PRIMARY KEY,
    audio_id VARCHAR(255),
    language VARCHAR(10) DEFAULT 'zh-CN',
    full_text TEXT,
    segments JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processing_time INTEGER,
    FOREIGN KEY (audio_id) REFERENCES audios(id) ON DELETE CASCADE
);

-- 播放状态表
CREATE TABLE audio_resume_states (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    audio_id VARCHAR(255) NOT NULL,
    position REAL NOT NULL DEFAULT 0,
    session_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, audio_id),
    FOREIGN KEY (audio_id) REFERENCES audios(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 查询性能表
CREATE TABLE query_performance (
    id SERIAL PRIMARY KEY,
    query_hash VARCHAR(255) NOT NULL,
    query_sql TEXT NOT NULL,
    execution_time REAL NOT NULL,
    rows_affected INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 日志表
CREATE TABLE logs (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('error', 'metric', 'action')),
    data JSONB NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
-- 用户表索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status, role);
CREATE INDEX idx_users_created ON users(created_at DESC);

-- 音频表索引
CREATE INDEX idx_audios_subject ON audios(subject);
CREATE INDEX idx_audios_upload_date ON audios(upload_date DESC);
CREATE INDEX idx_audios_title ON audios(title);
CREATE INDEX idx_audios_search ON audios(title, subject, tags);
CREATE INDEX idx_audios_duration ON audios(duration);
CREATE INDEX idx_audios_composite ON audios(subject, upload_date DESC, duration);

-- 评论表索引
CREATE INDEX idx_comments_audio_time ON comments(audio_id, created_at DESC);
CREATE INDEX idx_comments_user ON comments(user_id);

-- 评分表索引
CREATE INDEX idx_ratings_audio ON ratings(audio_id, rating);
CREATE INDEX idx_ratings_user ON ratings(user_id);

-- 收藏表索引
CREATE INDEX idx_favorites_user ON favorites(user_id, created_at DESC);
CREATE INDEX idx_favorites_audio ON favorites(audio_id);

-- 问题表索引
CREATE INDEX idx_questions_audio ON questions(audio_id, created_at DESC);

-- 答案表索引
CREATE INDEX idx_answers_question ON answers(question_id, created_at DESC);

-- 章节表索引
CREATE INDEX idx_chapters_audio ON chapters(audio_id, chapter_order);

-- 标记表索引
CREATE INDEX idx_markers_audio ON markers(audio_id, time_position);

-- 通知表索引
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);

-- 订阅表索引
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id, is_active);

-- 转录表索引
CREATE INDEX idx_transcriptions_audio ON transcriptions(audio_id, language);

-- 播放状态表索引
CREATE INDEX idx_resume_user_audio ON audio_resume_states(user_id, audio_id);
CREATE INDEX idx_resume_updated ON audio_resume_states(updated_at DESC);
CREATE INDEX idx_resume_session ON audio_resume_states(session_id);

-- 查询性能表索引
CREATE INDEX idx_query_performance_hash ON query_performance(query_hash);
CREATE INDEX idx_query_performance_time ON query_performance(timestamp DESC);

-- 日志表索引
CREATE INDEX idx_logs_session ON logs(session_id);
CREATE INDEX idx_logs_type ON logs(type);
CREATE INDEX idx_logs_created ON logs(created_at DESC);
CREATE INDEX idx_logs_timestamp ON logs(timestamp DESC);

-- API性能监控表
CREATE TABLE api_metrics (
    id SERIAL PRIMARY KEY,
    endpoint VARCHAR(500) NOT NULL,
    method VARCHAR(10) NOT NULL,
    response_time REAL NOT NULL,
    status_code INTEGER NOT NULL,
    user_agent TEXT,
    ip VARCHAR(45),
    error TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- API性能监控表索引
CREATE INDEX idx_api_metrics_endpoint ON api_metrics(endpoint);
CREATE INDEX idx_api_metrics_timestamp ON api_metrics(timestamp DESC);
CREATE INDEX idx_api_metrics_response_time ON api_metrics(response_time DESC);
CREATE INDEX idx_api_metrics_status ON api_metrics(status_code);

-- 创建触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表创建更新时间触发器
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chapters_updated_at BEFORE UPDATE ON chapters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transcriptions_updated_at BEFORE UPDATE ON transcriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resume_states_updated_at BEFORE UPDATE ON audio_resume_states
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();