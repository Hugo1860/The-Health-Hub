#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ENV_FILE="${1:-.env.docker}"

if [ ! -f "$ENV_FILE" ]; then
  echo "[ERROR] Env file not found: $ENV_FILE"
  echo "Usage: $0 [/path/to/.env.docker]"
  exit 1
fi

echo "==> Using env file: $ENV_FILE"

echo "==> Building images (app)..."
docker compose --env-file "$ENV_FILE" build

echo "==> Starting services (db, app)..."
docker compose --env-file "$ENV_FILE" up -d

echo "==> Waiting for database to be healthy..."
set +e
for i in {1..30}; do
  docker compose ps db | grep -q "healthy" && ok=1 || ok=0
  if [ "$ok" = "1" ]; then
    echo "DB healthy."
    break
  fi
  echo "... still waiting ($i/30)"
  sleep 3
done
set -e

echo "==> Current services:"
docker compose ps

echo "==> Tail app logs (press Ctrl+C to exit)"
docker compose logs -f app | cat


