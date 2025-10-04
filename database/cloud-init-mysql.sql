-- 健康中心云端数据库完整初始化脚本
-- MySQL 8+ 版本
-- 生成时间: 2025-09-26
-- 适用于直接在云端数据库中执行，无需额外初始化

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS `health_hub`
CHARACTER SET utf8mb4
COLLATE utf8mb4_0900_ai_ci;
USE `health_hub`;

-- =============================================================================
-- 用户表
-- =============================================================================
CREATE TABLE IF NOT EXISTS `users` (
    `id` CHAR(36) PRIMARY KEY,
    `username` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `role` VARCHAR(50) NOT NULL DEFAULT 'user',
    `status` VARCHAR(50) NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    `last_login` DATETIME(3) NULL,
    `preferences` JSON NULL,
    CONSTRAINT `chk_users_role` CHECK (`role` IN ('user', 'admin', 'moderator', 'editor')),
    CONSTRAINT `chk_users_status` CHECK (`status` IN ('active', 'inactive', 'banned', 'suspended'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 分类表
-- =============================================================================
CREATE TABLE IF NOT EXISTS `categories` (
    `id` CHAR(36) PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `color` VARCHAR(7) DEFAULT '#6b7280',
    `icon` VARCHAR(10) DEFAULT '📂',
    `parent_id` CHAR(36) NULL,
    `level` TINYINT NOT NULL DEFAULT 1,
    `sort_order` INT DEFAULT 0,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT `fk_categories_parent` FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL,
    CONSTRAINT `chk_categories_level` CHECK (`level` IN (1, 2))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 音频表
-- =============================================================================
CREATE TABLE IF NOT EXISTS `audios` (
    `id` CHAR(36) PRIMARY KEY,
    `title` VARCHAR(500) NOT NULL,
    `description` TEXT,
    `filename` VARCHAR(500) NOT NULL,
    `url` VARCHAR(1000) NOT NULL,
    `cover_image` VARCHAR(1000),
    `upload_date` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    `subject` VARCHAR(255),
    `tags` JSON,
    `size` BIGINT,
    `duration` DOUBLE,
    `speaker` VARCHAR(255),
    `recording_date` DATETIME(3) NULL,
    `status` VARCHAR(20) DEFAULT 'draft',
    `category_id` CHAR(36) NULL,
    `subcategory_id` CHAR(36) NULL,
    `play_count` INT DEFAULT 0,
    `like_count` INT DEFAULT 0,
    `download_count` INT DEFAULT 0,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT `fk_audios_category` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_audios_subcategory` FOREIGN KEY (`subcategory_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL,
    CONSTRAINT `chk_audios_status` CHECK (`status` IN ('draft', 'published', 'archived', 'private'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 问题表
-- =============================================================================
CREATE TABLE IF NOT EXISTS `questions` (
    `id` CHAR(36) PRIMARY KEY,
    `audio_id` CHAR(36),
    `user_id` CHAR(36),
    `username` VARCHAR(255),
    `title` VARCHAR(500),
    `content` TEXT,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT `fk_questions_audio` FOREIGN KEY (`audio_id`) REFERENCES `audios`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_questions_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_questions_audio` (`audio_id`),
    INDEX `idx_questions_user` (`user_id`),
    INDEX `idx_questions_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 答案表
-- =============================================================================
CREATE TABLE IF NOT EXISTS `answers` (
    `id` CHAR(36) PRIMARY KEY,
    `question_id` CHAR(36),
    `user_id` CHAR(36),
    `username` VARCHAR(255),
    `content` TEXT,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `is_accepted` BOOLEAN DEFAULT FALSE,
    CONSTRAINT `fk_answers_question` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_answers_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_answers_question` (`question_id`),
    INDEX `idx_answers_user` (`user_id`),
    INDEX `idx_answers_accepted` (`is_accepted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 评论表
-- =============================================================================
CREATE TABLE IF NOT EXISTS `comments` (
    `id` CHAR(36) PRIMARY KEY,
    `audio_id` CHAR(36),
    `user_id` CHAR(36),
    `username` VARCHAR(255),
    `content` TEXT,
    `parent_id` CHAR(36),
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT `fk_comments_audio` FOREIGN KEY (`audio_id`) REFERENCES `audios`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_comments_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_comments_parent` FOREIGN KEY (`parent_id`) REFERENCES `comments`(`id`) ON DELETE CASCADE,
    INDEX `idx_comments_audio` (`audio_id`),
    INDEX `idx_comments_user` (`user_id`),
    INDEX `idx_comments_parent` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 评分表
-- =============================================================================
CREATE TABLE IF NOT EXISTS `ratings` (
    `id` CHAR(36) PRIMARY KEY,
    `audio_id` CHAR(36),
    `user_id` CHAR(36),
    `rating` INT NOT NULL,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT `fk_ratings_audio` FOREIGN KEY (`audio_id`) REFERENCES `audios`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_ratings_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    CONSTRAINT `chk_ratings_rating` CHECK (`rating` >= 1 AND `rating` <= 5),
    UNIQUE KEY `uq_ratings_audio_user` (`audio_id`, `user_id`),
    INDEX `idx_ratings_audio` (`audio_id`),
    INDEX `idx_ratings_user` (`user_id`),
    INDEX `idx_ratings_rating` (`rating`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 收藏表
-- =============================================================================
CREATE TABLE IF NOT EXISTS `favorites` (
    `id` CHAR(36) PRIMARY KEY,
    `audio_id` CHAR(36),
    `user_id` CHAR(36),
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT `fk_favorites_audio` FOREIGN KEY (`audio_id`) REFERENCES `audios`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_favorites_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    UNIQUE KEY `uq_favorites_audio_user` (`audio_id`, `user_id`),
    INDEX `idx_favorites_user` (`user_id`),
    INDEX `idx_favorites_audio` (`audio_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 播放列表表
-- =============================================================================
CREATE TABLE IF NOT EXISTS `playlists` (
    `id` CHAR(36) PRIMARY KEY,
    `user_id` CHAR(36),
    `name` VARCHAR(500) NOT NULL,
    `description` TEXT,
    `is_public` BOOLEAN DEFAULT FALSE,
    `is_default` BOOLEAN DEFAULT FALSE,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT `fk_playlists_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_playlists_user` (`user_id`),
    INDEX `idx_playlists_public` (`is_public`),
    INDEX `idx_playlists_default` (`is_default`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 播放列表项目表
-- =============================================================================
CREATE TABLE IF NOT EXISTS `playlist_items` (
    `id` CHAR(36) PRIMARY KEY,
    `playlist_id` CHAR(36),
    `audio_id` CHAR(36),
    `position` INT NOT NULL,
    `added_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT `fk_playlist_items_playlist` FOREIGN KEY (`playlist_id`) REFERENCES `playlists`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_playlist_items_audio` FOREIGN KEY (`audio_id`) REFERENCES `audios`(`id`) ON DELETE CASCADE,
    UNIQUE KEY `uq_playlist_items` (`playlist_id`, `audio_id`),
    INDEX `idx_playlist_items_playlist` (`playlist_id`),
    INDEX `idx_playlist_items_audio` (`audio_id`),
    INDEX `idx_playlist_items_position` (`position`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 章节表
-- =============================================================================
CREATE TABLE IF NOT EXISTS `chapters` (
    `id` CHAR(36) PRIMARY KEY,
    `audio_id` CHAR(36),
    `title` VARCHAR(500),
    `description` TEXT,
    `start_time` DOUBLE,
    `end_time` DOUBLE,
    `chapter_order` INT,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT `fk_chapters_audio` FOREIGN KEY (`audio_id`) REFERENCES `audios`(`id`) ON DELETE CASCADE,
    INDEX `idx_chapters_audio` (`audio_id`),
    INDEX `idx_chapters_order` (`chapter_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 标记表
-- =============================================================================
CREATE TABLE IF NOT EXISTS `markers` (
    `id` CHAR(36) PRIMARY KEY,
    `audio_id` CHAR(36),
    `title` VARCHAR(500),
    `description` TEXT,
    `time_position` DOUBLE,
    `marker_type` VARCHAR(50) DEFAULT 'note',
    `created_by` CHAR(36),
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT `fk_markers_audio` FOREIGN KEY (`audio_id`) REFERENCES `audios`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_markers_user` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_markers_audio` (`audio_id`),
    INDEX `idx_markers_user` (`created_by`),
    INDEX `idx_markers_time` (`time_position`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 幻灯片表
-- =============================================================================
CREATE TABLE IF NOT EXISTS `slides` (
    `id` CHAR(36) PRIMARY KEY,
    `audio_id` CHAR(36),
    `image_url` VARCHAR(1000),
    `timestamp_position` DOUBLE,
    `title` VARCHAR(500),
    `description` TEXT,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT `fk_slides_audio` FOREIGN KEY (`audio_id`) REFERENCES `audios`(`id`) ON DELETE CASCADE,
    INDEX `idx_slides_audio` (`audio_id`),
    INDEX `idx_slides_timestamp` (`timestamp_position`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 相关资源表
-- =============================================================================
CREATE TABLE IF NOT EXISTS `related_resources` (
    `id` CHAR(36) PRIMARY KEY,
    `audio_id` CHAR(36),
    `title` VARCHAR(500),
    `url` VARCHAR(1000),
    `resource_type` VARCHAR(100),
    `description` TEXT,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT `fk_related_resources_audio` FOREIGN KEY (`audio_id`) REFERENCES `audios`(`id`) ON DELETE CASCADE,
    INDEX `idx_related_resources_audio` (`audio_id`),
    INDEX `idx_related_resources_type` (`resource_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 转录表
-- =============================================================================
CREATE TABLE IF NOT EXISTS `transcriptions` (
    `id` CHAR(36) PRIMARY KEY,
    `audio_id` CHAR(36),
    `language` VARCHAR(10) DEFAULT 'zh-CN',
    `full_text` TEXT,
    `segments` JSON,
    `status` VARCHAR(50) DEFAULT 'pending',
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `processing_time` INT,
    CONSTRAINT `fk_transcriptions_audio` FOREIGN KEY (`audio_id`) REFERENCES `audios`(`id`) ON DELETE CASCADE,
    INDEX `idx_transcriptions_audio` (`audio_id`),
    INDEX `idx_transcriptions_status` (`status`),
    INDEX `idx_transcriptions_language` (`language`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 订阅表
-- =============================================================================
CREATE TABLE IF NOT EXISTS `subscriptions` (
    `id` CHAR(36) PRIMARY KEY,
    `user_id` CHAR(36),
    `subscription_type` VARCHAR(100),
    `value` VARCHAR(500),
    `notification_method` VARCHAR(100),
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `is_active` BOOLEAN DEFAULT TRUE,
    CONSTRAINT `fk_subscriptions_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_subscriptions_user` (`user_id`),
    INDEX `idx_subscriptions_type` (`subscription_type`),
    INDEX `idx_subscriptions_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 通知表
-- =============================================================================
CREATE TABLE IF NOT EXISTS `notifications` (
    `id` CHAR(36) PRIMARY KEY,
    `user_id` CHAR(36),
    `notification_type` VARCHAR(100),
    `title` VARCHAR(500),
    `message` TEXT,
    `related_id` CHAR(36),
    `related_type` VARCHAR(100),
    `is_read` BOOLEAN DEFAULT FALSE,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_notifications_user` (`user_id`),
    INDEX `idx_notifications_type` (`notification_type`),
    INDEX `idx_notifications_read` (`is_read`),
    INDEX `idx_notifications_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 管理员日志表
-- =============================================================================
CREATE TABLE IF NOT EXISTS `admin_logs` (
    `id` CHAR(36) PRIMARY KEY,
    `level` VARCHAR(20) NOT NULL DEFAULT 'info',
    `message` TEXT NOT NULL,
    `source` VARCHAR(100) NOT NULL,
    `user_id` CHAR(36),
    `ip_address` VARCHAR(45),
    `user_agent` TEXT,
    `method` VARCHAR(10),
    `url` VARCHAR(1000),
    `status_code` INT,
    `response_time` INT,
    `metadata` JSON,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT `fk_admin_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    CONSTRAINT `chk_admin_logs_level` CHECK (`level` IN ('debug', 'info', 'warn', 'error', 'critical')),
    INDEX `idx_admin_logs_created` (`created_at`),
    INDEX `idx_admin_logs_level` (`level`),
    INDEX `idx_admin_logs_source` (`source`),
    INDEX `idx_admin_logs_user` (`user_id`),
    INDEX `idx_admin_logs_ip` (`ip_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 音频恢复状态表
-- =============================================================================
CREATE TABLE IF NOT EXISTS `audio_resume_states` (
    `user_id` CHAR(36) NOT NULL,
    `audio_id` CHAR(36) NOT NULL,
    `position` DOUBLE NOT NULL DEFAULT 0,
    `session_id` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`user_id`, `audio_id`),
    CONSTRAINT `fk_resume_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_resume_audio` FOREIGN KEY (`audio_id`) REFERENCES `audios`(`id`) ON DELETE CASCADE,
    INDEX `idx_resume_updated` (`updated_at`),
    INDEX `idx_resume_session` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 查询性能监控表
-- =============================================================================
CREATE TABLE IF NOT EXISTS `query_performance` (
    `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
    `query_hash` VARCHAR(255) NOT NULL,
    `query_sql` TEXT NOT NULL,
    `execution_time` DOUBLE NOT NULL,
    `rows_affected` INT,
    `timestamp` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `idx_query_performance_hash` (`query_hash`),
    INDEX `idx_query_performance_time` (`timestamp`),
    INDEX `idx_query_performance_exec_time` (`execution_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- API性能指标表
-- =============================================================================
CREATE TABLE IF NOT EXISTS `api_metrics` (
    `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
    `endpoint` VARCHAR(500) NOT NULL,
    `method` VARCHAR(10) NOT NULL,
    `response_time` DOUBLE NOT NULL,
    `status_code` INT NOT NULL,
    `user_agent` TEXT,
    `ip` VARCHAR(45),
    `error` TEXT,
    `timestamp` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `idx_api_metrics_endpoint` (`endpoint`),
    INDEX `idx_api_metrics_method` (`method`),
    INDEX `idx_api_metrics_time` (`timestamp`),
    INDEX `idx_api_metrics_status` (`status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 系统日志表
-- =============================================================================
CREATE TABLE IF NOT EXISTS `logs` (
    `id` CHAR(36) PRIMARY KEY,
    `type` VARCHAR(50) NOT NULL,
    `data` JSON NOT NULL,
    `session_id` VARCHAR(255) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT `chk_logs_type` CHECK (`type` IN ('error', 'metric', 'action', 'debug', 'security')),
    INDEX `idx_logs_session` (`session_id`),
    INDEX `idx_logs_type` (`type`),
    INDEX `idx_logs_created` (`created_at`),
    INDEX `idx_logs_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 监控记录表
-- =============================================================================
CREATE TABLE IF NOT EXISTS `monitoring_records` (
    `id` VARCHAR(255) PRIMARY KEY,
    `timestamp` DATETIME(3) NOT NULL,
    `source` VARCHAR(100) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'healthy',
    `metrics` JSON NOT NULL,
    `metadata` JSON NOT NULL,
    `response_time` INTEGER NOT NULL,
    `error` TEXT,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT `chk_monitoring_status` CHECK (`status` IN ('healthy', 'degraded', 'unhealthy')),
    INDEX `idx_monitoring_timestamp` (`timestamp` DESC),
    INDEX `idx_monitoring_source` (`source`, `timestamp` DESC),
    INDEX `idx_monitoring_status` (`status`, `timestamp` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 告警表
-- =============================================================================
CREATE TABLE IF NOT EXISTS `alerts` (
    `id` VARCHAR(255) PRIMARY KEY,
    `level` VARCHAR(20) NOT NULL DEFAULT 'info',
    `title` VARCHAR(500) NOT NULL,
    `message` TEXT NOT NULL,
    `source` VARCHAR(100) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL,
    `resolved` BOOLEAN DEFAULT FALSE,
    `resolved_at` DATETIME(3),
    `metadata` JSON NOT NULL,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT `chk_alerts_level` CHECK (`level` IN ('info', 'warning', 'error', 'critical')),
    INDEX `idx_alerts_timestamp` (`timestamp` DESC),
    INDEX `idx_alerts_source` (`source`, `timestamp` DESC),
    INDEX `idx_alerts_resolved` (`resolved`, `timestamp` DESC),
    INDEX `idx_alerts_level` (`level`, `timestamp` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 告警规则表
-- =============================================================================
CREATE TABLE IF NOT EXISTS `alert_rules` (
    `id` VARCHAR(255) PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `source` VARCHAR(100) NOT NULL,
    `condition` JSON NOT NULL,
    `threshold` DOUBLE NOT NULL,
    `duration` INTEGER NOT NULL,
    `severity` VARCHAR(20) NOT NULL DEFAULT 'warning',
    `enabled` BOOLEAN DEFAULT TRUE,
    `notifications` JSON NOT NULL,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT `chk_alert_rules_severity` CHECK (`severity` IN ('info', 'warning', 'error', 'critical')),
    INDEX `idx_alert_rules_source` (`source`),
    INDEX `idx_alert_rules_enabled` (`enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 监控配置表
-- =============================================================================
CREATE TABLE IF NOT EXISTS `monitoring_configs` (
    `id` VARCHAR(255) PRIMARY KEY,
    `source` VARCHAR(100) NOT NULL UNIQUE,
    `interval` INTEGER NOT NULL,
    `enabled` BOOLEAN DEFAULT TRUE,
    `thresholds` JSON NOT NULL,
    `retention_days` INTEGER DEFAULT 30,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX `idx_monitoring_configs_source` (`source`),
    INDEX `idx_monitoring_configs_enabled` (`enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 监控聚合统计表
-- =============================================================================
CREATE TABLE IF NOT EXISTS `monitoring_aggregates` (
    `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
    `source` VARCHAR(100) NOT NULL,
    `date` DATE NOT NULL,
    `hour` INTEGER NOT NULL,
    `total_records` INTEGER DEFAULT 0,
    `healthy_records` INTEGER DEFAULT 0,
    `degraded_records` INTEGER DEFAULT 0,
    `unhealthy_records` INTEGER DEFAULT 0,
    `avg_response_time` DOUBLE DEFAULT 0,
    `max_response_time` INTEGER DEFAULT 0,
    `min_response_time` INTEGER DEFAULT 0,
    `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT `chk_aggregates_hour` CHECK (`hour` >= 0 AND `hour` <= 23),
    UNIQUE KEY `uq_aggregates_source_date_hour` (`source`, `date`, `hour`),
    INDEX `idx_aggregates_source_date` (`source`, `date` DESC),
    INDEX `idx_aggregates_date_hour` (`date`, `hour`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET foreign_key_checks = 1;

-- =============================================================================
-- 插入基础数据
-- =============================================================================

-- 插入默认管理员用户
INSERT INTO `users` (`id`, `username`, `email`, `password`, `role`, `status`, `created_at`, `preferences`) VALUES
('admin-1', 'admin', 'admin@example.com', '$2b$12$.2n6TwSW24c/bd3fivDUK.sU9liI3lJbwC2RTKg8VDTNjQT2aH4Xi', 'admin', 'active', '2025-09-26 00:00:00.000', '{"theme": "dark", "autoplay": false, "defaultPlaybackRate": 1, "defaultVolume": 0.8}'),
('user-1753372657572-uydjcc4uh', 'hugo', 'dajiawa@gmail.com', '$2b$12$/s3hhVrNbIDak.DEnceNKOWPuaIezzsSq.Nm8AsEU1bFzk07TSGye', 'admin', 'active', '2025-07-24 15:57:37.572', '{"theme": "light", "autoplay": false, "defaultPlaybackRate": 1, "defaultVolume": 0.8}');

-- 插入默认分类
INSERT INTO `categories` (`id`, `name`, `description`, `color`, `icon`, `level`, `sort_order`, `is_active`, `created_at`) VALUES
('cardiology', '心血管', '心血管疾病相关内容', '#b4ecf4', '❤️', 1, 1, TRUE, '2025-09-26 00:00:00.000'),
('neurology', '神经外科', '神经系统疾病相关内容', '#8b5cf6', '🧠', 1, 2, TRUE, '2025-09-26 00:00:00.000'),
('internal-medicine', '消化内科', '内科疾病相关内容', '#10b981', '🏥', 1, 3, TRUE, '2025-09-26 00:00:00.000'),
('surgery', '神经内科', '外科手术相关内容', '#f59e0b', '🔬', 1, 4, TRUE, '2025-09-26 00:00:00.000'),
('pediatrics', '儿科', '儿童疾病相关内容', '#3b82f6', '👶', 1, 5, TRUE, '2025-09-26 00:00:00.000'),
('other', '风湿免疫学', '其他医学相关内容', '#6b7280', '📚', 1, 6, TRUE, '2025-09-26 00:00:00.000');

-- 插入默认监控配置
INSERT INTO `monitoring_configs` (`id`, `source`, `interval`, `enabled`, `thresholds`, `retention_days`) VALUES
('config-database', 'database', 30000, TRUE, '{"responseTime": 5000, "connectionFailures": 3}', 30),
('config-memory', 'memory', 60000, TRUE, '{"usagePercentage": 85, "criticalPercentage": 95}', 7),
('config-environment', 'environment', 300000, TRUE, '{}', 30);

-- 插入默认告警规则
INSERT INTO `alert_rules` (`id`, `name`, `source`, `condition`, `threshold`, `duration`, `severity`, `enabled`, `notifications`) VALUES
('rule-db-response-time', 'Database Response Time Alert', 'database', '{"metric": "responseTime", "operator": "gt"}', 5000, 60000, 'warning', TRUE, '["email", "webhook"]'),
('rule-memory-usage', 'Memory Usage Alert', 'memory', '{"metric": "usagePercentage", "operator": "gt"}', 85, 300000, 'warning', TRUE, '["email"]'),
('rule-memory-critical', 'Critical Memory Usage Alert', 'memory', '{"metric": "usagePercentage", "operator": "gt"}', 95, 60000, 'critical', TRUE, '["email", "webhook"]'),
('rule-db-connection-failure', 'Database Connection Failure', 'database', '{"metric": "status", "operator": "eq", "value": "unhealthy"}', 1, 0, 'error', TRUE, '["email", "webhook"]');

-- =============================================================================
-- 插入示例管理员日志
-- =============================================================================
INSERT INTO `admin_logs` (`id`, `level`, `message`, `source`, `user_id`, `ip_address`, `user_agent`, `method`, `url`, `status_code`, `response_time`, `metadata`, `created_at`) VALUES
('log_sample_1', 'info', '管理员登录成功', 'auth', 'admin-1', '192.168.1.100', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'POST', '/api/auth/signin', 200, 150, '{"email": "admin@example.com", "success": true}', '2025-09-26 00:00:00.000'),
('log_sample_2', 'warn', '多次登录失败尝试', 'security', NULL, '192.168.1.200', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'POST', '/api/auth/signin', 401, 100, '{"attempts": 5, "blocked": false, "email": "unknown@example.com"}', '2025-09-26 00:00:00.000');

-- =============================================================================
-- 显示成功消息
-- =============================================================================
SELECT '✅ 健康中心云端数据库初始化完成！' as status;
SELECT '📊 数据库已包含以下表结构：' as info;
SELECT
  table_name as '表名',
  table_rows as '记录数',
  engine as '引擎',
  table_collation as '字符集'
FROM information_schema.tables
WHERE table_schema = 'health_hub'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- =============================================================================
-- 性能优化建议
-- =============================================================================
SELECT '🚀 性能优化建议：' as optimization;
SELECT '1. 定期执行: ANALYZE TABLE 所有表名;' as tip1;
SELECT '2. 监控查询性能: SELECT * FROM query_performance ORDER BY execution_time DESC LIMIT 10;' as tip2;
SELECT '3. 清理旧日志: DELETE FROM admin_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);' as tip3;
SELECT '4. 备份策略: mysqldump health_hub > backup_$(date +%Y%m%d_%H%M%S).sql' as tip4;
SELECT '5. 监控告警: SELECT * FROM alerts WHERE resolved = FALSE ORDER BY timestamp DESC;' as tip5;
