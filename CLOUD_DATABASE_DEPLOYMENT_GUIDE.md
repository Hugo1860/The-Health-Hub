# 云端数据库部署指南

## 目录
- [方案概述](#方案概述)
- [阿里云 RDS MySQL](#阿里云-rds-mysql)
- [AWS RDS MySQL](#aws-rds-mysql)
- [腾讯云 MySQL](#腾讯云-mysql)
- [Docker 部署](#docker-部署)
- [数据库初始化](#数据库初始化)
- [应用配置](#应用配置)
- [安全配置](#安全配置)
- [性能优化](#性能优化)

---

## 方案概述

### 推荐云服务商

| 云服务商 | 产品名称 | 优势 | 起步价格 |
|---------|---------|------|---------|
| **阿里云** | RDS MySQL | 国内访问快、文档完善 | ¥200/月起 |
| **腾讯云** | 云数据库 MySQL | 性价比高、微信生态 | ¥150/月起 |
| **AWS** | RDS MySQL | 全球覆盖、功能强大 | $15/月起 |
| **华为云** | RDS MySQL | 政企友好 | ¥180/月起 |

### 配置建议

#### 开发环境
- **规格**: 1核2GB
- **存储**: 20GB SSD
- **备份**: 每日自动备份
- **成本**: ¥150-200/月

#### 生产环境
- **规格**: 2核4GB 或更高
- **存储**: 100GB+ SSD
- **备份**: 每日自动 + 实时日志备份
- **高可用**: 主从同步
- **成本**: ¥500-1000/月

---

## 阿里云 RDS MySQL

### 1. 创建实例

#### 通过控制台
1. 登录 [阿里云控制台](https://rdsnext.console.aliyun.com/)
2. 选择 **云数据库 RDS** > **创建实例**
3. 配置选择：
   ```
   地域：根据应用服务器选择（建议同地域）
   数据库版本：MySQL 8.0
   系列：基础版（开发）/ 高可用版（生产）
   规格：2核4GB
   存储类型：SSD云盘
   存储空间：100GB
   ```
4. 网络配置：
   ```
   专有网络：选择或创建 VPC
   交换机：选择可用区
   ```
5. 点击 **立即购买**

### 2. 配置白名单

```bash
# 在 RDS 控制台 > 数据安全性 > 白名单设置
# 添加应用服务器 IP 或 IP 段

# 开发环境（临时）
0.0.0.0/0  # ⚠️ 仅用于测试，生产环境禁止

# 生产环境（推荐）
1.2.3.4/32  # 应用服务器 IP
10.0.0.0/24  # VPC 内网段
```

### 3. 创建数据库和用户

```sql
-- 通过 RDS 控制台 SQL 窗口执行

-- 创建数据库
CREATE DATABASE health_hub 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_0900_ai_ci;

-- 创建应用用户
CREATE USER 'health_app'@'%' IDENTIFIED BY 'YourStrongPassword123!@#';

-- 授权
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER 
ON health_hub.* 
TO 'health_app'@'%';

FLUSH PRIVILEGES;
```

### 4. 连接信息

```bash
# 从 RDS 控制台获取
主机地址: rm-bp1xxxxxxxx.mysql.rds.aliyuncs.com
端口: 3306
数据库名: health_hub
用户名: health_app
密码: YourStrongPassword123!@#
```

---

## AWS RDS MySQL

### 1. 创建实例

```bash
# 通过 AWS CLI
aws rds create-db-instance \
  --db-instance-identifier health-hub-mysql \
  --db-instance-class db.t3.medium \
  --engine mysql \
  --engine-version 8.0.35 \
  --master-username admin \
  --master-user-password YourStrongPassword \
  --allocated-storage 100 \
  --storage-type gp3 \
  --vpc-security-group-ids sg-xxxxxxxx \
  --db-subnet-group-name default \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "Mon:04:00-Mon:05:00" \
  --multi-az \
  --publicly-accessible \
  --storage-encrypted \
  --enable-cloudwatch-logs-exports '["error","general","slowquery"]'
```

### 2. 配置安全组

```bash
# 添加入站规则
Type: MySQL/Aurora (3306)
Source: 应用服务器安全组 ID 或 IP
Description: Health Hub Application
```

### 3. 连接信息

```bash
# 从 RDS 控制台获取
Endpoint: health-hub-mysql.xxxxxxxx.us-east-1.rds.amazonaws.com
Port: 3306
Username: admin
Password: YourStrongPassword
```

---

## 腾讯云 MySQL

### 1. 创建实例

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/cdb)
2. 选择 **MySQL** > **新建**
3. 配置选择：
   ```
   计费模式：包年包月
   地域：根据应用选择
   数据库版本：MySQL 8.0
   架构：双节点（高可用）
   规格：2核4GB
   硬盘：100GB SSD
   网络：选择 VPC
   ```

### 2. 初始化实例

```sql
-- 创建数据库
CREATE DATABASE health_hub 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_general_ci;

-- 创建用户
CREATE USER 'health_app'@'%' IDENTIFIED BY 'YourPassword';
GRANT ALL PRIVILEGES ON health_hub.* TO 'health_app'@'%';
FLUSH PRIVILEGES;
```

---

## Docker 部署

### 1. Docker Compose 配置

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: health-hub-mysql
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: health_hub
      MYSQL_USER: health_app
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
      TZ: Asia/Shanghai
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./database/cloud-init-mysql.sql:/docker-entrypoint-initdb.d/init.sql
      - ./mysql.cnf:/etc/mysql/conf.d/custom.cnf
    command:
      - --character-set-server=utf8mb4
      - --collation-server=utf8mb4_0900_ai_ci
      - --default-time-zone=+00:00
      - --max_connections=500
      - --innodb_buffer_pool_size=1G
    networks:
      - health-hub-network
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${MYSQL_ROOT_PASSWORD}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # 可选：phpMyAdmin 管理界面
  phpmyadmin:
    image: phpmyadmin:latest
    container_name: health-hub-phpmyadmin
    restart: always
    environment:
      PMA_HOST: mysql
      PMA_PORT: 3306
      PMA_USER: root
      PMA_PASSWORD: ${MYSQL_ROOT_PASSWORD}
    ports:
      - "8080:80"
    depends_on:
      - mysql
    networks:
      - health-hub-network

volumes:
  mysql_data:
    driver: local

networks:
  health-hub-network:
    driver: bridge
```

### 2. MySQL 配置文件

创建 `mysql.cnf`：

```ini
[mysqld]
# 字符集
character-set-server = utf8mb4
collation-server = utf8mb4_0900_ai_ci

# 连接
max_connections = 500
max_connect_errors = 1000

# 缓冲池
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M

# 查询缓存（8.0 已移除，仅供参考）
# query_cache_type = 1
# query_cache_size = 128M

# 日志
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow-query.log
long_query_time = 2

# 时区
default-time-zone = '+00:00'

# 安全
local_infile = 0

[client]
default-character-set = utf8mb4
```

### 3. 环境变量文件

创建 `.env.docker`：

```bash
MYSQL_ROOT_PASSWORD=your_secure_root_password_here
MYSQL_PASSWORD=your_app_password_here
```

### 4. 启动容器

```bash
# 启动
docker-compose up -d

# 查看日志
docker-compose logs -f mysql

# 检查状态
docker-compose ps

# 停止
docker-compose down

# 停止并删除数据
docker-compose down -v
```

---

## 数据库初始化

### 方式 1: 使用云端初始化脚本

```bash
# 连接到云端数据库
mysql -h <数据库地址> -P 3306 -u health_app -p

# 执行初始化脚本
mysql> source /path/to/The-Health-Hub\ 2/database/cloud-init-mysql.sql
```

### 方式 2: 使用 MySQL Workbench

1. 下载 [MySQL Workbench](https://dev.mysql.com/downloads/workbench/)
2. 创建新连接：
   - Hostname: 数据库地址
   - Port: 3306
   - Username: health_app
   - Password: (保存密码)
3. 打开 `database/cloud-init-mysql.sql`
4. 点击 **Execute**

### 方式 3: 使用命令行

```bash
# Linux/Mac
mysql -h <数据库地址> -u health_app -p health_hub < database/cloud-init-mysql.sql

# Windows
mysql.exe -h <数据库地址> -u health_app -p health_hub < database\cloud-init-mysql.sql
```

### 验证数据库结构

```sql
-- 查看所有表
SHOW TABLES;

-- 查看表结构
DESCRIBE users;
DESCRIBE audios;
DESCRIBE categories;

-- 查看索引
SHOW INDEX FROM audios;

-- 验证数据
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM categories;
```

---

## 应用配置

### 1. 环境变量配置

创建 `.env.production`：

```bash
# 数据库配置
DATABASE_URL="mysql://health_app:YourPassword@your-db-host.com:3306/health_hub"

# 或分离配置
DB_HOST=your-db-host.com
DB_PORT=3306
DB_USER=health_app
DB_PASSWORD=YourPassword
DB_NAME=health_hub
DB_SSL=true

# NextAuth
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-nextauth-secret-key

# 其他配置
NODE_ENV=production
```

### 2. 数据库连接代码

更新 `src/lib/db.ts`（如果需要）：

```typescript
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // SSL 配置（阿里云 RDS 需要）
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : undefined
});

export default pool;
```

### 3. 测试连接

```bash
# 在服务器上测试
cd /path/to/your-app
npm run build

# 测试数据库连接
node -e "const db = require('./src/lib/db').default; db.query('SELECT 1').then(() => console.log('✅ 连接成功')).catch(e => console.error('❌ 连接失败:', e));"
```

---

## 安全配置

### 1. 数据库用户权限最小化

```sql
-- 生产环境：不给 DROP 权限
REVOKE DROP ON health_hub.* FROM 'health_app'@'%';

-- 只读用户（用于报表查询）
CREATE USER 'health_readonly'@'%' IDENTIFIED BY 'ReadOnlyPassword';
GRANT SELECT ON health_hub.* TO 'health_readonly'@'%';
```

### 2. SSL/TLS 连接

```bash
# 阿里云 RDS：默认强制 SSL
# 下载 CA 证书
wget https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20220712/cmit/ApsaraDB-CA-Chain.zip

# 配置连接
ssl: {
  ca: fs.readFileSync('/path/to/ApsaraDB-CA-Chain.pem')
}
```

### 3. 防火墙规则

```bash
# 阿里云安全组
入站规则：
- 协议：TCP
- 端口：3306
- 源：应用服务器安全组 ID
- 描述：Health Hub App

# AWS 安全组
Type: MySQL/Aurora
Protocol: TCP
Port: 3306
Source: sg-xxxxxxxx (应用服务器)
```

### 4. 定期备份

```bash
# 自动备份（云服务商提供）
- 每日自动备份
- 保留 7-30 天
- 跨地域备份（高级）

# 手动备份脚本
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/mysql"
mkdir -p $BACKUP_DIR

mysqldump -h your-db-host.com \
  -u health_app \
  -p'YourPassword' \
  --single-transaction \
  --routines \
  --triggers \
  health_hub > $BACKUP_DIR/health_hub_$DATE.sql

# 压缩
gzip $BACKUP_DIR/health_hub_$DATE.sql

# 保留最近 7 天
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

---

## 性能优化

### 1. 索引优化

```sql
-- 检查慢查询
SELECT * FROM mysql.slow_log 
ORDER BY query_time DESC 
LIMIT 10;

-- 添加必要索引（已在 schema 中包含）
CREATE INDEX idx_audios_status ON audios(status);
CREATE INDEX idx_audios_category ON audios(category_id);
CREATE INDEX idx_audios_upload_date ON audios(upload_date);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_favorites_user ON favorites(user_id);
```

### 2. 查询优化

```sql
-- 使用 EXPLAIN 分析查询
EXPLAIN SELECT * FROM audios 
WHERE status = 'published' 
ORDER BY upload_date DESC 
LIMIT 20;

-- 避免 SELECT *，只选择需要的字段
SELECT id, title, url, cover_image 
FROM audios 
WHERE status = 'published';
```

### 3. 连接池配置

```javascript
// src/lib/db.ts
const pool = mysql.createPool({
  connectionLimit: 20,      // 最大连接数
  maxIdle: 10,              // 最大空闲连接
  idleTimeout: 60000,       // 空闲超时
  queueLimit: 0,            // 队列限制
  enableKeepAlive: true,    // 保持连接
});
```

### 4. 缓存策略

```typescript
// 使用 Redis 缓存热点数据
import Redis from 'ioredis';

const redis = new Redis({
  host: 'your-redis-host',
  port: 6379,
});

// 缓存音频列表
async function getPopularAudios() {
  const cacheKey = 'popular:audios';
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const audios = await db.query('SELECT * FROM audios ...');
  await redis.setex(cacheKey, 300, JSON.stringify(audios)); // 5分钟
  
  return audios;
}
```

---

## 监控和维护

### 1. 监控指标

- **连接数**: 当前活跃连接 / 最大连接数
- **QPS**: 每秒查询数
- **慢查询**: 执行时间 > 2秒的查询
- **磁盘使用**: 数据量增长趋势
- **CPU/内存**: 资源使用率

### 2. 日常维护

```sql
-- 查看表大小
SELECT 
  table_name,
  ROUND((data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables
WHERE table_schema = 'health_hub'
ORDER BY (data_length + index_length) DESC;

-- 优化表
OPTIMIZE TABLE audios;
OPTIMIZE TABLE users;

-- 查看连接数
SHOW PROCESSLIST;
SHOW STATUS LIKE 'Threads_connected';
```

### 3. 告警配置

```bash
# 阿里云云监控
- CPU 使用率 > 80%
- 磁盘使用率 > 85%
- 连接数 > 80%
- 慢查询数 > 100/分钟
```

---

## 常见问题

### Q1: 连接超时

```bash
# 检查网络
telnet your-db-host.com 3306

# 检查白名单
# 确保应用服务器 IP 在白名单中

# 检查安全组
# 确保入站规则允许 3306 端口
```

### Q2: 权限不足

```sql
-- 查看当前用户权限
SHOW GRANTS FOR 'health_app'@'%';

-- 重新授权
GRANT SELECT, INSERT, UPDATE, DELETE ON health_hub.* TO 'health_app'@'%';
FLUSH PRIVILEGES;
```

### Q3: 字符集问题

```sql
-- 检查字符集
SHOW VARIABLES LIKE 'character%';

-- 修改字符集
ALTER DATABASE health_hub CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE audios CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
```

---

## 快速开始检查清单

- [ ] 1. 创建云数据库实例
- [ ] 2. 配置白名单/安全组
- [ ] 3. 创建数据库和用户
- [ ] 4. 执行初始化脚本 (`cloud-init-mysql.sql`)
- [ ] 5. 验证表结构和索引
- [ ] 6. 配置应用环境变量
- [ ] 7. 测试数据库连接
- [ ] 8. 配置 SSL/TLS（如需要）
- [ ] 9. 设置自动备份
- [ ] 10. 配置监控告警
- [ ] 11. 性能测试
- [ ] 12. 生产环境部署

---

## 参考文档

- [阿里云 RDS MySQL 文档](https://help.aliyun.com/product/26090.html)
- [AWS RDS MySQL 文档](https://docs.aws.amazon.com/rds/index.html)
- [腾讯云 MySQL 文档](https://cloud.tencent.com/document/product/236)
- [MySQL 8.0 官方文档](https://dev.mysql.com/doc/refman/8.0/en/)
- [Docker MySQL 镜像](https://hub.docker.com/_/mysql)

---

**最后更新**: 2025-01-05
**维护者**: Health Hub Team

