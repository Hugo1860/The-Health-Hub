#!/bin/bash

# 🚀 健闻局 - 云端部署数据库导入包创建脚本
# 基于现有数据创建适合云端部署的导入包

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
PACKAGE_DIR="${ROOT_DIR}/cloud-import-package-${TIMESTAMP}"

echo "🚀 健闻局云端部署导入包创建"
echo "=============================="
echo ""

# 创建包目录
create_package_directory() {
    print_info "创建导入包目录..."
    mkdir -p "$PACKAGE_DIR"
    mkdir -p "$PACKAGE_DIR/database"
    mkdir -p "$PACKAGE_DIR/uploads"
    mkdir -p "$PACKAGE_DIR/scripts"
    print_success "导入包目录创建完成: $PACKAGE_DIR"
}

# 准备数据库文件
prepare_database_files() {
    print_info "准备数据库文件..."
    
    # 复制现有的 PostgreSQL 数据文件
    if [ -f "${ROOT_DIR}/database/current-data-export.sql" ]; then
        cp "${ROOT_DIR}/database/current-data-export.sql" "$PACKAGE_DIR/database/postgres-data.sql"
        print_success "PostgreSQL 数据文件已复制"
    fi
    
    if [ -f "${ROOT_DIR}/database/data-import.sql" ]; then
        cp "${ROOT_DIR}/database/data-import.sql" "$PACKAGE_DIR/database/postgres-import.sql"
        print_success "PostgreSQL 导入文件已复制"
    fi
    
    # 复制架构文件
    if [ -f "${ROOT_DIR}/database/postgresql-schema.sql" ]; then
        cp "${ROOT_DIR}/database/postgresql-schema.sql" "$PACKAGE_DIR/database/schema.sql"
        print_success "数据库架构文件已复制"
    fi
    
    # 如果有 SQLite 数据，尝试转换
    if [ -f "${ROOT_DIR}/data/local.db" ] && [ -s "${ROOT_DIR}/data/local.db" ]; then
        print_info "发现 SQLite 数据库，导出为 SQL..."
        sqlite3 "${ROOT_DIR}/data/local.db" ".dump" > "$PACKAGE_DIR/database/sqlite-export.sql"
        print_success "SQLite 数据已导出"
    fi
}

