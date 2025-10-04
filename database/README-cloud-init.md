# 云端数据库初始化指南

## 📋 概述

本目录包含完整的云端数据库初始化脚本，适用于直接在云端数据库中执行，无需额外初始化步骤。支持 MySQL 和 PostgreSQL 两种数据库。

## 🚀 快速开始

### MySQL 版本

1. **连接到你的 MySQL 数据库**
   ```bash
   mysql -h your-host -u your-username -p your-database
   ```

2. **执行初始化脚本**
   ```sql
   SOURCE database/cloud-init-mysql.sql;
   ```

3. **验证初始化结果**
   ```sql
   SHOW TABLES;
   SELECT * FROM users WHERE role = 'admin';
   ```

### PostgreSQL 版本

1. **连接到你的 PostgreSQL 数据库**
   ```bash
   psql -h your-host -U your-username -d your-database
   ```

2. **执行初始化脚本**
   ```sql
   \i database/cloud-init-postgresql.sql
   ```

3. **验证初始化结果**
   ```sql
   \dt
   SELECT * FROM users WHERE role = 'admin';
   ```

## 📊 包含的表结构

### 🔧 核心业务表
- `users` - 用户表
- `categories` - 分类表
- `audios` - 音频表
- `questions` - 问题表
- `answers` - 答案表
- `comments` - 评论表
- `ratings` - 评分表
- `favorites` - 收藏表

### 📚 高级功能表
- `playlists` - 播放列表表
- `playlist_items` - 播放列表项目表
- `chapters` - 章节表
- `markers` - 标记表
- `slides` - 幻灯片表
- `related_resources` - 相关资源表
- `transcriptions` - 转录表
- `subscriptions` - 订阅表
- `notifications` - 通知表

### 🔍 管理功能表
- `admin_logs` - 管理员日志表
- `audio_resume_states` - 音频恢复状态表

### 📈 监控和性能表
- `query_performance` - 查询性能监控表
- `api_metrics` - API性能指标表
- `logs` - 系统日志表
- `monitoring_records` - 监控记录表
- `alerts` - 告警表
- `alert_rules` - 告警规则表
- `monitoring_configs` - 监控配置表
- `monitoring_aggregates` - 监控聚合统计表

## 🔑 默认管理员账户

### MySQL / PostgreSQL 通用信息
- **用户名**: admin
- **邮箱**: admin@example.com
- **密码**: admin123 (请立即修改！)
- **角色**: admin
- **状态**: active

### 备用管理员账户
- **用户名**: hugo
- **邮箱**: dajiawa@gmail.com
- **密码**: 123456 (请立即修改！)
- **角色**: admin
- **状态**: active

## 🏷️ 默认分类数据

系统已预置以下分类：
1. **心血管** (❤️) - 心血管疾病相关内容
2. **神经外科** (🧠) - 神经系统疾病相关内容
3. **消化内科** (🏥) - 内科疾病相关内容
4. **神经内科** (🔬) - 外科手术相关内容
5. **儿科** (👶) - 儿童疾病相关内容
6. **风湿免疫学** (📚) - 其他医学相关内容

## 📝 监控配置

### 默认监控配置
- **数据库监控**: 30秒间隔，响应时间阈值5秒
- **内存监控**: 60秒间隔，使用率阈值85%
- **环境监控**: 5分钟间隔

### 默认告警规则
- **数据库响应时间告警**: 响应时间 > 5秒
- **内存使用率告警**: 使用率 > 85%
- **内存严重告警**: 使用率 > 95%
- **数据库连接失败**: 连接状态为不健康

## 🔧 索引优化

所有表都已创建了必要的索引，包括：
- 外键索引
- 常用查询索引
- 复合索引
- 全文搜索索引（如果适用）

## ⚡ 性能优化建议

### MySQL 优化
```sql
-- 分析表结构
ANALYZE TABLE users, audios, categories;

-- 检查慢查询
SELECT * FROM query_performance
ORDER BY execution_time DESC
LIMIT 10;

-- 清理旧日志
DELETE FROM admin_logs
WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- 优化表
OPTIMIZE TABLE audios, users, categories;
```

### PostgreSQL 优化
```sql
-- 分析表结构
VACUUM ANALYZE;

-- 检查慢查询
SELECT * FROM query_performance
ORDER BY execution_time DESC
LIMIT 10;

-- 清理旧日志
DELETE FROM admin_logs
WHERE created_at < NOW() - INTERVAL '30 days';

-- 重新索引
REINDEX TABLE audios;
REINDEX TABLE users;
REINDEX TABLE categories;
```

## 🔒 安全建议

### 立即执行的操作
1. **修改默认密码**
   ```sql
   -- MySQL
   UPDATE users SET password = '$2b$12$new-hashed-password' WHERE email = 'admin@example.com';

   -- PostgreSQL
   UPDATE users SET password = '$2b$12$new-hashed-password' WHERE email = 'admin@example.com';
   ```

