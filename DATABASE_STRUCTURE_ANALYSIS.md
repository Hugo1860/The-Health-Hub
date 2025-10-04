# Health Hub 数据库结构完整分析

## 📊 数据库概览

- **数据库名称**: `health_hub`
- **字符集**: UTF8MB4
- **排序规则**: utf8mb4_0900_ai_ci
- **数据库引擎**: InnoDB
- **总表数**: 19 张表

---

## 🗂️ 数据表分类

### 1. 核心业务表 (5张)
- `users` - 用户表
- `categories` - 分类表
- `audios` - 音频表
- `audio_resume_states` - 音频播放进度表
- `transcriptions` - 音频转录表

### 2. 内容管理表 (4张)
- `chapters` - 音频章节表
- `slides` - 音频幻灯片表
- `related_resources` - 相关资源表
- `markers` - 音频标记表

### 3. 互动功能表 (6张)
- `comments` - 评论表
- `questions` - 提问表
- `answers` - 回答表
- `ratings` - 评分表
- `favorites` - 收藏表
- `notifications` - 通知表

### 4. 系统管理表 (4张)
- `subscriptions` - 订阅表
- `logs` - 日志表
- `query_performance` - 查询性能表
- `api_metrics` - API指标表

---

## 📋 详细表结构分析

### 1. 用户系统

#### 1.1 `users` - 用户表
**用途**: 存储用户账户信息

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | CHAR(36) | PRIMARY KEY | UUID主键 |
| username | VARCHAR(255) | NOT NULL | 用户名 |
| email | VARCHAR(255) | NOT NULL UNIQUE | 邮箱(唯一) |
| password | VARCHAR(255) | NOT NULL | 密码(加密) |
| role | VARCHAR(50) | NOT NULL CHECK | 角色: user/admin |
| status | VARCHAR(50) | NOT NULL CHECK | 状态: active/inactive/banned |
| created_at | DATETIME(3) | DEFAULT NOW | 创建时间 |
| last_login | DATETIME(3) | NULL | 最后登录时间 |
| preferences | JSON | NULL | 用户偏好设置 |

**索引**:
- `idx_users_email` - 邮箱索引
- `idx_users_status` - 状态+角色组合索引
- `idx_users_created` - 创建时间索引

---

### 2. 分类系统

#### 2.1 `categories` - 分类表
**用途**: 音频内容分类管理

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | CHAR(36) | PRIMARY KEY | UUID主键 |
| name | VARCHAR(255) | NOT NULL | 分类名称 |
| description | TEXT | NULL | 分类描述 |
| color | VARCHAR(7) | DEFAULT '#6b7280' | 分类颜色 |
| icon | VARCHAR(10) | DEFAULT '📂' | 分类图标 |
| created_at | DATETIME(3) | DEFAULT NOW | 创建时间 |
| updated_at | DATETIME(3) | AUTO UPDATE | 更新时间 |

**特性**:
- 支持两级分类(通过 `audios` 表的 `category_id` 和 `subcategory_id` 实现)
- 自动更新 `updated_at` 时间戳

---

### 3. 音频核心

#### 3.1 `audios` - 音频表
**用途**: 存储音频文件元数据和内容信息

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | CHAR(36) | PRIMARY KEY | UUID主键 |
| title | VARCHAR(500) | NOT NULL | 音频标题 |
| description | TEXT | NULL | 简介(150字) |
| filename | VARCHAR(500) | NOT NULL | 文件名 |
| url | VARCHAR(1000) | NOT NULL | 文件URL |
| cover_image | VARCHAR(1000) | NULL | 封面图片 |
| upload_date | DATETIME(3) | DEFAULT NOW | 上传时间 |
| subject | VARCHAR(255) | NULL | 专业/学科 |
| tags | TEXT | NULL | 标签(JSON数组) |
| size | BIGINT | NULL | 文件大小(字节) |
| duration | DOUBLE | NULL | 时长(秒) |
| speaker | VARCHAR(255) | NULL | 主讲人 |
| recording_date | DATETIME(3) | NULL | 录制日期 |
| status | VARCHAR(20) | DEFAULT 'draft' | 状态: draft/published/archived |
| category_id | CHAR(36) | FK | 一级分类ID |
| subcategory_id | CHAR(36) | FK | 二级分类ID |

