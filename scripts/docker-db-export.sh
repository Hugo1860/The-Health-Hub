#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

OUT_DIR="database/exports"
mkdir -p "$OUT_DIR"
STAMP=$(date +%Y%m%d_%H%M%S)

# Read env from .env.docker if exists
if [ -f .env.docker ]; then
  export $(grep -v '^#' .env.docker | xargs -I{} echo {})
fi

DB_NAME="${MYSQL_DATABASE:-health_hub}"
OUT_FILE="$OUT_DIR/${DB_NAME}_full_${STAMP}.sql.gz"

echo "==> Exporting DB from running container: $DB_NAME -> $OUT_FILE"
docker compose exec -T db sh -c "mysqldump -u\"$MYSQL_USER\" -p\"$MYSQL_PASSWORD\" --single-transaction --quick --lock-tables=false --routines --triggers --events \"$DB_NAME\"" | gzip -c > "$OUT_FILE"

echo "==> Export completed: $OUT_FILE"