2. **创建备份用户**
   ```sql
   -- MySQL
   CREATE USER 'backup_user'@'%' IDENTIFIED BY 'your-secure-password';
   GRANT SELECT, LOCK TABLES ON health_hub.* TO 'backup_user'@'%';

   -- PostgreSQL
   CREATE USER backup_user WITH PASSWORD 'your-secure-password';
   GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;
   ```

3. **启用审计日志**
   ```sql
   -- 记录所有DDL操作
   SET GLOBAL general_log = 'ON';
   SET GLOBAL general_log_file = '/var/log/mysql/general.log';
   ```

### 生产环境安全配置

#### MySQL 安全配置
```sql
-- 禁用远程root访问
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');

-- 创建专用应用用户
CREATE USER 'health_app'@'%' IDENTIFIED BY 'your-app-password';
GRANT SELECT, INSERT, UPDATE, DELETE ON health_hub.* TO 'health_app'@'%';

-- 刷新权限
FLUSH PRIVILEGES;
```

#### PostgreSQL 安全配置
```sql
-- 禁用远程超级用户访问
ALTER USER postgres PASSWORD 'new-superuser-password';

-- 创建专用应用用户
CREATE USER health_app WITH PASSWORD 'your-app-password';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO health_app;
GRANT USAGE ON SCHEMA public TO health_app;

-- 启用行级安全策略（如果需要）
ALTER TABLE sensitive_table ENABLE ROW LEVEL SECURITY;
```

## 📊 监控和维护

### 定期监控查询
```sql
-- 慢查询分析
SELECT query_sql, execution_time, timestamp
FROM query_performance
WHERE execution_time > 1000
ORDER BY execution_time DESC;

-- API性能分析
SELECT endpoint, method, AVG(response_time) as avg_time, COUNT(*) as count
FROM api_metrics
WHERE timestamp > NOW() - INTERVAL '1 day'
GROUP BY endpoint, method
ORDER BY avg_time DESC;
```

### 数据清理策略
```sql
-- 清理旧日志（30天）
DELETE FROM admin_logs WHERE created_at < NOW() - INTERVAL '30 days';

-- 清理未读通知（90天）
DELETE FROM notifications WHERE is_read = FALSE AND created_at < NOW() - INTERVAL '90 days';

-- 清理临时数据
DELETE FROM logs WHERE type = 'debug' AND created_at < NOW() - INTERVAL '7 days';
```

## 🚨 故障排除

### 常见问题

1. **连接超时**
   ```sql
   -- 检查连接配置
   SHOW VARIABLES LIKE 'max_connections';
   SHOW PROCESSLIST;
   ```

2. **查询性能慢**
   ```sql
   -- 分析查询计划
   EXPLAIN SELECT * FROM audios WHERE title LIKE '%test%';
   ```

3. **内存不足**
   ```sql
   -- 检查内存使用
   SHOW VARIABLES LIKE 'innodb_buffer_pool_size';
   ```

4. **磁盘空间不足**
   ```sql
   -- 检查表大小
   SELECT table_name, data_length, index_length
   FROM information_schema.tables
   WHERE table_schema = 'health_hub';
   ```

### 性能调优

#### MySQL 调优参数
```sql
-- 增加缓冲池大小
SET GLOBAL innodb_buffer_pool_size = 134217728; -- 128MB

-- 调整查询缓存
SET GLOBAL query_cache_size = 16777216; -- 16MB
SET GLOBAL query_cache_type = 1;

-- 优化连接数
SET GLOBAL max_connections = 200;
```

#### PostgreSQL 调优参数
```sql
-- 调整共享缓冲区
ALTER SYSTEM SET shared_buffers = '256MB';

-- 调整工作内存
ALTER SYSTEM SET work_mem = '4MB';

-- 调整维护工作内存
ALTER SYSTEM SET maintenance_work_mem = '64MB';

-- 重新加载配置
SELECT pg_reload_conf();
```

## 📈 扩展建议

### 水平扩展
1. **读写分离**: 主从复制架构
2. **分表策略**: 按时间或用户ID分表
3. **数据库集群**: 使用MySQL Group Replication或PostgreSQL集群

### 垂直扩展
1. **索引优化**: 基于查询模式添加索引
2. **查询优化**: 使用EXPLAIN分析和优化查询
3. **连接池**: 使用连接池中间件

### 监控和告警
1. **集成Prometheus**: 收集性能指标
2. **Grafana仪表板**: 可视化监控数据
3. **告警系统**: 基于阈值的自动告警

## 📚 参考资料

- [MySQL 官方文档](https://dev.mysql.com/doc/)
- [PostgreSQL 官方文档](https://www.postgresql.org/docs/)
- [数据库性能优化指南](https://github.com/major/MySQLTuner-perl)
- [云端数据库最佳实践](https://cloud.google.com/sql/docs/)

---

**注意**: 部署到生产环境前，请务必：
1. 修改所有默认密码
2. 配置适当的安全策略
3. 设置备份和恢复机制
4. 进行充分的测试
5. 监控系统性能
