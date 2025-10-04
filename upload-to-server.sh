#!/usr/bin/env bash

set -euo pipefail

# Health Hub Cloud Upload Script
# Uploads the deployment package to your cloud server

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="${SCRIPT_DIR}/dist"

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
║                 Health Hub Cloud Upload                      ║
║                                                              ║
║  🚀 Upload deployment package to cloud server                ║
║  📦 Automatic server deployment preparation                 ║
║  🔧 Multiple upload methods supported                       ║
║  📋 Complete instructions provided                          ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

# Check if package exists
check_package() {
    log "Checking for deployment package..."

    # Find the latest package
    local latest_package=$(ls -t "$DIST_DIR"/health-hub-cloud-* 2>/dev/null | head -n1)

    if [[ -z "$latest_package" ]]; then
        error "No deployment package found in $DIST_DIR"
    fi

    PACKAGE_DIR="$latest_package"
    PACKAGE_NAME=$(basename "$latest_package")
    TAR_FILE="${DIST_DIR}/${PACKAGE_NAME}.tar.gz"
    ZIP_FILE="${DIST_DIR}/${PACKAGE_NAME}.zip"

    if [[ -f "$TAR_FILE" ]]; then
        ARCHIVE_FILE="$TAR_FILE"
        ARCHIVE_TYPE="tar.gz"
    elif [[ -f "$ZIP_FILE" ]]; then
        ARCHIVE_FILE="$ZIP_FILE"
        ARCHIVE_TYPE="zip"
    else
        error "No archive file found for package: $PACKAGE_NAME"
    fi

    log "Found package: $PACKAGE_NAME"
    log "Archive file: $ARCHIVE_FILE"
    log "Archive size: $(du -h "$ARCHIVE_FILE" | cut -f1)"
}

# Get server information
get_server_info() {
    echo ""
    echo -e "${BLUE}📋 Server Information${NC}"
    echo "=================="
    echo ""

    # Server address
    read -p "Enter your server address (IP or domain): " SERVER_ADDRESS
    if [[ -z "$SERVER_ADDRESS" ]]; then
        error "Server address is required"
    fi

    # SSH user
    read -p "Enter SSH username [root]: " SSH_USER
    SSH_USER=${SSH_USER:-root}

    # SSH port
    read -p "Enter SSH port [22]: " SSH_PORT
    SSH_PORT=${SSH_PORT:-22}

    # Target directory
    read -p "Enter target directory on server [/var/www]: " TARGET_DIR
    TARGET_DIR=${TARGET_DIR:-/var/www}

    # Full server string
    SERVER_STRING="${SSH_USER}@${SERVER_ADDRESS}"
    TARGET_PATH="${SERVER_STRING}:${TARGET_DIR}"

    echo ""
    echo -e "${GREEN}📊 Upload Configuration:${NC}"
    echo "  Server: $SERVER_ADDRESS"
    echo "  User: $SSH_USER"
    echo "  Port: $SSH_PORT"
    echo "  Target: $TARGET_DIR"
    echo "  Package: $PACKAGE_NAME"
    echo "  Archive: $ARCHIVE_FILE ($(du -h "$ARCHIVE_FILE" | cut -f1))"
    echo ""
}

# Test server connection
test_connection() {
    log "Testing server connection..."

    if ! ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -p "$SSH_PORT" "$SERVER_STRING" "echo 'Connection successful'" >/dev/null 2>&1; then
        error "Cannot connect to server: $SERVER_STRING"
    fi

    success "Server connection successful"
}

# Upload using SCP
upload_scp() {
    log "Uploading package using SCP..."

    echo ""
    echo -e "${YELLOW}📤 Uploading to server...${NC}"
    echo "This may take several minutes depending on file size and network speed."
    echo "Press Ctrl+C to cancel if needed."
    echo ""

    if scp -o StrictHostKeyChecking=no -P "$SSH_PORT" "$ARCHIVE_FILE" "$TARGET_PATH"/; then
        success "Upload completed successfully"
        return 0
    else
        error "Upload failed"
    fi
}

