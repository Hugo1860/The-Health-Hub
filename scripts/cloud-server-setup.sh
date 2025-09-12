#!/bin/bash

# 🌐 健闻局云服务器环境自动配置脚本
# 适用于 Ubuntu 20.04+ 和 CentOS 7+

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

echo "🌐 健闻局云服务器环境配置"
echo "========================="
echo ""

# 检测操作系统
detect_os() {
    print_info "检测操作系统..."
    
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    else
        print_error "无法检测操作系统版本"
        exit 1
    fi
    
    print_success "检测到系统: $OS $VER"
}

# 更新系统
update_system() {
    print_info "更新系统包..."
    
    if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
        apt update && apt upgrade -y
    elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]]; then
        yum update -y
    else
        print_warning "未知的操作系统，跳过系统更新"
    fi
    
    print_success "系统更新完成"
}

# 安装基础工具
install_basic_tools() {
    print_info "安装基础工具..."
    
    if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
        apt install -y curl wget git unzip htop nano vim build-essential
    elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]]; then
        yum install -y curl wget git unzip htop nano vim gcc gcc-c++ make
    fi
    
    print_success "基础工具安装完成"
}

# 安装 Node.js
install_nodejs() {
    print_info "安装 Node.js 18.x..."
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_warning "Node.js 已安装: $NODE_VERSION"
        return 0
    fi
    
    # 安装 NodeSource 仓库
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    
    if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
        apt-get install -y nodejs
    elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]]; then
        yum install -y nodejs npm
    fi
    
    # 验证安装
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    
    print_success "Node.js 安装完成: $NODE_VERSION"
    print_success "NPM 版本: $NPM_VERSION"
}

# 安装 PM2
install_pm2() {
    print_info "安装 PM2 进程管理器..."
    
    if command -v pm2 &> /dev/null; then
        print_warning "PM2 已安装"
        return 0
    fi
    
    npm install -g pm2
    
    # 配置 PM2 开机启动
    pm2 startup
    
    print_success "PM2 安装完成"
}

# 安装 PostgreSQL
install_postgresql() {
    print_info "安装 PostgreSQL..."
    
    if command -v psql &> /dev/null; then
        PG_VERSION=$(psql --version | awk '{print $3}')
        print_warning "PostgreSQL 已安装: $PG_VERSION"
        return 0
    fi
    
    if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
        # 安装 PostgreSQL 官方仓库
        wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
        echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list
        apt update
        apt install -y postgresql-14 postgresql-client-14 postgresql-contrib-14
    elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]]; then
        yum install -y postgresql-server postgresql-contrib
        postgresql-setup initdb
    fi
    
    # 启动并启用 PostgreSQL
    systemctl start postgresql
    systemctl enable postgresql
    
    print_success "PostgreSQL 安装完成"
}

# 配置 PostgreSQL
configure_postgresql() {
    print_info "配置 PostgreSQL..."
    
    # 创建应用数据库和用户
    sudo -u postgres psql << 'EOF'
CREATE USER healthhub_user WITH ENCRYPTED PASSWORD 'healthhub_default_password';
CREATE DATABASE health_hub OWNER healthhub_user;
GRANT ALL PRIVILEGES ON DATABASE health_hub TO healthhub_user;
ALTER USER healthhub_user CREATEDB;
\q
EOF
    
    # 配置 PostgreSQL 允许本地连接
    PG_VERSION=$(sudo -u postgres psql -t -c "SELECT version();" | grep -oP '\d+\.\d+' | head -1)
    PG_CONFIG_DIR="/etc/postgresql/${PG_VERSION}/main"
    
    if [ -d "$PG_CONFIG_DIR" ]; then
        # 备份原始配置
        cp "$PG_CONFIG_DIR/postgresql.conf" "$PG_CONFIG_DIR/postgresql.conf.backup"
        cp "$PG_CONFIG_DIR/pg_hba.conf" "$PG_CONFIG_DIR/pg_hba.conf.backup"
        
        # 修改配置允许本地连接
        sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" "$PG_CONFIG_DIR/postgresql.conf"
        
        # 重启 PostgreSQL
        systemctl restart postgresql
    fi
    
    print_success "PostgreSQL 配置完成"
    print_warning "默认数据库密码: healthhub_default_password (请在生产环境中修改)"
}

