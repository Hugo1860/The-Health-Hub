#!/usr/bin/env bash

set -euo pipefail

# Initialize advanced features for Health Hub
# Creates tables for subscriptions, playlists, learning progress, user behavior, and social features

MYSQL_HOST=${MYSQL_HOST:-localhost}
MYSQL_PORT=${MYSQL_PORT:-3306}
MYSQL_USER=${MYSQL_USER:-root}
MYSQL_PASSWORD=${MYSQL_PASSWORD:-}
MYSQL_DATABASE=${MYSQL_DATABASE:-health_hub}

PASS_ARG=""
if [ -n "$MYSQL_PASSWORD" ]; then
  PASS_ARG="-p$MYSQL_PASSWORD"
fi

echo "==> Initializing advanced features in database '$MYSQL_DATABASE'"

# Execute the advanced features schema
mysql -h"$MYSQL_HOST" -P"$MYSQL_PORT" -u"$MYSQL_USER" $PASS_ARG -D "$MYSQL_DATABASE" < "$(dirname "$0")/../database/advanced-features-schema.sql"

echo "==> Advanced features initialized successfully!"
echo ""
echo "New features available:"
echo "  - User subscriptions and notifications"
echo "  - Advanced playlist management with collaboration"
echo "  - Personal learning progress tracking"
echo "  - User behavior analytics"
echo "  - Social features (follow, like, share)"
echo ""
echo "API endpoints:"
echo "  - /api/user/subscriptions"
echo "  - /api/user/notifications" 
echo "  - /api/user/playlists"
echo "  - /api/user/progress"
echo "  - /api/user/insights"
echo "  - /api/user/social"
echo "  - /api/behavior/track"
