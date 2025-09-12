#!/bin/bash

# 🗄️ 健闻局 - 完整数据库导出脚本
# 用于导出本地开发环境的完整数据库，便于云端部署导入

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
EXPORT_DIR="${ROOT_DIR}/database-export-${TIMESTAMP}"

echo "🗄️ 健闻局数据库完整导出"
echo "=============================="
echo ""

# 创建导出目录
create_export_directory() {
    print_info "创建导出目录..."
    mkdir -p "$EXPORT_DIR"
    print_success "导出目录创建完成: $EXPORT_DIR"
}

# 检测数据库类型和状态
detect_database() {
    print_info "检测数据库环境..."
    
    # 检查 PostgreSQL 容器
    if docker ps --format '{{.Names}}' | grep -q 'health-hub-postgres'; then
        DB_TYPE="postgres_docker"
        POSTGRES_CONTAINER="health-hub-postgres"
        print_success "检测到 PostgreSQL Docker 容器"
        return
    fi
    
    # 检查本地 PostgreSQL
    if command -v pg_dump &> /dev/null; then
        if [ -f "${ROOT_DIR}/deploy/docker/.env" ]; then
            source "${ROOT_DIR}/deploy/docker/.env"
            if pg_isready -h "${POSTGRES_HOST:-localhost}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER}" >/dev/null 2>&1; then
                DB_TYPE="postgres_local"
                print_success "检测到本地 PostgreSQL 数据库"
                return
            fi
        fi
    fi
    
    # 检查 SQLite 文件
    if [ -f "${ROOT_DIR}/data/local.db" ] && [ -s "${ROOT_DIR}/data/local.db" ]; then
        DB_TYPE="sqlite"
        print_success "检测到 SQLite 数据库文件"
        return
    fi
    
    # 检查现有的 SQL 导出文件
    if [ -f "${ROOT_DIR}/database/current-data-export.sql" ]; then
        DB_TYPE="sql_file"
        print_success "检测到现有 PostgreSQL 导出文件"
        return
    fi
    
    if [ -f "${ROOT_DIR}/database/data-import.sql" ]; then
        DB_TYPE="sql_file"
        SQL_SOURCE="${ROOT_DIR}/database/data-import.sql"
        print_success "检测到现有数据导入文件"
        return
    fi
    
    print_error "未检测到任何可用的数据库"
    print_info "请确保以下之一可用："
    echo "  - PostgreSQL Docker 容器正在运行"
    echo "  - 本地 PostgreSQL 数据库可访问"
    echo "  - SQLite 数据库文件存在且非空"
    echo "  - 现有的 SQL 导出文件"
    exit 1
}

# 导出 PostgreSQL Docker 容器数据
export_postgres_docker() {
    print_info "从 PostgreSQL Docker 容器导出数据..."
    
    # 读取环境变量
    if [ -f "${ROOT_DIR}/deploy/docker/.env" ]; then
        source "${ROOT_DIR}/deploy/docker/.env"
    else
        print_error "未找到 Docker 环境配置文件"
        exit 1
    fi
    
    # 导出架构
    print_info "导出数据库架构..."
    docker exec "$POSTGRES_CONTAINER" pg_dump \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        --schema-only \
        --no-owner \
        --no-privileges > "$EXPORT_DIR/schema.sql"
    
    # 导出数据
    print_info "导出数据库数据..."
    docker exec "$POSTGRES_CONTAINER" pg_dump \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        --data-only \
        --no-owner \
        --inserts \
        --column-inserts > "$EXPORT_DIR/data.sql"
    
    # 导出完整数据库
    print_info "导出完整数据库..."
    docker exec "$POSTGRES_CONTAINER" pg_dump \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        --no-owner \
        --no-privileges > "$EXPORT_DIR/complete.sql"
    
    print_success "PostgreSQL 数据导出完成"
}

