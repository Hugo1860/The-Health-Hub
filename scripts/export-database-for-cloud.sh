#!/bin/bash

# 🗄️ 健闻局数据库云端迁移导出脚本
# 完整导出PostgreSQL数据库结构和数据，用于云端部署

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

echo "🗄️ 健闻局数据库云端迁移导出"
echo "================================"
echo ""

# 获取当前时间戳
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
EXPORT_DIR="database-export-${TIMESTAMP}"
CLOUD_PACKAGE_DIR="cloud-deployment-${TIMESTAMP}"

# 创建导出目录
create_export_directories() {
    print_info "创建导出目录..."
    
    mkdir -p "${EXPORT_DIR}/database"
    mkdir -p "${EXPORT_DIR}/uploads"
    mkdir -p "${EXPORT_DIR}/scripts"
    mkdir -p "${CLOUD_PACKAGE_DIR}"
    
    print_success "导出目录创建完成"
}

# 导出数据库结构
export_database_schema() {
    print_info "导出数据库结构..."
    
    # 复制主要架构文件
    cp database/postgresql-schema.sql "${EXPORT_DIR}/database/"
    cp database/monitoring-schema.sql "${EXPORT_DIR}/database/"
    
    # 复制初始化脚本
    if [ -d "postgresql-docker/init-scripts" ]; then
        cp -r postgresql-docker/init-scripts "${EXPORT_DIR}/database/"
    fi
    
    # 复制迁移脚本
    if [ -d "database/migrations" ]; then
        cp -r database/migrations "${EXPORT_DIR}/database/"
    fi
    
    print_success "数据库结构导出完成"
}

# 导出数据库数据
export_database_data() {
    print_info "导出数据库数据..."
    
    # 检查PostgreSQL连接
    if ! command -v pg_dump &> /dev/null; then
        print_warning "pg_dump 未安装，跳过数据导出"
        return 0
    fi
    
    # 获取数据库连接信息
    DB_HOST=${DB_HOST:-localhost}
    DB_PORT=${DB_PORT:-5432}
    DB_NAME=${DB_DATABASE:-health_hub}
    DB_USER=${DB_USERNAME:-postgres}
    
    if [ -n "$DB_PASSWORD" ]; then
        export PGPASSWORD="$DB_PASSWORD"
    fi
    
    # 导出数据
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --data-only --inserts --column-inserts \
        -f "${EXPORT_DIR}/database/data-export.sql" 2>/dev/null; then
        print_success "数据库数据导出完成"
    else
        print_warning "数据库数据导出失败，可能数据库未运行"
        
        # 创建示例数据文件
        cat > "${EXPORT_DIR}/database/sample-data.sql" << 'EOF'
-- 示例数据 - 请根据实际情况替换

-- 插入默认管理员用户
INSERT INTO users (id, username, email, password, role, status) VALUES
('admin-user-001', 'admin', 'admin@healthhub.com', '$2b$12$hash_password_here', 'admin', 'active')
ON CONFLICT (id) DO NOTHING;

-- 插入默认分类
INSERT INTO categories (id, name, description, color, icon) VALUES
('cat-001', '健康讲座', '健康相关的讲座内容', '#13C2C2', '🏥'),
('cat-002', '医学知识', '医学专业知识分享', '#52C41A', '🩺'),
('cat-003', '养生保健', '日常养生保健方法', '#FA8C16', '🌱')
ON CONFLICT (id) DO NOTHING;
EOF
        print_info "已创建示例数据文件"
    fi
}

# 导出上传文件
export_uploads() {
    print_info "导出上传文件..."
    
    if [ -d "uploads" ]; then
        # 计算上传文件大小
        UPLOAD_SIZE=$(du -sh uploads 2>/dev/null | cut -f1)
        print_info "上传文件总大小: ${UPLOAD_SIZE}"
        
        # 复制上传文件（排除过大的文件）
        find uploads -type f -size -100M -exec cp --parents {} "${EXPORT_DIR}/" \; 2>/dev/null || {
            print_warning "部分大文件跳过，建议单独上传"
        }
        
        # 创建上传文件清单
        find uploads -type f > "${EXPORT_DIR}/uploads/file-list.txt"
        
        print_success "上传文件导出完成"
    else
        print_warning "uploads 目录不存在"
        mkdir -p "${EXPORT_DIR}/uploads"
    fi
}

# 创建云端部署脚本
create_cloud_deployment_scripts() {
    print_info "创建云端部署脚本..."
    
    # 创建数据库初始化脚本
    cat > "${EXPORT_DIR}/scripts/init-cloud-database.sh" << 'EOF'
#!/bin/bash

# 云端数据库初始化脚本

set -e

echo "🗄️ 初始化云端数据库..."

# 数据库配置
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_DATABASE:-health_hub}
DB_USER=${DB_USERNAME:-postgres}
DB_PASSWORD=${DB_PASSWORD}

