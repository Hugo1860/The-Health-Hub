#!/bin/bash
set -euo pipefail

BLUE='\033[0;34m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log(){ echo -e "${BLUE}[INFO]${NC} $*"; }
ok(){ echo -e "${GREEN}[OK]${NC} $*"; }
err(){ echo -e "${RED}[ERR ]${NC} $*" >&2; }

# 项目根
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_FILE="${ROOT_DIR}/database/data-import.sql"

cd "${ROOT_DIR}/deploy/docker"
[ -f .env ] || { err ".env 不存在，请先 cp env.example .env 并填写变量"; exit 1; }
set -a; source ./.env; set +a

# 导出策略：优先容器 pg_dump；如容器未运行，回退到本机 pg_dump（需 PATH 有 pg_dump）
if docker ps --format '{{.Names}}' | grep -q '^health-hub-postgres$'; then
  log "检测到容器 health-hub-postgres，开始容器内导出..."
  docker exec health-hub-postgres sh -lc "pg_dump -U \"$POSTGRES_USER\" -d \"$POSTGRES_DB\" --data-only --no-owner --inserts --column-inserts" > "$OUT_FILE"
  ok "已导出到 $OUT_FILE"
else
  log "未检测到容器，尝试使用本机 pg_dump（要求已安装并可访问目标数据库）..."
  : "${PGHOST:=localhost}"
  : "${PGPORT:=5432}"
  : "${PGUSER:=$POSTGRES_USER}"
  : "${PGDATABASE:=$POSTGRES_DB}"
  PGPASSWORD="${POSTGRES_PASSWORD:-}" pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" --data-only --no-owner --inserts --column-inserts > "$OUT_FILE"
  ok "已导出到 $OUT_FILE"
fi

ls -lh "$OUT_FILE" | awk '{print "[SIZE] "$5"  "$(NF)}'


