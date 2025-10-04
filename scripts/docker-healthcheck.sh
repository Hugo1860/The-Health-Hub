#!/usr/bin/env bash

set -euo pipefail

echo "==> Checking containers health"
docker compose ps
echo ""
echo "==> DB last 50 lines"
docker compose logs --tail=50 db | cat
echo ""
echo "==> APP last 50 lines"
docker compose logs --tail=50 app | cat


