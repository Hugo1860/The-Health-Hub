# 健康中心云端部署指南

## 📋 目录

1. [部署前准备](#部署前准备)
2. [数据库初始化](#数据库初始化)
3. [应用部署](#应用部署)
4. [配置优化](#配置优化)
5. [监控和维护](#监控和维护)
6. [故障排除](#故障排除)
7. [安全加固](#安全加固)
8. [性能优化](#性能优化)

## 🚀 部署前准备

### 1.1 系统要求

#### 服务器规格
- **CPU**: 2核或以上
- **内存**: 4GB或以上
- **存储**: 20GB SSD或以上
- **带宽**: 10Mbps或以上

#### 支持的云平台
- ✅ AWS EC2 / Lightsail
- ✅ Google Cloud Compute Engine
- ✅ Microsoft Azure VM
- ✅ Alibaba Cloud ECS
- ✅ DigitalOcean Droplets
- ✅ Linode / Vultr
- ✅ 其他支持Docker的云主机

### 1.2 软件依赖

#### 必须安装
- Docker 20.10+
- Docker Compose 2.0+
- Git 2.30+
- curl/wget

#### 可选安装
- Nginx (用于反向代理)
- Redis (用于会话存储)
- Prometheus + Grafana (用于监控)

### 1.3 获取部署包

```bash
# 克隆项目
git clone https://github.com/your-repo/health-hub.git
cd health-hub

# 或者下载部署包
wget https://your-domain.com/health-hub-deployment.zip
unzip health-hub-deployment.zip
cd health-hub-deployment
```

## 🗄️ 数据库初始化

### 2.1 选择数据库类型

支持两种数据库类型：
- **MySQL 8.0+** (推荐)
- **PostgreSQL 13+**

### 2.2 快速初始化

#### 方法一：自动脚本初始化

```bash
# MySQL 初始化
./scripts/init-cloud-database.sh mysql

# PostgreSQL 初始化
./scripts/init-cloud-database.sh postgresql
```

#### 方法二：Docker 容器初始化

```bash
# 启动数据库容器
docker-compose up -d mysql  # 或 postgresql

# 等待容器启动
sleep 30

# 执行初始化
./scripts/init-cloud-database-docker.sh mysql  # 或 postgresql
```

#### 方法三：手动初始化

```bash
# 连接到数据库
mysql -h your-host -u username -p database_name
# 然后执行: SOURCE database/cloud-init-mysql.sql;

# 或 PostgreSQL
psql -h your-host -U username -d database_name -f database/cloud-init-postgresql.sql
```

### 2.3 验证初始化

```sql
-- MySQL
USE health_hub;
SHOW TABLES;
SELECT COUNT(*) FROM users WHERE role = 'admin';

-- PostgreSQL
\c health_hub;
\dt;
SELECT COUNT(*) FROM users WHERE role = 'admin';
```

## 🐳 应用部署

### 3.1 Docker 部署

#### 3.1.1 单容器部署

```bash
# 构建应用镜像
docker build -t health-hub:latest .

# 运行容器
docker run -d \
  --name health-hub-app \
  -p 3000:3000 \
  -e DB_HOST=your-db-host \
  -e DB_PASSWORD=your-db-password \
  -e NEXTAUTH_SECRET=your-nextauth-secret \
  health-hub:latest
```

#### 3.1.2 Docker Compose 部署

```yaml
# docker-compose.yml
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: your-root-password
      MYSQL_DATABASE: health_hub
      MYSQL_USER: health_app
      MYSQL_PASSWORD: your-app-password
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"

  app:
    build: .
    depends_on:
      - mysql
    environment:
      DATABASE_TYPE: mysql
      DB_HOST: mysql
      DB_PORT: 3306
      DB_DATABASE: health_hub
      DB_USERNAME: health_app
      DB_PASSWORD: your-app-password
      NEXTAUTH_SECRET: your-nextauth-secret
      NODE_ENV: production
    ports:
      - "3000:3000"
    volumes:
      - uploads:/app/uploads

volumes:
  mysql_data:
  uploads:
```

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f app
```

### 3.2 传统部署

#### 3.2.1 系统依赖安装

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y nodejs npm nginx certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum update -y
sudo yum install -y nodejs npm nginx
```

#### 3.2.2 应用部署

```bash
# 安装依赖
npm install --production

# 构建应用
npm run build

# 启动应用
npm start
```

#### 3.2.3 Nginx 配置

```nginx
# /etc/nginx/sites-available/health-hub
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # API 代理
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 文件上传代理
    location /uploads/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 前端路由
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# 启用配置
sudo ln -s /etc/nginx/sites-available/health-hub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## ⚙️ 配置优化

### 4.1 环境配置

```bash
# 复制配置模板
cp env.cloud.template .env.cloud

# 编辑配置
nano .env.cloud
```

关键配置项：
```bash
# 数据库配置
DATABASE_TYPE=mysql
DB_HOST=your-db-host
DB_DATABASE=health_hub
DB_USERNAME=health_app
DB_PASSWORD=your-secure-password

# NextAuth 配置
NEXTAUTH_SECRET=your-nextauth-secret-32-chars-min
NEXTAUTH_URL=https://your-domain.com

# 应用配置
NODE_ENV=production
PORT=3000
```

### 4.2 性能优化

#### 4.2.1 数据库优化

```sql
-- MySQL 优化
SET GLOBAL innodb_buffer_pool_size = 134217728;  -- 128MB
SET GLOBAL query_cache_size = 16777216;          -- 16MB
SET GLOBAL max_connections = 200;

-- 分析表
ANALYZE TABLE users, audios, categories;
```

```sql
-- PostgreSQL 优化
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
SELECT pg_reload_conf();
```

#### 4.2.2 应用优化

```bash
# 启用 PM2 集群模式
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'health-hub',
    script: 'npm start',
    instances: 'max',  // 使用所有CPU核心
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### 4.3 SSL 配置

#### 4.3.1 Let's Encrypt

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取 SSL 证书
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 自动续期
sudo crontab -e
# 添加: 0 3 * * * certbot renew --quiet
```

#### 4.3.2 自定义证书

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /path/to/your/cert.pem;
    ssl_certificate_key /path/to/your/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;

    # 其他配置...
}
```

## 📊 监控和维护

### 5.1 应用监控

#### 5.1.1 健康检查

```bash
# 健康检查端点
curl https://your-domain.com/api/health

# 详细健康检查
curl https://your-domain.com/api/health/detailed
```

#### 5.1.2 日志监控

```bash
# 查看应用日志
docker-compose logs -f app

# 查看错误日志
tail -f logs/errors.log

# 查看性能日志
tail -f logs/security.log
```

#### 5.1.3 性能监控

```bash
# 性能指标
curl https://your-domain.com/api/metrics

# 数据库性能
curl https://your-domain.com/api/admin/dashboard/stats
```

### 5.2 数据库维护

#### 5.2.1 备份策略

```bash
# 手动备份
./scripts/export-db.sh

# 自动备份配置
crontab -e
# 添加: 0 2 * * * /path/to/health-hub/scripts/export-db.sh
```

#### 5.2.2 清理任务

```sql
-- 清理旧日志（30天）
DELETE FROM admin_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- 清理未读通知（90天）
DELETE FROM notifications WHERE is_read = FALSE AND created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);

-- 优化表
OPTIMIZE TABLE audios, users, categories;
```

#### 5.2.3 监控查询

```sql
-- 慢查询分析
SELECT * FROM query_performance
WHERE execution_time > 1000
ORDER BY execution_time DESC
LIMIT 10;

-- API 性能分析
SELECT endpoint, method, AVG(response_time), COUNT(*)
FROM api_metrics
WHERE timestamp > NOW() - INTERVAL '1 day'
GROUP BY endpoint, method
ORDER BY AVG(response_time) DESC;
```

### 5.3 系统监控

#### 5.3.1 资源监控

```bash
# 系统资源使用
htop
df -h
free -h

# Docker 资源使用
docker stats

# 网络监控
iftop
nethogs
```

#### 5.3.2 告警设置

```bash
# 监控脚本
./scripts/monitor.sh

# 邮件告警
curl -X POST https://your-domain.com/api/alerts/test
```

## 🔧 故障排除

### 6.1 常见问题

#### 6.1.1 数据库连接问题

**问题**: `Error: connect ECONNREFUSED`
**解决**:
```bash
# 检查数据库服务状态
sudo systemctl status mysql  # 或 postgresql

# 检查连接配置
ping your-db-host
telnet your-db-host 3306  # 或 5432

# 查看连接日志
docker-compose logs mysql
```

#### 6.1.2 应用启动失败

**问题**: `Error: EADDRINUSE :::3000`
**解决**:
```bash
# 检查端口占用
lsof -i :3000
kill -9 <PID>

# 或修改端口
export PORT=3001
npm start
```

#### 6.1.3 文件权限问题

**问题**: `Error: EACCES: permission denied`
**解决**:
```bash
# 修复文件权限
sudo chown -R $USER:$USER /path/to/health-hub
chmod -R 755 /path/to/health-hub
chmod -R 777 uploads/ logs/ backups/
```

### 6.2 调试模式

```bash
# 启用调试
export DEBUG=true
export LOG_LEVEL=debug
npm start

# 查看详细日志
tail -f logs/app.log | grep -E "(ERROR|WARN|DEBUG)"
```

### 6.3 性能问题

```bash
# 性能分析
curl https://your-domain.com/api/metrics

# 数据库性能
SHOW PROCESSLIST;  # MySQL
SELECT * FROM pg_stat_activity;  # PostgreSQL

# 应用性能
ab -n 100 -c 10 https://your-domain.com/
```

## 🔒 安全加固

### 7.1 账户安全

```sql
-- 修改默认密码
UPDATE users SET password = '$2b$12$new-secure-hashed-password'
WHERE email = 'admin@example.com';

-- 创建专门的应用用户
CREATE USER 'health_app'@'%' IDENTIFIED BY 'secure-app-password';
GRANT SELECT, INSERT, UPDATE, DELETE ON health_hub.* TO 'health_app'@'%';
```

### 7.2 网络安全

```bash
# 防火墙配置
sudo ufw allow 'Nginx Full'
sudo ufw allow ssh
sudo ufw enable

# Nginx 安全头
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
```

### 7.3 数据安全

```bash
# 启用加密
# 编辑 .env.cloud
BACKUP_ENCRYPTION_KEY=your-encryption-key

# 定期备份
./scripts/export-db.sh

# 备份验证
ls -la backups/
```

### 7.4 审计和监控

```sql
-- 启用审计日志
SET GLOBAL general_log = 'ON';
SET GLOBAL general_log_file = '/var/log/mysql/general.log';

-- 监控可疑活动
SELECT * FROM admin_logs
WHERE level IN ('warn', 'error')
AND created_at > NOW() - INTERVAL '24 hours';
```

## ⚡ 性能优化

### 8.1 缓存优化

```bash
# Redis 缓存（如果使用）
redis-cli info memory

# 应用缓存
curl https://your-domain.com/api/cache/stats
```

### 8.2 数据库优化

```sql
-- 查询优化
EXPLAIN SELECT * FROM audios WHERE title LIKE '%test%';

-- 索引优化
CREATE INDEX idx_audios_title_fulltext ON audios(title);

-- 连接池优化
SHOW STATUS LIKE 'Threads_connected';
```

### 8.3 CDN 配置

```nginx
# 静态资源缓存
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    proxy_pass http://localhost:3000;
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header X-Cache-Status $upstream_cache_status;
}
```

### 8.4 压缩优化

```bash
# 启用 gzip
sudo apt install nginx-extras
sudo systemctl reload nginx
```

## 📚 参考资料

- [Docker 官方文档](https://docs.docker.com/)
- [Nginx 官方文档](https://nginx.org/en/docs/)
- [MySQL 性能调优](https://dev.mysql.com/doc/refman/8.0/en/optimization.html)
- [PostgreSQL 性能调优](https://www.postgresql.org/docs/current/performance-tips.html)
- [PM2 生产部署](https://pm2.keymetrics.io/docs/usage/deployment/)
- [SSL 配置最佳实践](https://ssl-config.mozilla.org/)

## 🆘 技术支持

如遇问题，请：
1. 查看日志文件：`tail -f logs/*.log`
2. 检查系统资源：`htop`, `df -h`, `free -h`
3. 测试网络连接：`ping your-domain.com`
4. 验证配置：`cat .env.cloud | grep -v PASSWORD`

---

**部署成功后请立即：**
1. 修改所有默认密码
2. 配置 SSL 证书
3. 设置监控和告警
4. 配置定期备份
5. 进行安全审计
