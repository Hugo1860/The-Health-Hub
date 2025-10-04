#!/usr/bin/env bash

set -euo pipefail

# MySQL 8+ import helper
# Usage:
#   MYSQL_HOST=... MYSQL_PORT=... MYSQL_USER=... MYSQL_PASSWORD=... MYSQL_DATABASE=... ./scripts/import-mysql.sh /path/to/dump.sql[.gz]
# or
#   DATABASE_URL='mysql://user:pass@host:3306/dbname' ./scripts/import-mysql.sh /path/to/dump.sql[.gz]

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <dump.sql|dump.sql.gz>" >&2
  exit 1
fi

DUMP_FILE="$1"
if [[ ! -f "$DUMP_FILE" ]]; then
  echo "[ERROR] File not found: $DUMP_FILE" >&2
  exit 1
fi

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

PASS_ARG=""
if [[ -n "$MYSQL_PASSWORD" ]]; then
  PASS_ARG="-p$MYSQL_PASSWORD"
fi

# Check client availability
if ! command -v mysql >/dev/null 2>&1; then
  echo "[ERROR] mysql client not found in PATH. Please install MySQL client." >&2
  exit 1
fi

# Verify connection
echo "==> Verifying MySQL connection to $MYSQL_HOST:$MYSQL_PORT as $MYSQL_USER ..."
if ! mysql -h"$MYSQL_HOST" -P"$MYSQL_PORT" -u"$MYSQL_USER" $PASS_ARG -e "SELECT VERSION();" >/dev/null; then
  echo "[ERROR] Failed to connect to MySQL. Check credentials and network." >&2
  exit 1
fi

# Create database if not exists
mysql -h"$MYSQL_HOST" -P"$MYSQL_PORT" -u"$MYSQL_USER" $PASS_ARG \
  -e "CREATE DATABASE IF NOT EXISTS \`$MYSQL_DATABASE\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;" || true

# Import
echo "==> Importing into database: $MYSQL_DATABASE"
echo "    File: $DUMP_FILE"
if [[ "$DUMP_FILE" == *.gz ]]; then
  gunzip -c "$DUMP_FILE" | mysql -h"$MYSQL_HOST" -P"$MYSQL_PORT" -u"$MYSQL_USER" $PASS_ARG "$MYSQL_DATABASE"
else
  mysql -h"$MYSQL_HOST" -P"$MYSQL_PORT" -u"$MYSQL_USER" $PASS_ARG "$MYSQL_DATABASE" < "$DUMP_FILE"
fi

echo "==> Import completed"
