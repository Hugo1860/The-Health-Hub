#!/bin/bash

# 🐘 健闻局 PostgreSQL 完整数据库导出脚本
# 用于导出完整的PostgreSQL数据库，便于云端部署导入

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
EXPORT_DIR="${ROOT_DIR}/postgresql-export-${TIMESTAMP}"

echo "🐘 健闻局 PostgreSQL 数据库完整导出"
echo "===================================="
echo ""

# 检测PostgreSQL环境
detect_postgresql() {
    print_info "检测PostgreSQL环境..."
    
    # 检查本地PostgreSQL
    if command -v pg_dump &> /dev/null; then
        if command -v psql &> /dev/null; then
            print_success "检测到本地PostgreSQL工具"
            return 0
        fi
    fi
    
    # 检查Docker PostgreSQL容器
    if command -v docker &> /dev/null; then
        if docker ps --format '{{.Names}}' | grep -q 'health-hub-postgres'; then
            POSTGRES_CONTAINER="health-hub-postgres"
            print_success "检测到PostgreSQL Docker容器: $POSTGRES_CONTAINER"
            return 0
        fi
        
        if docker ps --format '{{.Names}}' | grep -q 'postgres'; then
            POSTGRES_CONTAINER=$(docker ps --format '{{.Names}}' | grep postgres | head -1)
            print_success "检测到PostgreSQL Docker容器: $POSTGRES_CONTAINER"
            return 0
        fi
    fi
    
    print_error "未检测到可用的PostgreSQL环境"
    print_info "请确保以下之一可用："
    echo "  - 本地安装的PostgreSQL (pg_dump, psql)"
    echo "  - 运行中的PostgreSQL Docker容器"
    exit 1
}

# 创建导出目录
create_export_directory() {
    print_info "创建导出目录..."
    mkdir -p "$EXPORT_DIR"
    mkdir -p "$EXPORT_DIR/database"
    mkdir -p "$EXPORT_DIR/docker"
    mkdir -p "$EXPORT_DIR/scripts"
    mkdir -p "$EXPORT_DIR/uploads"
    print_success "导出目录创建完成: $EXPORT_DIR"
}

# 读取PostgreSQL配置
read_postgres_config() {
    print_info "读取PostgreSQL配置..."
    
    # 从Docker环境文件读取配置
    if [ -f "${ROOT_DIR}/deploy/docker/env.example" ]; then
        print_info "使用Docker环境配置模板"
        POSTGRES_DB="healthhub"
        POSTGRES_USER="postgres"
        POSTGRES_PASSWORD="your-secure-postgres-password"
    fi
    
    # 尝试从.env文件读取实际配置
    if [ -f "${ROOT_DIR}/deploy/docker/.env" ]; then
        print_info "读取实际环境配置"
        source "${ROOT_DIR}/deploy/docker/.env"
    elif [ -f "${ROOT_DIR}/.env" ]; then
        print_info "读取根目录环境配置"
        source "${ROOT_DIR}/.env"
    fi
    
    # 设置默认值
    POSTGRES_DB=${POSTGRES_DB:-"healthhub"}
    POSTGRES_USER=${POSTGRES_USER:-"postgres"}
    POSTGRES_HOST=${POSTGRES_HOST:-"localhost"}
    POSTGRES_PORT=${POSTGRES_PORT:-"5432"}
    
    print_success "PostgreSQL配置读取完成"
    echo "  数据库: $POSTGRES_DB"
    echo "  用户: $POSTGRES_USER"
    echo "  主机: $POSTGRES_HOST"
    echo "  端口: $POSTGRES_PORT"
}

