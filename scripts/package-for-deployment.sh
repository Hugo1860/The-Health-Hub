#!/usr/bin/env bash

set -euo pipefail

# Health Hub Cloud Deployment Package Builder
# Creates a complete cloud-ready deployment package
# Includes: Application, Database scripts, Docker configs, and deployment guides

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PACKAGE_NAME="health-hub-complete-${TIMESTAMP}"
BUILD_DIR="${PROJECT_ROOT}/dist/${PACKAGE_NAME}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Parse MySQL connection from DATABASE_URL if provided
parse_mysql_url() {
    local url="$1"
    # strip mysql://
    url="${url#mysql://}"
    # user:pass@host:port/db
    local creds hostportdb hostport
    if [[ "$url" == *"@"* ]]; then
        creds="${url%%@*}"
        hostportdb="${url#*@}"
        MYSQL_USER="${creds%%:*}"
        MYSQL_PASSWORD="${creds#*:}"
    else
        hostportdb="$url"
        MYSQL_USER=""
        MYSQL_PASSWORD=""
    fi
    
    hostport="${hostportdb%%/*}"
    MYSQL_DATABASE="${hostportdb#*/}"
    MYSQL_HOST="${hostport%%:*}"
    MYSQL_PORT="${hostport#*:}"
    
    # Handle default port
    if [[ "$MYSQL_PORT" == "$MYSQL_HOST" ]]; then
        MYSQL_PORT="3306"
    fi
}

# Initialize database connection parameters
init_db_params() {
    if [[ -n "${DATABASE_URL:-}" ]]; then
        log "Parsing DATABASE_URL..."
        parse_mysql_url "$DATABASE_URL"
    else
        MYSQL_HOST=${MYSQL_HOST:-localhost}
        MYSQL_PORT=${MYSQL_PORT:-3306}
        MYSQL_USER=${MYSQL_USER:-root}
        MYSQL_PASSWORD=${MYSQL_PASSWORD:-}
        MYSQL_DATABASE=${MYSQL_DATABASE:-health_hub}
    fi
    
    log "Database connection: ${MYSQL_USER}@${MYSQL_HOST}:${MYSQL_PORT}/${MYSQL_DATABASE}"
}

# Test database connection
test_db_connection() {
    log "Testing database connection..."
    
    local PASS_ARG=""
    if [[ -n "$MYSQL_PASSWORD" ]]; then
        PASS_ARG="-p$MYSQL_PASSWORD"
    fi
    
    if ! mysql -h"$MYSQL_HOST" -P"$MYSQL_PORT" -u"$MYSQL_USER" $PASS_ARG -e "SELECT 1" "$MYSQL_DATABASE" >/dev/null 2>&1; then
        error "Database connection failed!"
        error "Please check your MySQL connection parameters:"
        error "  Host: $MYSQL_HOST"
        error "  Port: $MYSQL_PORT"
        error "  User: $MYSQL_USER"
        error "  Database: $MYSQL_DATABASE"
        exit 1
    fi
    
    success "Database connection verified"
}