# 检查PostgreSQL是否运行
if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER"; then
    echo "❌ 数据库连接失败，请检查PostgreSQL服务"
    exit 1
fi

# 创建数据库（如果不存在）
createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" 2>/dev/null || echo "数据库已存在"

# 执行架构脚本
echo "📋 创建数据库结构..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f database/postgresql-schema.sql
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f database/monitoring-schema.sql

# 导入数据
if [ -f "database/data-export.sql" ]; then
    echo "📊 导入数据..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f database/data-export.sql
elif [ -f "database/sample-data.sql" ]; then
    echo "📊 导入示例数据..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f database/sample-data.sql
fi

echo "✅ 数据库初始化完成！"
EOF

    # 创建应用部署脚本
    cat > "${EXPORT_DIR}/scripts/deploy-app.sh" << 'EOF'
#!/bin/bash

# 应用部署脚本

set -e

echo "🚀 部署健闻局应用..."

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 18+"
    exit 1
fi

# 安装依赖
echo "📦 安装依赖..."
npm ci --production

# 构建应用
echo "🔨 构建应用..."
npm run build

# 启动应用
echo "🌟 启动应用..."
if command -v pm2 &> /dev/null; then
    pm2 stop health-hub 2>/dev/null || true
    pm2 start npm --name "health-hub" -- start
    pm2 save
    echo "✅ 应用已通过 PM2 启动"
else
    echo "⚠️ PM2 未安装，请手动启动: npm start"
fi

echo "✅ 应用部署完成！"
EOF

    # 创建环境配置模板
    cat > "${EXPORT_DIR}/scripts/env.cloud.template" << 'EOF'
# ==========================================
# 🌐 健闻局云端环境配置
# ==========================================

# 基础配置
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# 数据库配置 (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=health_hub
DB_USERNAME=postgres
DB_PASSWORD=your_secure_password_here

# 应用密钥 (请修改为随机值)
JWT_SECRET=your_jwt_secret_32_chars_minimum
SESSION_SECRET=your_session_secret_32_chars_min
NEXTAUTH_SECRET=your_nextauth_secret_32_chars

# 应用URL (修改为您的域名)
NEXTAUTH_URL=http://your-domain.com
BASE_URL=http://your-domain.com

# 文件上传配置
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=100MB
ALLOWED_FILE_TYPES=audio/mpeg,audio/wav,audio/mp3,audio/m4a,image/jpeg,image/png

# 安全配置
BCRYPT_ROUNDS=12
CSRF_PROTECTION=true
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# 日志配置
LOG_LEVEL=info
LOG_DESTINATION=file
LOG_FILE=./logs/app.log

# 性能配置
DB_POOL_SIZE=20
DB_TIMEOUT=10000
ENABLE_CACHING=true
ENABLE_COMPRESSION=true
EOF

    # 设置执行权限
    chmod +x "${EXPORT_DIR}/scripts/"*.sh
    
    print_success "云端部署脚本创建完成"
}