# 导出本地 PostgreSQL 数据
export_postgres_local() {
    print_info "从本地 PostgreSQL 导出数据..."
    
    # 读取环境变量
    if [ -f "${ROOT_DIR}/deploy/docker/.env" ]; then
        source "${ROOT_DIR}/deploy/docker/.env"
    else
        print_error "未找到环境配置文件"
        exit 1
    fi
    
    export PGPASSWORD="$POSTGRES_PASSWORD"
    
    # 导出架构
    print_info "导出数据库架构..."
    pg_dump -h "${POSTGRES_HOST:-localhost}" \
        -p "${POSTGRES_PORT:-5432}" \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        --schema-only \
        --no-owner \
        --no-privileges > "$EXPORT_DIR/schema.sql"
    
    # 导出数据
    print_info "导出数据库数据..."
    pg_dump -h "${POSTGRES_HOST:-localhost}" \
        -p "${POSTGRES_PORT:-5432}" \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        --data-only \
        --no-owner \
        --inserts \
        --column-inserts > "$EXPORT_DIR/data.sql"
    
    # 导出完整数据库
    print_info "导出完整数据库..."
    pg_dump -h "${POSTGRES_HOST:-localhost}" \
        -p "${POSTGRES_PORT:-5432}" \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        --no-owner \
        --no-privileges > "$EXPORT_DIR/complete.sql"
    
    unset PGPASSWORD
    print_success "PostgreSQL 数据导出完成"
}

# 导出 SQLite 数据
export_sqlite() {
    print_info "从 SQLite 导出数据..."
    
    SQLITE_FILE="${ROOT_DIR}/data/local.db"
    
    # 导出为 SQL
    print_info "导出 SQLite 数据为 SQL 格式..."
    sqlite3 "$SQLITE_FILE" ".dump" > "$EXPORT_DIR/sqlite_dump.sql"
    
    # 复制原始数据库文件
    print_info "复制 SQLite 数据库文件..."
    cp "$SQLITE_FILE" "$EXPORT_DIR/local.db"
    
    print_success "SQLite 数据导出完成"
}

# 复制现有 SQL 文件
export_sql_file() {
    print_info "复制现有 SQL 文件..."
    
    if [ -f "${ROOT_DIR}/database/current-data-export.sql" ]; then
        cp "${ROOT_DIR}/database/current-data-export.sql" "$EXPORT_DIR/postgres_export.sql"
        print_success "PostgreSQL 导出文件复制完成"
    fi
    
    if [ -f "${ROOT_DIR}/database/data-import.sql" ]; then
        cp "${ROOT_DIR}/database/data-import.sql" "$EXPORT_DIR/postgres_import.sql"
        print_success "PostgreSQL 导入文件复制完成"
    fi
}