# Upload using rsync
upload_rsync() {
    log "Uploading package using rsync..."

    echo ""
    echo -e "${YELLOW}📤 Uploading to server...${NC}"
    echo "rsync supports resume and progress display."
    echo "This may take several minutes depending on file size and network speed."
    echo ""

    if rsync -avz --progress -e "ssh -p $SSH_PORT -o StrictHostKeyChecking=no" "$ARCHIVE_FILE" "$TARGET_PATH"/; then
        success "Upload completed successfully"
        return 0
    else
        error "Upload failed"
    fi
}

# Choose upload method
choose_upload_method() {
    echo ""
    echo -e "${BLUE}📤 Choose Upload Method${NC}"
    echo "======================"
    echo ""
    echo "1) SCP (recommended for most cases)"
    echo "2) rsync (better for large files, supports resume)"
    echo "3) FTP (if SSH is not available)"
    echo ""

    read -p "Enter your choice [1]: " choice
    choice=${choice:-1}

    case $choice in
        1)
            upload_scp
            ;;
        2)
            if ! command -v rsync >/dev/null; then
                warn "rsync not found, falling back to SCP"
                upload_scp
            else
                upload_rsync
            fi
            ;;
        3)
            echo ""
            echo -e "${YELLOW}📤 FTP Upload Instructions:${NC}"
            echo "1. Use an FTP client like FileZilla"
            echo "2. Connect to: $SERVER_ADDRESS"
            echo "3. Username: $SSH_USER"
            echo "4. Upload the following file:"
            echo "   Local: $ARCHIVE_FILE"
            echo "   Remote: $TARGET_DIR/"
            echo ""
            read -p "Press Enter when FTP upload is complete..."
            ;;
        *)
            warn "Invalid choice, using SCP"
            upload_scp
            ;;
    esac
}

