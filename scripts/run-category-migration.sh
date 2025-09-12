#!/bin/bash

# 分类层级功能迁移执行脚本
# 用法: ./scripts/run-category-migration.sh [--validate-only] [--rollback]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查环境变量
check_env() {
    print_info "检查环境配置..."
    
    if [ -f ".env.local" ]; then
        source .env.local
        print_success "已加载 .env.local 配置"
    else
        print_warning ".env.local 文件不存在，使用默认配置"
    fi
    
    # 检查必要的环境变量
    if [ -z "$DB_HOST" ]; then
        export DB_HOST="localhost"
        print_info "使用默认数据库主机: localhost"
    fi
    
    if [ -z "$DB_DATABASE" ]; then
        export DB_DATABASE="health_hub"
        print_info "使用默认数据库名: health_hub"
    fi
    
    if [ -z "$DB_USERNAME" ]; then
        export DB_USERNAME="hugo"
        print_info "使用默认用户名: hugo"
    fi
}

# 检查数据库连接
check_db_connection() {
    print_info "检查数据库连接..."
    
    if command -v psql >/dev/null 2>&1; then
        if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USERNAME" -d "$DB_DATABASE" -c "SELECT 1;" >/dev/null 2>&1; then
            print_success "数据库连接正常"
        else
            print_error "无法连接到数据库"
            print_info "请检查数据库配置和连接参数"
            exit 1
        fi
    else
        print_warning "未找到 psql 命令，跳过连接测试"
    fi
}

# 备份数据库
backup_database() {
    print_info "创建数据库备份..."
    
    local backup_dir="backups"
    local backup_file="${backup_dir}/category_migration_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    mkdir -p "$backup_dir"
    
    if command -v pg_dump >/dev/null 2>&1; then
        if PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -U "$DB_USERNAME" -d "$DB_DATABASE" \
           --table=categories --table=audios --data-only > "$backup_file"; then
            print_success "数据库备份已保存到: $backup_file"
        else
            print_error "数据库备份失败"
            exit 1
        fi
    else
        print_warning "未找到 pg_dump 命令，跳过备份"
    fi
}

# 执行迁移
run_migration() {
    print_info "开始执行分类层级功能迁移..."
    
    if npm run migrate:category-hierarchy; then
        print_success "迁移执行完成"
    else
        print_error "迁移执行失败"
        exit 1
    fi
}

# 验证迁移
validate_migration() {
    print_info "验证迁移结果..."
    
    if npm run validate:category-migration; then
        print_success "迁移验证通过"
    else
        print_error "迁移验证失败"
        exit 1
    fi
}

# 回滚迁移
rollback_migration() {
    print_warning "开始回滚分类层级功能迁移..."
    
    local rollback_script="database/migrations/001_add_category_hierarchy_rollback.sql"
    
    if [ -f "$rollback_script" ]; then
        if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USERNAME" -d "$DB_DATABASE" -f "$rollback_script"; then
            print_success "迁移回滚完成"
        else
            print_error "迁移回滚失败"
            exit 1
        fi
    else
        print_error "回滚脚本不存在: $rollback_script"
        exit 1
    fi
}

# 主函数
main() {
    echo "🚀 分类层级功能数据库迁移工具"
    echo "=================================="
    
    # 解析命令行参数
    VALIDATE_ONLY=false
    ROLLBACK=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --validate-only)
                VALIDATE_ONLY=true
                shift
                ;;
            --rollback)
                ROLLBACK=true
                shift
                ;;
            -h|--help)
                echo "用法: $0 [选项]"
                echo "选项:"
                echo "  --validate-only    仅执行验证，不进行迁移"
                echo "  --rollback        回滚迁移"
                echo "  -h, --help        显示帮助信息"
                exit 0
                ;;
            *)
                print_error "未知选项: $1"
                exit 1
                ;;
        esac
    done
    
    # 检查环境
    check_env
    check_db_connection
    
    if [ "$ROLLBACK" = true ]; then
        # 执行回滚
        rollback_migration
    elif [ "$VALIDATE_ONLY" = true ]; then
        # 仅验证
        validate_migration
    else
        # 完整迁移流程
        backup_database
        run_migration
        validate_migration
        
        print_success "🎉 分类层级功能迁移完成！"
        print_info "现在可以开始使用二级分类功能了"
    fi
}

# 执行主函数
main "$@"