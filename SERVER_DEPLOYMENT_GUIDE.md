# 云端服务器部署指南

## 🚀 完整部署流程

### 前置要求

- ✅ Node.js >= 22.0.0
- ✅ npm >= 10.0.0
- ✅ MySQL 8.0+ 数据库（已配置）
- ✅ 服务器内存 >= 2GB
- ✅ 磁盘空间 >= 10GB

---

## 📋 部署步骤

### 1️⃣ 安装 Node.js 和 npm（如未安装）

```bash
# 方法 1: 使用 nvm（推荐）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22

# 方法 2: 直接安装
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证版本
node -v  # 应该 >= v22.0.0
npm -v   # 应该 >= 10.0.0
```

### 2️⃣ 克隆项目

```bash
# 如果还没有 Git
sudo apt-get install git -y

# 克隆项目
cd /www/wwwroot
git clone https://github.com/Hugo1860/The-Health-Hub.git

# 进入项目目录
cd The-Health-Hub

# 查看项目文件
ls -la
```

### 3️⃣ 安装依赖

```bash
# 清理 npm 缓存（可选）
npm cache clean --force

# 安装所有依赖
npm install

# 如果遇到权限问题
sudo npm install --unsafe-perm

# 验证安装
npm list --depth=0
```

### 4️⃣ 配置环境变量

```bash
# 创建生产环境配置文件
nano .env.production

# 或使用 vim
vim .env.production
```

**`.env.production` 内容**：

```bash
# ==================== 基础配置 ====================
NODE_ENV=production

# ==================== 应用配置 ====================
# 你的域名或服务器 IP
NEXT_PUBLIC_APP_URL=https://yourdomain.com
# 或使用 IP: http://1.2.3.4:3000

# ==================== 数据库配置 ====================
# 方式 1: 完整连接字符串
DATABASE_URL=mysql://health_app:YourPassword@your-db-host.com:3306/health_hub

# 方式 2: 分离配置
DB_HOST=your-db-host.com
DB_PORT=3306
DB_USER=health_app
DB_PASSWORD=YourPassword
DB_NAME=health_hub
DB_SSL=false

# ==================== NextAuth 配置 ====================
# 应用访问地址（重要！）
NEXTAUTH_URL=https://yourdomain.com
# 或: http://1.2.3.4:3000

# 密钥（必须修改为随机字符串）
NEXTAUTH_SECRET=your-super-secret-key-here-change-this-to-random-string

# ==================== 上传配置 ====================
# 文件上传目录
UPLOAD_DIR=/www/wwwroot/The-Health-Hub/public/uploads

# 最大文件大小（MB）
MAX_FILE_SIZE=500

# ==================== 安全配置 ====================
# 是否启用调试日志
DEBUG_AUTH=0

# CORS 允许的域名
ALLOWED_ORIGINS=https://yourdomain.com

# ==================== 可选配置 ====================
# API 版本
API_VERSION=1.0.0

# 日志级别
LOG_LEVEL=info
```

**生成随机密钥**：

```bash
# 生成 NEXTAUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 5️⃣ 创建必要的目录

```bash
# 创建上传目录
mkdir -p public/uploads/audios
mkdir -p public/uploads/covers
mkdir -p public/uploads/trash

# 设置权限
chmod -R 755 public/uploads
```

### 6️⃣ 构建项目

```bash
# 清理之前的构建（如有）
rm -rf .next

# 构建生产版本
npm run build

# 构建可能需要 5-10 分钟，请耐心等待
# 输出应该类似：
#   ✓ Compiled successfully
#   ✓ Linting and checking validity of types
#   ✓ Collecting page data
#   ✓ Generating static pages (143/143)
#   ✓ Finalizing page optimization
```

**常见构建错误**：

```bash
# 错误 1: 内存不足
# 解决：增加 Node.js 内存限制
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# 错误 2: 数据库连接失败（构建时连接）
# 解决：确保数据库可访问，或临时禁用数据库相关代码

# 错误 3: TypeScript 类型错误
# 解决：跳过类型检查（不推荐）
npm run build:no-check
```

### 7️⃣ 启动应用

```bash
# 方式 1: 直接启动（前台运行）
npm start

# 应该看到:
# > the-health-hub@1.0.0 start
# > next start
#
#   ▲ Next.js 15.5.0
#   - Local:        http://localhost:3000
#   - Network:      http://192.168.1.100:3000
```

**访问测试**：

```bash
# 在服务器上测试
curl http://localhost:3000