# Extract and deploy on server
server_extract_and_deploy() {
    log "Extracting and preparing deployment on server..."

    local remote_commands="
        cd $TARGET_DIR && \
        echo '📦 Extracting package...' && \
        tar -xzf ${PACKAGE_NAME}.tar.gz && \
        cd $PACKAGE_NAME && \
        echo '🔧 Setting permissions...' && \
        chmod +x deploy.sh && \
        chmod +x scripts/*.sh && \
        echo '✅ Package extracted successfully' && \
        echo '📋 Next steps:' && \
        echo '1. cd $TARGET_DIR/$PACKAGE_NAME' && \
        echo '2. cp .env.example .env' && \
        echo '3. nano .env  # Configure your settings' && \
        echo '4. ./deploy.sh  # Start deployment' && \
        echo '' && \
        echo '📖 See README.md for detailed instructions'
    "

    echo ""
    echo -e "${YELLOW}🔧 Server-side setup...${NC}"
    echo ""

    if ssh -o StrictHostKeyChecking=no -p "$SSH_PORT" "$SERVER_STRING" "$remote_commands"; then
        success "Server-side setup completed"
    else
        error "Server-side setup failed"
    fi
}

# Generate deployment instructions
generate_deployment_instructions() {
    echo ""
    echo -e "${GREEN}🎯 Deployment Instructions${NC}"
    echo "=========================="
    echo ""
    echo -e "${BLUE}📋 Server Connection:${NC}"
    echo "  ssh -p $SSH_PORT $SERVER_STRING"
    echo ""
    echo -e "${BLUE}📁 Navigate to Package:${NC}"
    echo "  cd $TARGET_DIR/$PACKAGE_NAME"
    echo ""
    echo -e "${BLUE}⚙️ Configure Environment:${NC}"
    echo "  cp .env.example .env"
    echo "  nano .env  # Edit configuration"
    echo ""
    echo -e "${BLUE}🚀 Deploy Application:${NC}"
    echo "  ./deploy.sh  # Traditional deployment"
    echo "  ./docker-deploy.sh  # Docker deployment"
    echo ""
    echo -e "${YELLOW}⚠️ Required Environment Variables:${NC}"
    echo "  DATABASE_TYPE=mysql"
    echo "  DB_HOST=your-database-host"
    echo "  DB_DATABASE=health_hub"
    echo "  DB_USERNAME=your-db-user"
    echo "  DB_PASSWORD=your-db-password"
    echo "  NEXTAUTH_URL=https://your-domain.com"
    echo "  NEXTAUTH_SECRET=32-character-secret"
    echo ""
    echo -e "${GREEN}📖 Documentation:${NC}"
    echo "  README.md - Quick start guide"
    echo "  config/CLOUD_DEPLOYMENT_GUIDE.md - Detailed guide"
    echo ""
    echo -e "${YELLOW}🔧 Useful Commands:${NC}"
    echo "  pm2 status  # Check app status (if using PM2)"
    echo "  pm2 logs    # View application logs"
    echo "  docker compose logs -f  # Docker logs"
    echo ""
}

# Main execution
main() {
    show_banner

    log "Starting Health Hub cloud upload process..."

    # Check package
    check_package

    # Get server information
    get_server_info

    # Test connection
    test_connection

    # Choose and perform upload
    choose_upload_method

    # Server-side setup
    server_extract_and_deploy

    # Generate instructions
    generate_deployment_instructions

    echo ""
    success "Upload and setup completed successfully!"
    echo ""
    echo -e "${GREEN}🚀 Next Steps:${NC}"
    echo "   1. SSH to your server: ssh -p $SSH_PORT $SERVER_STRING"
    echo "   2. Navigate to package: cd $TARGET_DIR/$PACKAGE_NAME"
    echo "   3. Configure environment: cp .env.example .env && nano .env"
    echo "   4. Deploy application: ./deploy.sh"
    echo ""
    echo -e "${YELLOW}⚠️ Important:${NC}"
    echo "   - Change all default passwords after deployment"
    echo "   - Configure SSL certificate for production"
    echo "   - Set up monitoring and backup strategies"
    echo ""
    echo -e "${GREEN}✨ Happy deploying!${NC}"
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Health Hub Cloud Upload Script"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "This script helps you upload the deployment package to your cloud server"
        echo "and provides step-by-step deployment instructions."
        echo ""
        echo "Options:"
        echo "  --help, -h    Show this help message"
        echo "  --test        Test server connection only"
        echo ""
        echo "The script will:"
        echo "  1. Check for deployment package"
        echo "  2. Get server connection information"
        echo "  3. Test server connectivity"
        echo "  4. Upload package using SCP or rsync"
        echo "  5. Extract and prepare on server"
        echo "  6. Generate deployment instructions"
        echo ""
        echo "Example usage:"
        echo "  $0                    # Interactive upload"
        echo "  $0 --test            # Test connection only"
        echo ""
        echo "Before running, make sure you have:"
        echo "  - Generated a deployment package with create-cloud-package.sh"
        echo "  - SSH access to your server"
        echo "  - Network connectivity to your server"
        exit 0
        ;;
    --test)
        log "Testing server connection..."

        read -p "Enter server address: " SERVER_ADDRESS
        read -p "Enter SSH username [root]: " SSH_USER
        SSH_USER=${SSH_USER:-root}
        read -p "Enter SSH port [22]: " SSH_PORT
        SSH_PORT=${SSH_PORT:-22}

        SERVER_STRING="${SSH_USER}@${SERVER_ADDRESS}"

        if ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -p "$SSH_PORT" "$SERVER_STRING" "echo 'Connection successful'"; then
            success "Server connection successful"
        else
            error "Cannot connect to server: $SERVER_STRING"
        fi
        exit 0
        ;;
    *)
        main
        ;;
esac
