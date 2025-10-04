#!/usr/bin/env bash

set -euo pipefail

# Run one-time backup container
docker compose -f docker-compose.backup.yml --env-file .env.docker up -d db-backup
echo "Backup service started (interval via BACKUP_INTERVAL_SECONDS)."