**外键关系**:
- `fk_audios_category` → `categories(id)` ON DELETE SET NULL
- `fk_audios_subcategory` → `categories(id)` ON DELETE SET NULL

**索引**:
- `idx_audios_subject` - 专业索引
- `idx_audios_upload_date` - 上传时间索引
- `idx_audios_title` - 标题索引
- `idx_audios_search` - 标题+专业搜索索引
- `idx_audios_duration` - 时长索引
- `idx_audios_composite` - 专业+时间+时长组合索引

#### 3.2 `audio_resume_states` - 播放进度表
**用途**: 记录用户的音频播放进度

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| user_id | CHAR(36) | PRIMARY KEY (1/2) | 用户ID |
| audio_id | CHAR(36) | PRIMARY KEY (2/2) | 音频ID |
| position | DOUBLE | DEFAULT 0 | 播放位置(秒) |
| session_id | VARCHAR(255) | NOT NULL | 会话ID |
| created_at | DATETIME(3) | DEFAULT NOW | 创建时间 |
| updated_at | DATETIME(3) | AUTO UPDATE | 更新时间 |

**特性**:
- 复合主键 (user_id, audio_id)
- 自动追踪播放位置

**索引**:
- `idx_resume_user_audio` - 用户+音频索引
- `idx_resume_updated` - 更新时间索引
- `idx_resume_session` - 会话ID索引

#### 3.3 `transcriptions` - 转录表
**用途**: 存储音频转录文本

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | CHAR(36) | PRIMARY KEY | UUID主键 |
| audio_id | CHAR(36) | FK | 音频ID |
| language | VARCHAR(10) | DEFAULT 'zh-CN' | 语言代码 |
| full_text | TEXT | NULL | 完整文本 |
| segments | JSON | NULL | 分段数据 |
| status | VARCHAR(50) | DEFAULT 'pending' | 状态 |
| created_at | DATETIME(3) | DEFAULT NOW | 创建时间 |
| updated_at | DATETIME(3) | AUTO UPDATE | 更新时间 |
| processing_time | INT | NULL | 处理时间(毫秒) |

**索引**:
- `idx_transcriptions_audio` - 音频+语言索引

---

### 4. 内容结构

#### 4.1 `chapters` - 章节表
**用途**: 音频章节划分

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | CHAR(36) | PRIMARY KEY | UUID主键 |
| audio_id | CHAR(36) | FK | 音频ID |
| title | VARCHAR(500) | NULL | 章节标题 |
| description | TEXT | NULL | 章节描述 |
| start_time | DOUBLE | NULL | 开始时间(秒) |
| end_time | DOUBLE | NULL | 结束时间(秒) |
| chapter_order | INT | NULL | 章节顺序 |
| created_at | DATETIME(3) | DEFAULT NOW | 创建时间 |
| updated_at | DATETIME(3) | AUTO UPDATE | 更新时间 |

**索引**:
- `idx_chapters_audio` - 音频+顺序索引

#### 4.2 `slides` - 幻灯片表
**用途**: 与音频同步的幻灯片

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | CHAR(36) | PRIMARY KEY | UUID主键 |
| audio_id | CHAR(36) | FK | 音频ID |
| image_url | VARCHAR(1000) | NULL | 图片URL |
| timestamp_position | DOUBLE | NULL | 时间戳位置(秒) |
| title | VARCHAR(500) | NULL | 标题 |
| description | TEXT | NULL | 描述 |
| created_at | DATETIME(3) | DEFAULT NOW | 创建时间 |

#### 4.3 `markers` - 标记表
**用途**: 用户在音频中添加的标记/笔记

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | CHAR(36) | PRIMARY KEY | UUID主键 |
| audio_id | CHAR(36) | FK | 音频ID |
| title | VARCHAR(500) | NULL | 标记标题 |
| description | TEXT | NULL | 标记描述 |
| time_position | DOUBLE | NULL | 时间位置(秒) |
| marker_type | VARCHAR(50) | DEFAULT 'note' | 标记类型 |
| created_by | CHAR(36) | FK | 创建者ID |
| created_at | DATETIME(3) | DEFAULT NOW | 创建时间 |

**索引**:
- `idx_markers_audio` - 音频+时间位置索引

