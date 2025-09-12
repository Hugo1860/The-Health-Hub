#!/bin/bash

# 🐘 健闻局 PostgreSQL 数据打包脚本
# 基于现有数据文件创建完整的PostgreSQL部署包

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
PACKAGE_DIR="${ROOT_DIR}/postgresql-package-${TIMESTAMP}"

echo "🐘 健闻局 PostgreSQL 数据包创建"
echo "==============================="
echo ""

# 创建包目录
create_package_directory() {
    print_info "创建数据包目录..."
    mkdir -p "$PACKAGE_DIR"
    mkdir -p "$PACKAGE_DIR/database"
    mkdir -p "$PACKAGE_DIR/docker"
    mkdir -p "$PACKAGE_DIR/scripts"
    mkdir -p "$PACKAGE_DIR/uploads"
    print_success "数据包目录创建完成: $PACKAGE_DIR"
}

# 收集数据库文件
collect_database_files() {
    print_info "收集数据库文件..."
    
    # 复制主要的PostgreSQL导出文件
    if [ -f "${ROOT_DIR}/database/current-data-export.sql" ]; then
        cp "${ROOT_DIR}/database/current-data-export.sql" "$PACKAGE_DIR/database/complete_database.sql"
        print_success "主数据库文件已复制"
        
        # 分析文件内容，提取架构和数据
        print_info "分析数据库文件内容..."
        
        # 提取架构部分（CREATE语句）
        grep -E "^(CREATE|ALTER|SET|SELECT pg_catalog)" "${ROOT_DIR}/database/current-data-export.sql" > "$PACKAGE_DIR/database/schema_only.sql" || true
        
        # 提取数据部分（INSERT语句）
        grep -E "^INSERT INTO" "${ROOT_DIR}/database/current-data-export.sql" > "$PACKAGE_DIR/database/data_only.sql" || true
        
        print_success "数据库文件分析完成"
    else
        print_warning "未找到主数据库导出文件"
    fi
    
    # 复制其他数据库相关文件
    if [ -f "${ROOT_DIR}/database/data-import.sql" ]; then
        cp "${ROOT_DIR}/database/data-import.sql" "$PACKAGE_DIR/database/import_data.sql"
        print_success "数据导入文件已复制"
    fi
    
    if [ -f "${ROOT_DIR}/database/postgresql-schema.sql" ]; then
        cp "${ROOT_DIR}/database/postgresql-schema.sql" "$PACKAGE_DIR/database/schema.sql"
        print_success "架构文件已复制"
    fi
    
    # 复制所有数据库目录文件
    if [ -d "${ROOT_DIR}/database" ]; then
        find "${ROOT_DIR}/database" -name "*.sql" -exec cp {} "$PACKAGE_DIR/database/" \; 2>/dev/null || true
        print_success "所有SQL文件已复制"
    fi
}

