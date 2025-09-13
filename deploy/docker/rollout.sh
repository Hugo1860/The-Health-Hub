#!/bin/bash
set -euo pipefail

BLUE='\033[0;34m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log(){ echo -e "${BLUE}[INFO]${NC} $*"; }
ok(){ echo -e "${GREEN}[OK]${NC} $*"; }
warn(){ echo -e "${YELLOW}[WARN]${NC} $*"; }
err(){ echo -e "${RED}[ERR ]${NC} $*" >&2; }

cd "$(dirname "$0")"

if command -v docker compose >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/devnull 2>&1; then
  DC="docker-compose"
else
  err "未检测到 docker compose 或 docker-compose"; exit 1;
fi

# 变量：镜像标签
TAG=${TAG:-latest}
export TAG

log "拉取镜像 ghcr.io/${GH_OWNER:-${COMPOSE_PROJECT_NAME:-health-hub-owner}}/the-health-hub:${TAG}"
${DC} -f docker-compose.prod.yml pull health-hub

log "以零停机方式更新应用容器"
${DC} -f docker-compose.prod.yml up -d health-hub

# 健康检查
log "等待应用健康..."
for i in {1..30}; do
  if curl -fsS http://localhost/api/health >/dev/null 2>&1 || curl -fsS http://localhost/health >/dev/null 2>&1; then
    ok "应用健康，更新完成"
    exit 0
  fi
  [ $i -eq 30 ] && { err "应用健康检查失败"; ${DC} -f docker-compose.prod.yml logs --no-color health-hub | tail -n 200; exit 1; }
  sleep 2
done


