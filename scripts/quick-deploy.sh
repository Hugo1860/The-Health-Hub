#!/usr/bin/env bash

set -euo pipefail

# Health Hub Quick Deploy Script
# One-command deployment with database initialization

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[DEPLOY]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

show_usage() {
    cat << EOF
Health Hub Quick Deploy

Usage: $0 [mode] [options]

Modes:
  local     Deploy locally with MySQL
  docker    Deploy with Docker Compose
  package   Create deployment package
  
Options:
  --init-db     Initialize database with sample data
  --export-db   Export current database before deploy
  --help        Show this help

Examples:
  $0 local --init-db                    # Local deploy with DB init
  $0 docker                             # Docker deploy
  $0 package --export-db                # Create package with DB export
  
Environment Variables:
  DATABASE_URL     MySQL connection string
  NEXTAUTH_SECRET  NextAuth secret key
  MYSQL_PASSWORD   MySQL root password (for Docker)
EOF
}

# Deploy locally
deploy_local() {
    log "Starting local deployment..."
    
    cd "$PROJECT_ROOT"
    
    # Install dependencies
    log "Installing dependencies..."
    npm install
    
    # Initialize database if requested
    if [[ "${INIT_DB:-false}" == "true" ]]; then
        log "Initializing MySQL database..."
        chmod +x scripts/init-mysql-local.sh
        ./scripts/init-mysql-local.sh
    fi
    
    # Set environment variables
    export DATABASE_URL=${DATABASE_URL:-'mysql://root@localhost:3306/health_hub'}
    export DB_DRIVER=mysql
    export NEXTAUTH_URL=${NEXTAUTH_URL:-'http://localhost:3000'}
    export NEXTAUTH_SECRET=${NEXTAUTH_SECRET:-'dev-secret-key-change-in-production'}
    
    # Build and start
    log "Building application..."
    npm run build
    
    log "Starting application..."
    echo ""
    success "Application starting at http://localhost:3000"
    success "Admin panel: http://localhost:3000/admin"
    success "Default admin: admin@example.com / admin123"
    echo ""
    
    npm start
}

# Deploy with Docker
deploy_docker() {
    log "Starting Docker deployment..."
    
    cd "$PROJECT_ROOT"
    
    # Create docker directory if not exists
    mkdir -p docker
    
    # Create .env for docker if not exists
    if [[ ! -f docker/.env ]]; then
        log "Creating Docker environment file..."
        cat > docker/.env << EOF
DATABASE_URL=mysql://root:${MYSQL_PASSWORD:-healthhub123}@db:3306/health_hub
MYSQL_ROOT_PASSWORD=${MYSQL_PASSWORD:-healthhub123}
NEXTAUTH_URL=${NEXTAUTH_URL:-http://localhost:3000}
NEXTAUTH_SECRET=${NEXTAUTH_SECRET:-$(openssl rand -base64 32 2>/dev/null || echo "change-me-in-production")}
DB_DRIVER=mysql
NODE_ENV=production
EOF
        warn "Created docker/.env - please review and update for production"
    fi
    
    # Start services
    log "Building and starting Docker services..."
    cd docker
    docker compose up -d --build
    
    # Wait for services to be ready
    log "Waiting for services to start..."
    sleep 10
    
    # Initialize database if requested
    if [[ "${INIT_DB:-false}" == "true" ]]; then
        log "Initializing database in container..."
        docker compose exec app /usr/local/bin/export-mysql || true
    fi
    
    success "Docker deployment completed!"
    echo ""
    echo "🎉 Services Status:"
    docker compose ps
    echo ""
    success "Application: http://localhost:3000"
    success "Admin panel: http://localhost:3000/admin"
    success "Database: localhost:3306"
    echo ""
    echo "📋 Management Commands:"
    echo "  View logs:    cd docker && docker compose logs -f"
    echo "  Stop:         cd docker && docker compose down"
    echo "  Export DB:    cd docker && docker compose exec app export-mysql"
    echo "  Restart:      cd docker && docker compose restart"
}

# Create deployment package
create_package() {
    log "Creating deployment package..."
    
    # Export database if requested
    if [[ "${EXPORT_DB:-false}" == "true" ]]; then
        log "Exporting database before packaging..."
        cd "$PROJECT_ROOT"
        ./scripts/export-mysql.sh || warn "Database export failed, continuing without export"
    fi
    
    # Run packaging script
    cd "$PROJECT_ROOT"
    chmod +x scripts/package-for-deployment.sh
    ./scripts/package-for-deployment.sh
    
    success "Deployment package created!"
}

# Parse arguments
MODE="${1:-}"
INIT_DB=false
EXPORT_DB=false

shift || true
while [[ $# -gt 0 ]]; do
    case $1 in
        --init-db)
            INIT_DB=true
            shift
            ;;
        --export-db)
            EXPORT_DB=true
            shift
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            warn "Unknown option: $1"
            shift
            ;;
    esac
done

# Execute based on mode
case "$MODE" in
    local)
        deploy_local
        ;;
    docker)
        deploy_docker
        ;;
    package)
        create_package
        ;;
    ""|--help|-h)
        show_usage
        ;;
    *)
        warn "Unknown mode: $MODE"
        show_usage
        exit 1
        ;;
esac
