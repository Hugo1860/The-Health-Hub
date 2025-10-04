# Ubuntu 22.04 快速部署 - 3分钟上手

## 🚀 最简化部署流程

### 前提条件
- Ubuntu 22.04 x86_64 服务器
- SSH访问权限
- 至少 2GB 内存 / 20GB 硬盘

---

## 📦 方法一：一键部署（推荐）

### 在服务器上执行：

```bash
# 1. 上传项目到服务器（在本地Mac上执行）
tar --exclude='node_modules' --exclude='.next' --exclude='tmp' -czf health-hub.tar.gz .
scp health-hub.tar.gz user@your-server-ip:~/

# 2. 在服务器上解压
ssh user@your-server-ip
tar -xzf health-hub.tar.gz -C ~/health-hub
cd ~/health-hub

# 3. 运行一键部署脚本
chmod +x deploy-ubuntu-simple.sh
./deploy-ubuntu-simple.sh
```

**就这样！** 🎉

脚本会自动：
- ✅ 安装 Docker 和 Docker Compose
- ✅ 配置环境变量
- ✅ 构建 x86_64 镜像
- ✅ 启动所有服务
- ✅ 初始化数据库

完成后访问: `http://your-server-ip:3000`

---

## 🎯 方法二：Docker Compose手动部署

如果自动脚本遇到问题，可以手动执行：

### 步骤1：安装Docker

```bash
# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 安装Docker Compose
sudo apt update
sudo apt install -y docker-compose-plugin

# 重新登录使权限生效
exit  # 然后重新SSH登录
```

### 步骤2：配置环境

```bash
# 复制环境变量模板
cp env.cloud.template .env.production

# 编辑配置（修改密码和URL）
nano .env.production
```

**必须修改的配置**:
```env
NEXTAUTH_URL=http://your-server-ip:3000
NEXTAUTH_SECRET=$(openssl rand -base64 32)  # 生成新密钥
SESSION_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
CSRF_SECRET=$(openssl rand -base64 32)
MYSQL_ROOT_PASSWORD=你的root密码
MYSQL_PASSWORD=你的app密码
```

### 步骤3：部署

```bash
# 构建并启动
docker compose build --platform linux/amd64
docker compose up -d

# 查看状态
docker compose ps
docker compose logs -f
```

### 步骤4：初始化数据库

```bash
# 等待数据库启动（约30秒）
sleep 30

# 运行迁移
docker compose exec -T db mysql -u health_app -p health_hub < database/migrations/002_create_user_action_logs.sql
```

---

## 🔧 方法三：PM2部署（不使用Docker）

### 适用场景
- 服务器资源有限
- 已有MySQL数据库
- 不想使用Docker

### 步骤：

```bash
# 1. 安装Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. 安装PM2
sudo npm install -g pm2

# 3. 安装MySQL 8.0
sudo apt install mysql-server -y
sudo mysql_secure_installation

# 4. 创建数据库和用户
sudo mysql -e "
CREATE DATABASE health_hub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'health_app'@'localhost' IDENTIFIED BY 'appPass123!';
GRANT ALL PRIVILEGES ON health_hub.* TO 'health_app'@'localhost';
FLUSH PRIVILEGES;"

# 5. 配置环境变量
cp env.example .env.production
nano .env.production  # 修改数据库配置

# 6. 安装依赖并构建
npm install
npm run build

# 7. 使用PM2启动
pm2 start npm --name "health-hub" -- start
pm2 startup
pm2 save
```

---

## 🌐 配置域名和HTTPS（可选）

### 安装Nginx

```bash
sudo apt install nginx -y
```

### 配置反向代理

```bash
sudo nano /etc/nginx/sites-available/health-hub
```

**粘贴以下配置**:

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

### 安装SSL证书

```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期已配置
```

---

## 🛡️ 安全设置

### 配置防火墙

```bash
# 允许SSH
sudo ufw allow 22/tcp

# 允许HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 如果直接访问3000端口
sudo ufw allow 3000/tcp

# 启用防火墙
sudo ufw enable
```

### 修改默认密码

```bash
# 编辑环境变量
nano .env.production

# 修改所有密码相关配置
# 重启应用
docker compose restart app  # Docker部署
pm2 restart health-hub      # PM2部署
```

---

## 📊 验证部署

### 检查服务状态

```bash
# Docker部署
docker compose ps
docker compose logs app

# PM2部署
pm2 list
pm2 logs health-hub
```

### 测试访问

```bash
# 本地测试
curl http://localhost:3000
curl http://localhost:3000/api/health

# 外部访问
curl http://your-server-ip:3000
```

### 测试数据库

```bash
# Docker部署
docker compose exec db mysql -u health_app -pappPass123! -e "SHOW DATABASES;"

# 直接连接
mysql -h localhost -P 3307 -u health_app -pappPass123! health_hub
```

---

## 🔄 常用命令

### Docker部署

```bash
# 查看日志
docker compose logs -f app

# 重启服务
docker compose restart app

# 停止服务
docker compose down

# 更新代码后重新部署
git pull
docker compose build app
docker compose up -d
```

### PM2部署

```bash
# 查看日志
pm2 logs health-hub

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

## ❓ 常见问题

### 端口被占用

```bash
# 查看端口占用
sudo lsof -i :3000
sudo lsof -i :3307

# 修改端口（编辑docker-compose.yml）
nano docker-compose.yml
# 修改 ports 配置后重启
```

### 数据库连接失败

```bash
# 检查数据库服务
docker compose ps db

# 进入数据库测试
docker compose exec db mysql -u health_app -pappPass123! health_hub

# 查看数据库日志
docker compose logs db
```

### 内存不足

```bash
# 查看内存使用
free -h
docker stats

# 增加swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## 📞 获取帮助

- 详细文档: `DEPLOYMENT_GUIDE_UBUNTU.md`
- 环境配置: `env.cloud.template`
- 数据库脚本: `database/migrations/`

---

**预计部署时间**: 5-10分钟

**最简流程**: 上传代码 → 运行脚本 → 完成！

🎉 开始部署吧！

