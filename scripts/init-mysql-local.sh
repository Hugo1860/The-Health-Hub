#!/usr/bin/env bash

set -euo pipefail

# Local MySQL quick init for The Health Hub
# Creates database, minimal schema and seed data compatible with the MySQL adapter

MYSQL_HOST=${MYSQL_HOST:-localhost}
MYSQL_PORT=${MYSQL_PORT:-3306}
MYSQL_USER=${MYSQL_USER:-root}
MYSQL_PASSWORD=${MYSQL_PASSWORD:-}
MYSQL_DATABASE=${MYSQL_DATABASE:-health_hub}

PASS_ARG=""
if [ -n "$MYSQL_PASSWORD" ]; then
  PASS_ARG="-p$MYSQL_PASSWORD"
fi

echo "==> Connecting to MySQL at $MYSQL_USER@$MYSQL_HOST:$MYSQL_PORT"

mysql -h"$MYSQL_HOST" -P"$MYSQL_PORT" -u"$MYSQL_USER" $PASS_ARG -e "CREATE DATABASE IF NOT EXISTS \`$MYSQL_DATABASE\`;" >/dev/null

echo "==> Creating minimal tables in database '$MYSQL_DATABASE'"
mysql -h"$MYSQL_HOST" -P"$MYSQL_PORT" -u"$MYSQL_USER" $PASS_ARG -D "$MYSQL_DATABASE" <<'SQL'
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7),
  icon VARCHAR(10),
  parent_id VARCHAR(255),
  level INT NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audios (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  filename VARCHAR(500),
  url VARCHAR(1000),
  coverImage VARCHAR(1000),
  uploadDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  subject VARCHAR(255),
  tags TEXT,
  size BIGINT,
  duration DOUBLE,
  speaker VARCHAR(255),
  recordingDate TIMESTAMP NULL,
  status VARCHAR(20) DEFAULT 'published',
  category_id VARCHAR(255),
  subcategory_id VARCHAR(255)
);