#### 4.4 `related_resources` - 相关资源表
**用途**: 与音频相关的外部资源链接

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | CHAR(36) | PRIMARY KEY | UUID主键 |
| audio_id | CHAR(36) | FK | 音频ID |
| title | VARCHAR(500) | NULL | 资源标题 |
| url | VARCHAR(1000) | NULL | 资源URL |
| resource_type | VARCHAR(100) | NULL | 资源类型 |
| description | TEXT | NULL | 资源描述 |
| created_at | DATETIME(3) | DEFAULT NOW | 创建时间 |

---

### 5. 互动功能

#### 5.1 `comments` - 评论表
**用途**: 音频评论系统

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | CHAR(36) | PRIMARY KEY | UUID主键 |
| audio_id | CHAR(36) | FK | 音频ID |
| user_id | CHAR(36) | FK | 用户ID |
| username | VARCHAR(255) | NULL | 用户名 |
| content | TEXT | NULL | 评论内容 |
| parent_id | CHAR(36) | FK | 父评论ID(回复功能) |
| created_at | DATETIME(3) | DEFAULT NOW | 创建时间 |
| updated_at | DATETIME(3) | AUTO UPDATE | 更新时间 |

**特性**:
- 支持嵌套回复(通过 `parent_id`)
- 级联删除

**索引**:
- `idx_comments_audio_time` - 音频+时间索引
- `idx_comments_user` - 用户索引

#### 5.2 `questions` - 提问表
**用途**: 用户针对音频内容的提问

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | CHAR(36) | PRIMARY KEY | UUID主键 |
| audio_id | CHAR(36) | FK | 音频ID |
| user_id | CHAR(36) | FK | 用户ID |
| username | VARCHAR(255) | NULL | 用户名 |
| title | VARCHAR(500) | NULL | 问题标题 |
| content | TEXT | NULL | 问题内容 |
| created_at | DATETIME(3) | DEFAULT NOW | 创建时间 |

**索引**:
- `idx_questions_audio` - 音频+时间索引

#### 5.3 `answers` - 回答表
**用途**: 问题的回答

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | CHAR(36) | PRIMARY KEY | UUID主键 |
| question_id | CHAR(36) | FK | 问题ID |
| user_id | CHAR(36) | FK | 用户ID |
| username | VARCHAR(255) | NULL | 用户名 |
| content | TEXT | NULL | 回答内容 |
| created_at | DATETIME(3) | DEFAULT NOW | 创建时间 |
| is_accepted | BOOLEAN | DEFAULT FALSE | 是否被采纳 |

**索引**:
- `idx_answers_question` - 问题+时间索引

#### 5.4 `ratings` - 评分表
**用途**: 音频评分(1-5星)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | CHAR(36) | PRIMARY KEY | UUID主键 |
| audio_id | CHAR(36) | FK | 音频ID |
| user_id | CHAR(36) | FK | 用户ID |
| rating | INT | CHECK 1-5 | 评分(1-5) |
| created_at | DATETIME(3) | DEFAULT NOW | 创建时间 |

**约束**:
- 唯一约束: (audio_id, user_id) - 每个用户对每个音频只能评一次分
- CHECK约束: rating 必须在 1-5 之间

**索引**:
- `idx_ratings_audio` - 音频+评分索引
- `idx_ratings_user` - 用户索引

#### 5.5 `favorites` - 收藏表
**用途**: 用户收藏的音频

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | CHAR(36) | PRIMARY KEY | UUID主键 |
| audio_id | CHAR(36) | FK | 音频ID |
| user_id | CHAR(36) | FK | 用户ID |
| created_at | DATETIME(3) | DEFAULT NOW | 创建时间 |

**约束**:
- 唯一约束: (audio_id, user_id) - 防止重复收藏

**索引**:
- `idx_favorites_user` - 用户+时间索引
- `idx_favorites_audio` - 音频索引

#### 5.6 `notifications` - 通知表
**用途**: 系统通知

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | CHAR(36) | PRIMARY KEY | UUID主键 |
| user_id | CHAR(36) | FK | 用户ID |
| notification_type | VARCHAR(100) | NULL | 通知类型 |
| title | VARCHAR(500) | NULL | 通知标题 |
| message | TEXT | NULL | 通知内容 |
| related_id | CHAR(36) | NULL | 关联对象ID |
| related_type | VARCHAR(100) | NULL | 关联对象类型 |
| is_read | BOOLEAN | DEFAULT FALSE | 是否已读 |
| created_at | DATETIME(3) | DEFAULT NOW | 创建时间 |

