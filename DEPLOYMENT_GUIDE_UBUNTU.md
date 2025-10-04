# Ubuntu 22.04 云端部署指南

## 🚀 最简洁部署方案

### 服务器环境
- **系统**: Ubuntu 22.04.5 LTS (Jammy Jellyfish) x86_64
- **架构**: x86_64 (与本地 M3 ARM 不同，Docker会自动处理)
- **最小配置**: 2核CPU / 4GB内存 / 20GB硬盘

---

## 📋 部署方式对比

### 方案一：Docker 部署 ⭐️ **推荐**
**优点**: 
- ✅ 环境一致性，隔离性好
- ✅ 自动处理架构差异(ARM→x86)
- ✅ 一键启动，易于回滚
- ✅ 包含MySQL数据库

**缺点**: 
- 需要安装Docker (但只需一次)

### 方案二：PM2 部署
**优点**: 
- ✅ 资源占用较小
- ✅ 进程守护和自动重启

**缺点**: 
- 需要手动安装Node.js、MySQL
- 环境配置复杂

---

## 🎯 方案一：Docker 部署（推荐）

### 步骤 1: 服务器准备

```bash
# 1. 更新系统
sudo apt update && sudo apt upgrade -y

# 2. 安装Docker和Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 安装Docker Compose
sudo apt install docker-compose-plugin -y

# 3. 验证安装
docker --version
docker compose version

# 4. 重新登录使权限生效
exit  # 然后重新SSH登录
```

### 步骤 2: 上传代码

**方法 1: 使用Git（推荐）**
```bash
# 在服务器上
cd ~
git clone <你的仓库地址>
cd The-Health-Hub\ 2
```

**方法 2: 使用scp**
```bash
# 在本地Mac上
# 先打包（排除 node_modules 和 .next）
tar --exclude='node_modules' \
    --exclude='.next' \
    --exclude='tmp' \
    --exclude='.git' \
    -czf health-hub.tar.gz .

# 上传到服务器
scp health-hub.tar.gz user@your-server-ip:~/

# 在服务器上解压
ssh user@your-server-ip
tar -xzf health-hub.tar.gz -C ~/The-Health-Hub-2
cd ~/The-Health-Hub-2
```

### 步骤 3: 配置环境变量

```bash
# 复制环境变量模板
cp env.cloud.template .env.production

# 编辑配置
nano .env.production
```

**必须修改的配置**:
```env
# 应用URL（改成你的域名或IP）
NEXTAUTH_URL=http://your-server-ip:3000

# 安全密钥（生成新的随机密钥）
NEXTAUTH_SECRET=你的32位随机字符串
SESSION_SECRET=你的32位随机字符串
JWT_SECRET=你的32位随机字符串
CSRF_SECRET=你的32位随机字符串

# 数据库密码（建议修改）
MYSQL_ROOT_PASSWORD=你的root密码
MYSQL_PASSWORD=你的app密码

# 可选：端口配置
MYSQL_PORT=3307  # 如果3306被占用
```

**生成随机密钥**:
```bash
# 生成4个随机密钥
openssl rand -base64 32
openssl rand -base64 32
openssl rand -base64 32
openssl rand -base64 32
```

### 步骤 4: 一键部署

```bash
# 使用我们提供的快速部署脚本
chmod +x quick-cloud-deploy.sh
./quick-cloud-deploy.sh
```

**或者手动执行**:
```bash
# 1. 构建镜像（针对x86_64）
docker compose build --no-cache

# 2. 启动服务
docker compose up -d

# 3. 查看日志
docker compose logs -f app

# 4. 等待服务启动（约30-60秒）
```

### 步骤 5: 初始化数据库

```bash
# 运行数据库迁移
docker compose exec app sh -c "cd database/migrations && ls *.sql | xargs -I {} mysql -h db -u health_app -pappPass123! health_hub < {}"

# 或者手动执行
docker compose exec db mysql -u health_app -pappPass123! health_hub < database/migrations/002_create_user_action_logs.sql
```

### 步骤 6: 验证部署

```bash
# 1. 检查服务状态
docker compose ps

# 2. 检查日志
docker compose logs app

# 3. 访问应用
curl http://localhost:3000

# 4. 访问健康检查
curl http://localhost:3000/api/health
```

**在浏览器中访问**:
```
http://your-server-ip:3000
```

### 步骤 7: 配置Nginx反向代理（可选）

如果想使用域名或80端口：

```bash
# 1. 安装Nginx
sudo apt install nginx -y

# 2. 创建配置文件
sudo nano /etc/nginx/sites-available/health-hub

# 3. 粘贴以下内容
```

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 改成你的域名

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

```bash
# 4. 启用配置
sudo ln -s /etc/nginx/sites-available/health-hub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 5. 更新 .env.production 中的 NEXTAUTH_URL
nano .env.production
# 改为: NEXTAUTH_URL=http://your-domain.com

# 6. 重启应用
docker compose restart app
```

---

## 🔧 常用命令

### 服务管理
```bash
# 启动服务
docker compose up -d

# 停止服务
docker compose down

# 重启服务
docker compose restart

# 重启特定服务
docker compose restart app
docker compose restart db

# 查看日志
docker compose logs -f
docker compose logs -f app  # 只看应用日志
```

