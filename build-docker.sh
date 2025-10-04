#!/bin/bash
#
# Docker 镜像构建脚本
# 用于在 Mac M3 上构建适用于不同架构的镜像
#

set -euo pipefail

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# 默认参数
VERSION=${1:-latest}
PLATFORM=${2:-linux/amd64}
NO_CACHE=${3:-false}

echo -e "${GREEN}"
cat << "EOF"
╔════════════════════════════════════════════════════╗
║                                                    ║
║        Health Hub Docker 构建工具                 ║
║                                                    ║
║  🐳 支持多架构构建                                 ║
║  📦 针对生产环境优化                               ║
║                                                    ║
╚════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${BLUE}📋 构建配置:${NC}"
echo "  版本: $VERSION"
echo "  平台: $PLATFORM"
echo "  无缓存: $NO_CACHE"
echo ""

# 检查Docker是否运行
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker 未运行，请先启动 Docker Desktop${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker 运行正常${NC}"
echo ""

# 清理旧镜像（可选）
read -p "是否清理旧镜像? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🧹 清理旧镜像...${NC}"
    docker compose down 2>/dev/null || true
    docker image rm "health-hub:$VERSION" 2>/dev/null || true
    echo -e "${GREEN}✅ 清理完成${NC}"
fi
echo ""

# 开始构建
echo -e "${BLUE}🔨 开始构建镜像...${NC}"
echo "  这可能需要几分钟时间..."
echo ""

BUILD_ARGS=""
if [ "$NO_CACHE" = "true" ]; then
    BUILD_ARGS="--no-cache"
fi

# 使用docker compose构建
if docker compose build $BUILD_ARGS --platform $PLATFORM 2>&1 | tee build.log; then
    echo ""
    echo -e "${GREEN}✅ 构建成功！${NC}"
else
    echo ""
    echo -e "${RED}❌ 构建失败，请查看 build.log${NC}"
    exit 1
fi

# 标记版本
if [ "$VERSION" != "latest" ]; then
    echo ""
    echo -e "${BLUE}🏷️  标记版本...${NC}"
    IMAGE_ID=$(docker images -q health-hub:latest)
    if [ -n "$IMAGE_ID" ]; then
        docker tag "health-hub:latest" "health-hub:$VERSION"
        echo -e "${GREEN}✅ 已标记版本: $VERSION${NC}"
    fi
fi

# 显示镜像信息
echo ""
echo -e "${BLUE}📊 镜像信息:${NC}"
docker images | grep -E "REPOSITORY|health-hub" | head -5

# 检查架构
echo ""
echo -e "${BLUE}🔍 架构信息:${NC}"
ARCH=$(docker inspect health-hub:latest --format '{{.Architecture}}' 2>/dev/null || echo "unknown")
OS=$(docker inspect health-hub:latest --format '{{.Os}}' 2>/dev/null || echo "unknown")
echo "  OS: $OS"
echo "  Architecture: $ARCH"

# 显示镜像大小
SIZE=$(docker images health-hub:latest --format "{{.Size}}" 2>/dev/null || echo "unknown")
echo "  Size: $SIZE"

# 检查是否匹配目标平台
if [[ "$PLATFORM" == *"amd64"* ]] && [[ "$ARCH" == "amd64" ]]; then
    echo -e "${GREEN}✅ 架构匹配: x86_64 (amd64)${NC}"
elif [[ "$PLATFORM" == *"arm64"* ]] && [[ "$ARCH" == "arm64" ]]; then
    echo -e "${GREEN}✅ 架构匹配: ARM64${NC}"
else
    echo -e "${YELLOW}⚠️  架构可能不匹配，请检查${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                    ║${NC}"
echo -e "${GREEN}║            🎉 构建完成！                           ║${NC}"
echo -e "${GREEN}║                                                    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# 下一步提示
echo -e "${YELLOW}📝 下一步操作:${NC}"
echo ""
echo -e "${BLUE}1. 本地测试:${NC}"
echo "   docker compose up -d"
echo "   curl http://localhost:3000"
echo ""
echo -e "${BLUE}2. 导出镜像:${NC}"
echo "   docker save health-hub:$VERSION | gzip > health-hub-$VERSION.tar.gz"
echo ""
echo -e "${BLUE}3. 上传到服务器:${NC}"
echo "   scp health-hub-$VERSION.tar.gz user@server:~/"
echo "   ssh user@server 'docker load < health-hub-$VERSION.tar.gz'"
echo ""
echo -e "${BLUE}4. 或使用部署脚本:${NC}"
echo "   ./upload-and-deploy.sh ubuntu@server-ip"
echo ""

# 询问是否立即测试
read -p "是否立即启动测试? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}🚀 启动服务...${NC}"
    docker compose up -d
    echo ""
    echo -e "${YELLOW}等待服务启动...${NC}"
    sleep 5
    echo ""
    docker compose ps
    echo ""
    echo -e "${GREEN}✅ 服务已启动${NC}"
    echo -e "${BLUE}访问: http://localhost:3000${NC}"
fi

echo ""
echo -e "${GREEN}✨ 完成！${NC}"