**索引**:
- `idx_notifications_user` - 用户+时间索引

---

### 6. 系统管理

#### 6.1 `subscriptions` - 订阅表
**用途**: 用户订阅管理

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | CHAR(36) | PRIMARY KEY | UUID主键 |
| user_id | CHAR(36) | FK | 用户ID |
| subscription_type | VARCHAR(100) | NULL | 订阅类型 |
| value | VARCHAR(500) | NULL | 订阅值 |
| notification_method | VARCHAR(100) | NULL | 通知方式 |
| created_at | DATETIME(3) | DEFAULT NOW | 创建时间 |
| is_active | BOOLEAN | DEFAULT TRUE | 是否激活 |

**索引**:
- `idx_subscriptions_user` - 用户+激活状态索引

#### 6.2 `logs` - 日志表
**用途**: 系统日志记录

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | CHAR(36) | PRIMARY KEY | UUID主键 |
| type | VARCHAR(50) | NOT NULL CHECK | 类型: error/metric/action |
| data | JSON | NOT NULL | 日志数据 |
| session_id | VARCHAR(255) | NOT NULL | 会话ID |
| timestamp | DATETIME(3) | NOT NULL | 时间戳 |
| created_at | DATETIME(3) | DEFAULT NOW | 创建时间 |

**索引**:
- `idx_logs_session` - 会话ID索引
- `idx_logs_type` - 类型索引
- `idx_logs_created` - 创建时间索引
- `idx_logs_timestamp` - 时间戳索引

#### 6.3 `query_performance` - 查询性能表
**用途**: 数据库查询性能监控

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT | PRIMARY KEY AUTO_INCREMENT | 自增主键 |
| query_hash | VARCHAR(255) | NOT NULL | 查询哈希值 |
| query_sql | TEXT | NOT NULL | SQL语句 |
| execution_time | DOUBLE | NOT NULL | 执行时间(毫秒) |
| rows_affected | INT | NULL | 影响行数 |
| timestamp | DATETIME(3) | DEFAULT NOW | 时间戳 |

**索引**:
- `idx_query_performance_hash` - 查询哈希索引
- `idx_query_performance_time` - 时间戳索引

#### 6.4 `api_metrics` - API指标表
**用途**: API请求监控

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT | PRIMARY KEY AUTO_INCREMENT | 自增主键 |
| endpoint | VARCHAR(500) | NOT NULL | API端点 |
| method | VARCHAR(10) | NOT NULL | HTTP方法 |
| response_time | DOUBLE | NOT NULL | 响应时间(毫秒) |
| status_code | INT | NOT NULL | HTTP状态码 |
| user_agent | TEXT | NULL | 用户代理 |
| ip | VARCHAR(45) | NULL | IP地址 |
| error | TEXT | NULL | 错误信息 |
| timestamp | DATETIME(3) | DEFAULT NOW | 时间戳 |

---

## 🔗 数据关系图

```
users (用户)
  ├── audios (通过 created_by - 待实现)
  ├── comments (评论)
  ├── questions (提问)
  ├── answers (回答)
  ├── ratings (评分)
  ├── favorites (收藏)
  ├── markers (标记)
  ├── notifications (通知)
  ├── subscriptions (订阅)
  └── audio_resume_states (播放进度)

categories (分类)
  ├── audios.category_id (一级分类)
  └── audios.subcategory_id (二级分类)

audios (音频)
  ├── comments (评论)
  ├── questions (提问)
  ├── ratings (评分)
  ├── favorites (收藏)
  ├── chapters (章节)
  ├── slides (幻灯片)
  ├── markers (标记)
  ├── related_resources (相关资源)
  ├── transcriptions (转录)
  └── audio_resume_states (播放进度)

questions (提问)
  └── answers (回答)

comments (评论)
  └── comments (自关联 - 回复功能)
```

---

## 📊 索引策略总结

### 高频查询索引
1. **用户相关**: email, status+role, created_at
2. **音频搜索**: title, subject, upload_date, duration
3. **组合查询**: (subject, upload_date, duration)
4. **外键索引**: 所有外键字段都有索引
5. **时间序列**: 所有 created_at, updated_at 字段