-- Compatibility generated/physical columns for snake_case consumers
SET @col := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'audios' AND column_name = 'upload_date');
SET @sql := IF(@col=0, 'ALTER TABLE audios ADD COLUMN upload_date DATETIME GENERATED ALWAYS AS (uploadDate) VIRTUAL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'audios' AND column_name = 'recording_date');
SET @sql := IF(@col=0, 'ALTER TABLE audios ADD COLUMN recording_date DATETIME GENERATED ALWAYS AS (recordingDate) VIRTUAL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'audios' AND column_name = 'cover_image');
SET @sql := IF(@col=0, 'ALTER TABLE audios ADD COLUMN cover_image VARCHAR(1000) GENERATED ALWAYS AS (coverImage) VIRTUAL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- play_count for rankings/recommendations
SET @col := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'audios' AND column_name = 'play_count');
SET @sql := IF(@col=0, 'ALTER TABLE audios ADD COLUMN play_count INT DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  username VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS comments (
  id VARCHAR(255) PRIMARY KEY,
  audio_id VARCHAR(255),
  user_id VARCHAR(255),
  content TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  parent_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  moderated_at TIMESTAMP NULL,
  moderated_by VARCHAR(255),
  moderation_reason TEXT
);

CREATE TABLE IF NOT EXISTS favorites (
  id VARCHAR(255) PRIMARY KEY,
  audio_id VARCHAR(255),
  user_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_fav (audio_id, user_id)
);

CREATE TABLE IF NOT EXISTS play_history (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  userId VARCHAR(255) NOT NULL,
  audioId VARCHAR(255) NOT NULL,
  lastPlayedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  lastPosition INT DEFAULT 0,
  duration INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS admin_logs (
  id VARCHAR(255) PRIMARY KEY,
  level VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  source VARCHAR(100),
  user_id VARCHAR(255),
  ip_address VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Conditionally create indexes for admin_logs
SET @exists := (SELECT COUNT(1) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'admin_logs' AND index_name = 'idx_admin_logs_created_at');
SET @sql := IF(@exists=0, 'CREATE INDEX idx_admin_logs_created_at ON admin_logs(created_at)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(1) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'admin_logs' AND index_name = 'idx_admin_logs_level');
SET @sql := IF(@exists=0, 'CREATE INDEX idx_admin_logs_level ON admin_logs(level)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(1) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'admin_logs' AND index_name = 'idx_admin_logs_source');
SET @sql := IF(@exists=0, 'CREATE INDEX idx_admin_logs_source ON admin_logs(source)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(1) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'admin_logs' AND index_name = 'idx_admin_logs_user_id');
SET @sql := IF(@exists=0, 'CREATE INDEX idx_admin_logs_user_id ON admin_logs(user_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(1) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'admin_logs' AND index_name = 'idx_admin_logs_level_created_at');
SET @sql := IF(@exists=0, 'CREATE INDEX idx_admin_logs_level_created_at ON admin_logs(level, created_at)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(1) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'admin_logs' AND index_name = 'idx_admin_logs_source_created_at');
SET @sql := IF(@exists=0, 'CREATE INDEX idx_admin_logs_source_created_at ON admin_logs(source, created_at)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS logs (
  id VARCHAR(255) PRIMARY KEY,
  type VARCHAR(100) NOT NULL,
  data TEXT,
  session_id VARCHAR(255),
  timestamp BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Conditionally create indexes for logs
SET @exists := (SELECT COUNT(1) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'logs' AND index_name = 'idx_logs_created_at');
SET @sql := IF(@exists=0, 'CREATE INDEX idx_logs_created_at ON logs(created_at)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(1) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'logs' AND index_name = 'idx_logs_type');
SET @sql := IF(@exists=0, 'CREATE INDEX idx_logs_type ON logs(type)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS api_metrics (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  endpoint VARCHAR(500),
  method VARCHAR(10),
  response_time DOUBLE,
  status_code INT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Conditionally create index for api_metrics
SET @exists := (SELECT COUNT(1) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'api_metrics' AND index_name = 'idx_api_metrics_time');
SET @sql := IF(@exists=0, 'CREATE INDEX idx_api_metrics_time ON api_metrics(timestamp)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS query_performance (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  query_sql TEXT,
  execution_time DOUBLE,
  rows_affected INT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Conditionally create index for query_performance
SET @exists := (SELECT COUNT(1) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'query_performance' AND index_name = 'idx_query_perf_time');
SET @sql := IF(@exists=0, 'CREATE INDEX idx_query_perf_time ON query_performance(timestamp)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Seed minimal data (idempotent)
INSERT IGNORE INTO categories (id, name, description, color, icon, parent_id, level, sort_order, is_active)
VALUES
 ('cat1','心血管','心血管疾病相关内容','#ef4444','❤️',NULL,1,0,1),
 ('cat2','神经科','神经系统疾病相关内容','#8b5cf6','🧠',NULL,1,1,1),
 ('cat3','内科学','内科疾病相关内容','#10b981','🏥',NULL,1,2,1);

INSERT IGNORE INTO audios (
  id, title, description, filename, url, coverImage, uploadDate, subject, tags,
  duration, speaker, recordingDate, status, category_id
) VALUES
 ('a1','示例音频1','简介1','f1.mp3','/a1.mp3',NULL,CURRENT_TIMESTAMP,'心血管','[]',120,'Dr. A',CURRENT_TIMESTAMP,'published','cat1'),
 ('a2','示例音频2','简介2','f2.mp3','/a2.mp3',NULL,CURRENT_TIMESTAMP,'神经科','[]',95,'Dr. B',CURRENT_TIMESTAMP,'published','cat2');

-- Seed users (admin + user)
INSERT IGNORE INTO users (id, username, email, password, role, status, created_at)
VALUES
 ('u_admin','管理员','admin@example.com','$2b$10$placeholderhash','admin','active',CURRENT_TIMESTAMP),
 ('u_user','普通用户','user@example.com','$2b$10$placeholderhash','user','active',CURRENT_TIMESTAMP);

-- Seed one approved comment on a1
INSERT IGNORE INTO comments (id, audio_id, user_id, content, status, created_at, updated_at)
VALUES ('c1','a1','u_user','很棒的内容！','approved',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

-- Seed favorite
INSERT IGNORE INTO favorites (id, audio_id, user_id, created_at)
VALUES ('f1','a1','u_user',CURRENT_TIMESTAMP);

-- Seed one play history row
INSERT IGNORE INTO play_history (userId, audioId, lastPlayedAt, lastPosition, duration)
VALUES ('u_user','a1',CURRENT_TIMESTAMP,30,120);

-- Seed one admin log & one error log
INSERT IGNORE INTO admin_logs (id, level, message, source, user_id, ip_address, created_at)
VALUES ('alog1','info','初始化完成','init','u_admin','127.0.0.1',CURRENT_TIMESTAMP);

INSERT IGNORE INTO logs (id, type, data, session_id, timestamp, created_at)
VALUES ('log1','error','{"message":"sample error"}','sess1',UNIX_TIMESTAMP()*1000,CURRENT_TIMESTAMP);
SQL

echo "==> Done. Suggested env vars:"
echo "    export DATABASE_URL='mysql://$MYSQL_USER${MYSQL_PASSWORD:+:******}@$MYSQL_HOST:$MYSQL_PORT/$MYSQL_DATABASE'"
echo "    export DB_DRIVER=mysql"

echo ""
echo "==> To add advanced features (subscriptions, playlists, learning progress, social):"
echo "    ./scripts/init-advanced-features.sh"
echo ""
echo "==> You can now run: DATABASE_URL=... DB_DRIVER=mysql npm run dev"


