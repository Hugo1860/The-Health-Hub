# 🚀 Health Hub 云端部署方案总结

## 📋 部署方案概览

### 🎯 最简洁方案：Docker一键部署

**适用场景**: 全新Ubuntu服务器，零配置快速上线

**部署时间**: 5-10分钟

**步骤**:
```bash
# 在本地Mac上
./upload-and-deploy.sh user@your-server-ip

# 或者在服务器上
./deploy-ubuntu-simple.sh
```

---

## 📦 三种部署方式对比

| 方案 | 难度 | 时间 | 资源占用 | 推荐度 |
|------|------|------|----------|--------|
| **Docker Compose** | ⭐️ 简单 | 5-10分钟 | 中等 | ⭐️⭐️⭐️⭐️⭐️ |
| **PM2 手动** | ⭐️⭐️⭐️ 中等 | 15-20分钟 | 较低 | ⭐️⭐️⭐️ |
| **从本地自动化** | ⭐️ 最简单 | 3-5分钟 | 中等 | ⭐️⭐️⭐️⭐️⭐️ |

---

## 🎯 方案一：从本地Mac一键部署（最推荐）

### 特点
- ✅ 自动打包、上传、部署
- ✅ 处理ARM到x86架构转换
- ✅ 自动安装Docker
- ✅ 自动初始化数据库

### 使用方法

```bash
# 在本地Mac上运行
chmod +x upload-and-deploy.sh
./upload-and-deploy.sh ubuntu@your-server-ip
```

### 完成后
- 应用地址: `http://your-server-ip:3000`
- 数据库端口: `3307`

---

## 🎯 方案二：服务器上直接部署

### 1. 上传项目到服务器

**方法A: 使用Git（推荐）**
```bash
# 在服务器上
git clone your-repo-url
cd The-Health-Hub-2
```

**方法B: 手动上传**
```bash
# 在本地Mac上
tar --exclude='node_modules' --exclude='.next' -czf health-hub.tar.gz .
scp health-hub.tar.gz user@server:~/

# 在服务器上
tar -xzf health-hub.tar.gz -C ~/health-hub
cd ~/health-hub
```

### 2. 运行部署脚本

```bash
chmod +x deploy-ubuntu-simple.sh
./deploy-ubuntu-simple.sh
```

脚本会自动：
1. 安装Docker和Docker Compose
2. 生成环境变量配置
3. 构建x86_64镜像
4. 启动所有服务
5. 初始化数据库

---

## 🎯 方案三：PM2手动部署（不使用Docker）

### 适用场景
- 服务器资源有限（<2GB内存）
- 已有独立MySQL服务器
- 不想使用Docker

### 步骤

```bash
# 1. 安装Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. 安装MySQL
sudo apt install mysql-server -y

# 3. 创建数据库
sudo mysql << EOF
CREATE DATABASE health_hub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'health_app'@'localhost' IDENTIFIED BY 'your-password';
GRANT ALL PRIVILEGES ON health_hub.* TO 'health_app'@'localhost';
FLUSH PRIVILEGES;
EOF

# 4. 配置环境变量
cp env.example .env.production
nano .env.production  # 修改数据库配置

# 5. 安装依赖并构建
npm install
npm run build

# 6. 使用PM2启动
npm install -g pm2
pm2 start npm --name "health-hub" -- start
pm2 startup
pm2 save
```

---

## 🔧 部署后配置

### 1. 配置防火墙

```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw allow 3000/tcp # 应用端口（可选）
sudo ufw enable
```

### 2. 配置Nginx反向代理（可选）

```bash
# 安装Nginx
sudo apt install nginx -y

# 创建配置
sudo nano /etc/nginx/sites-available/health-hub
```

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    client_max_body_size 100M;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# 启用配置
sudo ln -s /etc/nginx/sites-available/health-hub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. 配置SSL证书

```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期已配置
```

---

## 🔍 健康检查

### 运行健康检查脚本

```bash
chmod +x server-health-check.sh
./server-health-check.sh
```

### 手动检查

