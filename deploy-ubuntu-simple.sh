#!/usr/bin/env bash
# 
# Health Hub - Ubuntu 22.04 一键部署脚本
# 适用于: Ubuntu 22.04 x86_64
# 从: Mac M3 (ARM) 部署到 Ubuntu (x86_64)
#

set -euo pipefail

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}"
cat << "EOF"
╔══════════════════════════════════════════════════════╗
║                                                      ║
║        Health Hub - Ubuntu 一键部署脚本              ║
║                                                      ║
║  🚀 自动安装 Docker 和依赖                           ║
║  📦 自动构建和启动服务                               ║
║  🗄️ 自动初始化数据库                                 ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# 检查是否为root
if [ "$EUID" -ne 0 ] && ! groups | grep -q docker; then 
   echo -e "${YELLOW}提示: 可能需要sudo权限或将用户添加到docker组${NC}"
fi

# 步骤1: 安装Docker
install_docker() {
    echo -e "${GREEN}[1/5] 检查并安装 Docker...${NC}"
    
    if command -v docker &> /dev/null; then
        echo "✅ Docker 已安装: $(docker --version)"
    else
        echo "正在安装 Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        rm get-docker.sh
        echo "✅ Docker 安装完成"
        echo -e "${YELLOW}⚠️  请重新登录以使docker组权限生效${NC}"
        echo "    然后再次运行此脚本"
        exit 0
    fi
    
    if ! command -v docker compose &> /dev/null; then
        echo "正在安装 Docker Compose..."
        sudo apt update
        sudo apt install -y docker-compose-plugin
        echo "✅ Docker Compose 安装完成"
    else
        echo "✅ Docker Compose 已安装"
    fi
}

# 步骤2: 配置环境变量
configure_env() {
    echo -e "${GREEN}[2/5] 配置环境变量...${NC}"
    
    if [ ! -f .env.production ]; then
        echo "创建 .env.production 文件..."
        
        # 生成随机密钥
        NEXTAUTH_SECRET=$(openssl rand -base64 32)
        SESSION_SECRET=$(openssl rand -base64 32)
        JWT_SECRET=$(openssl rand -base64 32)
        CSRF_SECRET=$(openssl rand -base64 32)
        
        # 获取服务器IP
        SERVER_IP=$(hostname -I | awk '{print $1}')
        
        cat > .env.production << EOF
# 应用配置
NODE_ENV=production
NEXTAUTH_URL=http://${SERVER_IP}:3000
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
SESSION_SECRET=${SESSION_SECRET}
JWT_SECRET=${JWT_SECRET}
CSRF_SECRET=${CSRF_SECRET}

# 数据库配置
DATABASE_TYPE=mysql
DB_HOST=db
DB_PORT=3306
DB_DATABASE=health_hub
DB_USERNAME=health_app
DB_PASSWORD=appPass123!

# MySQL配置
MYSQL_ROOT_PASSWORD=rootpass123!
MYSQL_DATABASE=health_hub
MYSQL_USER=health_app
MYSQL_PASSWORD=appPass123!
MYSQL_PORT=3307
EOF
        
        echo "✅ 环境变量文件已创建"
        echo -e "${YELLOW}📝 请编辑 .env.production 修改默认密码${NC}"
        echo "   访问地址将是: http://${SERVER_IP}:3000"
    else
        echo "✅ 环境变量文件已存在"
    fi
}

# 步骤3: 构建Docker镜像
build_images() {
    echo -e "${GREEN}[3/5] 构建 Docker 镜像 (针对x86_64)...${NC}"
    echo "这可能需要几分钟时间..."
    
    # 使用 --platform 确保构建 x86_64 镜像
    docker compose build --no-cache --platform linux/amd64
    
    echo "✅ Docker 镜像构建完成"
}

# 步骤4: 启动服务
start_services() {
    echo -e "${GREEN}[4/5] 启动服务...${NC}"
    
    # 停止可能存在的旧服务
    docker compose down 2>/dev/null || true
    
    # 启动服务
    docker compose up -d
    
    echo "等待服务启动..."
    sleep 10
    
    # 检查服务状态
    docker compose ps
    
    echo "✅ 服务已启动"
}

# 步骤5: 初始化数据库
initialize_database() {
    echo -e "${GREEN}[5/5] 初始化数据库...${NC}"
    
    echo "等待数据库就绪..."
    sleep 20
    
    # 运行数据库迁移
    if [ -f database/migrations/002_create_user_action_logs.sql ]; then
        echo "运行数据库迁移..."
        docker compose exec -T db mysql -u health_app -pappPass123! health_hub < database/migrations/002_create_user_action_logs.sql 2>/dev/null || true
        echo "✅ 数据库迁移完成"
    fi
    
    echo "✅ 数据库初始化完成"
}

# 显示部署结果
show_result() {
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                  ║${NC}"
    echo -e "${GREEN}║          🎉 部署完成！                           ║${NC}"
    echo -e "${GREEN}║                                                  ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
    echo ""
    
    SERVER_IP=$(hostname -I | awk '{print $1}')
    
    echo -e "${YELLOW}📋 访问信息:${NC}"
    echo "   🌐 应用地址: http://${SERVER_IP}:3000"
    echo "   🗄️ MySQL端口: ${SERVER_IP}:3307"
    echo ""
    
    echo -e "${YELLOW}🔐 默认管理员账号:${NC}"
    echo "   请参考数据库中的users表"
    echo ""
    
    echo -e "${YELLOW}📊 服务状态:${NC}"
    docker compose ps
    echo ""
    
    echo -e "${YELLOW}📝 常用命令:${NC}"
    echo "   查看日志: docker compose logs -f"
    echo "   重启服务: docker compose restart"
    echo "   停止服务: docker compose down"
    echo "   进入数据库: docker compose exec db mysql -u health_app -pappPass123! health_hub"
    echo ""
    
    echo -e "${YELLOW}⚠️  重要提醒:${NC}"
    echo "   1. 修改 .env.production 中的默认密码"
    echo "   2. 配置防火墙: sudo ufw allow 3000/tcp"
    echo "   3. 如需域名访问,请配置Nginx反向代理"
    echo "   4. 配置SSL证书以启用HTTPS"
    echo ""
    
    echo -e "${GREEN}✨ 详细文档请查看: DEPLOYMENT_GUIDE_UBUNTU.md${NC}"
}

# 主函数
main() {
    echo "开始部署..."
    echo ""
    
    install_docker
    configure_env
    build_images
    start_services
    initialize_database
    show_result
}

# 执行主函数
main

