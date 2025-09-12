#!/bin/bash

# 🚀 健闻局应用程序完整打包脚本
# 用于创建包含所有程序文件的完整部署包

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 项目根目录
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PACKAGE_DIR="${ROOT_DIR}/app-package-${TIMESTAMP}"

echo "🚀 健闻局应用程序完整打包"
echo "=========================="
echo ""

# 创建包目录结构
create_package_structure() {
    print_info "创建包目录结构..."
    
    mkdir -p "$PACKAGE_DIR"
    mkdir -p "$PACKAGE_DIR/src"
    mkdir -p "$PACKAGE_DIR/public"
    mkdir -p "$PACKAGE_DIR/database"
    mkdir -p "$PACKAGE_DIR/scripts"
    mkdir -p "$PACKAGE_DIR/deploy"
    mkdir -p "$PACKAGE_DIR/docs"
    mkdir -p "$PACKAGE_DIR/config"
    
    print_success "包目录结构创建完成"
}

# 复制源代码
copy_source_code() {
    print_info "复制源代码..."
    
    # 复制 src 目录（排除不必要的文件）
    if [ -d "${ROOT_DIR}/src" ]; then
        print_info "复制 src 目录..."
        cp -r "${ROOT_DIR}/src"/* "$PACKAGE_DIR/src/" 2>/dev/null || true
        
        # 清理不必要的文件
        find "$PACKAGE_DIR/src" -name "*.test.ts" -delete 2>/dev/null || true
        find "$PACKAGE_DIR/src" -name "*.test.tsx" -delete 2>/dev/null || true
        find "$PACKAGE_DIR/src" -name "*.spec.ts" -delete 2>/dev/null || true
        find "$PACKAGE_DIR/src" -name "*.spec.tsx" -delete 2>/dev/null || true
        find "$PACKAGE_DIR/src" -name "__tests__" -type d -exec rm -rf {} + 2>/dev/null || true
        
        print_success "源代码复制完成"
    fi
    
    # 复制 public 目录
    if [ -d "${ROOT_DIR}/public" ]; then
        print_info "复制 public 目录..."
        cp -r "${ROOT_DIR}/public"/* "$PACKAGE_DIR/public/" 2>/dev/null || true
        print_success "public 目录复制完成"
    fi
}

# 复制配置文件
copy_config_files() {
    print_info "复制配置文件..."
    
    # 主要配置文件
    CONFIG_FILES=(
        "package.json"
        "package-lock.json"
        "next.config.js"
        "tailwind.config.js"
        "tsconfig.json"
        "postcss.config.js"
        ".env.example"
        ".gitignore"
        "README.md"
        "LICENSE"
    )
    
    for file in "${CONFIG_FILES[@]}"; do
        if [ -f "${ROOT_DIR}/$file" ]; then
            cp "${ROOT_DIR}/$file" "$PACKAGE_DIR/"
            print_info "复制: $file"
        fi
    done
    
    # 复制环境配置文件
    if [ -f "${ROOT_DIR}/.env.local" ]; then
        cp "${ROOT_DIR}/.env.local" "$PACKAGE_DIR/.env.example.local"
        print_info "复制: .env.local (重命名为 .env.example.local)"
    fi
    
    print_success "配置文件复制完成"
}

# 复制数据库文件
copy_database_files() {
    print_info "复制数据库文件..."
    
    if [ -d "${ROOT_DIR}/database" ]; then
        cp -r "${ROOT_DIR}/database"/* "$PACKAGE_DIR/database/" 2>/dev/null || true
        print_success "数据库文件复制完成"
    fi
    
    # 复制数据目录（如果存在）
    if [ -d "${ROOT_DIR}/data" ]; then
        mkdir -p "$PACKAGE_DIR/data"
        # 只复制JSON文件，不复制数据库文件
        find "${ROOT_DIR}/data" -name "*.json" -exec cp {} "$PACKAGE_DIR/data/" \; 2>/dev/null || true
        print_success "数据文件复制完成"
    fi
}

# 复制脚本文件
copy_scripts() {
    print_info "复制脚本文件..."
    
    if [ -d "${ROOT_DIR}/scripts" ]; then
        # 复制所有脚本，但排除临时文件
        find "${ROOT_DIR}/scripts" -name "*.sh" -exec cp {} "$PACKAGE_DIR/scripts/" \; 2>/dev/null || true
        find "${ROOT_DIR}/scripts" -name "*.js" -exec cp {} "$PACKAGE_DIR/scripts/" \; 2>/dev/null || true
        find "${ROOT_DIR}/scripts" -name "*.sql" -exec cp {} "$PACKAGE_DIR/scripts/" \; 2>/dev/null || true
        
        # 设置执行权限
        chmod +x "$PACKAGE_DIR/scripts"/*.sh 2>/dev/null || true
        
        print_success "脚本文件复制完成"
    fi
}

# 复制部署配置
copy_deployment_config() {
    print_info "复制部署配置..."
    
    # 复制部署目录
    if [ -d "${ROOT_DIR}/deploy" ]; then
        cp -r "${ROOT_DIR}/deploy"/* "$PACKAGE_DIR/deploy/" 2>/dev/null || true
        print_success "部署配置复制完成"
    fi
    
    # 复制 Docker 相关文件
    DOCKER_FILES=(
        "Dockerfile"
        "docker-compose.yml"
        "docker-compose.production.yml"
        ".dockerignore"
    )
    
    for file in "${DOCKER_FILES[@]}"; do
        if [ -f "${ROOT_DIR}/$file" ]; then
            cp "${ROOT_DIR}/$file" "$PACKAGE_DIR/"
            print_info "复制: $file"
        fi
    done
    
    # 复制 PostgreSQL Docker 配置
    if [ -d "${ROOT_DIR}/postgresql-docker" ]; then
        cp -r "${ROOT_DIR}/postgresql-docker" "$PACKAGE_DIR/"
        print_success "PostgreSQL Docker 配置复制完成"
    fi
}

# 复制文档
copy_documentation() {
    print_info "复制文档..."
    
    # 查找所有 Markdown 文档
    find "${ROOT_DIR}" -maxdepth 1 -name "*.md" -exec cp {} "$PACKAGE_DIR/docs/" \; 2>/dev/null || true
    
    # 复制 docs 目录（如果存在）
    if [ -d "${ROOT_DIR}/docs" ]; then
        cp -r "${ROOT_DIR}/docs"/* "$PACKAGE_DIR/docs/" 2>/dev/null || true
    fi
    
    print_success "文档复制完成"
}

# 创建构建脚本
create_build_script() {
    print_info "创建构建脚本..."
    
    cat > "$PACKAGE_DIR/build.sh" << 'EOF'
#!/bin/bash

# 🔨 健闻局应用构建脚本

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

echo "🔨 健闻局应用构建"
echo "=================="
echo ""

# 检查 Node.js 环境
check_node() {
    print_info "检查 Node.js 环境..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js 未安装，请先安装 Node.js 16+"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    print_success "Node.js 版本: v$NODE_VERSION"
    
    if ! command -v npm &> /dev/null; then
        print_error "npm 未安装"
        exit 1
    fi
    
    print_success "npm 版本: $(npm --version)"
}

# 安装依赖
install_dependencies() {
    print_info "安装项目依赖..."
    
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    print_success "依赖安装完成"
}

# 构建应用
build_application() {
    print_info "构建应用..."
    
    # 设置生产环境
    export NODE_ENV=production
    
    # 构建应用
    npm run build
    
    print_success "应用构建完成"
}

# 主函数
main() {
    check_node
    install_dependencies
    build_application
    
    print_success "🎉 构建完成！"
    echo ""
    echo "构建产物位于 .next 目录"
    echo "可以使用以下命令启动生产服务器："
    echo "  npm start"
}

# 执行主函数
main "$@"
EOF

    chmod +x "$PACKAGE_DIR/build.sh"
    print_success "构建脚本创建完成"
}

# 创建部署脚本
create_deployment_script() {
    print_info "创建部署脚本..."
    
    cat > "$PACKAGE_DIR/deploy-app.sh" << 'EOF'
#!/bin/bash

# 🚀 健闻局应用部署脚本

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

echo "🚀 健闻局应用部署"
echo "=================="
echo ""

# 部署目标目录
TARGET_DIR="/www/wwwroot/The-Health-Hub"

# 检查部署环境
check_environment() {
    print_info "检查部署环境..."
    
    # 检查是否为root用户
    if [ "$EUID" -ne 0 ]; then
        print_warning "建议使用 root 用户执行部署"
    fi
    
    # 检查目标目录
    if [ ! -d "$(dirname "$TARGET_DIR")" ]; then
        print_error "目标目录的父目录不存在: $(dirname "$TARGET_DIR")"
        exit 1
    fi
    
    print_success "环境检查通过"
}

# 备份现有应用
backup_existing() {
    if [ -d "$TARGET_DIR" ]; then
        print_info "备份现有应用..."
        
        BACKUP_DIR="${TARGET_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
        mv "$TARGET_DIR" "$BACKUP_DIR"
        
        print_success "现有应用已备份到: $BACKUP_DIR"
    fi
}

# 部署应用
deploy_application() {
    print_info "部署应用到 $TARGET_DIR..."
    
    # 创建目标目录
    mkdir -p "$TARGET_DIR"
    
    # 复制所有文件
    cp -r . "$TARGET_DIR/"
    
    # 设置权限
    chown -R www-data:www-data "$TARGET_DIR" 2>/dev/null || true
    chmod -R 755 "$TARGET_DIR"
    
    print_success "应用部署完成"
}

# 安装依赖和构建
install_and_build() {
    print_info "安装依赖和构建应用..."
    
    cd "$TARGET_DIR"
    
    # 安装依赖
    if [ -f "package-lock.json" ]; then
        npm ci --production
    else
        npm install --production
    fi
    
    # 构建应用
    npm run build
    
    print_success "应用构建完成"
}

# 配置环境
configure_environment() {
    print_info "配置环境..."
    
    cd "$TARGET_DIR"
    
    # 复制环境配置
    if [ -f ".env.example" ] && [ ! -f ".env" ]; then
        cp ".env.example" ".env"
        print_warning "请编辑 .env 文件配置环境变量"
    fi
    
    # 创建必要的目录
    mkdir -p "uploads" "logs" "tmp"
    chown -R www-data:www-data "uploads" "logs" "tmp" 2>/dev/null || true
    
    print_success "环境配置完成"
}

# 启动应用
start_application() {
    print_info "启动应用..."
    
    cd "$TARGET_DIR"
    
    # 检查 PM2
    if command -v pm2 &> /dev/null; then
        # 停止现有应用
        pm2 stop healthhub 2>/dev/null || true
        pm2 delete healthhub 2>/dev/null || true
        
        # 启动新应用
        pm2 start npm --name "healthhub" -- start
        pm2 save
        
        print_success "应用已通过 PM2 启动"
    else
        print_warning "PM2 未安装，请手动启动应用："
        echo "  cd $TARGET_DIR"
        echo "  npm start"
    fi
}

# 验证部署
verify_deployment() {
    print_info "验证部署..."
    
    # 等待应用启动
    sleep 5
    
    # 检查应用健康状态
    if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
        print_success "✅ 应用启动成功"
    else
        print_warning "⚠️ 应用可能还在启动中，请稍后检查"
    fi
    
    # 显示PM2状态
    if command -v pm2 &> /dev/null; then
        echo ""
        echo "=== PM2 状态 ==="
        pm2 status
    fi
}

# 主函数
main() {
    check_environment
    backup_existing
    deploy_application
    install_and_build
    configure_environment
    start_application
    verify_deployment
    
    print_success "🎉 应用部署完成！"
    echo ""
    echo "=== 访问信息 ==="
    echo "🌐 应用地址: http://$(curl -s ifconfig.me 2>/dev/null || echo 'localhost'):3000"
    echo "📁 部署目录: $TARGET_DIR"
    echo ""
    echo "=== 管理命令 ==="
    echo "# 查看状态: pm2 status"
    echo "# 查看日志: pm2 logs healthhub"
    echo "# 重启应用: pm2 restart healthhub"
}

# 执行主函数
main "$@"
EOF

    chmod +x "$PACKAGE_DIR/deploy-app.sh"
    print_success "部署脚本创建完成"
}

# 创建说明文档
create_package_documentation() {
    print_info "创建包说明文档..."
    
    cat > "$PACKAGE_DIR/PACKAGE_README.md" << EOF
# 🚀 健闻局应用程序完整包

打包时间: $(date)
包版本: v2.0

## 📦 包内容

### 源代码
- \`src/\` - Next.js 应用源代码
  - \`app/\` - App Router 页面和API路由
  - \`components/\` - React 组件
  - \`lib/\` - 工具库和配置
  - \`store/\` - 状态管理
  - \`types/\` - TypeScript 类型定义

### 静态资源
- \`public/\` - 静态文件（图片、图标等）

### 配置文件
- \`package.json\` - 项目依赖和脚本
- \`next.config.js\` - Next.js 配置
- \`tailwind.config.js\` - Tailwind CSS 配置
- \`tsconfig.json\` - TypeScript 配置
- \`.env.example\` - 环境变量模板

### 数据库
- \`database/\` - 数据库文件和脚本
- \`data/\` - 示例数据文件

### 部署配置
- \`deploy/\` - 部署配置文件
- \`postgresql-docker/\` - PostgreSQL Docker 配置
- Docker 相关文件

### 脚本
- \`scripts/\` - 各种管理和部署脚本
- \`build.sh\` - 应用构建脚本
- \`deploy-app.sh\` - 应用部署脚本

### 文档
- \`docs/\` - 项目文档
- 各种 README 和说明文件

## 🚀 快速开始

### 方法一：自动部署（推荐）

\`\`\`bash
# 1. 上传应用包到服务器
scp app-package-*.tar.gz root@your-server:/tmp/

# 2. 解压应用包
ssh root@your-server
cd /tmp
tar -xzf app-package-*.tar.gz
cd app-package-*

# 3. 执行自动部署
./deploy-app.sh
\`\`\`

### 方法二：手动部署

#### 本地开发环境
\`\`\`bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 3. 启动开发服务器
npm run dev
\`\`\`

#### 生产环境部署
\`\`\`bash
# 1. 构建应用
./build.sh

# 2. 启动生产服务器
npm start

# 或使用 PM2
pm2 start npm --name "healthhub" -- start
\`\`\`

## 🔧 环境要求

### 系统要求
- **操作系统**: Linux (Ubuntu 18.04+ / CentOS 7+ 推荐)
- **Node.js**: 16.0.0 或更高版本
- **npm**: 7.0.0 或更高版本
- **内存**: 至少 2GB RAM
- **存储**: 至少 5GB 可用空间

### 数据库要求
- **PostgreSQL**: 12+ 版本（推荐）
- 或 **SQLite**: 3.x 版本

### 可选组件
- **PM2**: 进程管理器（生产环境推荐）
- **Nginx**: 反向代理服务器
- **Docker**: 容器化部署
- **Redis**: 缓存服务器

## 📋 部署清单

### 部署前准备
- [ ] 确认服务器环境满足要求
- [ ] 准备数据库连接信息
- [ ] 配置域名和SSL证书（如需要）
- [ ] 准备环境变量配置

### 部署步骤
- [ ] 上传应用包到服务器
- [ ] 解压应用包
- [ ] 配置环境变量
- [ ] 执行部署脚本
- [ ] 验证应用状态

### 部署后验证
- [ ] 应用可以正常访问
- [ ] 数据库连接正常
- [ ] API 接口工作正常
- [ ] 文件上传功能正常
- [ ] 用户认证功能正常

## 🔧 配置说明

### 环境变量配置
复制 \`.env.example\` 为 \`.env\` 并配置以下变量：

\`\`\`bash
# 应用配置
NODE_ENV=production
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=https://your-domain.com

# 数据库配置
DATABASE_URL=postgresql://user:password@localhost:5432/healthhub

# 文件上传配置
UPLOAD_PATH=/app/uploads
MAX_FILE_SIZE=100MB
\`\`\`

### 数据库配置
1. **PostgreSQL 配置**:
   - 创建数据库: \`createdb healthhub\`
   - 导入数据: \`psql -d healthhub -f database/schema.sql\`

2. **SQLite 配置**:
   - 数据库文件会自动创建在 \`data/\` 目录

## 🛠️ 管理命令

### 应用管理
\`\`\`bash
# 启动应用
npm start

# 开发模式
npm run dev

# 构建应用
npm run build

# 运行测试
npm test
\`\`\`

### PM2 管理
\`\`\`bash
# 启动应用
pm2 start npm --name "healthhub" -- start

# 查看状态
pm2 status

# 查看日志
pm2 logs healthhub

# 重启应用
pm2 restart healthhub

# 停止应用
pm2 stop healthhub
\`\`\`

### 数据库管理
\`\`\`bash
# PostgreSQL 备份
pg_dump healthhub > backup.sql

# PostgreSQL 恢复
psql healthhub < backup.sql

# 运行迁移脚本
node scripts/migrate.js
\`\`\`

## 🔍 故障排除

### 常见问题

**1. 端口占用**
\`\`\`bash
# 检查端口占用
netstat -tulpn | grep :3000
# 或
lsof -i :3000
\`\`\`

**2. 权限错误**
\`\`\`bash
# 设置正确权限
chown -R www-data:www-data /www/wwwroot/The-Health-Hub
chmod -R 755 /www/wwwroot/The-Health-Hub
\`\`\`

**3. 数据库连接失败**
\`\`\`bash
# 检查数据库服务
systemctl status postgresql
# 测试连接
psql -h localhost -U postgres -d healthhub -c "SELECT 1;"
\`\`\`

**4. 内存不足**
\`\`\`bash
# 检查内存使用
free -h
# 增加 swap 空间或升级服务器配置
\`\`\`

### 日志查看
\`\`\`bash
# 应用日志
pm2 logs healthhub

# 系统日志
journalctl -u your-service-name -f

# Nginx 日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
\`\`\`

## 📊 性能优化

### 生产环境优化
1. **启用 Gzip 压缩**
2. **配置 CDN**
3. **设置适当的缓存头**
4. **使用 PM2 集群模式**
5. **配置 Nginx 反向代理**

### 数据库优化
1. **创建适当的索引**
2. **定期清理日志**
3. **配置连接池**
4. **监控查询性能**

## 📞 技术支持

如果遇到问题，请提供以下信息：

1. **系统信息**:
   \`\`\`bash
   uname -a
   node --version
   npm --version
   \`\`\`

2. **应用状态**:
   \`\`\`bash
   pm2 status
   pm2 logs healthhub --lines 50
   \`\`\`

3. **系统资源**:
   \`\`\`bash
   free -h
   df -h
   \`\`\`

---

## 🎉 总结

这个应用包包含了健闻局项目的完整源代码、配置文件、部署脚本和文档。通过使用提供的自动化脚本，您可以轻松地在任何支持的环境中部署和运行应用。

**祝您部署成功！** 🚀
EOF

    print_success "包说明文档创建完成"
}

# 清理不必要的文件
cleanup_unnecessary_files() {
    print_info "清理不必要的文件..."
    
    cd "$PACKAGE_DIR"
    
    # 删除不必要的文件和目录
    CLEANUP_PATTERNS=(
        "node_modules"
        ".next"
        ".git"
        ".vscode"
        ".idea"
        "*.log"
        "*.tmp"
        ".DS_Store"
        "Thumbs.db"
        "coverage"
        ".nyc_output"
        "dist"
        "build"
    )
    
    for pattern in "${CLEANUP_PATTERNS[@]}"; do
        find . -name "$pattern" -exec rm -rf {} + 2>/dev/null || true
    done
    
    print_success "不必要文件清理完成"
}

# 计算包大小和统计信息
calculate_package_stats() {
    print_info "计算包统计信息..."
    
    # 文件数量统计
    TOTAL_FILES=$(find "$PACKAGE_DIR" -type f | wc -l)
    TOTAL_DIRS=$(find "$PACKAGE_DIR" -type d | wc -l)
    
    # 代码文件统计
    TS_FILES=$(find "$PACKAGE_DIR" -name "*.ts" -o -name "*.tsx" | wc -l)
    JS_FILES=$(find "$PACKAGE_DIR" -name "*.js" -o -name "*.jsx" | wc -l)
    CSS_FILES=$(find "$PACKAGE_DIR" -name "*.css" -o -name "*.scss" | wc -l)
    
    # 包大小
    PACKAGE_SIZE=$(du -sh "$PACKAGE_DIR" | cut -f1)
    
    print_success "包统计信息计算完成"
    echo "  总文件数: $TOTAL_FILES"
    echo "  总目录数: $TOTAL_DIRS"
    echo "  TypeScript文件: $TS_FILES"
    echo "  JavaScript文件: $JS_FILES"
    echo "  CSS文件: $CSS_FILES"
    echo "  包大小: $PACKAGE_SIZE"
}

# 创建最终压缩包
create_final_package() {
    print_info "创建最终压缩包..."
    
    cd "$(dirname "$PACKAGE_DIR")"
    PACKAGE_NAME="health-hub-app-package-${TIMESTAMP}.tar.gz"
    
    # 创建压缩包
    tar -czf "$PACKAGE_NAME" --exclude='*.tmp' --exclude='.DS_Store' "$(basename "$PACKAGE_DIR")"
    
    # 计算压缩包大小
    COMPRESSED_SIZE=$(ls -lh "$PACKAGE_NAME" | awk '{print $5}')
    
    print_success "最终压缩包创建完成"
    print_info "  压缩包名: $PACKAGE_NAME"
    print_info "  压缩大小: $COMPRESSED_SIZE"
    print_info "  位置: $(pwd)/$PACKAGE_NAME"
    
    # 清理临时目录
    rm -rf "$PACKAGE_DIR"
    
    return 0
}

# 显示完成信息
show_completion_info() {
    echo ""
    echo "🎉 应用程序包创建完成！"
    echo ""
    echo "=== 包信息 ==="
    echo "📦 包名: health-hub-app-package-${TIMESTAMP}.tar.gz"
    echo "📅 创建时间: $(date)"
    echo "🚀 包类型: Next.js 应用程序完整包"
    echo ""
    echo "=== 部署步骤 ==="
    echo "1. 上传到服务器:"
    echo "   scp health-hub-app-package-${TIMESTAMP}.tar.gz root@your-server:/tmp/"
    echo ""
    echo "2. 解压应用包:"
    echo "   cd /tmp"
    echo "   tar -xzf health-hub-app-package-${TIMESTAMP}.tar.gz"
    echo "   cd app-package-${TIMESTAMP}"
    echo ""
    echo "3. 执行自动部署:"
    echo "   ./deploy-app.sh"
    echo ""
    echo "=== 包含内容 ==="
    echo "✅ 完整的 Next.js 源代码"
    echo "✅ 所有配置文件"
    echo "✅ 数据库文件和脚本"
    echo "✅ Docker 部署配置"
    echo "✅ 自动化部署脚本"
    echo "✅ 完整的文档说明"
    echo ""
    echo "=== 特色功能 ==="
    echo "🔨 一键构建脚本"
    echo "🚀 自动化部署"
    echo "📊 性能优化"
    echo "🛡️ 安全配置"
    echo "📖 详细文档"
    echo ""
}

# 主函数
main() {
    create_package_structure
    copy_source_code
    copy_config_files
    copy_database_files
    copy_scripts
    copy_deployment_config
    copy_documentation
    create_build_script
    create_deployment_script
    create_package_documentation
    cleanup_unnecessary_files
    calculate_package_stats
    create_final_package
    show_completion_info
}

# 错误处理
trap 'print_error "打包过程中出现错误"; exit 1' ERR

# 执行主函数
main "$@"