### 更新部署
```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建
docker compose build --no-cache app

# 3. 重启服务
docker compose up -d

# 或者使用脚本
./quick-cloud-deploy.sh
```

### 数据库管理
```bash
# 进入数据库容器
docker compose exec db mysql -u health_app -pappPass123! health_hub

# 备份数据库
docker compose exec db mysqldump -u root -prootpass123! health_hub > backup_$(date +%Y%m%d).sql

# 恢复数据库
docker compose exec -T db mysql -u health_app -pappPass123! health_hub < backup.sql

# 查看数据库日志
docker compose logs db
```

### 文件上传管理
```bash
# 上传音频文件到服务器
scp local-audio.wav user@server:/path/to/The-Health-Hub-2/public/uploads/audios/

# 或在服务器上直接上传到Docker卷
docker compose cp local-audio.wav app:/app/public/uploads/audios/
```

---

## 📊 监控和维护

### 查看资源占用
```bash
# 查看Docker资源使用
docker stats

# 查看磁盘使用
df -h
du -sh ~/The-Health-Hub-2/*
```

### 日志管理
```bash
# Docker日志已自动配置为滚动（max 10MB × 3个文件）
# 查看日志配置
docker compose config

# 清理旧日志
docker system prune -a --volumes  # 谨慎使用！会删除未使用的容器和卷
```

### 设置自动重启
```bash
# Docker Compose 已配置 restart: unless-stopped
# 服务器重启后自动启动

# 手动设置开机启动Docker
sudo systemctl enable docker
```

---

## 🛡️ 安全配置

### 1. 防火墙设置
```bash
# 安装UFW
sudo apt install ufw -y

# 允许SSH
sudo ufw allow 22/tcp

# 允许HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 如果直接访问3000端口
sudo ufw allow 3000/tcp

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status
```

### 2. SSL证书（使用Let's Encrypt）
```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取证书（确保域名已解析到服务器IP）
sudo certbot --nginx -d your-domain.com

# 自动续期（已包含在系统中）
sudo certbot renew --dry-run
```

### 3. 修改默认端口（可选）
```bash
# 编辑 docker-compose.yml
nano docker-compose.yml

# 修改端口映射
# ports:
#   - "8080:3000"  # 改成其他端口

# 重启服务
docker compose up -d
```

---

## ❌ 故障排查

### 应用无法启动
```bash
# 1. 查看容器状态
docker compose ps

# 2. 查看详细日志
docker compose logs app --tail=100

# 3. 检查环境变量
docker compose exec app env | grep -E "DB_|NEXTAUTH"

# 4. 测试数据库连接
docker compose exec app node scripts/test-db-connection.js
```

### 数据库连接失败
```bash
# 1. 检查数据库是否启动
docker compose ps db

# 2. 进入数据库测试
docker compose exec db mysql -u health_app -pappPass123! -e "SHOW DATABASES;"

# 3. 检查网络
docker compose exec app ping db

# 4. 重启数据库
docker compose restart db
```

### 端口被占用
```bash
# 查看端口占用
sudo lsof -i :3000
sudo lsof -i :3307

# 修改端口
nano docker-compose.yml
# 修改 ports 配置后重启
docker compose down && docker compose up -d
```

### 磁盘空间不足
```bash
# 清理Docker资源
docker system prune -a
docker volume prune

# 清理旧镜像
docker image prune -a

# 清理日志
sudo journalctl --vacuum-time=3d
```

---

## 📈 性能优化

### 1. Node.js 内存限制
编辑 `docker-compose.yml`:
```yaml
services:
  app:
    environment:
      NODE_OPTIONS: "--max-old-space-size=2048"  # 限制为2GB
```

### 2. MySQL优化
```bash
# 创建自定义MySQL配置
cat > mysql-custom.cnf <<EOF
[mysqld]
max_connections = 200
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
query_cache_size = 0
EOF

# 挂载配置（编辑docker-compose.yml）
# volumes:
#   - ./mysql-custom.cnf:/etc/mysql/conf.d/custom.cnf
```

### 3. 启用Gzip压缩
Nginx配置已包含，或在Next.js中启用（next.config.js）。

---

## 🔄 回滚方案

```bash
# 1. 停止当前服务
docker compose down

# 2. 回滚到之前的镜像
docker tag health-hub:previous health-hub:latest

# 3. 启动服务
docker compose up -d

# 或使用Git回滚
git checkout <previous-commit>
docker compose build && docker compose up -d
```

---

## 📞 需要帮助？

### 检查清单
- [ ] Docker和Docker Compose已安装
- [ ] .env.production配置正确
- [ ] 防火墙允许相应端口
- [ ] 数据库迁移已执行
- [ ] uploads目录有写权限
- [ ] 域名已解析（如果使用域名）

### 快速诊断
```bash
# 运行完整诊断
./scripts/docker-healthcheck.sh

# 查看所有服务状态
docker compose ps
docker compose logs
curl http://localhost:3000/api/health
```

---

## 总结

**最简洁的部署流程**:
1. 安装Docker (5分钟)
2. 上传代码 (5分钟)
3. 配置环境变量 (5分钟)
4. 运行 `./quick-cloud-deploy.sh` (2分钟)
5. 完成！🎉

**总耗时**: 约 20 分钟

---

*最后更新: 2025-10-01*