# 导出 JSON 数据文件
export_json_data() {
    print_info "导出 JSON 数据文件..."
    
    JSON_DIR="$EXPORT_DIR/json_data"
    mkdir -p "$JSON_DIR"
    
    if [ -d "${ROOT_DIR}/data" ]; then
        # 复制所有 JSON 文件
        for json_file in "${ROOT_DIR}/data"/*.json; do
            if [ -f "$json_file" ]; then
                cp "$json_file" "$JSON_DIR/"
                print_info "复制: $(basename "$json_file")"
            fi
        done
        
        print_success "JSON 数据文件导出完成"
    else
        print_warning "未找到 JSON 数据目录"
    fi
}

# 导出上传文件
export_uploads() {
    print_info "导出上传文件..."
    
    if [ -d "${ROOT_DIR}/uploads" ]; then
        print_info "复制上传文件目录..."
        cp -r "${ROOT_DIR}/uploads" "$EXPORT_DIR/"
        
        # 计算文件统计
        audio_count=$(find "$EXPORT_DIR/uploads" -name "*.wav" -o -name "*.mp3" -o -name "*.m4a" | wc -l)
        image_count=$(find "$EXPORT_DIR/uploads" -name "*.jpg" -o -name "*.png" -o -name "*.gif" | wc -l)
        
        print_success "上传文件导出完成"
        print_info "  音频文件: $audio_count 个"
        print_info "  图片文件: $image_count 个"
    else
        print_warning "未找到上传文件目录"
    fi
}

# 创建导入脚本
create_import_scripts() {
    print_info "创建导入脚本..."
    
    # 创建一键导入脚本
    cat > "$EXPORT_DIR/import.sh" << 'EOF'
#!/bin/bash

# 🗄️ 健闻局数据库一键导入脚本

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

echo "🗄️ 健闻局数据库导入"
echo "===================="
echo ""

# 检查目标环境
TARGET_DIR="/www/wwwroot/The-Health-Hub"
if [ ! -d "$TARGET_DIR" ]; then
    print_error "未找到目标目录: $TARGET_DIR"
    exit 1
fi

cd "$TARGET_DIR"

# 备份现有数据库
print_info "创建现有数据库备份..."
BACKUP_DIR="backups/import_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

if [ -f "data/local.db" ]; then
    cp "data/local.db" "$BACKUP_DIR/"
fi

if [ -d "uploads" ]; then
    cp -r "uploads" "$BACKUP_DIR/"
fi

print_success "备份完成: $BACKUP_DIR"

# 停止应用
print_info "停止应用服务..."
pm2 stop healthhub || true

# 导入数据库
if [ -f "complete.sql" ]; then
    print_info "导入 PostgreSQL 完整数据库..."
    # 这里需要根据实际的 PostgreSQL 配置进行导入
    print_warning "PostgreSQL 导入需要手动配置"
elif [ -f "sqlite_dump.sql" ]; then
    print_info "导入 SQLite 数据..."
    rm -f "data/local.db"
    sqlite3 "data/local.db" < "sqlite_dump.sql"
elif [ -f "local.db" ]; then
    print_info "复制 SQLite 数据库文件..."
    cp "local.db" "data/local.db"
fi

# 导入 JSON 数据
if [ -d "json_data" ]; then
    print_info "导入 JSON 数据文件..."
    cp json_data/*.json "data/" 2>/dev/null || true
fi

# 导入上传文件
if [ -d "uploads" ]; then
    print_info "导入上传文件..."
    rm -rf "uploads.old" 2>/dev/null || true
    if [ -d "$TARGET_DIR/uploads" ]; then
        mv "$TARGET_DIR/uploads" "uploads.old"
    fi
    cp -r "uploads" "$TARGET_DIR/"
fi

# 设置权限
print_info "设置文件权限..."
chown -R www-data:www-data "data/"
chown -R www-data:www-data "uploads/" 2>/dev/null || true
chmod 644 "data/local.db" 2>/dev/null || true

# 启动应用
print_info "启动应用服务..."
pm2 start healthhub

# 等待应用启动
sleep 5

# 验证导入
print_info "验证导入结果..."
if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
    print_success "✅ 应用启动成功"
else
    print_warning "⚠️ 应用可能还在启动中"
fi

print_success "🎉 数据库导入完成！"
echo ""
echo "如果遇到问题，可以从备份恢复："
echo "  cp $BACKUP_DIR/local.db data/"
echo "  pm2 restart healthhub"

EOF

    chmod +x "$EXPORT_DIR/import.sh"
    
    # 创建 README
    cat > "$EXPORT_DIR/README.md" << EOF
# 健闻局数据库导出包

导出时间: $(date)
导出类型: $DB_TYPE

## 📦 包含内容

EOF
    
    if [ "$DB_TYPE" = "postgres_docker" ] || [ "$DB_TYPE" = "postgres_local" ]; then
        echo "- \`schema.sql\`: 数据库架构文件" >> "$EXPORT_DIR/README.md"
        echo "- \`data.sql\`: 数据库数据文件" >> "$EXPORT_DIR/README.md"
        echo "- \`complete.sql\`: 完整数据库文件" >> "$EXPORT_DIR/README.md"
    fi
    
    if [ "$DB_TYPE" = "sqlite" ]; then
        echo "- \`sqlite_dump.sql\`: SQLite 导出的 SQL 文件" >> "$EXPORT_DIR/README.md"
        echo "- \`local.db\`: SQLite 数据库文件" >> "$EXPORT_DIR/README.md"
    fi
    
    cat >> "$EXPORT_DIR/README.md" << EOF
- \`json_data/\`: JSON 格式的数据文件
- \`uploads/\`: 上传的音频和图片文件
- \`import.sh\`: 一键导入脚本
- \`README.md\`: 本说明文件

## 🚀 使用方法

### 方法一：使用一键导入脚本（推荐）

1. 将整个导出包上传到服务器
2. 解压到临时目录
3. 执行导入脚本：

\`\`\`bash
cd database-export-${TIMESTAMP}
chmod +x import.sh
./import.sh
\`\`\`

### 方法二：手动导入

1. 备份现有数据：
\`\`\`bash
cd /www/wwwroot/The-Health-Hub
cp -r data backups/manual_backup_\$(date +%Y%m%d_%H%M%S)
\`\`\`

2. 停止应用：
\`\`\`bash
pm2 stop healthhub
\`\`\`

3. 导入数据库：
EOF
    
    if [ "$DB_TYPE" = "sqlite" ]; then
        echo "\`\`\`bash" >> "$EXPORT_DIR/README.md"
        echo "sqlite3 data/local.db < sqlite_dump.sql" >> "$EXPORT_DIR/README.md"
        echo "# 或者直接复制数据库文件" >> "$EXPORT_DIR/README.md"
        echo "cp local.db data/local.db" >> "$EXPORT_DIR/README.md"
        echo "\`\`\`" >> "$EXPORT_DIR/README.md"
    else
        echo "\`\`\`bash" >> "$EXPORT_DIR/README.md"
        echo "# PostgreSQL 导入（需要配置数据库连接）" >> "$EXPORT_DIR/README.md"
        echo "psql -h localhost -U postgres -d health_hub < complete.sql" >> "$EXPORT_DIR/README.md"
        echo "\`\`\`" >> "$EXPORT_DIR/README.md"
    fi
    
    cat >> "$EXPORT_DIR/README.md" << EOF

4. 复制上传文件：
\`\`\`bash
cp -r uploads/* /www/wwwroot/The-Health-Hub/uploads/
\`\`\`

5. 设置权限：
\`\`\`bash
chown -R www-data:www-data data/
chown -R www-data:www-data uploads/
\`\`\`

6. 启动应用：
\`\`\`bash
pm2 start healthhub
\`\`\`

## ⚠️ 注意事项

- 导入前请务必备份现有数据
- 确保目标服务器有足够的磁盘空间
- 上传文件可能较大，请确保网络稳定
- 导入后请验证应用功能是否正常

## 🆘 故障恢复

如果导入失败，可以从备份恢复：

\`\`\`bash
cd /www/wwwroot/The-Health-Hub
pm2 stop healthhub
cp backups/latest_backup/* data/
pm2 start healthhub
\`\`\`
EOF

    print_success "导入脚本创建完成"
}

# 创建压缩包
create_package() {
    print_info "创建压缩包..."
    
    cd "$(dirname "$EXPORT_DIR")"
    PACKAGE_NAME="health-hub-database-export-${TIMESTAMP}.tar.gz"
    
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

# 显示导出信息
show_export_info() {
    echo ""
    echo "🎉 数据库导出完成！"
    echo ""
    echo "=== 导出信息 ==="
    echo "📦 导出类型: $DB_TYPE"
    echo "📅 导出时间: $(date)"
    echo "📁 压缩包: health-hub-database-export-${TIMESTAMP}.tar.gz"
    echo ""
    echo "=== 下一步操作 ==="
    echo "1. 将压缩包上传到云端服务器"
    echo "2. 解压: tar -xzf health-hub-database-export-${TIMESTAMP}.tar.gz"
    echo "3. 执行导入: cd database-export-${TIMESTAMP} && ./import.sh"
    echo ""
    echo "=== 上传命令示例 ==="
    echo "scp health-hub-database-export-${TIMESTAMP}.tar.gz root@your-server:/tmp/"
    echo ""
}

# 主函数
main() {
    create_export_directory
    detect_database
    
    # 根据数据库类型执行相应的导出
    case "$DB_TYPE" in
        "postgres_docker")
            export_postgres_docker
            ;;
        "postgres_local")
            export_postgres_local
            ;;
        "sqlite")
            export_sqlite
            ;;
        "sql_file")
            export_sql_file
            ;;
    esac
    
    # 导出其他数据
    export_json_data
    export_uploads
    create_import_scripts
    create_package
    show_export_info
}

# 错误处理
trap 'print_error "导出过程中出现错误"; exit 1' ERR

# 执行主函数
main "$@"