```bash
# 检查容器状态
docker compose ps

# 检查应用日志
docker compose logs -f app

# 检查数据库
docker compose exec db mysql -u health_app -pappPass123! health_hub

# 测试API
curl http://localhost:3000/api/health

# 查看资源使用
docker stats
```

---

## 📊 常用管理命令

### Docker部署

```bash
# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f app
docker compose logs -f db

# 重启服务
docker compose restart app
docker compose restart db

# 停止服务
docker compose down

# 更新代码后重新部署
git pull
docker compose build app
docker compose up -d
```

### PM2部署

```bash
# 查看状态
pm2 list
pm2 status health-hub

# 查看日志
pm2 logs health-hub
pm2 logs health-hub --lines 100

# 重启
pm2 restart health-hub

# 停止
pm2 stop health-hub

# 更新代码后
git pull
npm install
npm run build
pm2 restart health-hub
```

---

## 🔄 备份和恢复

### 数据库备份

```bash
# 备份数据库
docker compose exec db mysqldump -u root -prootpass123! health_hub > backup_$(date +%Y%m%d).sql

# 恢复数据库
docker compose exec -T db mysql -u health_app -pappPass123! health_hub < backup.sql
```

### 文件备份

```bash
# 备份上传文件
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz public/uploads/

# 恢复上传文件
tar -xzf uploads_backup.tar.gz
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

# 4. 重启服务
docker compose restart app
```

### 数据库连接失败

```bash
# 1. 检查数据库容器
docker compose ps db

# 2. 测试数据库连接
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

# 修改端口（编辑docker-compose.yml）
nano docker-compose.yml
# 修改 ports 配置
docker compose down && docker compose up -d
```

---

## 📚 相关文档

- **QUICK_START_UBUNTU.md** - 3分钟快速开始指南
- **DEPLOYMENT_GUIDE_UBUNTU.md** - 详细部署文档
- **env.cloud.template** - 环境变量模板
- **docker-compose.yml** - Docker编排配置

---

## 🔐 安全建议

### 必做项

1. ✅ 修改所有默认密码
2. ✅ 生成新的认证密钥
3. ✅ 配置防火墙
4. ✅ 启用SSL证书
5. ✅ 定期备份数据

### 生成随机密钥

```bash
# 生成4个32位密钥
openssl rand -base64 32  # NEXTAUTH_SECRET
openssl rand -base64 32  # SESSION_SECRET
openssl rand -base64 32  # JWT_SECRET
openssl rand -base64 32  # CSRF_SECRET
```

---

## 🎯 部署清单

### 部署前

- [ ] 准备Ubuntu 22.04服务器
- [ ] 配置SSH访问
- [ ] 准备域名（可选）
- [ ] 确认服务器配置（2GB+内存，20GB+硬盘）

### 部署中

- [ ] 上传代码到服务器
- [ ] 修改环境变量配置
- [ ] 生成新的密钥
- [ ] 运行部署脚本
- [ ] 验证服务启动

### 部署后

- [ ] 修改默认密码
- [ ] 配置防火墙
- [ ] 配置Nginx（如需域名）
- [ ] 配置SSL证书
- [ ] 运行健康检查
- [ ] 配置自动备份
- [ ] 测试所有功能

---

## 📞 快速命令参考

```bash
# 从本地一键部署
./upload-and-deploy.sh user@server-ip

# 服务器上部署
./deploy-ubuntu-simple.sh

# 健康检查
./server-health-check.sh

# 查看日志
docker compose logs -f

# 重启服务
docker compose restart

# 备份数据库
docker compose exec db mysqldump -u root -prootpass123! health_hub > backup.sql
```

---

## ✨ 部署成功指标

- ✅ Docker容器全部运行中
- ✅ 应用可通过浏览器访问
- ✅ 数据库连接正常
- ✅ API健康检查通过
- ✅ 可以上传音频文件
- ✅ 可以播放音频
- ✅ 可以登录后台管理

---

**预计总部署时间**: 5-10分钟

**推荐方案**: Docker一键部署

**技术支持**: 查看详细文档或运行健康检查脚本

🚀 开始部署吧！

