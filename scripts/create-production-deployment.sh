#!/bin/bash

# 🚀 健闻局生产环境完整部署包创建脚本
# 创建包含应用、数据库、配置的完整部署包

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "🚀 健闻局生产环境部署包创建"
echo "============================="
echo ""

# 获取当前时间戳
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
PACKAGE_NAME="health-hub-production-${TIMESTAMP}"
TEMP_DIR="/tmp/${PACKAGE_NAME}"
CURRENT_DIR=$(pwd)

# 创建临时目录
create_temp_directory() {
    print_info "创建临时目录: ${TEMP_DIR}"
    rm -rf "${TEMP_DIR}"
    mkdir -p "${TEMP_DIR}"
    print_success "临时目录创建完成"
}

# 复制应用文件
copy_application_files() {
    print_info "复制应用文件..."
    
    rsync -av \
        --exclude='.git' \
        --exclude='node_modules' \
        --exclude='.next' \
        --exclude='dist' \
        --exclude='*.log' \
        --exclude='.DS_Store' \
        --exclude='*.tar.gz' \
        --exclude='backups/*' \
        --exclude='logs/*' \
        --exclude='.env.local' \
        --exclude='tsconfig.tsbuildinfo' \
        --exclude='tmp/*' \
        --exclude='uploads/*.mp3' \
        --exclude='uploads/*.wav' \
        --exclude='uploads/*.m4a' \
        "${CURRENT_DIR}/" "${TEMP_DIR}/"
    
    print_success "应用文件复制完成"
}