# 安装 Nginx
install_nginx() {
    print_info "安装 Nginx..."
    
    if command -v nginx &> /dev/null; then
        print_warning "Nginx 已安装"
        return 0
    fi
    
    if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
        apt install -y nginx
    elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]]; then
        yum install -y nginx
    fi
    
    # 启动并启用 Nginx
    systemctl start nginx
    systemctl enable nginx
    
    print_success "Nginx 安装完成"
}

# 配置防火墙
configure_firewall() {
    print_info "配置防火墙..."
    
    if command -v ufw &> /dev/null; then
        # Ubuntu UFW
        ufw --force enable
        ufw allow ssh
        ufw allow 80/tcp
        ufw allow 443/tcp
        ufw allow 3000/tcp
        print_success "UFW 防火墙配置完成"
    elif command -v firewall-cmd &> /dev/null; then
        # CentOS/RHEL firewalld
        systemctl start firewalld
        systemctl enable firewalld
        firewall-cmd --permanent --add-service=ssh
        firewall-cmd --permanent --add-service=http
        firewall-cmd --permanent --add-service=https
        firewall-cmd --permanent --add-port=3000/tcp
        firewall-cmd --reload
        print_success "Firewalld 防火墙配置完成"
    else
        print_warning "未检测到防火墙，请手动配置"
    fi
}

# 创建应用目录
create_app_directories() {
    print_info "创建应用目录..."
    
    mkdir -p /var/www/health-hub
    mkdir -p /var/log/health-hub
    mkdir -p /var/backups/health-hub
    
    # 设置权限
    chown -R www-data:www-data /var/www/health-hub 2>/dev/null || chown -R nginx:nginx /var/www/health-hub
    chmod -R 755 /var/www/health-hub
    
    print_success "应用目录创建完成"
}