# 准备上传文件
prepare_upload_files() {
    print_info "准备上传文件..."
    
    if [ -d "${ROOT_DIR}/uploads" ]; then
        # 计算上传文件大小
        UPLOAD_SIZE=$(du -sh "${ROOT_DIR}/uploads" 2>/dev/null | cut -f1 || echo "0")
        
        print_info "上传文件总大小: $UPLOAD_SIZE"
        
        # 如果文件太大，询问是否包含
        if [[ "$UPLOAD_SIZE" =~ [0-9]+G ]] || [[ "$UPLOAD_SIZE" =~ [5-9][0-9][0-9]M ]]; then
            print_warning "上传文件较大 ($UPLOAD_SIZE)，可能影响传输速度"
            print_info "建议单独上传大文件，这里只创建目录结构"
            
            # 创建目录结构但不复制大文件
            find "${ROOT_DIR}/uploads" -type d -exec mkdir -p "$PACKAGE_DIR/uploads/{}" \;
            
            # 只复制小于 10MB 的文件
            find "${ROOT_DIR}/uploads" -type f -size -10M -exec cp "{}" "$PACKAGE_DIR/uploads/{}" \; 2>/dev/null || true
            
            print_success "上传文件目录结构已创建，大文件需单独上传"
        else
            # 文件不大，全部复制
            cp -r "${ROOT_DIR}/uploads"/* "$PACKAGE_DIR/uploads/" 2>/dev/null || true
            print_success "上传文件已复制"
        fi
    else
        print_warning "未找到上传文件目录"
        mkdir -p "$PACKAGE_DIR/uploads"
    fi
}

# 创建云端导入脚本
create_cloud_import_script() {
    print_info "创建云端导入脚本..."
    
    cat > "$PACKAGE_DIR/cloud-import.sh" << 'EOF'
#!/bin/bash

# 🚀 健闻局 - 云端数据库导入脚本
# 适用于云端服务器的一键数据库导入

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

echo "🚀 健闻局云端数据库导入"
echo "======================"
echo ""

# 检查运行环境
check_environment() {
    print_info "检查运行环境..."
    
    # 检查是否在正确的服务器目录
    TARGET_DIR="/www/wwwroot/The-Health-Hub"
    if [ ! -d "$TARGET_DIR" ]; then
        print_error "未找到目标目录: $TARGET_DIR"
        print_info "请确保在正确的服务器上运行此脚本"
        exit 1
    fi
    
    # 检查 PM2
    if ! command -v pm2 &> /dev/null; then
        print_error "PM2 未安装，请先安装 PM2"
        exit 1
    fi
    
    # 检查当前目录是否包含数据文件
    if [ ! -d "database" ]; then
        print_error "未找到数据库文件目录，请确保在导入包目录中运行"
        exit 1
    fi
    
    print_success "环境检查通过"
}

# 创建备份
create_backup() {
    print_info "创建现有数据备份..."
    
    BACKUP_DIR="/www/wwwroot/The-Health-Hub/backups/cloud_import_backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # 备份数据目录
    if [ -d "/www/wwwroot/The-Health-Hub/data" ]; then
        cp -r "/www/wwwroot/The-Health-Hub/data" "$BACKUP_DIR/"
        print_info "数据目录已备份"
    fi
    
    # 备份上传目录
    if [ -d "/www/wwwroot/The-Health-Hub/uploads" ]; then
        cp -r "/www/wwwroot/The-Health-Hub/uploads" "$BACKUP_DIR/"
        print_info "上传目录已备份"
    fi
    
    # 备份数据库（如果是 PostgreSQL）
    if command -v pg_dump &> /dev/null && [ -f "/www/wwwroot/The-Health-Hub/deploy/docker/.env" ]; then
        source "/www/wwwroot/The-Health-Hub/deploy/docker/.env"
        if pg_isready -h "${POSTGRES_HOST:-localhost}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER}" >/dev/null 2>&1; then
            print_info "备份 PostgreSQL 数据库..."
            PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h "${POSTGRES_HOST:-localhost}" -p "${POSTGRES_PORT:-5432}" -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$BACKUP_DIR/postgres_backup.sql"
            print_info "PostgreSQL 数据库已备份"
        fi
    fi
    
    print_success "备份完成: $BACKUP_DIR"
    echo "BACKUP_DIR=\"$BACKUP_DIR\"" > /tmp/health_hub_backup_path
}

# 停止应用服务
stop_services() {
    print_info "停止应用服务..."
    
    # 停止 PM2 应用
    pm2 stop healthhub 2>/dev/null || true
    pm2 stop all 2>/dev/null || true
    
    # 等待服务完全停止
    sleep 3
    
    print_success "应用服务已停止"
}

# 导入数据库
import_database() {
    print_info "导入数据库..."
    
    cd "/www/wwwroot/The-Health-Hub"
    
    # 检查数据库类型和导入方式
    if [ -f "$(dirname "$0")/database/postgres-data.sql" ]; then
        print_info "检测到 PostgreSQL 数据文件..."
        
        if [ -f "deploy/docker/.env" ]; then
            source "deploy/docker/.env"
            
            # 检查 PostgreSQL 连接
            if command -v psql &> /dev/null; then
                print_info "导入 PostgreSQL 数据..."
                
                # 先导入架构（如果存在）
                if [ -f "$(dirname "$0")/database/schema.sql" ]; then
                    PGPASSWORD="$POSTGRES_PASSWORD" psql -h "${POSTGRES_HOST:-localhost}" -p "${POSTGRES_PORT:-5432}" -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$(dirname "$0")/database/schema.sql" || true
                fi
                
                # 导入数据
                PGPASSWORD="$POSTGRES_PASSWORD" psql -h "${POSTGRES_HOST:-localhost}" -p "${POSTGRES_PORT:-5432}" -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$(dirname "$0")/database/postgres-data.sql"
                
                print_success "PostgreSQL 数据导入完成"
            else
                print_error "未找到 psql 命令，无法导入 PostgreSQL 数据"
                exit 1
            fi
        else
            print_error "未找到 PostgreSQL 配置文件"
            exit 1
        fi
        
    elif [ -f "$(dirname "$0")/database/sqlite-export.sql" ]; then
        print_info "检测到 SQLite 数据文件..."
        
        # 确保数据目录存在
        mkdir -p "data"
        
        # 导入 SQLite 数据
        rm -f "data/local.db"
        sqlite3 "data/local.db" < "$(dirname "$0")/database/sqlite-export.sql"
        
        print_success "SQLite 数据导入完成"
        
    else
        print_warning "未找到数据库文件，跳过数据库导入"
    fi
}

# 导入上传文件
import_uploads() {
    print_info "导入上传文件..."
    
    cd "/www/wwwroot/The-Health-Hub"
    
    if [ -d "$(dirname "$0")/uploads" ]; then
        # 备份现有上传目录
        if [ -d "uploads" ]; then
            mv "uploads" "uploads.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
        fi
        
        # 复制新的上传文件
        cp -r "$(dirname "$0")/uploads" "."
        
        print_success "上传文件导入完成"
    else
        print_warning "未找到上传文件目录"
    fi
}

# 设置权限
set_permissions() {
    print_info "设置文件权限..."
    
    cd "/www/wwwroot/The-Health-Hub"
    
    # 设置数据目录权限
    if [ -d "data" ]; then
        chown -R www-data:www-data "data/"
        chmod -R 755 "data/"
        chmod 644 "data"/*.db 2>/dev/null || true
    fi
    
    # 设置上传目录权限
    if [ -d "uploads" ]; then
        chown -R www-data:www-data "uploads/"
        chmod -R 755 "uploads/"
    fi
    
    # 设置应用权限
    chown -R www-data:www-data "/www/wwwroot/The-Health-Hub"
    
    print_success "文件权限设置完成"
}

# 启动应用服务
start_services() {
    print_info "启动应用服务..."
    
    cd "/www/wwwroot/The-Health-Hub"
    
    # 启动 PM2 应用
    pm2 start healthhub 2>/dev/null || pm2 start ecosystem.config.js 2>/dev/null || pm2 start npm --name "healthhub" -- start
    
    # 等待应用启动
    print_info "等待应用启动..."
    sleep 10
    
    print_success "应用服务已启动"
}

# 验证导入结果
verify_import() {
    print_info "验证导入结果..."
    
    # 检查 PM2 状态
    echo ""
    echo "=== PM2 服务状态 ==="
    pm2 status
    
    # 检查应用健康状态
    echo ""
    echo "=== 应用健康检查 ==="
    
    local count=0
    while [ $count -lt 30 ]; do
        if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
            print_success "✅ 应用服务正常"
            break
        else
            print_info "等待应用启动... ($((count + 1))/30)"
            sleep 2
            count=$((count + 1))
        fi
    done
    
    if [ $count -eq 30 ]; then
        print_warning "⚠️ 应用启动检查超时，请手动检查"
    fi
    
    # 检查数据库连接
    if curl -f http://localhost:3000/api/health/database >/dev/null 2>&1; then
        print_success "✅ 数据库连接正常"
    else
        print_warning "⚠️ 数据库连接可能有问题"
    fi
    
    print_success "导入验证完成"
}

# 显示完成信息
show_completion_info() {
    echo ""
    echo "🎉 云端数据库导入完成！"
    echo ""
    echo "=== 访问信息 ==="
    echo "🌐 应用地址: http://$(curl -s ifconfig.me 2>/dev/null || echo 'your-server-ip')"
    echo "🔍 健康检查: http://$(curl -s ifconfig.me 2>/dev/null || echo 'your-server-ip')/api/health"
    echo ""
    echo "=== 备份信息 ==="
    if [ -f "/tmp/health_hub_backup_path" ]; then
        source "/tmp/health_hub_backup_path"
        echo "📦 备份位置: $BACKUP_DIR"
        echo "🔄 恢复命令: 如需恢复，请联系管理员"
    fi
    echo ""
    echo "=== 管理命令 ==="
    echo "# 查看应用状态"
    echo "pm2 status"
    echo ""
    echo "# 查看应用日志"
    echo "pm2 logs healthhub"
    echo ""
    echo "# 重启应用"
    echo "pm2 restart healthhub"
    echo ""
}

# 错误恢复函数
recover_from_error() {
    print_error "导入过程中出现错误，尝试恢复..."
    
    if [ -f "/tmp/health_hub_backup_path" ]; then
        source "/tmp/health_hub_backup_path"
        
        print_info "从备份恢复..."
        cd "/www/wwwroot/The-Health-Hub"
        
        # 恢复数据
        if [ -d "$BACKUP_DIR/data" ]; then
            rm -rf "data"
            cp -r "$BACKUP_DIR/data" "."
        fi
        
        # 恢复上传文件
        if [ -d "$BACKUP_DIR/uploads" ]; then
            rm -rf "uploads"
            cp -r "$BACKUP_DIR/uploads" "."
        fi
        
        # 重启应用
        pm2 restart healthhub 2>/dev/null || true
        
        print_info "已从备份恢复，请检查应用状态"
    fi
}

# 主函数
main() {
    # 设置错误处理
    trap 'recover_from_error; exit 1' ERR
    
    check_environment
    create_backup
    stop_services
    import_database
    import_uploads
    set_permissions
    start_services
    verify_import
    show_completion_info
    
    # 清理临时文件
    rm -f "/tmp/health_hub_backup_path"
    
    print_success "🎉 云端导入流程全部完成！"
}

# 执行主函数
main "$@"
EOF

    chmod +x "$PACKAGE_DIR/cloud-import.sh"
    print_success "云端导入脚本创建完成"
}

# 创建快速部署脚本
create_quick_deploy_script() {
    print_info "创建快速部署脚本..."
    
    cat > "$PACKAGE_DIR/quick-deploy.sh" << 'EOF'
#!/bin/bash

# 🚀 健闻局 - 快速部署脚本
# 一键完成数据导入和应用部署

set -e

echo "🚀 健闻局快速部署"
echo "================"
echo ""

# 检查当前目录
if [ ! -f "cloud-import.sh" ]; then
    echo "错误：请在导入包目录中运行此脚本"
    exit 1
fi

echo "开始快速部署流程..."
echo ""

# 1. 执行数据导入
echo "步骤 1/3: 导入数据库和文件"
./cloud-import.sh

echo ""
echo "步骤 2/3: 等待服务稳定..."
sleep 5

# 2. 验证部署
echo "步骤 3/3: 最终验证"
if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
    echo "✅ 快速部署成功！"
    echo ""
    echo "🌐 应用已启动，可以通过以下地址访问："
    echo "   http://$(curl -s ifconfig.me 2>/dev/null || echo 'your-server-ip')"
else
    echo "⚠️ 部署完成但应用可能还在启动中"
    echo "   请稍等片刻后访问应用"
fi

echo ""
echo "🎉 快速部署完成！"
EOF

    chmod +x "$PACKAGE_DIR/quick-deploy.sh"
    print_success "快速部署脚本创建完成"
}

# 创建说明文档
create_documentation() {
    print_info "创建说明文档..."
    
    cat > "$PACKAGE_DIR/README.md" << EOF
# 健闻局云端部署导入包

创建时间: $(date)
版本: v1.0

## 📦 包含内容

- \`database/\`: 数据库文件目录
- \`uploads/\`: 上传文件目录  
- \`cloud-import.sh\`: 云端导入脚本（完整版）
- \`quick-deploy.sh\`: 快速部署脚本（简化版）
- \`README.md\`: 本说明文件

## 🚀 使用方法

### 方法一：快速部署（推荐新手）

适合快速完成部署的用户：

\`\`\`bash
# 1. 上传并解压导入包到服务器
tar -xzf cloud-import-package-*.tar.gz
cd cloud-import-package-*

# 2. 执行快速部署
./quick-deploy.sh
\`\`\`

### 方法二：完整导入（推荐高级用户）

提供更多控制和详细信息：

\`\`\`bash
# 1. 上传并解压导入包到服务器
tar -xzf cloud-import-package-*.tar.gz
cd cloud-import-package-*

# 2. 执行完整导入
./cloud-import.sh
\`\`\`

## 📋 部署要求

### 服务器要求

- **操作系统**: Linux (Ubuntu 18.04+ / CentOS 7+ 推荐)
- **内存**: 至少 2GB RAM
- **存储**: 至少 10GB 可用空间
- **网络**: 稳定的网络连接

### 软件要求

- **Node.js**: 16+ 版本
- **PM2**: 进程管理器
- **数据库**: PostgreSQL 或 SQLite
- **Web服务器**: Nginx (可选)

### 预安装检查

在执行导入前，请确保以下条件：

\`\`\`bash
# 检查 Node.js
node --version

# 检查 PM2
pm2 --version

# 检查目标目录
ls -la /www/wwwroot/The-Health-Hub/

# 检查权限
whoami
# 应该显示 root 或具有 sudo 权限的用户
\`\`\`

## 🔧 部署步骤详解

### 1. 上传导入包

**方法一：使用 SCP**
\`\`\`bash
scp cloud-import-package-*.tar.gz root@your-server:/tmp/
\`\`\`

**方法二：使用 Web 面板**
通过宝塔面板或其他 Web 管理界面上传到 \`/tmp/\` 目录

### 2. 解压和准备

\`\`\`bash
# 连接服务器
ssh root@your-server

# 进入临时目录
cd /tmp

# 解压导入包
tar -xzf cloud-import-package-*.tar.gz
cd cloud-import-package-*

# 检查内容
ls -la
\`\`\`

### 3. 执行导入

**选择快速部署：**
\`\`\`bash
./quick-deploy.sh
\`\`\`

**或选择完整导入：**
\`\`\`bash
./cloud-import.sh
\`\`\`

### 4. 验证部署

\`\`\`bash
# 检查 PM2 状态
pm2 status

# 检查应用健康
curl http://localhost:3000/api/health

# 检查数据库连接
curl http://localhost:3000/api/health/database
\`\`\`

## 🛡️ 安全和备份

### 自动备份

导入脚本会自动创建备份：
- 备份位置: \`/www/wwwroot/The-Health-Hub/backups/\`
- 备份内容: 现有数据库、上传文件
- 备份格式: \`cloud_import_backup_YYYYMMDD_HHMMSS\`

### 恢复操作

如果导入失败或需要回滚：

\`\`\`bash
cd /www/wwwroot/The-Health-Hub
pm2 stop healthhub

# 查看备份
ls -la backups/

# 恢复数据（替换为实际的备份目录名）
cp -r backups/cloud_import_backup_*/data/* data/
cp -r backups/cloud_import_backup_*/uploads/* uploads/

# 重启应用
pm2 start healthhub
\`\`\`

## 🔍 故障排除

### 常见问题

**1. 权限错误**
\`\`\`bash
# 解决方案：重新设置权限
chown -R www-data:www-data /www/wwwroot/The-Health-Hub
chmod -R 755 /www/wwwroot/The-Health-Hub
\`\`\`

**2. 端口占用**
\`\`\`bash
# 检查端口使用情况
netstat -tulpn | grep :3000

# 如果端口被占用，停止占用进程或修改配置
\`\`\`

**3. 数据库连接失败**
\`\`\`bash
# 检查数据库状态
systemctl status postgresql  # PostgreSQL
# 或
ls -la /www/wwwroot/The-Health-Hub/data/local.db  # SQLite

# 检查数据库配置
cat /www/wwwroot/The-Health-Hub/.env
\`\`\`

**4. 应用启动失败**
\`\`\`bash
# 查看详细日志
pm2 logs healthhub

# 手动启动应用进行调试
cd /www/wwwroot/The-Health-Hub
npm start
\`\`\`

### 获取帮助

如果遇到问题，请提供以下信息：

1. 操作系统版本: \`cat /etc/os-release\`
2. Node.js 版本: \`node --version\`
3. PM2 状态: \`pm2 status\`
4. 应用日志: \`pm2 logs healthhub --lines 50\`
5. 系统资源: \`free -h && df -h\`

## 📊 性能优化建议

### 1. 内存优化
\`\`\`bash
# 调整 PM2 进程数量
pm2 start healthhub -i max  # 使用所有 CPU 核心
# 或
pm2 start healthhub -i 2    # 使用 2 个进程
\`\`\`

### 2. 缓存配置
\`\`\`bash
# 安装和配置 Redis（可选）
apt install redis-server
systemctl start redis-server
\`\`\`

### 3. 反向代理
\`\`\`bash
# 配置 Nginx 反向代理（推荐）
# 编辑 /etc/nginx/sites-available/health-hub
# 添加适当的反向代理配置
\`\`\`

## 📈 监控和维护

### 日常维护命令

\`\`\`bash
# 查看应用状态
pm2 monit

# 重启应用
pm2 restart healthhub

# 查看日志
pm2 logs healthhub

# 清理日志
pm2 flush

# 创建数据库备份
pg_dump -U postgres health_hub > backup_\$(date +%Y%m%d).sql
\`\`\`

### 定期备份脚本

建议设置定期备份任务：

\`\`\`bash
# 添加到 crontab
crontab -e

# 每天凌晨 2 点备份
0 2 * * * /www/wwwroot/The-Health-Hub/scripts/backup-database.sh
\`\`\`

---

**🎉 祝您部署顺利！**

如有问题，请查看故障排除部分或联系技术支持。
EOF

    print_success "说明文档创建完成"
}

# 创建压缩包
create_final_package() {
    print_info "创建最终部署包..."
    
    cd "$(dirname "$PACKAGE_DIR")"
    PACKAGE_NAME="health-hub-cloud-import-${TIMESTAMP}.tar.gz"
    
    tar -czf "$PACKAGE_NAME" "$(basename "$PACKAGE_DIR")"
    
    # 计算文件大小
    PACKAGE_SIZE=$(ls -lh "$PACKAGE_NAME" | awk '{print $5}')
    
    print_success "云端部署包创建完成"
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
    echo "🎉 云端部署导入包创建完成！"
    echo ""
    echo "=== 包信息 ==="
    echo "📦 包名: health-hub-cloud-import-${TIMESTAMP}.tar.gz"
    echo "📅 创建时间: $(date)"
    echo "📁 位置: $(pwd)/health-hub-cloud-import-${TIMESTAMP}.tar.gz"
    echo ""
    echo "=== 部署步骤 ==="
    echo "1. 上传到服务器:"
    echo "   scp health-hub-cloud-import-${TIMESTAMP}.tar.gz root@your-server:/tmp/"
    echo ""
    echo "2. 在服务器上解压:"
    echo "   cd /tmp"
    echo "   tar -xzf health-hub-cloud-import-${TIMESTAMP}.tar.gz"
    echo "   cd cloud-import-package-${TIMESTAMP}"
    echo ""
    echo "3. 执行部署:"
    echo "   ./quick-deploy.sh      # 快速部署"
    echo "   # 或"
    echo "   ./cloud-import.sh      # 完整导入"
    echo ""
    echo "=== 注意事项 ==="
    echo "⚠️  部署前请确保目标服务器环境已准备就绪"
    echo "⚠️  建议先在测试环境中验证部署流程"
    echo "⚠️  部署过程中会自动备份现有数据"
    echo ""
}

# 主函数
main() {
    create_package_directory
    prepare_database_files
    prepare_upload_files
    create_cloud_import_script
    create_quick_deploy_script
    create_documentation
    create_final_package
    show_completion_info
}

# 错误处理
trap 'print_error "创建过程中出现错误"; exit 1' ERR

# 执行主函数
main "$@"