# 创建生产环境配置
create_production_config() {
    print_info "创建生产环境配置..."
    
    # 创建生产环境配置文件
    cp "${CURRENT_DIR}/cloud-deployment-config.env" "${TEMP_DIR}/.env.production"
    
    # 创建 PM2 生态系统配置
    cat > "${TEMP_DIR}/ecosystem.config.js" << 'EOF'
module.exports = {
  apps: [{
    name: 'health-hub',
    script: 'npm',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max_old_space_size=4096',
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    reload_delay: 1000,
    max_restarts: 10,
    min_uptime: '10s'
  }],
  
  deploy: {
    production: {
      user: 'root',
      host: ['your-server-ip'],
      ref: 'origin/main',
      repo: 'git@github.com:your-username/health-hub.git',
      path: '/var/www/health-hub',
      'post-deploy': 'npm ci --production && npm run build && pm2 reload ecosystem.config.js --env production',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};
EOF
    
    # 创建 Docker 配置
    cat > "${TEMP_DIR}/Dockerfile.production" << 'EOF'
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create necessary directories
RUN mkdir -p ./uploads ./logs ./data
RUN chown -R nextjs:nodejs ./uploads ./logs ./data

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
EOF
    
    # 创建 Docker Compose 配置
    cat > "${TEMP_DIR}/docker-compose.production.yml" << 'EOF'
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.production
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://healthhub_user:${DB_PASSWORD}@postgres:5432/health_hub
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
      - ./data:/app/data
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: health_hub
      POSTGRES_USER: healthhub_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U healthhub_user -d health_hub"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - ./uploads:/var/www/uploads
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
EOF
    
    print_success "生产环境配置创建完成"
}

# 创建 Nginx 配置
create_nginx_config() {
    print_info "创建 Nginx 配置..."
    
    mkdir -p "${TEMP_DIR}/nginx"
    
    cat > "${TEMP_DIR}/nginx/nginx.conf" << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 100M;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

    # Upstream
    upstream app {
        server app:3000;
        keepalive 32;
    }

    server {
        listen 80;
        server_name _;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name _;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security Headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
        add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; media-src 'self' blob:; object-src 'none'; frame-src 'none';";

        # API routes with rate limiting
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 300;
            proxy_connect_timeout 300;
            proxy_send_timeout 300;
        }

        # Login with stricter rate limiting
        location /api/auth/ {
            limit_req zone=login burst=5 nodelay;
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Static files
        location /uploads/ {
            alias /var/www/uploads/;
            expires 1y;
            add_header Cache-Control "public, immutable";
            add_header Access-Control-Allow-Origin "*";
        }

        # Next.js static files
        location /_next/static/ {
            proxy_pass http://app;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Main application
        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 300;
            proxy_connect_timeout 300;
            proxy_send_timeout 300;
        }

        # Health check
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF
    
    print_success "Nginx 配置创建完成"
}

# 创建部署脚本
create_deployment_scripts() {
    print_info "创建部署脚本..."
    
    # 主部署脚本
    cat > "${TEMP_DIR}/deploy.sh" << 'EOF'
#!/bin/bash

# 健闻局生产环境部署脚本

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "🚀 健闻局生产环境部署"
echo "===================="
echo ""

# 检查环境
check_environment() {
    print_info "检查部署环境..."
    
    # 检查必要命令
    for cmd in node npm; do
        if ! command -v $cmd &> /dev/null; then
            print_error "$cmd 未安装"
            exit 1
        fi
    done
    
    # 检查Node.js版本
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js 版本过低，需要 18.x 或更高版本"
        exit 1
    fi
    
    print_success "环境检查通过"
}

# 配置环境变量
setup_environment() {
    print_info "配置环境变量..."
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.production" ]; then
            cp .env.production .env
            print_warning "已复制生产环境配置，请检查并修改 .env 文件"
        else
            print_error ".env 文件不存在，请创建环境配置文件"
            exit 1
        fi
    fi
    
    print_success "环境变量配置完成"
}

# 安装依赖
install_dependencies() {
    print_info "安装生产依赖..."
    
    # 清理缓存
    npm cache clean --force
    
    # 安装依赖
    npm ci --production
    
    print_success "依赖安装完成"
}

# 构建应用
build_application() {
    print_info "构建应用..."
    
    # 设置生产环境
    export NODE_ENV=production
    
    # 构建
    npm run build
    
    print_success "应用构建完成"
}

# 初始化数据库
initialize_database() {
    print_info "初始化数据库..."
    
    if [ -f "scripts/init-cloud-database.sh" ]; then
        chmod +x scripts/init-cloud-database.sh
        ./scripts/init-cloud-database.sh
    else
        print_warning "数据库初始化脚本不存在，跳过"
    fi
    
    print_success "数据库初始化完成"
}

# 启动应用
start_application() {
    print_info "启动应用..."
    
    # 创建必要目录
    mkdir -p logs uploads data
    
    if command -v pm2 &> /dev/null; then
        # 使用PM2启动
        pm2 stop health-hub 2>/dev/null || true
        pm2 start ecosystem.config.js --env production
        pm2 save
        print_success "应用已通过 PM2 启动"
    else
        print_warning "PM2 未安装，请手动启动应用: npm start"
    fi
}

# 验证部署
verify_deployment() {
    print_info "验证部署..."
    
    sleep 10
    
    if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
        print_success "✅ 应用部署成功！"
        echo ""
        echo "🌐 应用访问地址: http://$(curl -s ifconfig.me 2>/dev/null || echo 'your-server-ip'):3000"
        echo "🔧 管理命令:"
        echo "  - 查看状态: pm2 status"
        echo "  - 查看日志: pm2 logs health-hub"
        echo "  - 重启应用: pm2 restart health-hub"
    else
        print_warning "⚠️ 应用可能还在启动中，请稍后检查"
    fi
}

# 主函数
main() {
    check_environment
    setup_environment
    install_dependencies
    build_application
    initialize_database
    start_application
    verify_deployment
    
    print_success "🎉 部署完成！"
}

# 错误处理
trap 'print_error "部署过程中出现错误"; exit 1' ERR

# 执行主函数
main "$@"
EOF
    
    # Docker 部署脚本
    cat > "${TEMP_DIR}/deploy-docker.sh" << 'EOF'
#!/bin/bash

# Docker 部署脚本

set -e

echo "🐳 使用 Docker 部署健闻局..."

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose 未安装"
    exit 1
fi

# 创建环境文件
if [ ! -f ".env" ]; then
    cp .env.production .env
    echo "⚠️ 请编辑 .env 文件并设置正确的配置"
    exit 1
fi

# 构建并启动服务
docker-compose -f docker-compose.production.yml up -d --build

echo "✅ Docker 部署完成！"
echo "🌐 应用访问地址: http://localhost"
EOF
    
    # 设置执行权限
    chmod +x "${TEMP_DIR}/deploy.sh"
    chmod +x "${TEMP_DIR}/deploy-docker.sh"
    
    print_success "部署脚本创建完成"
}

# 创建文档
create_documentation() {
    print_info "创建部署文档..."
    
    cat > "${TEMP_DIR}/README-DEPLOYMENT.md" << 'EOF'
# 🚀 健闻局生产环境部署指南

## 📦 部署包内容

- **应用代码**: 完整的 Next.js 应用程序
- **数据库结构**: PostgreSQL 数据库架构和初始数据
- **配置文件**: 生产环境配置模板
- **部署脚本**: 自动化部署脚本
- **Docker 配置**: 容器化部署配置
- **Nginx 配置**: 反向代理和负载均衡配置

## 🔧 系统要求

### 最低配置
- **操作系统**: Ubuntu 20.04+ / CentOS 7+
- **CPU**: 2核心
- **内存**: 4GB RAM
- **磁盘**: 20GB 可用空间
- **网络**: 稳定的互联网连接

### 推荐配置
- **CPU**: 4核心或更多
- **内存**: 8GB RAM 或更多
- **磁盘**: 50GB SSD
- **网络**: 带宽 100Mbps 或更高

## 🚀 快速部署

### 方法一: 传统部署

1. **准备服务器环境**
   ```bash
   # 如果是全新服务器，先运行环境配置脚本
   chmod +x scripts/cloud-server-setup.sh
   sudo ./scripts/cloud-server-setup.sh
   ```

2. **配置环境变量**
   ```bash
   cp .env.production .env
   nano .env  # 修改数据库密码、JWT密钥等
   ```

3. **执行部署**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

### 方法二: Docker 部署

1. **安装 Docker**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   ```

2. **配置并部署**
   ```bash
   cp .env.production .env
   nano .env  # 修改配置
   chmod +x deploy-docker.sh
   ./deploy-docker.sh
   ```

## ⚙️ 详细配置

### 环境变量配置

编辑 `.env` 文件，重点配置以下项目：

```bash
# 数据库配置
DB_PASSWORD=your_secure_password_here

# 应用密钥
JWT_SECRET=your_jwt_secret_32_chars_minimum
SESSION_SECRET=your_session_secret_32_chars
NEXTAUTH_SECRET=your_nextauth_secret_32_chars

# 应用URL
NEXTAUTH_URL=https://your-domain.com
BASE_URL=https://your-domain.com
```

### SSL证书配置

1. **使用 Let's Encrypt**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

2. **手动配置证书**
   ```bash
   # 将证书文件放置到 nginx/ssl/ 目录
   cp your-cert.pem nginx/ssl/cert.pem
   cp your-key.pem nginx/ssl/key.pem
   ```

## 🔍 故障排除

### 常见问题

1. **应用无法启动**
   - 检查端口是否被占用: `netstat -tlnp | grep 3000`
   - 查看应用日志: `pm2 logs health-hub`
   - 检查环境变量配置

2. **数据库连接失败**
   - 检查 PostgreSQL 服务状态: `systemctl status postgresql`
   - 验证数据库配置: `psql -h localhost -U healthhub_user -d health_hub`

3. **Nginx 配置错误**
   - 测试配置: `nginx -t`
   - 查看错误日志: `tail -f /var/log/nginx/error.log`

### 性能优化

1. **数据库优化**
   - 配置连接池大小
   - 启用查询缓存
   - 定期执行 VACUUM

2. **应用优化**
   - 启用 Gzip 压缩
   - 配置静态文件缓存
   - 使用 CDN 加速

## 📊 监控和维护

### 日志管理
```bash
# 应用日志
pm2 logs health-hub

# Nginx 日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# 系统日志
journalctl -u postgresql -f
```

### 备份策略
```bash
# 数据库备份
pg_dump -h localhost -U healthhub_user health_hub > backup_$(date +%Y%m%d_%H%M%S).sql

# 文件备份
tar -czf uploads_backup_$(date +%Y%m%d_%H%M%S).tar.gz uploads/
```

### 更新应用
```bash
# 停止应用
pm2 stop health-hub

# 更新代码
git pull origin main

# 重新部署
./deploy.sh
```

## 🔒 安全建议

1. **修改默认密码**: 确保所有默认密码都已修改
2. **配置防火墙**: 只开放必要的端口
3. **启用SSL**: 使用HTTPS加密传输
4. **定期更新**: 保持系统和应用程序最新
5. **监控日志**: 定期检查访问和错误日志
6. **备份数据**: 建立完善的备份策略

## 📞 技术支持

如遇问题，请提供以下信息：
- 系统环境信息
- 错误日志内容
- 部署步骤详情
- 网络配置情况
EOF
    
    print_success "部署文档创建完成"
}

# 创建压缩包
create_package() {
    print_info "创建部署包..."
    
    cd /tmp
    tar -czf "${CURRENT_DIR}/${PACKAGE_NAME}.tar.gz" "${PACKAGE_NAME}"
    
    # 获取文件大小
    PACKAGE_SIZE=$(du -sh "${CURRENT_DIR}/${PACKAGE_NAME}.tar.gz" | cut -f1)
    
    print_success "部署包创建完成: ${PACKAGE_NAME}.tar.gz (${PACKAGE_SIZE})"
}

# 清理临时文件
cleanup() {
    print_info "清理临时文件..."
    rm -rf "${TEMP_DIR}"
    print_success "清理完成"
}

# 显示部署信息
show_deployment_info() {
    echo ""
    print_success "🎉 生产环境部署包创建完成！"
    echo ""
    echo "📦 部署包信息:"
    echo "  - 文件名: ${PACKAGE_NAME}.tar.gz"
    echo "  - 位置: ${CURRENT_DIR}/${PACKAGE_NAME}.tar.gz"
    echo "  - 大小: $(du -sh "${CURRENT_DIR}/${PACKAGE_NAME}.tar.gz" | cut -f1)"
    echo ""
    echo "🚀 部署步骤:"
    echo "  1. 将部署包上传到云服务器"
    echo "  2. 解压: tar -xzf ${PACKAGE_NAME}.tar.gz"
    echo "  3. 进入目录: cd ${PACKAGE_NAME}"
    echo "  4. 配置环境: cp .env.production .env && nano .env"
    echo "  5. 执行部署: ./deploy.sh"
    echo ""
    echo "🐳 Docker 部署:"
    echo "  - 使用 Docker: ./deploy-docker.sh"
    echo ""
    echo "📖 详细说明:"
    echo "  - 查看部署文档: README-DEPLOYMENT.md"
}

# 主函数
main() {
    create_temp_directory
    copy_application_files
    create_production_config
    create_nginx_config
    create_deployment_scripts
    create_documentation
    create_package
    cleanup
    show_deployment_info
}

# 错误处理
trap 'print_error "创建过程中出现错误"; cleanup; exit 1' ERR

# 执行主函数
main "$@"
