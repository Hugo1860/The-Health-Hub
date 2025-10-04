#!/usr/bin/env bash

set -euo pipefail

# Health Hub Quick Cloud Deploy
# One-command solution for packaging and preparing cloud deployment

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Display banner
show_banner() {
    echo -e "${GREEN}"
    cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║              Health Hub Quick Cloud Deploy                  ║
║                                                              ║
║  🚀 One-command cloud deployment preparation                ║
║  📦 Automatic packaging and configuration                   ║
║  🗄️ Database scripts and Docker configs included            ║
║  📚 Complete documentation and guides                        ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

# Check if we're in the right directory
check_project() {
    log "Checking project structure..."

    if [[ ! -f "$SCRIPT_DIR/package.json" ]]; then
        error "package.json not found. Are you in the Health Hub project directory?"
    fi

    if [[ ! -d "$SCRIPT_DIR/src" ]]; then
        error "src/ directory not found. This doesn't look like a Health Hub project."
    fi

    if [[ ! -d "$SCRIPT_DIR/database" ]]; then
        error "database/ directory not found. Database scripts are missing."
    fi

    success "Project structure verified"
}

# Create cloud deployment package
create_cloud_package() {
    log "Creating cloud deployment package..."

    # Use the comprehensive packaging script
    if [[ -f "$SCRIPT_DIR/create-cloud-package.sh" ]]; then
        log "Running comprehensive packaging script..."
        "$SCRIPT_DIR/create-cloud-package.sh"
    else
        warn "create-cloud-package.sh not found, using basic packaging..."
        "$SCRIPT_DIR/scripts/package-for-deployment.sh"
    fi

    success "Cloud deployment package created"
}

# Generate upload instructions
generate_upload_instructions() {
    log "Generating upload instructions..."

    local package_dir="$SCRIPT_DIR/dist"
    local latest_package=$(ls -t "$package_dir"/health-hub-cloud-* 2>/dev/null | head -n1)

    if [[ -z "$latest_package" ]]; then
        latest_package=$(ls -t "$package_dir"/health-hub-complete-* 2>/dev/null | head -n1)
    fi

    if [[ -z "$latest_package" ]]; then
        error "No deployment package found in $package_dir"
    fi

    local package_name=$(basename "$latest_package")
    local tar_file="${package_dir}/${package_name}.tar.gz"
    local zip_file="${package_dir}/${package_name}.zip"

    echo ""
    echo -e "${GREEN}📋 Upload Instructions${NC}"
    echo "=================="
    echo ""

    if [[ -f "$tar_file" ]]; then
        echo -e "${YELLOW}📦 Upload this file to your cloud server:${NC}"
        echo "   $tar_file"
        echo "   Size: $(du -h "$tar_file" | cut -f1)"
        echo ""
        echo -e "${BLUE}Upload commands:${NC}"
        echo "# Using scp (replace 'your-server' with your server IP/domain)"
        echo "scp '$tar_file' your-server:~/"
        echo ""
        echo "# Using rsync (recommended for large files)"
        echo "rsync -avz '$tar_file' your-server:~/"
        echo ""
        echo "# Using FTP (if SSH not available)"
        echo "# Upload via FTP client to your server"
        echo ""
    fi

    if [[ -f "$zip_file" ]]; then
        echo -e "${YELLOW}📦 Alternative upload (Windows compatibility):${NC}"
        echo "   $zip_file"
        echo ""
    fi

    echo -e "${GREEN}🚀 Server Deployment Commands${NC}"
    echo "=========================="
    echo ""
    echo "# Connect to your server"
    echo "ssh your-server"
    echo ""
    echo "# Extract the package"
    echo "tar -xzf ${package_name}.tar.gz"
    echo "cd $package_name"
    echo ""
    echo "# Configure environment"
    echo "cp .env.example .env"
    echo "nano .env  # Edit configuration"
    echo ""
    echo "# Deploy application"
    echo "./deploy.sh"
    echo ""
    echo -e "${BLUE}Alternative deployment options:${NC}"
    echo "# Docker deployment"
    echo "./docker-deploy.sh"
    echo ""
    echo "# Manual database setup (if needed)"
    echo "./scripts/init-cloud-database.sh mysql"
    echo ""
    echo -e "${YELLOW}⚠️  Important Post-Deployment Steps:${NC}"
    echo "1. Change all default passwords"
    echo "2. Configure SSL certificate"
    echo "3. Set up monitoring and backups"
    echo "4. Test all application features"
    echo ""
    echo -e "${GREEN}📖 Documentation:${NC}"
    echo "  README.md - Quick start guide"
    echo "  config/CLOUD_DEPLOYMENT_GUIDE.md - Detailed guide"
    echo "  database/README-cloud-init.md - Database setup"
    echo ""
}

# Verify package contents
verify_package() {
    log "Verifying package contents..."

    local package_dir="$SCRIPT_DIR/dist"
    local latest_package=$(ls -t "$package_dir"/health-hub-cloud-* 2>/dev/null | head -n1)

    if [[ -z "$latest_package" ]]; then
        latest_package=$(ls -t "$package_dir"/health-hub-complete-* 2>/dev/null | head -n1)
    fi

    if [[ -z "$latest_package" ]]; then
        warn "No deployment package found to verify"
        return
    fi

    local package_name=$(basename "$latest_package")
    local tar_file="${package_dir}/${package_name}.tar.gz"

    if [[ -f "$tar_file" ]]; then
        echo -e "${YELLOW}🔍 Package verification:${NC}"
        echo "  Package: $package_name"
        echo "  Size: $(du -h "$tar_file" | cut -f1)"
        echo "  Location: $tar_file"

        # Check for essential files in the package
        if tar -tzf "$tar_file" | grep -q "deploy.sh"; then
            echo "  ✅ Deployment script: deploy.sh"
        fi

        if tar -tzf "$tar_file" | grep -q "database/cloud-init-mysql.sql"; then
            echo "  ✅ Database scripts: MySQL"
        fi

        if tar -tzf "$tar_file" | grep -q "database/cloud-init-postgresql.sql"; then
            echo "  ✅ Database scripts: PostgreSQL"
        fi

        if tar -tzf "$tar_file" | grep -q "docker/docker-compose.yml"; then
            echo "  ✅ Docker configuration"
        fi

        if tar -tzf "$tar_file" | grep -q "config/CLOUD_DEPLOYMENT_GUIDE.md"; then
            echo "  ✅ Documentation: Deployment guide"
        fi

        if tar -tzf "$tar_file" | grep -q "README.md"; then
            echo "  ✅ Documentation: README"
        fi

        echo ""
        success "Package verification completed"
    else
        warn "Package file not found: $tar_file"
    fi
}

# Show deployment checklist
show_deployment_checklist() {
    echo ""
    echo -e "${GREEN}🎯 Deployment Checklist${NC}"
    echo "======================"
    echo ""
    echo -e "${YELLOW}Pre-Deployment:${NC}"
    echo "  [ ] Verify server requirements (Node.js 18+, Docker, etc.)"
    echo "  [ ] Prepare database server (MySQL 8+ or PostgreSQL 13+)"
    echo "  [ ] Setup domain name and SSL certificate"
    echo "  [ ] Configure firewall and security groups"
    echo ""
    echo -e "${YELLOW}During Deployment:${NC}"
    echo "  [ ] Upload package to server"
    echo "  [ ] Extract and configure environment"
    echo "  [ ] Run database initialization"
    echo "  [ ] Start application services"
    echo "  [ ] Test basic functionality"
    echo ""
    echo -e "${YELLOW}Post-Deployment:${NC}"
    echo "  [ ] Change all default passwords"
    echo "  [ ] Configure SSL certificate"
    echo "  [ ] Setup monitoring and alerts"
    echo "  [ ] Configure backup strategy"
    echo "  [ ] Test all application features"
    echo "  [ ] Performance optimization"
    echo "  [ ] Security audit"
    echo ""
    echo -e "${BLUE}🔧 Quick Commands:${NC}"
    echo "  # Package creation"
    echo "  ./create-cloud-package.sh"
    echo ""
    echo "  # Upload to server"
    echo "  scp dist/health-hub-cloud-*.tar.gz your-server:~/"
    echo ""
    echo "  # Server deployment"
    echo "  tar -xzf health-hub-cloud-*.tar.gz"
    echo "  cd health-hub-cloud-*"
    echo "  cp .env.example .env"
    echo "  nano .env  # Configure settings"
    echo "  ./deploy.sh"
    echo ""
}

# Main execution
main() {
    show_banner

    log "Starting Health Hub quick cloud deployment preparation..."

    # Check project
    check_project

    # Create cloud deployment package
    create_cloud_package

    # Generate upload instructions
    generate_upload_instructions

    # Verify package
    verify_package

    # Show deployment checklist
    show_deployment_checklist

    echo ""
    success "Cloud deployment preparation completed!"
    echo ""
    echo -e "${GREEN}🚀 Next Steps:${NC}"
    echo "   1. Upload the package to your cloud server"
    echo "   2. Follow the upload instructions above"
    echo "   3. Complete the deployment checklist"
    echo "   4. Test your deployed application"
    echo ""
    echo -e "${YELLOW}📖 For detailed instructions, see:${NC}"
    echo "   - README.md in the package"
    echo "   - config/CLOUD_DEPLOYMENT_GUIDE.md"
    echo "   - database/README-cloud-init.md"
    echo ""
    echo -e "${GREEN}✨ Happy deploying!${NC}"
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Health Hub Quick Cloud Deploy"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "This script creates a complete cloud deployment package and provides"
        echo "upload instructions for easy cloud server deployment."
        echo ""
        echo "Options:"
        echo "  --help, -h    Show this help message"
        echo "  --verify      Only verify existing package (no creation)"
        echo ""
        echo "The deployment package includes:"
        echo "  - Built Next.js application"
        echo "  - Cloud database initialization scripts"
        echo "  - Docker and traditional deployment options"
        echo "  - Complete documentation and guides"
        echo "  - Security and monitoring configurations"
        echo ""
        echo "Output files:"
        echo "  - dist/health-hub-cloud-YYYYMMDD_HHMMSS.tar.gz"
        echo "  - dist/health-hub-cloud-YYYYMMDD_HHMMSS.zip (if zip available)"
        echo ""
        echo "Example usage:"
        echo "  $0                    # Create package and show instructions"
        echo "  $0 --verify          # Only verify existing package"
        exit 0
        ;;
    --verify)
        verify_package
        generate_upload_instructions
        show_deployment_checklist
        exit 0
        ;;
    *)
        main
        ;;
esac
