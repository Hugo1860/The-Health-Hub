#!/bin/bash
set -euo pipefail

BLUE='\033[0;34m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log(){ echo -e "${BLUE}[INFO]${NC} $*"; }
ok(){ echo -e "${GREEN}[OK]${NC} $*"; }
warn(){ echo -e "${YELLOW}[WARN]${NC} $*"; }
err(){ echo -e "${RED}[ERR ]${NC} $*" >&2; }

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TS=$(date +%Y%m%d_%H%M%S)
PKG="health-hub-docker_${TS}.tar.gz"
BUNDLE_DIR="${ROOT_DIR}/docker_bundle"

log "生成 Docker 部署包（含数据库 SQL）..."
rm -rf "$BUNDLE_DIR"
mkdir -p "$BUNDLE_DIR"

# 1) 复制必要文件
log "复制应用与配置..."
cp -r "$ROOT_DIR/src" "$BUNDLE_DIR/"
cp -r "$ROOT_DIR/public" "$BUNDLE_DIR/"
cp "$ROOT_DIR/package.json" "$BUNDLE_DIR/"
cp "$ROOT_DIR/package-lock.json" "$BUNDLE_DIR/" 2>/dev/null || true
cp "$ROOT_DIR/next.config.js" "$BUNDLE_DIR/" 2>/dev/null || true
cp "$ROOT_DIR/tsconfig.json" "$BUNDLE_DIR/" 2>/dev/null || true
cp "$ROOT_DIR/tailwind.config.js" "$BUNDLE_DIR/" 2>/dev/null || true
cp "$ROOT_DIR/postcss.config.js" "$BUNDLE_DIR/" 2>/dev/null || true

mkdir -p "$BUNDLE_DIR/deploy/docker"
cp "$ROOT_DIR/deploy/docker/docker-compose.yml" "$BUNDLE_DIR/deploy/docker/"
cp "$ROOT_DIR/deploy/docker/Dockerfile" "$BUNDLE_DIR/deploy/docker/"
cp "$ROOT_DIR/deploy/docker/nginx-site.conf" "$BUNDLE_DIR/deploy/docker/"
cp "$ROOT_DIR/deploy/docker/init-db.sql" "$BUNDLE_DIR/deploy/docker/"
cp "$ROOT_DIR/deploy/docker/one-click-docker.sh" "$BUNDLE_DIR/deploy/docker/"
cp "$ROOT_DIR/deploy/docker/env.example" "$BUNDLE_DIR/deploy/docker/"

# 2) 数据库导出（可选）
if [ -x "$ROOT_DIR/deploy/export-db.sh" ]; then
  if [ -f "$ROOT_DIR/deploy/docker/.env" ]; then
    log "执行数据库导出..."
    bash "$ROOT_DIR/deploy/export-db.sh" || warn "数据库导出失败，继续打包"
  else
    warn "未找到 deploy/docker/.env，跳过数据库导出"
  fi
fi
mkdir -p "$BUNDLE_DIR/database"
if [ -s "$ROOT_DIR/database/data-import.sql" ]; then
  cp "$ROOT_DIR/database/data-import.sql" "$BUNDLE_DIR/database/"
  ok "已包含 data-import.sql"
else
  warn "未包含 data-import.sql（可部署后再导入）"
fi

# 3) 文档
mkdir -p "$BUNDLE_DIR/docs"
cp "$ROOT_DIR/docs/API_ENDPOINTS.md" "$BUNDLE_DIR/docs/" 2>/dev/null || true

# 4) 打包
log "创建压缩包: $PKG"
tar -czf "$PKG" -C "$BUNDLE_DIR" .
SIZE=$(du -h "$PKG" | cut -f1)
ok "完成: $PKG (大小: $SIZE)"
echo "上传: scp $PKG ubuntu@<server-ip>:/opt/"


