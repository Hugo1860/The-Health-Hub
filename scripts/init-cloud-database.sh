#!/bin/bash

# 健康中心云端数据库初始化脚本
# 支持 MySQL 和 PostgreSQL
# 使用方法: ./scripts/init-cloud-database.sh mysql|postgresql

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查参数
if [ $# -ne 1 ]; then
    echo -e "${RED}错误: 请指定数据库类型${NC}"
    echo "使用方法: $0 mysql|postgresql"
    echo "示例: $0 mysql"
    exit 1
fi

DB_TYPE=$1

if [ "$DB_TYPE" != "mysql" ] && [ "$DB_TYPE" != "postgresql" ]; then
    echo -e "${RED}错误: 不支持的数据库类型 '$DB_TYPE'${NC}"
    echo "支持的类型: mysql, postgresql"
    exit 1
fi

echo -e "${GREEN}🚀 开始初始化 $DB_TYPE 数据库...${NC}"

# 配置文件
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MYSQL_SCRIPT="$PROJECT_ROOT/database/cloud-init-mysql.sql"
POSTGRESQL_SCRIPT="$PROJECT_ROOT/database/cloud-init-postgresql.sql"

# 检查脚本文件是否存在
if [ "$DB_TYPE" = "mysql" ] && [ ! -f "$MYSQL_SCRIPT" ]; then
    echo -e "${RED}错误: MySQL 初始化脚本不存在: $MYSQL_SCRIPT${NC}"
    exit 1
fi

if [ "$DB_TYPE" = "postgresql" ] && [ ! -f "$POSTGRESQL_SCRIPT" ]; then
    echo -e "${RED}错误: PostgreSQL 初始化脚本不存在: $POSTGRESQL_SCRIPT${NC}"
    exit 1
fi

# 数据库连接信息（从环境变量或用户输入获取）
echo -e "${YELLOW}📝 请输入数据库连接信息:${NC}"

if [ -z "$DB_HOST" ]; then
    read -p "数据库主机 (默认: localhost): " DB_HOST
    DB_HOST=${DB_HOST:-localhost}
fi

if [ -z "$DB_PORT" ]; then
    if [ "$DB_TYPE" = "mysql" ]; then
        read -p "数据库端口 (默认: 3306): " DB_PORT
        DB_PORT=${DB_PORT:-3306}
    else
        read -p "数据库端口 (默认: 5432): " DB_PORT
        DB_PORT=${DB_PORT:-5432}
    fi
fi

if [ -z "$DB_NAME" ]; then
    read -p "数据库名称 (默认: health_hub): " DB_NAME
    DB_NAME=${DB_NAME:-health_hub}
fi

if [ -z "$DB_USER" ]; then
    read -p "数据库用户名: " DB_USER
fi

if [ -z "$DB_PASSWORD" ]; then
    read -s -p "数据库密码: " DB_PASSWORD
    echo
fi

echo -e "${GREEN}📊 数据库连接信息:${NC}"
echo "  类型: $DB_TYPE"
echo "  主机: $DB_HOST"
echo "  端口: $DB_PORT"
echo "  数据库: $DB_NAME"
echo "  用户: $DB_USER"

# 测试数据库连接
echo -e "${YELLOW}🔍 测试数据库连接...${NC}"

if [ "$DB_TYPE" = "mysql" ]; then
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" > /dev/null 2>&1
else
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1
fi

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 数据库连接失败！请检查连接信息。${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 数据库连接成功！${NC}"

# 执行初始化脚本
echo -e "${YELLOW}⚡ 执行数据库初始化脚本...${NC}"

if [ "$DB_TYPE" = "mysql" ]; then
    # MySQL 初始化
    echo -e "${YELLOW}连接到 MySQL 数据库...${NC}"
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$MYSQL_SCRIPT"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ MySQL 数据库初始化完成！${NC}"

        # 验证初始化结果
        echo -e "${YELLOW}🔍 验证初始化结果...${NC}"
        mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "
        USE $DB_NAME;
        SHOW TABLES;
        SELECT '✅ 管理员用户' as info, COUNT(*) as count FROM users WHERE role = 'admin';
        SELECT '📊 总表数' as info, COUNT(*) as count FROM information_schema.tables WHERE table_schema = '$DB_NAME';
        " 2>/dev/null
    else
        echo -e "${RED}❌ MySQL 数据库初始化失败！${NC}"
        exit 1
    fi

else
    # PostgreSQL 初始化
    echo -e "${YELLOW}连接到 PostgreSQL 数据库...${NC}"

    # 确保数据库存在
    export PGPASSWORD="$DB_PASSWORD"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || true

    # 执行初始化脚本
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$POSTGRESQL_SCRIPT"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ PostgreSQL 数据库初始化完成！${NC}"

        # 验证初始化结果
        echo -e "${YELLOW}🔍 验证初始化结果...${NC}"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        \dt;
        SELECT '✅ 管理员用户' as info, COUNT(*) as count FROM users WHERE role = 'admin';
        SELECT '📊 总表数' as info, COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
        " 2>/dev/null
    else
        echo -e "${RED}❌ PostgreSQL 数据库初始化失败！${NC}"
        exit 1
    fi
fi

# 显示成功信息
echo -e "${GREEN}🎉 数据库初始化成功完成！${NC}"
echo -e "${YELLOW}📋 后续步骤:${NC}"
echo "1. 修改默认管理员密码"
echo "2. 配置应用连接信息"
echo "3. 测试数据库连接"
echo "4. 开始使用应用"

echo -e "${YELLOW}🔧 默认管理员信息:${NC}"
echo "  用户名: admin"
echo "  邮箱: admin@example.com"
echo "  密码: admin123 (请立即修改！)"
echo "  角色: admin"

echo -e "${YELLOW}📖 查看详细文档:${NC}"
echo "  $PROJECT_ROOT/database/README-cloud-init.md"

echo -e "${GREEN}✨ 初始化完成！您现在可以开始使用健康中心应用了。${NC}"
