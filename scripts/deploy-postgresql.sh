#!/bin/bash

# PostgreSQL数据库部署脚本
# 用于在云端服务器上快速部署健康中心应用数据库

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查必要的环境变量
check_env_vars() {
    log_info "检查环境变量..."
    
    required_vars=("POSTGRES_HOST" "POSTGRES_DB" "POSTGRES_USER" "POSTGRES_PASSWORD")
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "缺少必要的环境变量: ${missing_vars[*]}"
        log_info "请设置以下环境变量:"
        for var in "${missing_vars[@]}"; do
            echo "  export $var=your_value"
        done
        exit 1
    fi
    
    log_success "环境变量检查通过"
}

# 检查PostgreSQL连接
check_postgres_connection() {
    log_info "检查PostgreSQL连接..."
    
    if command -v psql >/dev/null 2>&1; then
        if psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;" >/dev/null 2>&1; then
            log_success "PostgreSQL连接成功"
        else
            log_error "无法连接到PostgreSQL数据库"
            log_info "请检查连接参数和网络连接"
            exit 1
        fi
    else
        log_error "未找到psql命令，请安装PostgreSQL客户端"
        exit 1
    fi
}

# 创建数据库架构
create_schema() {
    log_info "创建数据库架构..."
    
    if [ -f "database/postgresql-schema.sql" ]; then
        psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "database/postgresql-schema.sql"
        log_success "数据库架构创建完成"
    else
        log_error "未找到架构文件: database/postgresql-schema.sql"
        exit 1
    fi
}

# 导入数据
import_data() {
    log_info "导入数据..."
    
    if [ -f "database/data-import.sql" ]; then
        psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "database/data-import.sql"
        log_success "数据导入完成"
    else
        log_warning "未找到数据文件: database/data-import.sql"
        log_info "尝试生成数据文件..."
        
        if [ -f "scripts/export-to-sql.js" ]; then
            node scripts/export-to-sql.js
            if [ -f "database/data-import.sql" ]; then
                psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "database/data-import.sql"
                log_success "数据导入完成"
            else
                log_error "数据文件生成失败"
                exit 1
            fi
        else
            log_error "未找到数据导出脚本"
            exit 1
        fi
    fi
}

# 验证部署
verify_deployment() {
    log_info "验证部署结果..."
    
    # 检查表是否存在
    tables=$(psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public';" | wc -l)
    
    if [ "$tables" -gt 10 ]; then
        log_success "数据库表创建成功 ($tables 个表)"
    else
        log_error "数据库表创建可能不完整"
        exit 1
    fi
    
    # 检查数据
    log_info "检查数据完整性..."
    
    user_count=$(psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM users;")
    audio_count=$(psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM audios;")
    category_count=$(psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM categories;")
    
    log_info "数据统计:"
    echo "  用户数量: $user_count"
    echo "  音频数量: $audio_count"
    echo "  分类数量: $category_count"
    
    if [ "$user_count" -gt 0 ] && [ "$audio_count" -gt 0 ] && [ "$category_count" -gt 0 ]; then
        log_success "数据验证通过"
    else
        log_warning "数据可能不完整，请检查导入过程"
    fi
}

# 创建备份
create_backup() {
    log_info "创建数据库备份..."
    
    backup_file="backup/health_hub_$(date +%Y%m%d_%H%M%S).sql"
    mkdir -p backup
    
    pg_dump -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$backup_file"
    
    if [ -f "$backup_file" ]; then
        log_success "备份创建成功: $backup_file"
    else
        log_error "备份创建失败"
    fi
}

# 显示使用帮助
show_help() {
    echo "PostgreSQL数据库部署脚本"
    echo ""
    echo "使用方法:"
    echo "  $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --schema-only    仅创建数据库架构"
    echo "  --data-only      仅导入数据（需要先有架构）"
    echo "  --verify         仅验证部署结果"
    echo "  --backup         创建数据库备份"
    echo "  --help           显示此帮助信息"
    echo ""
    echo "环境变量:"
    echo "  POSTGRES_HOST     PostgreSQL主机地址"
    echo "  POSTGRES_PORT     PostgreSQL端口（默认5432）"
    echo "  POSTGRES_DB       数据库名称"
    echo "  POSTGRES_USER     用户名"
    echo "  POSTGRES_PASSWORD 密码"
    echo ""
    echo "示例:"
    echo "  export POSTGRES_HOST=localhost"
    echo "  export POSTGRES_DB=health_hub"
    echo "  export POSTGRES_USER=postgres"
    echo "  export POSTGRES_PASSWORD=password"
    echo "  $0"
}

# 主函数
main() {
    log_info "开始PostgreSQL数据库部署..."
    
    case "${1:-}" in
        --schema-only)
            check_env_vars
            check_postgres_connection
            create_schema
            ;;
        --data-only)
            check_env_vars
            check_postgres_connection
            import_data
            verify_deployment
            ;;
        --verify)
            check_env_vars
            check_postgres_connection
            verify_deployment
            ;;
        --backup)
            check_env_vars
            check_postgres_connection
            create_backup
            ;;
        --help)
            show_help
            exit 0
            ;;
        "")
            # 完整部署
            check_env_vars
            check_postgres_connection
            create_schema
            import_data
            verify_deployment
            create_backup
            ;;
        *)
            log_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
    
    log_success "部署完成！"
}

# 运行主函数
main "$@"