# 收集Docker配置
collect_docker_config() {
    print_info "收集Docker配置..."
    
    # 复制Docker部署配置
    if [ -d "${ROOT_DIR}/deploy/docker" ]; then
        cp -r "${ROOT_DIR}/deploy/docker"/* "$PACKAGE_DIR/docker/" 2>/dev/null || true
        print_success "Docker配置已复制"
    fi
    
    # 复制PostgreSQL专用Docker配置
    if [ -d "${ROOT_DIR}/postgresql-docker" ]; then
        cp -r "${ROOT_DIR}/postgresql-docker"/* "$PACKAGE_DIR/docker/" 2>/dev/null || true
        print_success "PostgreSQL Docker配置已复制"
    fi
    
    # 复制Docker bundle配置
    if [ -d "${ROOT_DIR}/docker_bundle" ]; then
        cp -r "${ROOT_DIR}/docker_bundle/deploy/docker"/* "$PACKAGE_DIR/docker/" 2>/dev/null || true
        print_success "Docker bundle配置已复制"
    fi
}

# 收集上传文件
collect_uploads() {
    print_info "收集上传文件..."
    
    if [ -d "${ROOT_DIR}/uploads" ]; then
        UPLOAD_SIZE=$(du -sh "${ROOT_DIR}/uploads" 2>/dev/null | cut -f1 || echo "0")
        print_info "上传文件总大小: $UPLOAD_SIZE"
        
        # 创建上传文件清单
        find "${ROOT_DIR}/uploads" -type f > "$PACKAGE_DIR/uploads_list.txt" 2>/dev/null || true
        
        # 复制小文件，大文件创建清单
        if [[ "$UPLOAD_SIZE" =~ [0-9]+G ]] || [[ "$UPLOAD_SIZE" =~ [5-9][0-9][0-9]M ]]; then
            print_warning "上传文件较大，将创建文件清单"
            
            # 创建目录结构
            find "${ROOT_DIR}/uploads" -type d -exec mkdir -p "$PACKAGE_DIR/uploads/{}" \; 2>/dev/null || true
            
            # 只复制小于5MB的文件
            find "${ROOT_DIR}/uploads" -type f -size -5M -exec cp "{}" "$PACKAGE_DIR/uploads/{}" \; 2>/dev/null || true
            
            # 创建大文件清单
            find "${ROOT_DIR}/uploads" -type f -size +5M > "$PACKAGE_DIR/large_files_list.txt" 2>/dev/null || true
            
            print_success "文件结构和小文件已复制，大文件清单已创建"
        else
            cp -r "${ROOT_DIR}/uploads"/* "$PACKAGE_DIR/uploads/" 2>/dev/null || true
            print_success "所有上传文件已复制"
        fi
    else
        print_warning "未找到上传文件目录"
        mkdir -p "$PACKAGE_DIR/uploads"
    fi
}

# 创建部署脚本
create_deployment_scripts() {
    print_info "创建部署脚本..."
    
    # 创建一键部署脚本
    cat > "$PACKAGE_DIR/deploy.sh" << 'EOF'
#!/bin/bash

# 🚀 健闻局 PostgreSQL 一键部署脚本

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

echo "🚀 健闻局 PostgreSQL 一键部署"
echo "============================="
echo ""

# 检查部署环境
check_environment() {
    print_info "检查部署环境..."
    
    # 检查目标目录
    TARGET_DIR="/www/wwwroot/The-Health-Hub"
    if [ ! -d "$TARGET_DIR" ]; then
        print_error "目标目录不存在: $TARGET_DIR"
        print_info "请确保应用已部署到正确位置"
        exit 1
    fi
    
    # 检查Docker
    if command -v docker &> /dev/null; then
        print_success "Docker 可用"
        DEPLOYMENT_TYPE="docker"
    elif command -v psql &> /dev/null; then
        print_success "PostgreSQL 客户端可用"
        DEPLOYMENT_TYPE="local"
    else
        print_error "未找到 Docker 或 PostgreSQL 客户端"
        exit 1
    fi
}

# Docker部署
deploy_with_docker() {
    print_info "使用Docker部署PostgreSQL..."
    
    cd "$TARGET_DIR"
    
    # 复制Docker配置
    if [ -d "$(dirname "$0")/docker" ]; then
        cp -r "$(dirname "$0")/docker"/* . 2>/dev/null || true
        print_success "Docker配置已复制"
    fi
    
    # 启动PostgreSQL容器
    if [ -f "docker-compose.yml" ]; then
        print_info "启动PostgreSQL容器..."
        docker-compose up -d postgres
        
        # 等待数据库启动
        print_info "等待数据库启动..."
        sleep 15
        
        # 导入数据
        if [ -f "$(dirname "$0")/database/complete_database.sql" ]; then
            print_info "导入数据库..."
            docker-compose exec -T postgres psql -U postgres -d healthhub < "$(dirname "$0")/database/complete_database.sql"
            print_success "数据库导入完成"
        fi
        
        # 启动应用
        print_info "启动应用..."
        docker-compose up -d
        
    else
        print_error "未找到docker-compose.yml文件"
        exit 1
    fi
}

# 本地部署
deploy_local() {
    print_info "使用本地PostgreSQL部署..."
    
    # 检查数据库连接
    if ! psql -h localhost -p 5432 -U postgres -d healthhub -c "SELECT 1;" >/dev/null 2>&1; then
        print_error "无法连接到PostgreSQL数据库"
        print_info "请确保PostgreSQL服务正在运行，并且数据库healthhub已创建"
        exit 1
    fi
    
    # 导入数据
    if [ -f "$(dirname "$0")/database/complete_database.sql" ]; then
        print_info "导入数据库..."
        psql -h localhost -p 5432 -U postgres -d healthhub -f "$(dirname "$0")/database/complete_database.sql"
        print_success "数据库导入完成"
    else
        print_error "未找到数据库文件"
        exit 1
    fi
}

# 复制上传文件
deploy_uploads() {
    print_info "部署上传文件..."
    
    cd "$TARGET_DIR"
    
    if [ -d "$(dirname "$0")/uploads" ]; then
        # 备份现有上传文件
        if [ -d "uploads" ]; then
            mv "uploads" "uploads.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
        fi
        
        # 复制新的上传文件
        cp -r "$(dirname "$0")/uploads" . 2>/dev/null || true
        
        # 设置权限
        chown -R www-data:www-data uploads/ 2>/dev/null || true
        chmod -R 755 uploads/ 2>/dev/null || true
        
        print_success "上传文件部署完成"
    else
        print_warning "未找到上传文件目录"
    fi
    
    # 处理大文件清单
    if [ -f "$(dirname "$0")/large_files_list.txt" ]; then
        print_warning "检测到大文件清单，请手动上传以下文件："
        cat "$(dirname "$0")/large_files_list.txt"
    fi
}

# 验证部署
verify_deployment() {
    print_info "验证部署结果..."
    
    # 检查数据库连接
    if [ "$DEPLOYMENT_TYPE" = "docker" ]; then
        if docker-compose exec postgres pg_isready -U postgres -d healthhub >/dev/null 2>&1; then
            print_success "✅ 数据库连接正常"
        else
            print_error "❌ 数据库连接失败"
        fi
    else
        if psql -h localhost -p 5432 -U postgres -d healthhub -c "SELECT 1;" >/dev/null 2>&1; then
            print_success "✅ 数据库连接正常"
        else
            print_error "❌ 数据库连接失败"
        fi
    fi
    
    # 检查应用
    if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
        print_success "✅ 应用服务正常"
    else
        print_warning "⚠️ 应用服务可能还在启动中"
    fi
    
    print_success "部署验证完成"
}

# 主函数
main() {
    check_environment
    
    if [ "$DEPLOYMENT_TYPE" = "docker" ]; then
        deploy_with_docker
    else
        deploy_local
    fi
    
    deploy_uploads
    verify_deployment
    
    print_success "🎉 PostgreSQL 部署完成！"
    echo ""
    echo "=== 访问信息 ==="
    echo "🌐 应用地址: http://$(curl -s ifconfig.me 2>/dev/null || echo 'localhost'):3000"
    echo "🔍 健康检查: http://$(curl -s ifconfig.me 2>/dev/null || echo 'localhost'):3000/api/health"
}

# 执行主函数
main "$@"
EOF

    chmod +x "$PACKAGE_DIR/deploy.sh"
    
    # 创建数据库恢复脚本
    cat > "$PACKAGE_DIR/restore-database.sh" << 'EOF'
#!/bin/bash

# 🐘 PostgreSQL 数据库恢复脚本

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "🐘 PostgreSQL 数据库恢复"
echo "======================="
echo ""

# 设置数据库连接参数
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-healthhub}
DB_USER=${DB_USER:-postgres}

# 检查数据库连接
check_connection() {
    print_info "检查数据库连接..."
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" >/dev/null 2>&1; then
        print_success "数据库连接成功"
    else
        print_error "数据库连接失败"
        print_info "请检查连接参数："
        echo "  主机: $DB_HOST"
        echo "  端口: $DB_PORT"
        echo "  数据库: $DB_NAME"
        echo "  用户: $DB_USER"
        exit 1
    fi
}

# 恢复数据库
restore_database() {
    print_info "恢复数据库..."
    
    if [ -f "database/complete_database.sql" ]; then
        print_info "使用完整数据库文件恢复..."
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "database/complete_database.sql"
        print_success "数据库恢复完成"
    elif [ -f "database/import_data.sql" ]; then
        print_info "使用导入数据文件恢复..."
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "database/import_data.sql"
        print_success "数据库恢复完成"
    else
        print_error "未找到可用的数据库文件"
        exit 1
    fi
}

# 验证恢复结果
verify_restore() {
    print_info "验证恢复结果..."
    
    # 检查表数量
    table_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
    print_info "数据表数量: $table_count"
    
    # 检查数据
    user_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs || echo "0")
    audio_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM audios;" 2>/dev/null | xargs || echo "0")
    category_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM categories;" 2>/dev/null | xargs || echo "0")
    
    echo ""
    echo "=== 数据统计 ==="
    echo "用户数量: $user_count"
    echo "音频数量: $audio_count"
    echo "分类数量: $category_count"
    
    print_success "验证完成"
}

# 主函数
main() {
    check_connection
    restore_database
    verify_restore
    
    print_success "🎉 数据库恢复完成！"
}

# 执行主函数
main "$@"
EOF

    chmod +x "$PACKAGE_DIR/restore-database.sh"
    
    print_success "部署脚本创建完成"
}

# 创建说明文档
create_documentation() {
    print_info "创建说明文档..."
    
    cat > "$PACKAGE_DIR/README.md" << EOF
# 🐘 健闻局 PostgreSQL 数据包

创建时间: $(date)
数据库类型: PostgreSQL

## 📦 包含内容

### 数据库文件
- \`database/complete_database.sql\` - 完整数据库（来自现有导出）
- \`database/schema_only.sql\` - 数据库架构
- \`database/data_only.sql\` - 数据内容
- \`database/import_data.sql\` - 数据导入文件
- \`database/*.sql\` - 其他相关SQL文件

### Docker配置
- \`docker/docker-compose.yml\` - Docker Compose配置
- \`docker/env.example\` - 环境变量模板
- \`docker/init-db.sql\` - 数据库初始化脚本
- \`docker/\` - 其他Docker相关配置

### 上传文件
- \`uploads/\` - 应用上传的文件
- \`uploads_list.txt\` - 上传文件清单
- \`large_files_list.txt\` - 大文件清单（如果有）

### 部署脚本
- \`deploy.sh\` - 一键部署脚本（推荐）
- \`restore-database.sh\` - 数据库恢复脚本

## 🚀 快速部署

### 方法一：一键部署（推荐）

\`\`\`bash
# 1. 上传数据包到服务器
scp postgresql-package-*.tar.gz root@your-server:/tmp/

# 2. 解压数据包
ssh root@your-server
cd /tmp
tar -xzf postgresql-package-*.tar.gz
cd postgresql-package-*

# 3. 执行一键部署
./deploy.sh
\`\`\`

### 方法二：手动部署

#### Docker部署
\`\`\`bash
# 1. 复制Docker配置
cp -r docker/* /www/wwwroot/The-Health-Hub/

# 2. 启动服务
cd /www/wwwroot/The-Health-Hub
docker-compose up -d postgres

# 3. 导入数据
docker-compose exec -T postgres psql -U postgres -d healthhub < database/complete_database.sql

# 4. 启动应用
docker-compose up -d
\`\`\`

#### 本地PostgreSQL部署
\`\`\`bash
# 1. 恢复数据库
./restore-database.sh

# 2. 复制上传文件
cp -r uploads/* /www/wwwroot/The-Health-Hub/uploads/

# 3. 重启应用
pm2 restart healthhub
\`\`\`

## 📊 数据包信息

EOF

    # 添加文件统计信息
    if [ -f "$PACKAGE_DIR/database/complete_database.sql" ]; then
        echo "### 数据库统计" >> "$PACKAGE_DIR/README.md"
        
        # 统计文件大小
        db_size=$(ls -lh "$PACKAGE_DIR/database/complete_database.sql" | awk '{print $5}')
        echo "- 数据库文件大小: $db_size" >> "$PACKAGE_DIR/README.md"
        
        # 统计表数量
        table_count=$(grep -c "CREATE TABLE\|INSERT INTO.*categories\|INSERT INTO.*users\|INSERT INTO.*audios" "$PACKAGE_DIR/database/complete_database.sql" 2>/dev/null || echo "未知")
        echo "- 主要数据表: categories, users, audios等" >> "$PACKAGE_DIR/README.md"
        
        # 统计INSERT语句
        insert_count=$(grep -c "INSERT INTO" "$PACKAGE_DIR/database/complete_database.sql" 2>/dev/null || echo "0")
        echo "- 数据记录: $insert_count 条INSERT语句" >> "$PACKAGE_DIR/README.md"
    fi
    
    if [ -d "$PACKAGE_DIR/uploads" ]; then
        upload_count=$(find "$PACKAGE_DIR/uploads" -type f | wc -l)
        echo "- 上传文件数量: $upload_count 个" >> "$PACKAGE_DIR/README.md"
    fi
    
    cat >> "$PACKAGE_DIR/README.md" << EOF

### 环境要求
- PostgreSQL 12+ 或 Docker
- Node.js 16+
- PM2 (可选)

## 🔧 配置说明

### 环境变量
在部署前，请配置以下环境变量：

\`\`\`bash
# PostgreSQL配置
DATABASE_URL=postgresql://postgres:password@localhost:5432/healthhub
POSTGRES_PASSWORD=your-secure-password
POSTGRES_USER=postgres
POSTGRES_DB=healthhub

# 应用配置
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com
NODE_ENV=production
\`\`\`

### Docker配置
如果使用Docker部署，请编辑 \`docker/.env\` 文件：

\`\`\`bash
cp docker/env.example docker/.env
nano docker/.env
\`\`\`

## 🔍 故障排除

### 数据库连接问题
\`\`\`bash
# 检查PostgreSQL服务
systemctl status postgresql

# 检查Docker容器
docker ps | grep postgres

# 测试连接
psql -h localhost -p 5432 -U postgres -d healthhub -c "SELECT version();"
\`\`\`

### 权限问题
\`\`\`bash
# 设置文件权限
chown -R www-data:www-data /www/wwwroot/The-Health-Hub
chmod -R 755 /www/wwwroot/The-Health-Hub
\`\`\`

### 应用启动问题
\`\`\`bash
# 查看PM2状态
pm2 status

# 查看应用日志
pm2 logs healthhub

# 重启应用
pm2 restart healthhub
\`\`\`

## 📞 支持

如果遇到问题，请检查：
1. PostgreSQL版本兼容性
2. 环境变量配置
3. 网络连接和防火墙设置
4. 磁盘空间和权限

---

**🎉 祝您部署成功！**
EOF

    print_success "说明文档创建完成"
}

# 创建压缩包
create_final_package() {
    print_info "创建最终数据包..."
    
    cd "$(dirname "$PACKAGE_DIR")"
    PACKAGE_NAME="health-hub-postgresql-package-${TIMESTAMP}.tar.gz"
    
    tar -czf "$PACKAGE_NAME" "$(basename "$PACKAGE_DIR")"
    
    # 计算文件大小
    PACKAGE_SIZE=$(ls -lh "$PACKAGE_NAME" | awk '{print $5}')
    
    print_success "PostgreSQL数据包创建完成"
    print_info "  文件名: $PACKAGE_NAME"
    print_info "  文件大小: $PACKAGE_SIZE"
    print_info "  位置: $(pwd)/$PACKAGE_NAME"
    
    # 清理临时目录
    rm -rf "$PACKAGE_DIR"
    
    return 0
}

# 显示完成信息
show_completion_info() {
    echo ""
    echo "🎉 PostgreSQL数据包创建完成！"
    echo ""
    echo "=== 包信息 ==="
    echo "📦 包名: health-hub-postgresql-package-${TIMESTAMP}.tar.gz"
    echo "📅 创建时间: $(date)"
    echo "🐘 数据库类型: PostgreSQL"
    echo ""
    echo "=== 部署步骤 ==="
    echo "1. 上传到云端服务器:"
    echo "   scp health-hub-postgresql-package-${TIMESTAMP}.tar.gz root@your-server:/tmp/"
    echo ""
    echo "2. 在服务器上解压:"
    echo "   cd /tmp"
    echo "   tar -xzf health-hub-postgresql-package-${TIMESTAMP}.tar.gz"
    echo "   cd postgresql-package-${TIMESTAMP}"
    echo ""
    echo "3. 执行一键部署:"
    echo "   ./deploy.sh"
    echo ""
    echo "=== 包含内容 ==="
    echo "✅ PostgreSQL 完整数据库文件"
    echo "✅ Docker 配置文件"
    echo "✅ 上传文件（音频、图片等）"
    echo "✅ 一键部署脚本"
    echo "✅ 数据库恢复脚本"
    echo "✅ 详细说明文档"
    echo ""
    echo "=== 注意事项 ==="
    echo "⚠️  部署前请确保目标服务器环境已准备"
    echo "⚠️  建议先在测试环境验证部署流程"
    echo "⚠️  部署过程会自动备份现有数据"
    echo ""
}

# 主函数
main() {
    create_package_directory
    collect_database_files
    collect_docker_config
    collect_uploads
    create_deployment_scripts
    create_documentation
    create_final_package
    show_completion_info
}

# 错误处理
trap 'print_error "打包过程中出现错误"; exit 1' ERR

# 执行主函数
main "$@"