# 创建完整的云端部署包
create_cloud_package() {
    print_info "创建完整的云端部署包..."
    
    # 复制项目文件
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
        ./ "${CLOUD_PACKAGE_DIR}/"
    
    # 复制数据库导出
    cp -r "${EXPORT_DIR}/database" "${CLOUD_PACKAGE_DIR}/"
    cp -r "${EXPORT_DIR}/uploads" "${CLOUD_PACKAGE_DIR}/"
    cp -r "${EXPORT_DIR}/scripts" "${CLOUD_PACKAGE_DIR}/"
    
    # 创建部署说明
    cat > "${CLOUD_PACKAGE_DIR}/DEPLOYMENT_README.md" << 'EOF'
# 🚀 健闻局云端部署包

## 📦 包含内容

- **完整应用代码**: Next.js 应用程序
- **数据库结构**: PostgreSQL 架构和数据
- **上传文件**: 用户上传的音频和图片文件
- **部署脚本**: 自动化部署和初始化脚本

## 🔧 部署步骤

### 1. 系统要求
- Ubuntu 20.04+ 或 CentOS 7+
- Node.js 18+
- PostgreSQL 12+
- 至少 2GB RAM
- 至少 10GB 磁盘空间

### 2. 安装依赖
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y nodejs npm postgresql postgresql-contrib

# CentOS/RHEL
sudo yum install -y nodejs npm postgresql postgresql-server
```

### 3. 配置数据库
```bash
# 启动PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 创建数据库用户
sudo -u postgres createuser --interactive
sudo -u postgres createdb health_hub
```

### 4. 配置环境变量
```bash
# 复制环境配置模板
cp scripts/env.cloud.template .env

# 编辑配置文件
nano .env
```

### 5. 初始化数据库
```bash
chmod +x scripts/init-cloud-database.sh
./scripts/init-cloud-database.sh
```

### 6. 部署应用
```bash
chmod +x scripts/deploy-app.sh
./scripts/deploy-app.sh
```

## 🌐 访问应用

部署完成后，可通过以下地址访问：
- 应用首页: http://your-server-ip:3000
- 管理后台: http://your-server-ip:3000/admin

## 🔒 安全建议

1. 修改默认密码
2. 配置防火墙
3. 启用 SSL/TLS
4. 定期备份数据库
EOF
    
    print_success "云端部署包创建完成"
}

# 创建压缩包
create_archive() {
    print_info "创建压缩包..."
    
    # 创建数据库导出压缩包
    tar -czf "health-hub-database-export-${TIMESTAMP}.tar.gz" "${EXPORT_DIR}"
    
    # 创建完整部署包压缩包
    tar -czf "health-hub-cloud-deployment-${TIMESTAMP}.tar.gz" "${CLOUD_PACKAGE_DIR}"
    
    # 显示文件大小
    DB_SIZE=$(du -sh "health-hub-database-export-${TIMESTAMP}.tar.gz" | cut -f1)
    FULL_SIZE=$(du -sh "health-hub-cloud-deployment-${TIMESTAMP}.tar.gz" | cut -f1)
    
    print_success "压缩包创建完成"
    echo ""
    echo "📦 生成的文件:"
    echo "  - 数据库导出: health-hub-database-export-${TIMESTAMP}.tar.gz (${DB_SIZE})"
    echo "  - 完整部署包: health-hub-cloud-deployment-${TIMESTAMP}.tar.gz (${FULL_SIZE})"
}

# 生成部署指令
generate_deployment_instructions() {
    print_info "生成部署指令..."
    
    cat > "cloud-deployment-instructions-${TIMESTAMP}.md" << EOF
# 🚀 健闻局云端部署指令

## 📋 部署信息
- 生成时间: $(date)
- 数据库导出: health-hub-database-export-${TIMESTAMP}.tar.gz
- 完整部署包: health-hub-cloud-deployment-${TIMESTAMP}.tar.gz

## 🌐 快速部署命令

### 1. 上传文件到服务器
\`\`\`bash
# 上传完整部署包
scp health-hub-cloud-deployment-${TIMESTAMP}.tar.gz user@your-server:/root/

# 或者只上传数据库
scp health-hub-database-export-${TIMESTAMP}.tar.gz user@your-server:/root/
\`\`\`

### 2. 服务器端操作
\`\`\`bash
# 连接到服务器
ssh user@your-server

# 解压部署包
tar -xzf health-hub-cloud-deployment-${TIMESTAMP}.tar.gz
cd ${CLOUD_PACKAGE_DIR}

# 配置环境
cp scripts/env.cloud.template .env
nano .env  # 修改配置

# 初始化数据库
./scripts/init-cloud-database.sh

# 部署应用
./scripts/deploy-app.sh
\`\`\`

### 3. 验证部署
\`\`\`bash
# 检查应用状态
curl http://localhost:3000/api/health

# 查看应用日志
pm2 logs health-hub
\`\`\`

## 🔧 故障排除

如果遇到问题，请检查：
1. PostgreSQL 服务是否运行
2. 环境变量是否正确配置
3. 端口 3000 是否被占用
4. 防火墙设置是否正确

## 📞 技术支持

如需帮助，请提供：
- 错误日志
- 系统环境信息
- 部署步骤详情
EOF
    
    print_success "部署指令生成完成: cloud-deployment-instructions-${TIMESTAMP}.md"
}

# 清理临时文件
cleanup() {
    print_info "清理临时文件..."
    
    rm -rf "${EXPORT_DIR}"
    rm -rf "${CLOUD_PACKAGE_DIR}"
    
    print_success "清理完成"
}

# 主函数
main() {
    create_export_directories
    export_database_schema
    export_database_data
    export_uploads
    create_cloud_deployment_scripts
    create_cloud_package
    create_archive
    generate_deployment_instructions
    cleanup
    
    echo ""
    print_success "🎉 云端迁移导出完成！"
    echo ""
    echo "📁 生成的文件:"
    echo "  - health-hub-database-export-${TIMESTAMP}.tar.gz"
    echo "  - health-hub-cloud-deployment-${TIMESTAMP}.tar.gz"
    echo "  - cloud-deployment-instructions-${TIMESTAMP}.md"
    echo ""
    echo "🚀 接下来的步骤:"
    echo "  1. 将部署包上传到云服务器"
    echo "  2. 按照部署指令进行安装"
    echo "  3. 配置域名和SSL证书"
}

# 错误处理
trap 'print_error "导出过程中出现错误"; cleanup; exit 1' ERR

# 执行主函数
main "$@"
