#!/bin/bash
set -euo pipefail

BLUE='\033[0;34m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log(){ echo -e "${BLUE}[INFO]${NC} $*"; }
ok(){ echo -e "${GREEN}[OK]${NC} $*"; }
warn(){ echo -e "${YELLOW}[WARN]${NC} $*"; }
err(){ echo -e "${RED}[ERR ]${NC} $*" >&2; }

cd "$(dirname "$0")"

# 0) 依赖检查
command -v docker >/dev/null || { err "Docker 未安装"; exit 1; }
command -v docker-compose >/dev/null || { err "docker-compose 未安装"; exit 1; }
[ -f .env ] || { err "缺少 .env，请先复制并配置 env.example -> .env"; exit 1; }
set -a; source ./.env; set +a

# 1) 启动 Postgres 并等待健康
log "启动 PostgreSQL..."
docker-compose up -d postgres
log "等待数据库就绪..."
for i in {1..60}; do
  if docker-compose exec -T postgres pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" >/dev/null 2>&1; then
    ok "PostgreSQL 就绪"
    break
  fi
  [ $i -eq 60 ] && { err "PostgreSQL 启动超时"; exit 1; }
  sleep 2
done

# 2) 初始化 Schema（若 docker-compose 未挂载 init-db.sql，可手动执行）
if docker-compose exec -T postgres psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "\dt" | grep -q users; then
  log "检测到已存在表，跳过 schema 初始化"
else
  if [ -f ./init-db.sql ]; then
    log "执行 schema 初始化: init-db.sql"
    docker-compose exec -T postgres psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -v ON_ERROR_STOP=1 -f /docker-entrypoint-initdb.d/001-init.sql || \
    docker-compose exec -T postgres psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -v ON_ERROR_STOP=1 -f ./init-db.sql
    ok "Schema 初始化完成"
  else
    warn "未找到 init-db.sql，将依赖容器入口脚本或现有表"
  fi
fi

# 3) 导入数据（可选）
DATA_SQL="../../database/data-import.sql"
if [ -f "$DATA_SQL" ] && [ -s "$DATA_SQL" ]; then
  log "导入数据: $DATA_SQL"
  docker cp "$DATA_SQL" health-hub-postgres:/tmp/data-import.sql
  docker-compose exec -T postgres psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -v ON_ERROR_STOP=1 -f /tmp/data-import.sql
  ok "数据导入完成"
else
  warn "未发现数据文件（$DATA_SQL），跳过数据导入"
fi

# 4) 构建并启动应用与依赖
log "构建应用镜像..."
docker-compose build --no-cache health-hub
log "启动应用/Nginx/Redis..."
docker-compose up -d health-hub nginx redis

# 5) 健康检查
log "等待应用健康检查..."
for i in {1..30}; do
  if curl -fsS http://localhost/api/health >/dev/null 2>&1 || curl -fsS http://localhost/health >/dev/null 2>&1; then
    ok "应用就绪"
    break
  fi
  [ $i -eq 30 ] && { err "应用启动超时"; docker-compose logs --no-color | tail -n 200; exit 1; }
  sleep 2
done

SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "localhost")
ok "部署完成"
echo "访问地址: http://${SERVER_IP}"
echo "管理面板: http://${SERVER_IP}/admin"
echo "健康检查: http://${SERVER_IP}/api/health"