### 唯一约束
1. **users.email** - 邮箱唯一
2. **(audio_id, user_id)** 组合:
   - ratings - 防止重复评分
   - favorites - 防止重复收藏
   - audio_resume_states - 每用户每音频一条进度记录

---

## 🔒 数据完整性约束

### CHECK 约束
1. **users.role**: 只能是 'user' 或 'admin'
2. **users.status**: 只能是 'active', 'inactive', 'banned'
3. **audios.status**: 只能是 'draft', 'published', 'archived'
4. **ratings.rating**: 必须在 1-5 之间
5. **logs.type**: 只能是 'error', 'metric', 'action'

### 外键约束
- **ON DELETE CASCADE**: 大部分关联表(删除主记录时自动删除关联记录)
- **ON DELETE SET NULL**: categories 关联(删除分类时音频的分类字段设为NULL)

---

## 💾 存储特性

### 数据类型选择
1. **UUID**: 使用 CHAR(36) 存储
2. **时间戳**: DATETIME(3) - 毫秒级精度
3. **JSON**: 用于 preferences, segments, logs.data
4. **TEXT**: 长文本内容(评论、描述等)
5. **DOUBLE**: 浮点数(时长、位置、执行时间)

### 自增字段
仅两张表使用自增:
1. **query_performance.id** - BIGINT AUTO_INCREMENT
2. **api_metrics.id** - BIGINT AUTO_INCREMENT

### 自动时间戳
以下表支持自动更新时间戳:
- categories
- audios (需要添加)
- chapters
- comments
- audio_resume_states
- transcriptions

---

## 📈 性能优化建议

### 1. 已实现的优化
✅ 复合索引覆盖常见查询模式
✅ 外键索引提升 JOIN 性能
✅ 时间序列索引支持时间范围查询

### 2. 可以进一步优化
🔸 考虑对 `audios.tags` 使用全文索引
🔸 为高频 API 端点添加 Redis 缓存
🔸 `api_metrics` 和 `query_performance` 考虑分表策略
🔸 大表考虑分区(按时间)

### 3. 监控建议
📊 定期分析 `query_performance` 表识别慢查询
📊 监控 `api_metrics` 表跟踪API性能
📊 使用 `logs` 表进行错误追踪

---

## 🎯 业务功能支持

### 已支持的功能
✅ 用户注册/登录/权限管理
✅ 音频上传/分类/标签
✅ 两级分类体系
✅ 音频播放进度保存
✅ 评论/回复系统
✅ 问答系统
✅ 评分/收藏功能
✅ 音频章节划分
✅ 同步幻灯片
✅ 音频标记/笔记
✅ 相关资源链接
✅ 音频转录
✅ 通知系统
✅ 订阅功能
✅ 系统日志
✅ 性能监控

### 待完善的功能
🔹 播放列表(playlists)
🔹 用户关注/粉丝系统
🔹 音频播放统计(play_count)
🔹 分享/点赞功能
🔹 标签系统(独立表)
🔹 搜索历史

---

## 📝 数据迁移注意事项

### PostgreSQL → MySQL 主要差异
1. **UUID**: PostgreSQL的UUID类型 → MySQL的CHAR(36)
2. **TIMESTAMPTZ**: PostgreSQL → MySQL的DATETIME(3)
3. **JSONB**: PostgreSQL → MySQL的JSON
4. **SERIAL**: PostgreSQL → MySQL的AUTO_INCREMENT
5. **数组类型**: PostgreSQL原生支持 → MySQL使用JSON或TEXT

### 兼容性处理
✅ 所有 CHECK 约束保留(MySQL 8.0.16+支持)
✅ 触发器语法已转换为MySQL格式
✅ 索引策略已优化适配MySQL执行器

---

## 🔧 维护建议

### 定期维护任务
1. **每日**: 备份数据库
2. **每周**: 
   - 分析表统计信息(ANALYZE TABLE)
   - 检查慢查询日志
   - 清理过期日志数据
3. **每月**:
   - 优化表(OPTIMIZE TABLE)
   - 审查索引使用情况
   - 归档旧数据

### 数据清理策略
- `logs` 表: 保留最近30天
- `api_metrics` 表: 保留最近90天
- `query_performance` 表: 保留最近30天
- `notifications` 表: 已读通知保留30天

---

**文档生成时间**: 2025-09-30
**数据库版本**: MySQL 8.0+
**Schema版本**: v1.0