# 导出PostgreSQL数据库
export_postgresql_database() {
    print_info "导出PostgreSQL数据库..."
    
    if [ -n "$POSTGRES_CONTAINER" ]; then
        # 使用Docker容器导出
        print_info "使用Docker容器导出数据库..."
        
        # 导出完整数据库
        print_info "导出完整数据库..."
        docker exec "$POSTGRES_CONTAINER" pg_dump \
            -U "$POSTGRES_USER" \
            -d "$POSTGRES_DB" \
            --no-owner \
            --no-privileges \
            --verbose > "$EXPORT_DIR/database/complete_database.sql"
        
        # 导出仅数据
        print_info "导出数据内容..."
        docker exec "$POSTGRES_CONTAINER" pg_dump \
            -U "$POSTGRES_USER" \
            -d "$POSTGRES_DB" \
            --data-only \
            --no-owner \
            --inserts \
            --column-inserts \
            --verbose > "$EXPORT_DIR/database/data_only.sql"
        
        # 导出仅架构
        print_info "导出数据库架构..."
        docker exec "$POSTGRES_CONTAINER" pg_dump \
            -U "$POSTGRES_USER" \
            -d "$POSTGRES_DB" \
            --schema-only \
            --no-owner \
            --no-privileges \
            --verbose > "$EXPORT_DIR/database/schema_only.sql"
        
        # 导出全局对象（角色、表空间等）
        print_info "导出全局对象..."
        docker exec "$POSTGRES_CONTAINER" pg_dumpall \
            -U "$POSTGRES_USER" \
            --globals-only \
            --no-role-passwords \
            --verbose > "$EXPORT_DIR/database/globals.sql" 2>/dev/null || true
            
    else
        # 使用本地PostgreSQL导出
        print_info "使用本地PostgreSQL导出数据库..."
        
        if [ -n "$POSTGRES_PASSWORD" ]; then
            export PGPASSWORD="$POSTGRES_PASSWORD"
        fi
        
        # 导出完整数据库
        print_info "导出完整数据库..."
        pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" \
            -U "$POSTGRES_USER" \
            -d "$POSTGRES_DB" \
            --no-owner \
            --no-privileges \
            --verbose > "$EXPORT_DIR/database/complete_database.sql"
        
        # 导出仅数据
        print_info "导出数据内容..."
        pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" \
            -U "$POSTGRES_USER" \
            -d "$POSTGRES_DB" \
            --data-only \
            --no-owner \
            --inserts \
            --column-inserts \
            --verbose > "$EXPORT_DIR/database/data_only.sql"
        
        # 导出仅架构
        print_info "导出数据库架构..."
        pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" \
            -U "$POSTGRES_USER" \
            -d "$POSTGRES_DB" \
            --schema-only \
            --no-owner \
            --no-privileges \
            --verbose > "$EXPORT_DIR/database/schema_only.sql"
        
        # 导出全局对象
        print_info "导出全局对象..."
        pg_dumpall -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" \
            -U "$POSTGRES_USER" \
            --globals-only \
            --no-role-passwords \
            --verbose > "$EXPORT_DIR/database/globals.sql" 2>/dev/null || true
        
        unset PGPASSWORD
    fi
    
    print_success "PostgreSQL数据库导出完成"
}

