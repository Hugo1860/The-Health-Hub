#!/bin/bash

# 健康中心云端数据库Docker初始化脚本
# 适用于Docker容器环境
# 使用方法: ./scripts/init-cloud-database-docker.sh mysql|postgresql

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

echo -e "${GREEN}🐳 Docker环境数据库初始化开始...${NC}"

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Docker 容器信息
MYSQL_CONTAINER="${MYSQL_CONTAINER:-health-hub-mysql}"
POSTGRESQL_CONTAINER="${POSTGRESQL_CONTAINER:-health-hub-postgresql}"
DB_CONTAINER_NAME=""

if [ "$DB_TYPE" = "mysql" ]; then
    DB_CONTAINER_NAME="$MYSQL_CONTAINER"
else
    DB_CONTAINER_NAME="$POSTGRESQL_CONTAINER"
fi

echo -e "${YELLOW}🔍 检查Docker容器状态...${NC}"

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker 未运行或不可用${NC}"
    exit 1
fi

# 检查数据库容器是否存在
if ! docker ps -a --format "table {{.Names}}" | grep -q "^${DB_CONTAINER_NAME}$"; then
    echo -e "${RED}❌ 数据库容器 '$DB_CONTAINER_NAME' 不存在${NC}"
    echo "请先启动数据库容器或检查容器名称"
    exit 1
fi

# 检查容器是否运行
if ! docker ps --format "table {{.Names}}" | grep -q "^${DB_CONTAINER_NAME}$"; then
    echo -e "${YELLOW}🔄 启动数据库容器...${NC}"
    docker start "$DB_CONTAINER_NAME"

    # 等待容器启动
    echo -e "${YELLOW}⏳ 等待容器启动...${NC}"
    sleep 10
fi

echo -e "${GREEN}✅ 数据库容器运行正常${NC}"

# 获取数据库连接信息
if [ "$DB_TYPE" = "mysql" ]; then
    # MySQL 连接信息
    DB_HOST="${DB_HOST:-localhost}"
    DB_PORT="${DB_PORT:-3306}"
    DB_NAME="${DB_NAME:-health_hub}"
    DB_USER="${DB_USER:-root}"
    DB_PASSWORD="${DB_PASSWORD:-}"

    # 如果密码未设置，从环境变量或容器环境获取
    if [ -z "$DB_PASSWORD" ]; then
        DB_PASSWORD=$(docker exec "$DB_CONTAINER_NAME" env | grep MYSQL_ROOT_PASSWORD | cut -d'=' -f2 || echo "")
    fi

    if [ -z "$DB_PASSWORD" ]; then
        echo -e "${YELLOW}🔐 请输入 MySQL root 密码:${NC}"
        read -s DB_PASSWORD
        echo
    fi

else
    # PostgreSQL 连接信息
    DB_HOST="${DB_HOST:-localhost}"
    DB_PORT="${DB_PORT:-5432}"
    DB_NAME="${DB_NAME:-health_hub}"
    DB_USER="${DB_USER:-postgres}"
    DB_PASSWORD="${DB_PASSWORD:-}"

    # 如果密码未设置，从环境变量或容器环境获取
    if [ -z "$DB_PASSWORD" ]; then
        DB_PASSWORD=$(docker exec "$DB_CONTAINER_NAME" env | grep POSTGRES_PASSWORD | cut -d'=' -f2 || echo "")
    fi

    if [ -z "$DB_PASSWORD" ]; then
        echo -e "${YELLOW}🔐 请输入 PostgreSQL 密码:${NC}"
        read -s DB_PASSWORD
        echo
    fi
fi

echo -e "${GREEN}📊 数据库连接信息:${NC}"
echo "  类型: $DB_TYPE"
echo "  容器: $DB_CONTAINER_NAME"
echo "  主机: $DB_HOST"
echo "  端口: $DB_PORT"
echo "  数据库: $DB_NAME"
echo "  用户: $DB_USER"

# 测试数据库连接
echo -e "${YELLOW}🔍 测试数据库连接...${NC}"

if [ "$DB_TYPE" = "mysql" ]; then
    docker exec "$DB_CONTAINER_NAME" mysql -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" > /dev/null 2>&1
else
    docker exec "$DB_CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1
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
    echo -e "${YELLOW}📝 执行 MySQL 初始化脚本...${NC}"
    docker exec -i "$DB_CONTAINER_NAME" mysql -u "$DB_USER" -p"$DB_PASSWORD" < "$PROJECT_ROOT/database/cloud-init-mysql.sql"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ MySQL 数据库初始化完成！${NC}"

        # 验证初始化结果
        echo -e "${YELLOW}🔍 验证初始化结果...${NC}"
        docker exec "$DB_CONTAINER_NAME" mysql -u "$DB_USER" -p"$DB_PASSWORD" -e "
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
    echo -e "${YELLOW}📝 执行 PostgreSQL 初始化脚本...${NC}"

    # 确保数据库存在
    docker exec "$DB_CONTAINER_NAME" psql -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || true

    # 执行初始化脚本
    docker exec -i "$DB_CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" < "$PROJECT_ROOT/database/cloud-init-postgresql.sql"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ PostgreSQL 数据库初始化完成！${NC}"

        # 验证初始化结果
        echo -e "${YELLOW}🔍 验证初始化结果...${NC}"
        docker exec "$DB_CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "
        \dt;
        SELECT '✅ 管理员用户' as info, COUNT(*) as count FROM users WHERE role = 'admin';
        SELECT '📊 总表数' as info, COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
        " 2>/dev/null
    else
        echo -e "${RED}❌ PostgreSQL 数据库初始化失败！${NC}"
        exit 1
    fi
fi

# 成功完成
echo -e "${GREEN}🎉 Docker数据库初始化成功完成！${NC}"
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

echo -e "${GREEN}🐳 Docker环境初始化完成！${NC}"