# 配置 Nginx 反向代理
configure_nginx_proxy() {
    print_info "配置 Nginx 反向代理..."
    
    cat > /etc/nginx/sites-available/health-hub << 'EOF'
server {
    listen 80;
    server_name _;
    
    client_max_body_size 100M;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
    
    location /uploads/ {
        alias /var/www/health-hub/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location /static/ {
        alias /var/www/health-hub/.next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
    
    # 启用站点
    if [ -d "/etc/nginx/sites-enabled" ]; then
        ln -sf /etc/nginx/sites-available/health-hub /etc/nginx/sites-enabled/
        rm -f /etc/nginx/sites-enabled/default
    else
        # CentOS/RHEL
        cp /etc/nginx/sites-available/health-hub /etc/nginx/conf.d/health-hub.conf
    fi
    
    # 测试配置
    nginx -t
    systemctl reload nginx
    
    print_success "Nginx 反向代理配置完成"
}

# 安装 SSL 证书工具
install_certbot() {
    print_info "安装 Certbot SSL 证书工具..."
    
    if command -v certbot &> /dev/null; then
        print_warning "Certbot 已安装"
        return 0
    fi
    
    if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
        apt install -y certbot python3-certbot-nginx
    elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]]; then
        yum install -y certbot python3-certbot-nginx
    fi
    
    print_success "Certbot 安装完成"
    print_info "使用命令获取SSL证书: certbot --nginx -d your-domain.com"
}

# 创建部署脚本
create_deployment_script() {
    print_info "创建部署脚本..."
    
    cat > /var/www/health-hub/deploy.sh << 'EOF'
#!/bin/bash

# 健闻局应用部署脚本

set -e

APP_DIR="/var/www/health-hub"
cd "$APP_DIR"

echo "🚀 开始部署健闻局应用..."

# 安装依赖
echo "📦 安装依赖..."
npm ci --production

# 构建应用
echo "🔨 构建应用..."
npm run build

# 重启应用
echo "🔄 重启应用..."
pm2 restart health-hub || pm2 start npm --name "health-hub" -- start

# 保存 PM2 配置
pm2 save

echo "✅ 部署完成！"
EOF
    
    chmod +x /var/www/health-hub/deploy.sh
    
    print_success "部署脚本创建完成"
}

# 创建系统服务监控脚本
create_monitoring_script() {
    print_info "创建系统监控脚本..."
    
    cat > /usr/local/bin/health-hub-monitor.sh << 'EOF'
#!/bin/bash

# 健闻局系统监控脚本

LOG_FILE="/var/log/health-hub/monitor.log"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# 检查应用状态
check_app() {
    if ! pm2 describe health-hub >/dev/null 2>&1; then
        log "ERROR: 应用进程不存在"
        return 1
    fi
    
    if ! curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
        log "ERROR: 应用健康检查失败"
        return 1
    fi
    
    return 0
}

# 检查数据库状态
check_database() {
    if ! systemctl is-active --quiet postgresql; then
        log "ERROR: PostgreSQL 服务未运行"
        return 1
    fi
    
    if ! sudo -u postgres psql -c "SELECT 1;" >/dev/null 2>&1; then
        log "ERROR: 数据库连接失败"
        return 1
    fi
    
    return 0
}

# 检查磁盘空间
check_disk_space() {
    DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$DISK_USAGE" -gt 80 ]; then
        log "WARNING: 磁盘使用率过高: ${DISK_USAGE}%"
        return 1
    fi
    
    return 0
}

# 主检查函数
main() {
    if check_app && check_database && check_disk_space; then
        log "INFO: 系统状态正常"
    else
        log "WARNING: 发现系统问题"
        # 可以在这里添加告警通知
    fi
}

main
EOF
    
    chmod +x /usr/local/bin/health-hub-monitor.sh
    
    # 添加到 crontab
    (crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/health-hub-monitor.sh") | crontab -
    
    print_success "监控脚本创建完成"
}

# 显示部署后信息
show_deployment_info() {
    echo ""
    print_success "🎉 云服务器环境配置完成！"
    echo ""
    echo "📋 配置信息:"
    echo "  - Node.js: $(node --version)"
    echo "  - NPM: $(npm --version)"
    echo "  - PostgreSQL: $(sudo -u postgres psql -t -c 'SELECT version();' | head -1 | awk '{print $2}')"
    echo "  - PM2: $(pm2 --version)"
    echo "  - Nginx: $(nginx -v 2>&1 | awk '{print $3}')"
    echo ""
    echo "📁 重要目录:"
    echo "  - 应用目录: /var/www/health-hub"
    echo "  - 日志目录: /var/log/health-hub"
    echo "  - 备份目录: /var/backups/health-hub"
    echo ""
    echo "🔧 重要命令:"
    echo "  - 部署应用: /var/www/health-hub/deploy.sh"
    echo "  - 查看应用状态: pm2 status"
    echo "  - 查看应用日志: pm2 logs health-hub"
    echo "  - 重启应用: pm2 restart health-hub"
    echo ""
    echo "🌐 下一步:"
    echo "  1. 将应用文件上传到 /var/www/health-hub"
    echo "  2. 配置环境变量 (.env 文件)"
    echo "  3. 运行部署脚本"
    echo "  4. 配置域名和SSL证书"
    echo ""
    echo "🔒 安全提醒:"
    echo "  - 请修改默认的数据库密码"
    echo "  - 配置防火墙规则"
    echo "  - 启用SSL证书"
    echo "  - 定期更新系统和应用"
}

# 主函数
main() {
    detect_os
    update_system
    install_basic_tools
    install_nodejs
    install_pm2
    install_postgresql
    configure_postgresql
    install_nginx
    configure_firewall
    create_app_directories
    configure_nginx_proxy
    install_certbot
    create_deployment_script
    create_monitoring_script
    show_deployment_info
}

# 错误处理
trap 'print_error "配置过程中出现错误"; exit 1' ERR

# 检查root权限
if [ "$EUID" -ne 0 ]; then
    print_error "请使用root权限运行此脚本"
    exit 1
fi

# 执行主函数
main "$@"