# 复制现有数据文件
copy_existing_data() {
    print_info "复制现有数据文件..."
    
    # 复制现有的PostgreSQL导出文件
    if [ -f "${ROOT_DIR}/database/current-data-export.sql" ]; then
        cp "${ROOT_DIR}/database/current-data-export.sql" "$EXPORT_DIR/database/current_export.sql"
        print_success "现有数据导出文件已复制"
    fi
    
    if [ -f "${ROOT_DIR}/database/data-import.sql" ]; then
        cp "${ROOT_DIR}/database/data-import.sql" "$EXPORT_DIR/database/import_data.sql"
        print_success "数据导入文件已复制"
    fi
    
    if [ -f "${ROOT_DIR}/database/postgresql-schema.sql" ]; then
        cp "${ROOT_DIR}/database/postgresql-schema.sql" "$EXPORT_DIR/database/schema.sql"
        print_success "数据库架构文件已复制"
    fi
    
    # 复制所有数据库相关文件
    if [ -d "${ROOT_DIR}/database" ]; then
        cp -r "${ROOT_DIR}/database"/* "$EXPORT_DIR/database/" 2>/dev/null || true
        print_success "数据库目录文件已复制"
    fi
}

# 复制Docker配置
copy_docker_config() {
    print_info "复制Docker配置..."
    
    if [ -d "${ROOT_DIR}/deploy/docker" ]; then
        cp -r "${ROOT_DIR}/deploy/docker"/* "$EXPORT_DIR/docker/" 2>/dev/null || true
        print_success "Docker配置已复制"
    fi
    
    if [ -d "${ROOT_DIR}/postgresql-docker" ]; then
        cp -r "${ROOT_DIR}/postgresql-docker"/* "$EXPORT_DIR/docker/" 2>/dev/null || true
        print_success "PostgreSQL Docker配置已复制"
    fi
}

# 复制上传文件
copy_uploads() {
    print_info "复制上传文件..."
    
    if [ -d "${ROOT_DIR}/uploads" ]; then
        # 计算上传文件大小
        UPLOAD_SIZE=$(du -sh "${ROOT_DIR}/uploads" 2>/dev/null | cut -f1 || echo "0")
        print_info "上传文件总大小: $UPLOAD_SIZE"
        
        # 如果文件太大，询问是否包含
        if [[ "$UPLOAD_SIZE" =~ [0-9]+G ]] || [[ "$UPLOAD_SIZE" =~ [5-9][0-9][0-9]M ]]; then
            print_warning "上传文件较大 ($UPLOAD_SIZE)，将创建目录结构但不复制大文件"
            
            # 创建目录结构
            find "${ROOT_DIR}/uploads" -type d -exec mkdir -p "$EXPORT_DIR/uploads/{}" \; 2>/dev/null || true
            
            # 只复制小于10MB的文件
            find "${ROOT_DIR}/uploads" -type f -size -10M -exec cp "{}" "$EXPORT_DIR/uploads/{}" \; 2>/dev/null || true
            
            print_success "上传文件目录结构已创建，大文件需单独上传"
        else
            cp -r "${ROOT_DIR}/uploads"/* "$EXPORT_DIR/uploads/" 2>/dev/null || true
            print_success "上传文件已复制"
        fi
    else
        print_warning "未找到上传文件目录"
        mkdir -p "$EXPORT_DIR/uploads"
    fi
}

# 创建恢复脚本
create_restore_scripts() {
    print_info "创建恢复脚本..."
    
    # 创建PostgreSQL恢复脚本
    cat > "$EXPORT_DIR/restore-postgresql.sh" << 'EOF'
#!/bin/bash

# 🐘 PostgreSQL 数据库恢复脚本

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

echo "🐘 PostgreSQL 数据库恢复"
echo "======================="
echo ""

# 检查环境变量
check_env() {
    if [ -z "$POSTGRES_DB" ] || [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_PASSWORD" ]; then
        print_error "请设置环境变量："
        echo "export POSTGRES_DB=healthhub"
        echo "export POSTGRES_USER=postgres"
        echo "export POSTGRES_PASSWORD=your_password"
        echo "export POSTGRES_HOST=localhost"
        echo "export POSTGRES_PORT=5432"
        exit 1
    fi
}

# 测试数据库连接
test_connection() {
    print_info "测试数据库连接..."
    
    export PGPASSWORD="$POSTGRES_PASSWORD"
    
    if psql -h "${POSTGRES_HOST:-localhost}" -p "${POSTGRES_PORT:-5432}" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT version();" >/dev/null 2>&1; then
        print_success "数据库连接成功"
    else
        print_error "数据库连接失败"
        exit 1
    fi
}

# 恢复数据库
restore_database() {
    print_info "恢复数据库..."
    
    export PGPASSWORD="$POSTGRES_PASSWORD"
    
    # 选择恢复文件
    if [ -f "database/complete_database.sql" ]; then
        RESTORE_FILE="database/complete_database.sql"
        print_info "使用完整数据库文件恢复"
    elif [ -f "database/current_export.sql" ]; then
        RESTORE_FILE="database/current_export.sql"
        print_info "使用当前导出文件恢复"
    elif [ -f "database/data_only.sql" ]; then
        RESTORE_FILE="database/data_only.sql"
        print_info "使用数据文件恢复"
    else
        print_error "未找到可用的恢复文件"
        exit 1
    fi
    
    # 执行恢复
    print_info "执行数据恢复..."
    psql -h "${POSTGRES_HOST:-localhost}" -p "${POSTGRES_PORT:-5432}" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$RESTORE_FILE"
    
    print_success "数据库恢复完成"
}

# 验证恢复结果
verify_restore() {
    print_info "验证恢复结果..."
    
    export PGPASSWORD="$POSTGRES_PASSWORD"
    
    # 检查表数量
    table_count=$(psql -h "${POSTGRES_HOST:-localhost}" -p "${POSTGRES_PORT:-5432}" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
    
    if [ "$table_count" -gt 0 ]; then
        print_success "✅ 数据库表: $table_count 个"
    else
        print_warning "⚠️ 未找到数据库表"
    fi
    
    # 检查数据
    user_count=$(psql -h "${POSTGRES_HOST:-localhost}" -p "${POSTGRES_PORT:-5432}" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs || echo "0")
    audio_count=$(psql -h "${POSTGRES_HOST:-localhost}" -p "${POSTGRES_PORT:-5432}" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM audios;" 2>/dev/null | xargs || echo "0")
    category_count=$(psql -h "${POSTGRES_HOST:-localhost}" -p "${POSTGRES_PORT:-5432}" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM categories;" 2>/dev/null | xargs || echo "0")
    
    echo ""
    echo "=== 数据统计 ==="
    echo "用户数量: $user_count"
    echo "音频数量: $audio_count"
    echo "分类数量: $category_count"
    
    unset PGPASSWORD
    print_success "验证完成"
}

# 主函数
main() {
    check_env
    test_connection
    restore_database
    verify_restore
    
    print_success "🎉 PostgreSQL 数据库恢复完成！"
}

# 执行主函数
main "$@"
EOF

    chmod +x "$EXPORT_DIR/restore-postgresql.sh"
    
    # 创建Docker恢复脚本
    cat > "$EXPORT_DIR/restore-docker.sh" << 'EOF'
#!/bin/bash

# 🐳 Docker PostgreSQL 恢复脚本

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

echo "🐳 Docker PostgreSQL 恢复"
echo "========================="
echo ""

# 启动PostgreSQL容器
start_postgres() {
    print_info "启动PostgreSQL容器..."
    
    if [ -f "docker/.env" ]; then
        print_info "使用环境配置文件"
        cd docker
        docker-compose up -d postgres
        cd ..
    else
        print_info "使用默认配置启动容器"
        docker run -d \
            --name health-hub-postgres \
            -e POSTGRES_DB=healthhub \
            -e POSTGRES_USER=postgres \
            -e POSTGRES_PASSWORD=secure_password \
            -p 5432:5432 \
            -v postgres_data:/var/lib/postgresql/data \
            postgres:15
    fi
    
    # 等待数据库启动
    print_info "等待数据库启动..."
    sleep 10
    
    # 检查容器状态
    if docker ps | grep -q postgres; then
        print_success "PostgreSQL容器启动成功"
    else
        print_error "PostgreSQL容器启动失败"
        exit 1
    fi
}

# 恢复数据
restore_data() {
    print_info "恢复数据到容器..."
    
    CONTAINER_NAME=$(docker ps --format '{{.Names}}' | grep postgres | head -1)
    
    if [ -f "database/complete_database.sql" ]; then
        print_info "使用完整数据库文件恢复"
        docker exec -i "$CONTAINER_NAME" psql -U postgres -d healthhub < database/complete_database.sql
    elif [ -f "database/current_export.sql" ]; then
        print_info "使用当前导出文件恢复"
        docker exec -i "$CONTAINER_NAME" psql -U postgres -d healthhub < database/current_export.sql
    else
        print_error "未找到可用的恢复文件"
        exit 1
    fi
    
    print_success "数据恢复完成"
}

# 主函数
main() {
    start_postgres
    restore_data
    
    print_success "🎉 Docker PostgreSQL 恢复完成！"
    print_info "容器信息:"
    docker ps | grep postgres
}

# 执行主函数
main "$@"
EOF

    chmod +x "$EXPORT_DIR/restore-docker.sh"
    
    print_success "恢复脚本创建完成"
}

# 创建说明文档
create_documentation() {
    print_info "创建说明文档..."
    
    cat > "$EXPORT_DIR/README.md" << EOF
# 🐘 健闻局 PostgreSQL 完整数据库导出包

导出时间: $(date)
数据库类型: PostgreSQL

## 📦 包含内容

### 数据库文件
- \`database/complete_database.sql\` - 完整数据库导出（架构+数据）
- \`database/schema_only.sql\` - 仅数据库架构
- \`database/data_only.sql\` - 仅数据内容
- \`database/globals.sql\` - 全局对象（角色、权限等）
- \`database/current_export.sql\` - 当前导出备份
- \`database/import_data.sql\` - 数据导入文件

### 配置文件
- \`docker/\` - Docker配置文件
- \`docker/docker-compose.yml\` - Docker Compose配置
- \`docker/env.example\` - 环境变量模板
- \`docker/init-db.sql\` - 数据库初始化脚本

### 上传文件
- \`uploads/\` - 应用上传的文件（音频、图片等）

### 恢复脚本
- \`restore-postgresql.sh\` - PostgreSQL 本地恢复脚本
- \`restore-docker.sh\` - Docker 容器恢复脚本

## 🚀 使用方法

### 方法一：本地PostgreSQL恢复

1. **准备环境变量**:
\`\`\`bash
export POSTGRES_DB=healthhub
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=your_password
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
\`\`\`

2. **执行恢复**:
\`\`\`bash
./restore-postgresql.sh
\`\`\`

### 方法二：Docker容器恢复

1. **确保Docker运行**:
\`\`\`bash
docker --version
\`\`\`

2. **执行Docker恢复**:
\`\`\`bash
./restore-docker.sh
\`\`\`

### 方法三：手动恢复

1. **创建数据库**:
\`\`\`bash
createdb -U postgres healthhub
\`\`\`

2. **恢复数据**:
\`\`\`bash
psql -U postgres -d healthhub -f database/complete_database.sql
\`\`\`

## 📊 数据库信息

EOF

    # 添加数据库统计信息
    if [ -f "$EXPORT_DIR/database/complete_database.sql" ]; then
        echo "### 数据库统计" >> "$EXPORT_DIR/README.md"
        echo "" >> "$EXPORT_DIR/README.md"
        
        # 统计表数量
        table_count=$(grep -c "CREATE TABLE" "$EXPORT_DIR/database/complete_database.sql" 2>/dev/null || echo "未知")
        echo "- 数据表数量: $table_count" >> "$EXPORT_DIR/README.md"
        
        # 统计INSERT语句
        insert_count=$(grep -c "INSERT INTO" "$EXPORT_DIR/database/complete_database.sql" 2>/dev/null || echo "未知")
        echo "- 数据记录: $insert_count 条INSERT语句" >> "$EXPORT_DIR/README.md"
        
        # 文件大小
        file_size=$(ls -lh "$EXPORT_DIR/database/complete_database.sql" | awk '{print $5}')
        echo "- 数据库文件大小: $file_size" >> "$EXPORT_DIR/README.md"
    fi
    
    cat >> "$EXPORT_DIR/README.md" << EOF

## 🔧 故障排除

### 常见问题

**1. 连接失败**
\`\`\`bash
# 检查PostgreSQL服务状态
systemctl status postgresql
# 或检查Docker容器
docker ps | grep postgres
\`\`\`

**2. 权限错误**
\`\`\`bash
# 确保用户有足够权限
sudo -u postgres createuser --interactive
\`\`\`

**3. 数据库已存在**
\`\`\`bash
# 删除现有数据库（谨慎操作）
dropdb -U postgres healthhub
createdb -U postgres healthhub
\`\`\`

### 验证恢复结果

\`\`\`bash
# 连接数据库
psql -U postgres -d healthhub

# 检查表
\\dt

# 检查数据
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM audios;
SELECT COUNT(*) FROM categories;

# 退出
\\q
\`\`\`

## 📞 技术支持

如果遇到问题，请提供以下信息：
1. PostgreSQL版本: \`psql --version\`
2. 操作系统: \`uname -a\`
3. 错误信息的完整输出
4. 环境变量设置

---

**🎉 祝您恢复顺利！**
EOF

    print_success "说明文档创建完成"
}

# 创建压缩包
create_package() {
    print_info "创建压缩包..."
    
    cd "$(dirname "$EXPORT_DIR")"
    PACKAGE_NAME="health-hub-postgresql-export-${TIMESTAMP}.tar.gz"
    
    tar -czf "$PACKAGE_NAME" "$(basename "$EXPORT_DIR")"
    
    # 计算文件大小
    PACKAGE_SIZE=$(ls -lh "$PACKAGE_NAME" | awk '{print $5}')
    
    print_success "压缩包创建完成"
    print_info "  文件名: $PACKAGE_NAME"
    print_info "  文件大小: $PACKAGE_SIZE"
    print_info "  位置: $(pwd)/$PACKAGE_NAME"
    
    # 清理临时目录
    rm -rf "$EXPORT_DIR"
    
    return 0
}

# 显示完成信息
show_completion_info() {
    echo ""
    echo "🎉 PostgreSQL数据库导出完成！"
    echo ""
    echo "=== 导出信息 ==="
    echo "📦 导出类型: PostgreSQL"
    echo "📅 导出时间: $(date)"
    echo "📁 压缩包: health-hub-postgresql-export-${TIMESTAMP}.tar.gz"
    echo ""
    echo "=== 部署步骤 ==="
    echo "1. 上传到服务器:"
    echo "   scp health-hub-postgresql-export-${TIMESTAMP}.tar.gz root@your-server:/tmp/"
    echo ""
    echo "2. 在服务器上解压:"
    echo "   cd /tmp"
    echo "   tar -xzf health-hub-postgresql-export-${TIMESTAMP}.tar.gz"
    echo "   cd postgresql-export-${TIMESTAMP}"
    echo ""
    echo "3. 执行恢复:"
    echo "   ./restore-postgresql.sh      # 本地PostgreSQL"
    echo "   # 或"
    echo "   ./restore-docker.sh          # Docker容器"
    echo ""
    echo "=== 注意事项 ==="
    echo "⚠️  恢复前请确保PostgreSQL环境已准备就绪"
    echo "⚠️  建议先在测试环境中验证恢复流程"
    echo "⚠️  恢复过程会覆盖现有数据，请提前备份"
    echo ""
}

# 主函数
main() {
    detect_postgresql
    read_postgres_config
    create_export_directory
    export_postgresql_database
    copy_existing_data
    copy_docker_config
    copy_uploads
    create_restore_scripts
    create_documentation
    create_package
    show_completion_info
}

# 错误处理
trap 'print_error "导出过程中出现错误"; exit 1' ERR

# 执行主函数
main "$@"