# 从外部访问
# 浏览器打开: http://your-server-ip:3000
```

---

## 🔧 生产环境运行方式

### 方式 1: 使用 PM2（推荐）

PM2 是一个生产级的进程管理器，可以自动重启、日志管理、负载均衡。

#### 安装 PM2

```bash
# 全局安装 PM2
npm install -g pm2

# 验证安装
pm2 -v
```

#### 创建 PM2 配置文件

```bash
# 创建 ecosystem.config.js
nano ecosystem.config.js
```

**`ecosystem.config.js` 内容**：

```javascript
module.exports = {
  apps: [
    {
      name: 'health-hub',
      script: 'npm',
      args: 'start',
      cwd: '/www/wwwroot/The-Health-Hub',
      instances: 2,  // 根据 CPU 核心数调整
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
```

#### 使用 PM2 启动

```bash
# 创建日志目录
mkdir -p logs

# 启动应用
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs health-hub

# 实时监控
pm2 monit

# 停止应用
pm2 stop health-hub

# 重启应用
pm2 restart health-hub

# 删除应用
pm2 delete health-hub
```

#### PM2 开机自启

```bash
# 保存当前 PM2 进程列表
pm2 save

# 生成开机启动脚本
pm2 startup

# 按照提示执行显示的命令，例如：
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root
```

---

### 方式 2: 使用 systemd

#### 创建 systemd 服务文件

```bash
sudo nano /etc/systemd/system/health-hub.service
```

**`health-hub.service` 内容**：

```ini
[Unit]
Description=Health Hub Next.js Application
After=network.target mysql.service

[Service]
Type=simple
User=root
WorkingDirectory=/www/wwwroot/The-Health-Hub
Environment="NODE_ENV=production"
Environment="PORT=3000"
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=health-hub

[Install]
WantedBy=multi-user.target
```

#### 启动服务

```bash
# 重新加载 systemd
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start health-hub

# 查看状态
sudo systemctl status health-hub

# 开机自启
sudo systemctl enable health-hub

# 查看日志
sudo journalctl -u health-hub -f

# 停止服务
sudo systemctl stop health-hub

# 重启服务
sudo systemctl restart health-hub
```

---

### 方式 3: 使用 Screen（简单方式）

```bash
# 安装 screen
sudo apt-get install screen -y

# 创建新的 screen 会话
screen -S health-hub

# 启动应用
cd /www/wwwroot/The-Health-Hub
npm start

# 退出 screen（应用继续运行）
# 按 Ctrl+A 然后按 D

# 重新连接到 screen
screen -r health-hub

# 查看所有 screen 会话
screen -ls

# 结束 screen 会话
screen -X -S health-hub quit
```

---

## 🌐 配置 Nginx 反向代理

### 安装 Nginx

```bash
# 安装 Nginx
sudo apt-get install nginx -y

# 启动 Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# 查看状态
sudo systemctl status nginx
```

### 配置反向代理

```bash
# 创建配置文件
sudo nano /etc/nginx/sites-available/health-hub
```

**Nginx 配置内容**：

```nginx
# HTTP 配置（80端口）
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # 临时重定向到 HTTPS（如已配置 SSL）
    # return 301 https://$server_name$request_uri;

    # 日志
    access_log /var/log/nginx/health-hub-access.log;
    error_log /var/log/nginx/health-hub-error.log;

    # 客户端最大上传大小
    client_max_body_size 500M;

    # 反向代理到 Next.js
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
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 静态文件直接服务
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, max-age=3600, immutable";
    }

    # 音频文件代理
    location /uploads/ {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 24h;
        add_header Cache-Control "public, max-age=86400";
    }
}

# HTTPS 配置（443端口）- 需要 SSL 证书
# server {
#     listen 443 ssl http2;
#     server_name yourdomain.com www.yourdomain.com;
#
#     ssl_certificate /etc/nginx/ssl/fullchain.pem;
#     ssl_certificate_key /etc/nginx/ssl/privkey.pem;
#     ssl_protocols TLSv1.2 TLSv1.3;
#     ssl_ciphers HIGH:!aNULL:!MD5;
#
#     # 其他配置同上...
# }
```

### 启用配置

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/health-hub /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重新加载 Nginx
sudo systemctl reload nginx

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/health-hub-access.log
```

---

## 🔒 配置 SSL 证书（可选但推荐）

### 使用 Let's Encrypt（免费）

```bash
# 安装 Certbot
sudo apt-get install certbot python3-certbot-nginx -y

# 自动配置 SSL
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 测试自动续期
sudo certbot renew --dry-run

# 查看证书信息
sudo certbot certificates
```

---

## 🔥 防火墙配置

```bash
# 使用 ufw
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 3000/tcp    # Next.js（开发测试用）
sudo ufw enable

# 查看规则
sudo ufw status

# 使用 iptables
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
sudo iptables-save
```

---

## 📊 监控和日志

### 1. 应用日志

```bash
# PM2 日志
pm2 logs health-hub --lines 100

# systemd 日志
sudo journalctl -u health-hub -f

# Nginx 日志
sudo tail -f /var/log/nginx/health-hub-access.log
sudo tail -f /var/log/nginx/health-hub-error.log
```

### 2. 系统监控

```bash
# 查看进程
ps aux | grep node

# 查看端口
sudo netstat -tulpn | grep 3000
# 或
sudo ss -tulpn | grep 3000

# 查看内存
free -h

# 查看磁盘
df -h

# 实时监控
htop
```

### 3. PM2 监控

```bash
# 实时监控
pm2 monit

# Web 监控界面（可选）
pm2 install pm2-server-monit
```

---

## 🔄 更新部署

### 标准更新流程

```bash
# 1. 进入项目目录
cd /www/wwwroot/The-Health-Hub

# 2. 停止应用
pm2 stop health-hub

# 3. 备份（可选）
cp -r .next .next.backup
cp .env.production .env.production.backup

# 4. 拉取最新代码
git pull origin main

# 5. 安装新依赖（如有）
npm install

# 6. 重新构建
npm run build

# 7. 重启应用
pm2 restart health-hub

# 8. 验证
pm2 logs health-hub --lines 50
curl http://localhost:3000
```

### 零停机更新（使用 PM2 Cluster）

```bash
# PM2 会逐个重启实例，保证服务不中断
pm2 reload health-hub
```

---

## 🐛 故障排查

### 问题 1: npm start 提示 Missing script

**原因**: 不在项目根目录，或 package.json 损坏

**解决**:
```bash
# 确认当前目录
pwd
# 应该输出: /www/wwwroot/The-Health-Hub

# 查看 package.json
cat package.json | grep "start"

# 如果没有，重新克隆项目
```

### 问题 2: 端口 3000 被占用

**原因**: 其他进程占用端口

**解决**:
```bash
# 查找占用进程
sudo lsof -i :3000
# 或
sudo netstat -tulpn | grep 3000

# 杀死进程
sudo kill -9 <PID>

# 或使用其他端口
PORT=3001 npm start
```

### 问题 3: 数据库连接失败

**原因**: 数据库配置错误或网络不通

**解决**:
```bash
# 测试数据库连接
mysql -h your-db-host.com -u health_app -p

# 检查环境变量
cat .env.production | grep DB

# 检查防火墙
telnet your-db-host.com 3306

# 查看应用日志
pm2 logs health-hub
```

### 问题 4: 内存不足

**原因**: 服务器内存太小

**解决**:
```bash
# 添加 swap 空间
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 永久生效
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 限制 Node.js 内存
pm2 start ecosystem.config.js --max-memory-restart 512M
```

### 问题 5: 404 错误

**原因**: Nginx 配置错误或 Next.js 未启动

**解决**:
```bash
# 检查 Next.js 状态
pm2 status

# 检查端口
curl http://localhost:3000

# 检查 Nginx 配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

---

## ✅ 部署检查清单

```bash
□ Node.js >= 22.0.0 已安装
□ MySQL 数据库已配置并初始化
□ 项目代码已克隆到服务器
□ npm install 完成
□ .env.production 已配置
□ 上传目录已创建并有写权限
□ npm run build 构建成功
□ npm start 可以启动（测试）
□ PM2 已安装并配置
□ PM2 开机自启已设置
□ Nginx 已安装并配置
□ 防火墙规则已设置
□ SSL 证书已配置（可选）
□ 应用可以从外网访问
□ 数据库连接正常
□ 文件上传功能正常
□ 日志监控已配置
```

---

## 🎯 快速命令参考

```bash
# 启动应用
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs health-hub

# 重启应用
pm2 restart health-hub

# 停止应用
pm2 stop health-hub

# 重新加载（零停机）
pm2 reload health-hub

# 查看监控
pm2 monit

# Nginx
sudo systemctl status nginx
sudo systemctl reload nginx
sudo nginx -t

# 查看端口
sudo netstat -tulpn | grep 3000

# 测试连接
curl http://localhost:3000
```

---

## 📞 技术支持

如遇到部署问题，请提供：
1. 服务器系统版本: `cat /etc/os-release`
2. Node.js 版本: `node -v`
3. 错误日志: `pm2 logs health-hub --lines 100`
4. 构建日志: `npm run build` 的完整输出

---

**最后更新**: 2025-01-05
**适用版本**: The Health Hub v1.0.0

