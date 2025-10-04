#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

SQL_FILE="${1:-}"
if [ -z "$SQL_FILE" ] || [ ! -f "$SQL_FILE" ]; then
  echo "Usage: $0 <path/to/file.sql[.gz]>"
  exit 1
fi

if [ -f .env.docker ]; then
  export $(grep -v '^#' .env.docker | xargs -I{} echo {})
fi

DB_NAME="${MYSQL_DATABASE:-health_hub}"

echo "==> Importing into container DB: $DB_NAME from $SQL_FILE"
if [[ "$SQL_FILE" == *.gz ]]; then
  gunzip -c "$SQL_FILE" | docker compose exec -T db sh -c "mysql -u\"$MYSQL_USER\" -p\"$MYSQL_PASSWORD\" \"$DB_NAME\""
else
  docker compose exec -T db sh -c "mysql -u\"$MYSQL_USER\" -p\"$MYSQL_PASSWORD\" \"$DB_NAME\"" < "$SQL_FILE"
fi

echo "==> Import completed"


