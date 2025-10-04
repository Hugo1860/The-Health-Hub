#!/usr/bin/env bash
#
# 从本地Mac上传并部署到Ubuntu服务器的自动化脚本
# 使用方法: ./upload-and-deploy.sh user@server-ip
#

set -euo pipefail

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# 检查参数
if [ $# -lt 1 ]; then
    echo -e "${RED}错误: 请提供服务器地址${NC}"
    echo "使用方法: $0 user@server-ip [remote-path]"
    echo "例如: $0 ubuntu@192.168.1.100"
    echo "     $0 root@example.com /opt/health-hub"
    exit 1
fi

SERVER=$1
REMOTE_PATH=${2:-"~/health-hub"}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PACKAGE_NAME="health-hub-${TIMESTAMP}.tar.gz"

echo -e "${GREEN}"
cat << "EOF"
╔═══════════════════════════════════════════════════╗
║                                                   ║
║     Health Hub 自动上传部署工具                  ║
║                                                   ║
║  📦 本地打包 → 上传 → 服务器自动部署             ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# 步骤1: 测试SSH连接
echo -e "${BLUE}[1/6] 测试SSH连接...${NC}"
if ssh -o ConnectTimeout=10 "$SERVER" "echo '✅ SSH连接成功'" 2>/dev/null; then
    echo "✅ 服务器连接正常"
else
    echo -e "${RED}❌ 无法连接到服务器: $SERVER${NC}"
    echo "请检查:"
    echo "  1. 服务器地址是否正确"
    echo "  2. SSH密钥是否配置"
    echo "  3. 防火墙是否允许SSH(22端口)"
    exit 1
fi

# 步骤2: 本地打包
echo -e "${BLUE}[2/6] 打包项目文件...${NC}"
echo "正在创建压缩包（排除 node_modules, .next, .git）..."

tar --exclude='node_modules' \
    --exclude='.next' \
    --exclude='tmp' \
    --exclude='.git' \
    --exclude='dist' \
    --exclude='*.log' \
    --exclude='.DS_Store' \
    -czf "$PACKAGE_NAME" . 2>/dev/null || {
    echo -e "${RED}❌ 打包失败${NC}"
    exit 1
}

PACKAGE_SIZE=$(du -h "$PACKAGE_NAME" | cut -f1)
echo "✅ 打包完成: $PACKAGE_NAME ($PACKAGE_SIZE)"

# 步骤3: 上传到服务器
echo -e "${BLUE}[3/6] 上传到服务器...${NC}"
echo "目标: $SERVER:~/$PACKAGE_NAME"

if scp "$PACKAGE_NAME" "$SERVER:~/" 2>/dev/null; then
    echo "✅ 上传完成"
else
    echo -e "${RED}❌ 上传失败${NC}"
    rm -f "$PACKAGE_NAME"
    exit 1
fi

# 清理本地临时文件
rm -f "$PACKAGE_NAME"
echo "✅ 清理本地临时文件"

# 步骤4: 在服务器上解压
echo -e "${BLUE}[4/6] 在服务器上解压...${NC}"

ssh "$SERVER" bash << ENDSSH
    set -e
    
    # 创建目标目录
    mkdir -p "$REMOTE_PATH"
    
    # 备份旧版本（如果存在）
    if [ -d "$REMOTE_PATH/src" ]; then
        echo "📦 备份旧版本..."
        tar -czf ~/health-hub-backup-${TIMESTAMP}.tar.gz -C "$REMOTE_PATH" . 2>/dev/null || true
        echo "✅ 备份保存在: ~/health-hub-backup-${TIMESTAMP}.tar.gz"
    fi
    
    # 解压新版本
    echo "📂 解压项目文件..."
    tar -xzf ~/$PACKAGE_NAME -C "$REMOTE_PATH"
    
    # 清理上传的压缩包
    rm -f ~/$PACKAGE_NAME
    
    echo "✅ 解压完成"
ENDSSH

echo "✅ 服务器端文件准备完成"

# 步骤5: 检查部署脚本
echo -e "${BLUE}[5/6] 检查部署环境...${NC}"

ssh "$SERVER" bash << ENDSSH
    set -e
    cd "$REMOTE_PATH"
    
    # 检查Docker
    if command -v docker &> /dev/null; then
        echo "✅ Docker已安装: \$(docker --version)"
    else
        echo "⚠️  Docker未安装，将在部署时自动安装"
    fi
    
    # 检查环境变量文件
    if [ -f .env.production ]; then
        echo "✅ 环境变量文件已存在"
    else
        echo "⚠️  环境变量文件不存在，将使用默认配置"
    fi
    
    # 确保部署脚本可执行
    chmod +x deploy-ubuntu-simple.sh 2>/dev/null || true
    
    echo "✅ 环境检查完成"
ENDSSH

# 步骤6: 执行部署
echo -e "${BLUE}[6/6] 开始自动部署...${NC}"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  正在服务器上执行部署脚本...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

ssh "$SERVER" bash << 'ENDSSH'
    set -e
    cd "$REMOTE_PATH"
    
    # 运行部署脚本
    if [ -f deploy-ubuntu-simple.sh ]; then
        ./deploy-ubuntu-simple.sh
    else
        echo "⚠️  deploy-ubuntu-simple.sh 不存在，手动部署..."
        
        # 检查是否需要安装Docker
        if ! command -v docker &> /dev/null; then
            echo "安装Docker..."
            curl -fsSL https://get.docker.com -o get-docker.sh
            sudo sh get-docker.sh
            sudo usermod -aG docker $USER
            rm get-docker.sh
            echo "Docker安装完成，请重新登录后再次运行部署"
            exit 0
        fi
        
        # 配置环境变量（如果不存在）
        if [ ! -f .env.production ]; then
            echo "创建默认环境变量..."
            cp .env.production.example .env.production 2>/dev/null || \
            cp env.cloud.template .env.production 2>/dev/null || \
            cp env.example .env.production 2>/dev/null || true
        fi
        
        # 构建和启动
        echo "构建Docker镜像..."
        docker compose build --platform linux/amd64
        
        echo "启动服务..."
        docker compose up -d
        
        echo "等待服务启动..."
        sleep 20
        
        # 初始化数据库
        if [ -f database/migrations/002_create_user_action_logs.sql ]; then
            echo "初始化数据库..."
            docker compose exec -T db mysql -u health_app -pappPass123! health_hub < database/migrations/002_create_user_action_logs.sql 2>/dev/null || true
        fi
        
        echo "✅ 部署完成！"
    fi
ENDSSH

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                   ║${NC}"
echo -e "${GREEN}║           🎉 部署完成！                           ║${NC}"
echo -e "${GREEN}║                                                   ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

# 获取服务器IP
SERVER_IP=$(ssh "$SERVER" "hostname -I | awk '{print \$1}'")

echo -e "${YELLOW}📋 访问信息:${NC}"
echo "   🌐 应用地址: http://${SERVER_IP}:3000"
echo "   🗄️ MySQL端口: ${SERVER_IP}:3307"
echo ""

echo -e "${YELLOW}📊 查看服务状态:${NC}"
echo "   ssh $SERVER 'cd $REMOTE_PATH && docker compose ps'"
echo ""

echo -e "${YELLOW}📝 查看应用日志:${NC}"
echo "   ssh $SERVER 'cd $REMOTE_PATH && docker compose logs -f app'"
echo ""

echo -e "${YELLOW}🔄 重新部署:${NC}"
echo "   $0 $SERVER $REMOTE_PATH"
echo ""

echo -e "${GREEN}✨ 完成！${NC}"

