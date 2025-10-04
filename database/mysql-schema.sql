-- MySQL 8 等价 schema（基于 PostgreSQL 版本改写）
-- 关键策略：
-- - UUID 采用 CHAR(36)，由应用层生成或使用 UUID()；
-- - TIMESTAMPTZ → DATETIME(3)，统一写入 UTC；
-- - JSONB → JSON；
-- - SERIAL → BIGINT AUTO_INCREMENT（仅用于自增表）；
-- - CHECK 约束尽量保留（>=8.0.16 有效），并在应用层兜底校验；
-- - 触发器与过程使用 MySQL 语法；

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE DATABASE IF NOT EXISTS `health_hub` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE `health_hub`;

-- users
CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    last_login DATETIME(3) NULL,
    preferences JSON NULL,
    CHECK (role IN ('user','admin')),
    CHECK (status IN ('active','inactive','banned'))
) ENGINE=InnoDB;

-- categories
CREATE TABLE IF NOT EXISTS categories (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6b7280',
    icon VARCHAR(10) DEFAULT '📂',
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;

-- audios
CREATE TABLE IF NOT EXISTS audios (
    id CHAR(36) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    filename VARCHAR(500) NOT NULL,
    url VARCHAR(1000) NOT NULL,
    cover_image VARCHAR(1000),
    upload_date DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    subject VARCHAR(255),
    tags TEXT,
    size BIGINT,
    duration DOUBLE,
    speaker VARCHAR(255),
    recording_date DATETIME(3) NULL,
    status VARCHAR(20) DEFAULT 'draft',
    category_id CHAR(36) NULL,
    subcategory_id CHAR(36) NULL,
    CONSTRAINT fk_audios_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    CONSTRAINT fk_audios_subcategory FOREIGN KEY (subcategory_id) REFERENCES categories(id) ON DELETE SET NULL,
    CHECK (status IN ('draft','published','archived'))
) ENGINE=InnoDB;

-- questions
CREATE TABLE IF NOT EXISTS questions (
    id CHAR(36) PRIMARY KEY,
    audio_id CHAR(36),
    user_id CHAR(36),
    username VARCHAR(255),
    title VARCHAR(500),
    content TEXT,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_questions_audio FOREIGN KEY (audio_id) REFERENCES audios(id) ON DELETE CASCADE,
    CONSTRAINT fk_questions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- answers
CREATE TABLE IF NOT EXISTS answers (
    id CHAR(36) PRIMARY KEY,
    question_id CHAR(36),
    user_id CHAR(36),
    username VARCHAR(255),
    content TEXT,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    is_accepted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_answers_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    CONSTRAINT fk_answers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- chapters
CREATE TABLE IF NOT EXISTS chapters (
    id CHAR(36) PRIMARY KEY,
    audio_id CHAR(36),
    title VARCHAR(500),
    description TEXT,
    start_time DOUBLE,
    end_time DOUBLE,
    chapter_order INT,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_chapters_audio FOREIGN KEY (audio_id) REFERENCES audios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- comments
CREATE TABLE IF NOT EXISTS comments (
    id CHAR(36) PRIMARY KEY,
    audio_id CHAR(36),
    user_id CHAR(36),
    username VARCHAR(255),
    content TEXT,
    parent_id CHAR(36),
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_comments_audio FOREIGN KEY (audio_id) REFERENCES audios(id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_parent FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- markers
CREATE TABLE IF NOT EXISTS markers (
    id CHAR(36) PRIMARY KEY,
    audio_id CHAR(36),
    title VARCHAR(500),
    description TEXT,
    time_position DOUBLE,
    marker_type VARCHAR(50) DEFAULT 'note',
    created_by CHAR(36),
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_markers_audio FOREIGN KEY (audio_id) REFERENCES audios(id) ON DELETE CASCADE,
    CONSTRAINT fk_markers_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- notifications
CREATE TABLE IF NOT EXISTS notifications (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36),
    notification_type VARCHAR(100),
    title VARCHAR(500),
    message TEXT,
    related_id CHAR(36),
    related_type VARCHAR(100),
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ratings
CREATE TABLE IF NOT EXISTS ratings (
    id CHAR(36) PRIMARY KEY,
    audio_id CHAR(36),
    user_id CHAR(36),
    rating INT,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_ratings_audio FOREIGN KEY (audio_id) REFERENCES audios(id) ON DELETE CASCADE,
    CONSTRAINT fk_ratings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_ratings_audio_user (audio_id, user_id),
    CHECK (rating >= 1 AND rating <= 5)
) ENGINE=InnoDB;

-- favorites
CREATE TABLE IF NOT EXISTS favorites (
    id CHAR(36) PRIMARY KEY,
    audio_id CHAR(36),
    user_id CHAR(36),
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_fav_audio FOREIGN KEY (audio_id) REFERENCES audios(id) ON DELETE CASCADE,
    CONSTRAINT fk_fav_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_fav_audio_user (audio_id, user_id)
) ENGINE=InnoDB;

-- related_resources
CREATE TABLE IF NOT EXISTS related_resources (
    id CHAR(36) PRIMARY KEY,
    audio_id CHAR(36),
    title VARCHAR(500),
    url VARCHAR(1000),
    resource_type VARCHAR(100),
    description TEXT,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_rr_audio FOREIGN KEY (audio_id) REFERENCES audios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- slides
CREATE TABLE IF NOT EXISTS slides (
    id CHAR(36) PRIMARY KEY,
    audio_id CHAR(36),
    image_url VARCHAR(1000),
    timestamp_position DOUBLE,
    title VARCHAR(500),
    description TEXT,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_slides_audio FOREIGN KEY (audio_id) REFERENCES audios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36),
    subscription_type VARCHAR(100),
    value VARCHAR(500),
    notification_method VARCHAR(100),
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT fk_sub_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- transcriptions
CREATE TABLE IF NOT EXISTS transcriptions (
    id CHAR(36) PRIMARY KEY,
    audio_id CHAR(36),
    language VARCHAR(10) DEFAULT 'zh-CN',
    full_text TEXT,
    segments JSON,
    status VARCHAR(50) DEFAULT 'pending',
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    processing_time INT,
    CONSTRAINT fk_tr_audio FOREIGN KEY (audio_id) REFERENCES audios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- audio_resume_states（PG为复合主键/或自增ID的两种定义均已见，这里采用复合主键）
CREATE TABLE IF NOT EXISTS audio_resume_states (
    user_id CHAR(36) NOT NULL,
    audio_id CHAR(36) NOT NULL,
    position DOUBLE NOT NULL DEFAULT 0,
    session_id VARCHAR(255) NOT NULL,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (user_id, audio_id),
    CONSTRAINT fk_ars_audio FOREIGN KEY (audio_id) REFERENCES audios(id) ON DELETE CASCADE,
    CONSTRAINT fk_ars_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- query_performance
CREATE TABLE IF NOT EXISTS query_performance (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    query_hash VARCHAR(255) NOT NULL,
    query_sql TEXT NOT NULL,
    execution_time DOUBLE NOT NULL,
    rows_affected INT,
    timestamp DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;

-- logs
CREATE TABLE IF NOT EXISTS logs (
    id CHAR(36) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    data JSON NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    timestamp DATETIME(3) NOT NULL,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    CHECK (type IN ('error','metric','action'))
) ENGINE=InnoDB;

-- api_metrics
CREATE TABLE IF NOT EXISTS api_metrics (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    endpoint VARCHAR(500) NOT NULL,
    method VARCHAR(10) NOT NULL,
    response_time DOUBLE NOT NULL,
    status_code INT NOT NULL,
    user_agent TEXT,
    ip VARCHAR(45),
    error TEXT,
    timestamp DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;

-- 索引（考虑 MySQL 执行器差异，必要时调整覆盖顺序）
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status, role);
CREATE INDEX idx_users_created ON users(created_at);

CREATE INDEX idx_audios_subject ON audios(subject);
CREATE INDEX idx_audios_upload_date ON audios(upload_date);
CREATE INDEX idx_audios_title ON audios(title);
CREATE INDEX idx_audios_search ON audios(title, subject);
CREATE INDEX idx_audios_duration ON audios(duration);
CREATE INDEX idx_audios_composite ON audios(subject, upload_date, duration);

CREATE INDEX idx_comments_audio_time ON comments(audio_id, created_at);
CREATE INDEX idx_comments_user ON comments(user_id);

CREATE INDEX idx_ratings_audio ON ratings(audio_id, rating);
CREATE INDEX idx_ratings_user ON ratings(user_id);

CREATE INDEX idx_favorites_user ON favorites(user_id, created_at);
CREATE INDEX idx_favorites_audio ON favorites(audio_id);

CREATE INDEX idx_questions_audio ON questions(audio_id, created_at);
CREATE INDEX idx_answers_question ON answers(question_id, created_at);
CREATE INDEX idx_chapters_audio ON chapters(audio_id, chapter_order);
CREATE INDEX idx_markers_audio ON markers(audio_id, time_position);
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at);
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id, is_active);
CREATE INDEX idx_transcriptions_audio ON transcriptions(audio_id, language);
CREATE INDEX idx_resume_user_audio ON audio_resume_states(user_id, audio_id);
CREATE INDEX idx_resume_updated ON audio_resume_states(updated_at);
CREATE INDEX idx_resume_session ON audio_resume_states(session_id);

CREATE INDEX idx_query_performance_hash ON query_performance(query_hash);
CREATE INDEX idx_query_performance_time ON query_performance(timestamp);

CREATE INDEX idx_logs_session ON logs(session_id);
CREATE INDEX idx_logs_type ON logs(type);
CREATE INDEX idx_logs_created ON logs(created_at);
CREATE INDEX idx_logs_timestamp ON logs(timestamp);

-- 触发器：部分表的 updated_at 已用 ON UPDATE CURRENT_TIMESTAMP(3) 自动维护，
-- 其余需要的可补充 BEFORE UPDATE 触发器。


