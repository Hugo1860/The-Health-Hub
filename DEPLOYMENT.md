# 部署指南

本文档介绍如何将健闻局 The Health Hub 部署到各种平台。

## 🚀 Vercel 部署 (推荐)

Vercel 是 Next.js 的官方部署平台，提供最佳的性能和开发体验。

### 步骤

1. **连接 GitHub**
   - 访问 [Vercel](https://vercel.com)
   - 使用 GitHub 账户登录
   - 导入您的 GitHub 仓库

2. **配置项目**
   - 项目名称: `the-health-hub`
   - 框架预设: `Next.js`
   - 根目录: `./audio-blog` (如果项目在子目录中)

3. **环境变量配置**
   ```
   NEXTAUTH_SECRET=your-production-secret
   NEXTAUTH_URL=https://your-domain.vercel.app
   ```

4. **部署**
   - 点击 "Deploy" 按钮
   - 等待构建完成
   - 访问生成的 URL

### 自动部署
- 每次推送到主分支都会自动触发部署
- 支持预览部署 (Pull Request)

## 🌐 Netlify 部署

### 步骤

1. **连接仓库**
   - 登录 [Netlify](https://netlify.com)
   - 点击 "New site from Git"
   - 选择您的 GitHub 仓库

2. **构建设置**
   ```
   Build command: npm run build
   Publish directory: .next
   ```

3. **环境变量**
   在 Netlify 控制台中设置环境变量

## 🐳 Docker 部署

### Dockerfile
```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### Docker Compose
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXTAUTH_SECRET=your-secret
      - NEXTAUTH_URL=http://localhost:3000
    volumes:
      - ./uploads:/app/uploads
      - ./data:/app/data
```

## ☁️ 云服务器部署

### 系统要求
- Node.js 18.x 或更高版本
- npm 或 yarn
- PM2 (进程管理器)

### 部署步骤

1. **服务器准备**
   ```bash
   # 更新系统
   sudo apt update && sudo apt upgrade -y
   
   # 安装 Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # 安装 PM2
   sudo npm install -g pm2
   ```

2. **代码部署**
   ```bash
   # 克隆代码
   git clone https://github.com/Hugo1860/The-Health-Hub.git
   cd The-Health-Hub/audio-blog
   
   # 安装依赖
   npm install
   
   # 构建项目
   npm run build
   ```

3. **环境配置**
   ```bash
   # 创建环境变量文件
   cp .env.example .env.local
   
   # 编辑环境变量
   nano .env.local
   ```

4. **启动服务**
   ```bash
   # 使用 PM2 启动
   pm2 start npm --name "health-hub" -- start
   
   # 设置开机自启
   pm2 startup
   pm2 save
   ```

5. **Nginx 配置** (可选)
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
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
       }
   }
   ```

## 📁 文件存储配置

### 本地存储
- 上传文件存储在 `uploads/` 目录
- 确保目录有写入权限
- 定期备份重要文件

### 云存储 (推荐)
可以集成以下云存储服务：
- AWS S3
- 阿里云 OSS
- 腾讯云 COS
- 七牛云

## 🔒 安全配置

### HTTPS 配置
- 使用 Let's Encrypt 免费 SSL 证书
- 配置 HTTPS 重定向
- 设置安全头部

### 环境变量安全
- 使用强密码作为 SECRET
- 定期更换密钥
- 不要在代码中硬编码敏感信息

## 📊 监控和日志

### 应用监控
- 使用 PM2 监控进程状态
- 配置日志轮转
- 设置错误报警

### 性能监控
- 使用 Vercel Analytics (Vercel 部署)
- 集成 Google Analytics
- 监控 API 响应时间

## 🔄 更新部署

### 自动更新
```bash
#!/bin/bash
# update.sh
cd /path/to/your/app
git pull origin main
npm install
npm run build
pm2 restart health-hub
```

### 回滚策略
- 保留多个版本的备份
- 使用 Git 标签管理版本
- 快速回滚机制

## 🆘 故障排除

### 常见问题

1. **构建失败**
   - 检查 Node.js 版本
   - 清除 node_modules 重新安装
   - 检查环境变量配置

2. **文件上传失败**
   - 检查目录权限
   - 确认文件大小限制
   - 检查磁盘空间

3. **数据库连接失败**
   - 检查数据库服务状态
   - 验证连接字符串
   - 检查网络连接

### 日志查看
```bash
# PM2 日志
pm2 logs health-hub

# 系统日志
sudo journalctl -u nginx
```

## 📞 支持

如果在部署过程中遇到问题，请：
1. 查看项目文档
2. 搜索 GitHub Issues
3. 创建新的 Issue 描述问题

---

祝您部署顺利！🚀