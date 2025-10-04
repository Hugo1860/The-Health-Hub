#!/usr/bin/env bash

set -euo pipefail

# MySQL 8+ full export helper
# Usage:
#   MYSQL_HOST=... MYSQL_PORT=... MYSQL_USER=... MYSQL_PASSWORD=... MYSQL_DATABASE=... ./scripts/export-mysql.sh
# or
#   DATABASE_URL='mysql://user:pass@host:3306/dbname' ./scripts/export-mysql.sh
# Optional env:
#   INCLUDE_DATA_ONLY=true|false   # 只导出数据（无结构），默认 false
#   EXCLUDE_EVENTS=true|false      # 排除 events，默认 false
#   ADD_DROP_DATABASE=true|false   # 在导出中包含 DROP DATABASE/CREATE DATABASE，默认 false
#   COMPRESS=gzip|none             # 输出压缩方式，默认 gzip

parse_mysql_url() {
  local url="$1"
  url="${url#mysql://}"
  local creds hostportdb hostport
  if [[ "$url" == *"@"* ]]; then
    creds="${url%%@*}"
    hostportdb="${url#*@}"
    MYSQL_USER="${creds%%:*}"
    MYSQL_PASSWORD="${creds#*:}"
  else
    hostportdb="$url"
    MYSQL_USER="${MYSQL_USER:-root}"
    MYSQL_PASSWORD="${MYSQL_PASSWORD:-}"
  fi
  hostport="${hostportdb%%/*}"
  MYSQL_DATABASE="${hostportdb#*/}"
  MYSQL_HOST="${hostport%%:*}"
  MYSQL_PORT="${hostport#*:}"
  if [[ "$MYSQL_PORT" == "$MYSQL_HOST" ]]; then MYSQL_PORT=3306; fi
}

if [[ -n "${DATABASE_URL:-}" ]]; then
  parse_mysql_url "$DATABASE_URL"
fi

MYSQL_HOST=${MYSQL_HOST:-localhost}
MYSQL_PORT=${MYSQL_PORT:-3306}
MYSQL_USER=${MYSQL_USER:-root}
MYSQL_PASSWORD=${MYSQL_PASSWORD:-}
MYSQL_DATABASE=${MYSQL_DATABASE:-health_hub}
INCLUDE_DATA_ONLY=${INCLUDE_DATA_ONLY:-false}
EXCLUDE_EVENTS=${EXCLUDE_EVENTS:-false}
ADD_DROP_DATABASE=${ADD_DROP_DATABASE:-false}
COMPRESS=${COMPRESS:-gzip}

PASS_ARG=""
if [[ -n "$MYSQL_PASSWORD" ]]; then
  PASS_ARG="-p$MYSQL_PASSWORD"
fi

# Check client availability
if ! command -v mysqldump >/dev/null 2>&1; then
  echo "[ERROR] mysqldump not found in PATH. Please install MySQL client." >&2
  exit 1
fi

# Verify connection
echo "==> Verifying MySQL connection to $MYSQL_HOST:$MYSQL_PORT as $MYSQL_USER ..."
if ! mysql -h"$MYSQL_HOST" -P"$MYSQL_PORT" -u"$MYSQL_USER" $PASS_ARG -e "SELECT VERSION();" >/dev/null; then
  echo "[ERROR] Failed to connect to MySQL. Check credentials and network." >&2
  exit 1
fi

OUT_DIR="database/exports"
mkdir -p "$OUT_DIR"
STAMP=$(date +%Y%m%d_%H%M%S)
BASENAME="${MYSQL_DATABASE}_full_${STAMP}.sql"
OUT_FILE="$OUT_DIR/${BASENAME}"

# Build flags
DUMP_FLAGS=(
  -h"$MYSQL_HOST" -P"$MYSQL_PORT" -u"$MYSQL_USER" $PASS_ARG
  --single-transaction --quick --lock-tables=false
  --routines --triggers
)

if [[ "$EXCLUDE_EVENTS" != "true" ]]; then
  DUMP_FLAGS+=( --events )
fi

if [[ "$ADD_DROP_DATABASE" == "true" ]]; then
  DUMP_FLAGS+=( --add-drop-database --databases "$MYSQL_DATABASE" )
else
  DUMP_FLAGS+=( "$MYSQL_DATABASE" )
fi

if [[ "$INCLUDE_DATA_ONLY" == "true" ]]; then
  DUMP_FLAGS+=( --no-create-info )
fi

echo "==> Exporting database: $MYSQL_DATABASE"
echo "    Host: $MYSQL_HOST:$MYSQL_PORT"
echo "    User: $MYSQL_USER"
echo "    Options: data_only=$INCLUDE_DATA_ONLY exclude_events=$EXCLUDE_EVENTS add_drop_db=$ADD_DROP_DATABASE compress=$COMPRESS"

if [[ "$COMPRESS" == "gzip" ]]; then
  OUT_FILE+=".gz"
  mysqldump "${DUMP_FLAGS[@]}" | gzip -c > "$OUT_FILE"
else
  mysqldump "${DUMP_FLAGS[@]}" > "$OUT_DIR/${BASENAME}"
fi

echo "==> Export completed: $OUT_FILE"