# Export database
export_database() {
    log "Exporting database..."
    
    local PASS_ARG=""
    if [[ -n "$MYSQL_PASSWORD" ]]; then
        PASS_ARG="-p$MYSQL_PASSWORD"
    fi
    
    local export_file="${BUILD_DIR}/database/health_hub_export_${TIMESTAMP}.sql"
    mkdir -p "${BUILD_DIR}/database"
    
    mysqldump \
        -h"$MYSQL_HOST" -P"$MYSQL_PORT" -u"$MYSQL_USER" $PASS_ARG \
        --single-transaction \
        --quick \
        --lock-tables=false \
        --routines \
        --triggers \
        --events \
        --add-drop-database \
        --databases "$MYSQL_DATABASE" > "$export_file"
    
    # Create compressed version
    gzip -c "$export_file" > "${export_file}.gz"
    
    success "Database exported to: ${export_file}.gz"
    
    # Create import script
    cat > "${BUILD_DIR}/database/import.sh" << 'EOF'
#!/usr/bin/env bash
set -euo pipefail

# Import script for Health Hub database
# Usage: MYSQL_HOST=... MYSQL_USER=... MYSQL_PASSWORD=... ./import.sh

MYSQL_HOST=${MYSQL_HOST:-localhost}
MYSQL_PORT=${MYSQL_PORT:-3306}
MYSQL_USER=${MYSQL_USER:-root}
MYSQL_PASSWORD=${MYSQL_PASSWORD:-}

PASS_ARG=""
if [[ -n "$MYSQL_PASSWORD" ]]; then
    PASS_ARG="-p$MYSQL_PASSWORD"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE=$(ls "$SCRIPT_DIR"/*.sql.gz | head -n1)

if [[ -z "$SQL_FILE" ]]; then
    echo "Error: No SQL export file found"
    exit 1
fi

echo "Importing database from: $SQL_FILE"
gunzip -c "$SQL_FILE" | mysql -h"$MYSQL_HOST" -P"$MYSQL_PORT" -u"$MYSQL_USER" $PASS_ARG

echo "Database import completed successfully"
EOF
    
    chmod +x "${BUILD_DIR}/database/import.sh"
}

# Build application
build_application() {
    log "Building Next.js application..."
    
    cd "$PROJECT_ROOT"
    
    # Clean previous builds
    rm -rf .next
    
    # Install dependencies
    log "Installing dependencies..."
    npm ci --no-audit --no-fund
    
    # Build application
    log "Building application..."
    npm run build
    
    success "Application build completed"
}

# Create deployment package
create_package() {
    log "Creating deployment package..."
    
    # Create build directory
    mkdir -p "$BUILD_DIR"
    
    # Copy essential files
    log "Copying application files..."
    
    # Next.js build output
    cp -r "$PROJECT_ROOT/.next" "$BUILD_DIR/"
    cp -r "$PROJECT_ROOT/public" "$BUILD_DIR/"
    cp -r "$PROJECT_ROOT/node_modules" "$BUILD_DIR/"
    
    # Package files
    cp "$PROJECT_ROOT/package.json" "$BUILD_DIR/"
    cp "$PROJECT_ROOT/package-lock.json" "$BUILD_DIR/" 2>/dev/null || true
    
    # Configuration files
    cp "$PROJECT_ROOT/next.config.js" "$BUILD_DIR/"
    cp "$PROJECT_ROOT/tailwind.config.js" "$BUILD_DIR/" 2>/dev/null || true
    cp "$PROJECT_ROOT/tsconfig.json" "$BUILD_DIR/" 2>/dev/null || true
    
    # Cloud deployment files
    mkdir -p "$BUILD_DIR/database"
    cp "$PROJECT_ROOT/database/cloud-init-mysql.sql" "$BUILD_DIR/database/"
    cp "$PROJECT_ROOT/database/cloud-init-postgresql.sql" "$BUILD_DIR/database/"
    cp "$PROJECT_ROOT/database/README-cloud-init.md" "$BUILD_DIR/database/"

    # Docker files
    mkdir -p "$BUILD_DIR/docker"
    cp "$PROJECT_ROOT/docker/Dockerfile" "$BUILD_DIR/docker/" 2>/dev/null || true
    cp "$PROJECT_ROOT/docker/docker-compose.yml" "$BUILD_DIR/docker/" 2>/dev/null || true

    # Scripts
    mkdir -p "$BUILD_DIR/scripts"
    cp "$PROJECT_ROOT/scripts/init-cloud-database.sh" "$BUILD_DIR/scripts/"
    cp "$PROJECT_ROOT/scripts/init-cloud-database-docker.sh" "$BUILD_DIR/scripts/"
    cp "$PROJECT_ROOT/scripts/export-mysql.sh" "$BUILD_DIR/scripts/"

    # Cloud deployment configs
    mkdir -p "$BUILD_DIR/config"
    cp "$PROJECT_ROOT/env.cloud.template" "$BUILD_DIR/config/"
    cp "$PROJECT_ROOT/CLOUD_DEPLOYMENT_GUIDE.md" "$BUILD_DIR/config/"
    
    # Environment template for cloud deployment
    cat > "$BUILD_DIR/.env.example" << 'EOF'
# =============================================================================
# 数据库配置
# =============================================================================
DATABASE_TYPE=mysql
DB_HOST=your-db-host.cloud.com
DB_PORT=3306
DB_DATABASE=health_hub
DB_USERNAME=health_app
DB_PASSWORD=your-secure-db-password

# =============================================================================
# NextAuth.js 配置
# =============================================================================
NEXTAUTH_SECRET=your-nextauth-secret-key-minimum-32-characters
NEXTAUTH_URL=https://your-domain.com

# 会话配置
SESSION_SECRET=your-session-secret-key-minimum-32-characters
JWT_SECRET=your-jwt-secret-key-minimum-32-characters
CSRF_SECRET=your-csrf-secret-key-minimum-32-characters

# =============================================================================
# 应用配置
# =============================================================================
NODE_ENV=production
PORT=3000

# =============================================================================
# 安全配置
# =============================================================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
ADMIN_SESSION_TIMEOUT=480

# =============================================================================
# 日志配置
# =============================================================================
LOG_LEVEL=info
EOF
    
    success "Package structure created"
}

# Create deployment scripts
create_deployment_scripts() {
    log "Creating deployment scripts..."
    
    # Start script
    cat > "$BUILD_DIR/start.sh" << 'EOF'
#!/usr/bin/env bash
set -euo pipefail

echo "Starting Health Hub application..."

# Check if .env exists
if [[ ! -f .env ]]; then
    echo "Warning: .env file not found. Copying from .env.example"
    cp .env.example .env
    echo "Please edit .env file with your configuration before running again"
    exit 1
fi

# Source environment variables
set -a
source .env
set +a

# Start the application
echo "Starting Next.js server..."
npm start
EOF
    
    # Cloud deployment script
    cat > "$BUILD_DIR/deploy-cloud.sh" << 'EOF'
#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Health Hub Cloud Deployment Script"
echo "====================================="

# Check if .env exists
if [[ ! -f .env ]]; then
    echo "❌ .env file not found!"
    echo "Please copy .env.example to .env and configure your settings"
    exit 1
fi

# Source environment variables
set -a
source .env
set +a

echo "📊 Deployment Configuration:"
echo "  Database Type: $DATABASE_TYPE"
echo "  Database Host: $DB_HOST"
echo "  Application URL: $NEXTAUTH_URL"
echo "  Environment: $NODE_ENV"

# Initialize database (if not already done)
echo ""
echo "🔧 Initializing database..."
if [[ ! -f ".db_initialized" ]]; then
    echo "Running database initialization..."
    if [[ "$DATABASE_TYPE" == "mysql" ]]; then
        # MySQL initialization
        if command -v mysql >/dev/null; then
            echo "Using local MySQL client..."
            MYSQL_HOST=${DB_HOST:-localhost}
            MYSQL_PORT=${DB_PORT:-3306}
            MYSQL_USER=${DB_USERNAME:-root}
            MYSQL_PASSWORD=${DB_PASSWORD:-}

            if [[ -n "$MYSQL_PASSWORD" ]]; then
                mysql -h"$MYSQL_HOST" -P"$MYSQL_PORT" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" < database/cloud-init-mysql.sql
            else
                mysql -h"$MYSQL_HOST" -P"$MYSQL_PORT" -u"$MYSQL_USER" < database/cloud-init-mysql.sql
            fi
        else
            echo "MySQL client not found. Please run database initialization manually:"
            echo "  mysql -h $DB_HOST -u $DB_USERNAME -p < database/cloud-init-mysql.sql"
        fi
    else
        echo "PostgreSQL initialization:"
        echo "  psql -h $DB_HOST -U $DB_USERNAME -d $DB_DATABASE -f database/cloud-init-postgresql.sql"
    fi

    touch .db_initialized
    echo "✅ Database initialization completed"
else
    echo "✅ Database already initialized"
fi

# Build and start application
echo ""
echo "🏗️ Building application..."
npm run build

echo ""
echo "🚀 Starting application..."
if [[ "$NODE_ENV" == "production" ]]; then
    # Production deployment
    if command -v pm2 >/dev/null; then
        echo "Using PM2 for production deployment..."
        pm2 start ecosystem.config.js --env production
        pm2 save
        pm2 startup

        echo ""
        echo "✅ Application deployed with PM2!"
        echo "  Status: pm2 status"
        echo "  Logs: pm2 logs"
        echo "  Restart: pm2 restart health-hub"
        echo "  Stop: pm2 stop health-hub"
    else
        echo "PM2 not found. Using npm start..."
        npm start
    fi
else
    # Development deployment
    echo "Development mode..."
    npm run dev
fi

echo ""
echo "🎉 Deployment completed successfully!"
echo "  Application: $NEXTAUTH_URL"
echo "  Admin Panel: $NEXTAUTH_URL/admin"
echo ""
echo "📖 Documentation: config/CLOUD_DEPLOYMENT_GUIDE.md"
echo "🔧 Configuration: .env"
EOF

    # Docker start script
    cat > "$BUILD_DIR/docker-start.sh" << 'EOF'
#!/usr/bin/env bash
set -euo pipefail

echo "🐳 Health Hub Docker Deployment"
echo "================================"

cd docker

# Check if .env exists
if [[ ! -f .env ]]; then
    echo "Creating default .env for Docker..."
    cat > .env << 'DOCKER_ENV'
# Database Configuration
DATABASE_TYPE=mysql
DB_HOST=db
DB_PORT=3306
DB_DATABASE=health_hub
DB_USERNAME=health_app
DB_PASSWORD=secure-db-password-123

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-production-secret-key-minimum-32-chars
SESSION_SECRET=your-session-secret-key-minimum-32-chars
JWT_SECRET=your-jwt-secret-key-minimum-32-chars
CSRF_SECRET=your-csrf-secret-key-minimum-32-chars

# Application Configuration
NODE_ENV=production
PORT=3000

# Docker Configuration
MYSQL_ROOT_PASSWORD=secure-root-password-123
REDIS_PASSWORD=secure-redis-password-123

# Monitoring
ENABLE_MONITORING=true
LOG_LEVEL=info
DOCKER_ENV

    echo "⚠️  Please edit docker/.env with your production configuration!"
    echo "   Important: Change all default passwords!"
fi

echo "📦 Building Docker images..."
docker compose build --no-cache

echo "🚀 Starting services..."
docker compose up -d

echo "⏳ Waiting for services to start..."
sleep 30

echo ""
echo "✅ Docker deployment completed!"
echo "=================================="
echo "  Application: http://localhost:3000"
echo "  Admin Panel: http://localhost:3000/admin"
echo "  Database: MySQL (localhost:3306)"
echo ""
echo "🔧 Management Commands:"
echo "  View logs: docker compose logs -f"
echo "  Stop: docker compose down"
echo "  Restart: docker compose restart"
echo "  Shell: docker compose exec app bash"
echo ""
echo "📖 Documentation: ../config/CLOUD_DEPLOYMENT_GUIDE.md"
EOF
    
    # Make scripts executable
    chmod +x "$BUILD_DIR/start.sh"
    chmod +x "$BUILD_DIR/docker-start.sh"
    chmod +x "$BUILD_DIR/deploy-cloud.sh"
    chmod +x "$BUILD_DIR/scripts/init-cloud-database.sh"
    chmod +x "$BUILD_DIR/scripts/init-cloud-database-docker.sh"
    chmod +x "$BUILD_DIR/scripts/export-mysql.sh"
    
    success "Deployment scripts created"
}

# Create documentation
create_documentation() {
    log "Creating deployment documentation..."
    
    cat > "$BUILD_DIR/DEPLOYMENT.md" << 'EOF'
# Health Hub 云端部署指南

## 🚀 快速部署

### 方式一：云端一键部署（推荐）

```bash
# 1. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置数据库连接和域名信息

# 2. 数据库初始化（如果数据库已存在，跳过此步）
./scripts/init-cloud-database.sh mysql    # 或 postgresql

# 3. 部署应用
./deploy-cloud.sh
```

### 方式二：Docker 部署

```bash
# 1. 配置 Docker 环境
cp docker/.env.example docker/.env
# 编辑 docker/.env 文件

# 2. 启动服务
./docker-start.sh
```

### 方式三：传统部署

```bash
# 1. 构建应用
npm run build

# 2. 启动应用
npm start
```

## 📊 部署配置

### 默认账户
- **管理员**: admin@example.com / admin123
- **普通用户**: user@example.com / user123
- ⚠️ **重要**: 部署后立即修改默认密码！

### 环境变量配置

| 变量名 | 必需 | 示例值 | 说明 |
|--------|------|--------|------|
| DATABASE_TYPE | 是 | mysql | 数据库类型 |
| DB_HOST | 是 | db.example.com | 数据库主机 |
| DB_PORT | 是 | 3306 | 数据库端口 |
| DB_DATABASE | 是 | health_hub | 数据库名 |
| DB_USERNAME | 是 | health_app | 数据库用户 |
| DB_PASSWORD | 是 | secure-password | 数据库密码 |
| NEXTAUTH_URL | 是 | https://your-domain.com | 应用访问地址 |
| NEXTAUTH_SECRET | 是 | 32-char-secret | NextAuth 密钥 |
| SESSION_SECRET | 是 | 32-char-secret | 会话密钥 |
| NODE_ENV | 否 | production | 运行环境 |

## 🗄️ 数据库管理

### 云端数据库初始化

```bash
# MySQL 初始化
./scripts/init-cloud-database.sh mysql

# PostgreSQL 初始化
./scripts/init-cloud-database.sh postgresql

# Docker 环境
./scripts/init-cloud-database-docker.sh mysql
```

### 数据库备份

```bash
# 使用环境变量
MYSQL_HOST=localhost MYSQL_USER=root MYSQL_PASSWORD=xxx ./scripts/export-mysql.sh

# 或使用 DATABASE_URL
DATABASE_URL='mysql://root:xxx@localhost:3306/health_hub' ./scripts/export-mysql.sh
```

### 数据迁移

```bash
# 从旧数据库迁移
cd database
MYSQL_HOST=old-host MYSQL_USER=root MYSQL_PASSWORD=xxx ./import.sh
```

## 🔧 部署脚本说明

### deploy-cloud.sh
- 云端一键部署脚本
- 自动数据库初始化
- 支持 PM2 生产部署
- 包含健康检查

### docker-start.sh
- Docker 环境部署
- 自动构建镜像
- 一键启动所有服务

### scripts/init-cloud-database.sh
- 云端数据库初始化
- 支持 MySQL 和 PostgreSQL
- 自动验证连接

## 📈 监控和维护

### 应用监控
```bash
# 健康检查
curl https://your-domain.com/api/health

# 性能监控
curl https://your-domain.com/api/metrics

# 查看日志
pm2 logs              # PM2 环境
docker compose logs -f  # Docker 环境
```

### 数据库维护
```sql
-- 性能监控
SHOW PROCESSLIST;  -- MySQL
SELECT * FROM pg_stat_activity;  -- PostgreSQL

-- 清理旧数据
DELETE FROM admin_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

## 🔒 安全配置

### 立即执行
1. **修改默认密码**
   ```sql
   UPDATE users SET password = 'new-hashed-password' WHERE email = 'admin@example.com';
   ```

2. **创建专用数据库用户**
   ```sql
   CREATE USER 'health_app'@'%' IDENTIFIED BY 'secure-password';
   GRANT SELECT, INSERT, UPDATE, DELETE ON health_hub.* TO 'health_app'@'%';
   ```

3. **配置防火墙**
   ```bash
   sudo ufw allow 'Nginx Full'
   sudo ufw allow ssh
   sudo ufw enable
   ```

### SSL 配置
```bash
# Let's Encrypt
sudo certbot --nginx -d your-domain.com

# 自定义证书
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/health-hub.key \
  -out /etc/ssl/certs/health-hub.crt
```

## 🚨 故障排除

### 数据库连接问题
```bash
# 测试连接
./scripts/init-cloud-database.sh --test-db

# 检查网络
ping your-db-host
telnet your-db-host 3306
```

### 应用启动问题
```bash
# 查看日志
pm2 logs health-hub
docker compose logs app

# 检查环境变量
cat .env | grep -v PASSWORD

# 验证依赖
npm ls --depth=0
```

### 权限问题
```bash
# 修复文件权限
sudo chown -R $USER:$USER /path/to/health-hub
chmod -R 755 /path/to/health-hub
chmod -R 777 uploads/ logs/ database/
```

## 📈 性能优化

### 生产环境优化
```bash
# PM2 集群模式
pm2 start ecosystem.config.js --env production
pm2 save

# Nginx 反向代理优化
sudo nano /etc/nginx/sites-available/health-hub
# 添加缓存、压缩等配置
```

### 数据库优化
```sql
-- MySQL 优化
SET GLOBAL innodb_buffer_pool_size = 134217728;  -- 128MB
SET GLOBAL query_cache_size = 16777216;          -- 16MB

-- 索引优化
CREATE INDEX idx_audios_search ON audios(title, subject);
CREATE INDEX idx_users_email ON users(email);
```

### 缓存配置
```bash
# Redis 缓存（如果使用）
redis-cli info memory

# 应用缓存
curl https://your-domain.com/api/cache/stats
```

## 📚 高级配置

### 负载均衡
```nginx
# Nginx 负载均衡
upstream health_hub_backend {
    server 192.168.1.10:3000;
    server 192.168.1.11:3000;
    server 192.168.1.12:3000;
}

server {
    location / {
        proxy_pass http://health_hub_backend;
    }
}
```

### CDN 配置
```nginx
# 静态资源缓存
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    proxy_pass http://localhost:3000;
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 监控告警
```bash
# 集成 Prometheus + Grafana
docker run -d --name prometheus \
  -p 9090:9090 \
  -v /path/to/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus

docker run -d --name grafana \
  -p 3001:3000 \
  grafana/grafana
```

## 📖 文档和支持

- **详细部署指南**: `config/CLOUD_DEPLOYMENT_GUIDE.md`
- **数据库初始化**: `database/README-cloud-init.md`
- **配置模板**: `config/env.cloud.template`
- **故障排除**: 查看日志文件

## 🎯 部署检查清单

- [ ] 修改默认密码
- [ ] 配置 SSL 证书
- [ ] 设置备份策略
- [ ] 配置监控告警
- [ ] 测试所有功能
- [ ] 安全审计
- [ ] 性能测试

---

**部署成功后请立即：**
1. 修改所有默认密码
2. 配置 SSL 证书
3. 设置监控和告警
4. 配置定期备份
5. 进行安全审计

**技术支持**: 查看日志文件或参考文档
EOF
    
    success "Documentation created"
}

# Create package info
create_package_info() {
    log "Creating package information..."
    
    # Get git info if available
    local git_commit=""
    local git_branch=""
    if command -v git >/dev/null && [[ -d "$PROJECT_ROOT/.git" ]]; then
        git_commit=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
        git_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
    fi
    
    cat > "$BUILD_DIR/PACKAGE_INFO.json" << EOF
{
  "name": "health-hub-deployment-package",
  "version": "1.0.0",
  "buildTime": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "buildTimestamp": "$TIMESTAMP",
  "gitCommit": "$git_commit",
  "gitBranch": "$git_branch",
  "nodeVersion": "$(node --version)",
  "npmVersion": "$(npm --version)",
  "platform": "$(uname -s)",
  "architecture": "$(uname -m)",
  "includes": {
    "application": true,
    "database": true,
    "docker": true,
    "scripts": true,
    "documentation": true
  },
  "requirements": {
    "nodeVersion": ">=18.0.0",
    "mysqlVersion": ">=8.0.0",
    "dockerVersion": ">=20.0.0"
  }
}
EOF
    
    success "Package info created"
}

# Create archive
create_archive() {
    log "Creating deployment archive..."
    
    cd "$(dirname "$BUILD_DIR")"
    
    # Create tar.gz archive
    tar -czf "${PACKAGE_NAME}.tar.gz" "$PACKAGE_NAME"
    
    # Create zip archive for Windows compatibility
    if command -v zip >/dev/null; then
        zip -r "${PACKAGE_NAME}.zip" "$PACKAGE_NAME" >/dev/null
        success "Created ZIP archive: ${PACKAGE_NAME}.zip"
    fi
    
    success "Created TAR.GZ archive: ${PACKAGE_NAME}.tar.gz"
    
    # Show archive info
    local tar_size=$(du -h "${PACKAGE_NAME}.tar.gz" | cut -f1)
    log "Archive size: $tar_size"
    
    # Create checksums
    if command -v sha256sum >/dev/null; then
        sha256sum "${PACKAGE_NAME}.tar.gz" > "${PACKAGE_NAME}.tar.gz.sha256"
        success "SHA256 checksum created"
    elif command -v shasum >/dev/null; then
        shasum -a 256 "${PACKAGE_NAME}.tar.gz" > "${PACKAGE_NAME}.tar.gz.sha256"
        success "SHA256 checksum created"
    fi
}

# Main execution
main() {
    log "Starting Health Hub deployment package creation..."
    log "Package name: $PACKAGE_NAME"
    log "Build directory: $BUILD_DIR"
    
    # Initialize
    init_db_params
    
    # Test database connection
    test_db_connection
    
    # Clean previous builds
    if [[ -d "$BUILD_DIR" ]]; then
        log "Cleaning previous build..."
        rm -rf "$BUILD_DIR"
    fi
    
    # Create package structure
    create_package
    
    # Export database
    export_database
    
    # Build application
    build_application
    
    # Create deployment scripts
    create_deployment_scripts
    
    # Create documentation
    create_documentation
    
    # Create package info
    create_package_info
    
    # Create archive
    create_archive
    
    success "Deployment package created successfully!"
    echo ""
    echo "📦 Package Details:"
    echo "   Name: $PACKAGE_NAME"
    echo "   Location: $(dirname "$BUILD_DIR")/"
    echo "   Archives: ${PACKAGE_NAME}.tar.gz"
    if [[ -f "$(dirname "$BUILD_DIR")/${PACKAGE_NAME}.zip" ]]; then
        echo "            ${PACKAGE_NAME}.zip"
    fi
    echo ""
    echo "🚀 Deployment Instructions:"
    echo "   1. Upload archive to target server"
    echo "   2. Extract: tar -xzf ${PACKAGE_NAME}.tar.gz"
    echo "   3. Configure: cd ${PACKAGE_NAME} && cp .env.example .env"
    echo "   4. Deploy: ./docker-start.sh (Docker) or ./start.sh (Local)"
    echo ""
    echo "📖 See DEPLOYMENT.md for detailed instructions"
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [options]"
        echo ""
        echo "Environment variables:"
        echo "  DATABASE_URL     MySQL connection string (mysql://user:pass@host:port/db)"
        echo "  MYSQL_HOST       MySQL host (default: localhost)"
        echo "  MYSQL_PORT       MySQL port (default: 3306)"
        echo "  MYSQL_USER       MySQL user (default: root)"
        echo "  MYSQL_PASSWORD   MySQL password"
        echo "  MYSQL_DATABASE   MySQL database (default: health_hub)"
        echo ""
        echo "Examples:"
        echo "  DATABASE_URL='mysql://root:pass@localhost:3306/health_hub' $0"
        echo "  MYSQL_HOST=db.example.com MYSQL_USER=admin MYSQL_PASSWORD=secret $0"
        exit 0
        ;;
    --test-db)
        init_db_params
        test_db_connection
        exit 0
        ;;
    *)
        main
        ;;
esac
