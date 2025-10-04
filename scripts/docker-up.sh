#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

if [ -f .env.docker ]; then
  export $(grep -v '^#' .env.docker | xargs -I{} echo {})
fi

echo "==> Building images..."
docker compose --env-file .env.docker build

echo "==> Starting services..."
docker compose --env-file .env.docker up -d

echo "==> Services status:"
docker compose ps

echo "==> Logs (follow app):"
docker compose logs -f app | cat


