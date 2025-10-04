#!/usr/bin/env bash
#
# 服务器健康检查脚本
# 在服务器上运行，检查所有服务状态
#

set -euo pipefail

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}"
cat << "EOF"
╔═══════════════════════════════════════════════════╗
║                                                   ║
║          Health Hub 健康检查                      ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

check_docker() {
    echo -e "${BLUE}[1/8] 检查 Docker 服务${NC}"
    
    if command -v docker &> /dev/null; then
        echo "✅ Docker已安装: $(docker --version)"
        
        if systemctl is-active --quiet docker; then
            echo "✅ Docker服务运行中"
        else
            echo -e "${RED}❌ Docker服务未运行${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Docker未安装${NC}"
        return 1
    fi
}

check_containers() {
    echo -e "${BLUE}[2/8] 检查容器状态${NC}"
    
    if docker compose ps 2>/dev/null; then
        
        # 检查app容器
        if docker compose ps app | grep -q "Up"; then
            echo "✅ 应用容器运行中"
        else
            echo -e "${RED}❌ 应用容器未运行${NC}"
        fi
        
        # 检查db容器
        if docker compose ps db | grep -q "Up"; then
            echo "✅ 数据库容器运行中"
        else
            echo -e "${RED}❌ 数据库容器未运行${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  无法获取容器状态${NC}"
    fi
}

check_network() {
    echo -e "${BLUE}[3/8] 检查网络连接${NC}"
    
    # 检查容器间网络
    if docker compose exec -T app ping -c 1 db &> /dev/null; then
        echo "✅ 应用到数据库网络正常"
    else
        echo -e "${RED}❌ 应用无法连接到数据库${NC}"
    fi
}

check_ports() {
    echo -e "${BLUE}[4/8] 检查端口占用${NC}"
    
    # 检查3000端口
    if ss -tuln | grep -q ":3000 "; then
        echo "✅ 端口3000已监听"
    else
        echo -e "${YELLOW}⚠️  端口3000未监听${NC}"
    fi
    
    # 检查3307端口
    if ss -tuln | grep -q ":3307 "; then
        echo "✅ 端口3307已监听（MySQL）"
    else
        echo -e "${YELLOW}⚠️  端口3307未监听${NC}"
    fi
}

check_database() {
    echo -e "${BLUE}[5/8] 检查数据库连接${NC}"
    
    if docker compose exec -T db mysql -u health_app -pappPass123! -e "SELECT 1;" &> /dev/null; then
        echo "✅ 数据库连接正常"
        
        # 检查表是否存在
        TABLES=$(docker compose exec -T db mysql -u health_app -pappPass123! health_hub -e "SHOW TABLES;" 2>/dev/null | tail -n +2 | wc -l)
        echo "✅ 数据库表数量: $TABLES"
    else
        echo -e "${RED}❌ 数据库连接失败${NC}"
    fi
}

check_app_health() {
    echo -e "${BLUE}[6/8] 检查应用健康${NC}"
    
    # 检查健康检查端点
    if curl -sf http://localhost:3000/api/health &> /dev/null; then
        echo "✅ 应用健康检查通过"
    else
        echo -e "${YELLOW}⚠️  应用健康检查失败${NC}"
    fi
    
    # 检查首页
    if curl -sf http://localhost:3000 &> /dev/null; then
        echo "✅ 应用首页可访问"
    else
        echo -e "${YELLOW}⚠️  应用首页无法访问${NC}"
    fi
}

check_resources() {
    echo -e "${BLUE}[7/8] 检查系统资源${NC}"
    
    # 内存使用
    MEMORY=$(free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2 }')
    echo "📊 内存使用: $MEMORY"
    
    # 磁盘使用
    DISK=$(df -h / | awk 'NR==2{print $5}')
    echo "💾 磁盘使用: $DISK"
    
    # Docker资源
    echo "🐳 Docker资源使用:"
    docker stats --no-stream --format "   {{.Name}}: CPU {{.CPUPerc}} | 内存 {{.MemUsage}}"
}

check_logs() {
    echo -e "${BLUE}[8/8] 检查最近日志${NC}"
    
    echo "📋 应用日志（最近10条）:"
    docker compose logs --tail=10 app | sed 's/^/   /'
    
    echo ""
    echo "📋 数据库日志（最近5条）:"
    docker compose logs --tail=5 db | sed 's/^/   /'
}

show_summary() {
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║            健康检查完成                           ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════╝${NC}"
    echo ""
    
    SERVER_IP=$(hostname -I | awk '{print $1}')
    
    echo -e "${YELLOW}🔗 访问地址:${NC}"
    echo "   内部: http://localhost:3000"
    echo "   外部: http://${SERVER_IP}:3000"
    echo ""
    
    echo -e "${YELLOW}📊 常用命令:${NC}"
    echo "   查看服务: docker compose ps"
    echo "   查看日志: docker compose logs -f"
    echo "   重启服务: docker compose restart"
    echo "   停止服务: docker compose down"
    echo ""
}

# 主函数
main() {
    local errors=0
    
    check_docker || ((errors++))
    echo ""
    
    check_containers || ((errors++))
    echo ""
    
    check_network || ((errors++))
    echo ""
    
    check_ports || ((errors++))
    echo ""
    
    check_database || ((errors++))
    echo ""
    
    check_app_health || ((errors++))
    echo ""
    
    check_resources || ((errors++))
    echo ""
    
    check_logs || ((errors++))
    echo ""
    
    show_summary
    
    if [ $errors -eq 0 ]; then
        echo -e "${GREEN}✅ 所有检查通过！系统运行正常${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  发现 $errors 个问题，请检查上面的输出${NC}"
        return 1
    fi
}

# 执行主函数
main

