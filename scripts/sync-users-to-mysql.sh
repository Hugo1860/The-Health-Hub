#!/usr/bin/env bash

set -euo pipefail

# Sync users from data/users.json to MySQL database
# This bridges the gap between file-based auth and MySQL-based admin APIs

MYSQL_HOST=${MYSQL_HOST:-localhost}
MYSQL_PORT=${MYSQL_PORT:-3306}
MYSQL_USER=${MYSQL_USER:-root}
MYSQL_PASSWORD=${MYSQL_PASSWORD:-}
MYSQL_DATABASE=${MYSQL_DATABASE:-health_hub}

PASS_ARG=""
if [ -n "$MYSQL_PASSWORD" ]; then
  PASS_ARG="-p$MYSQL_PASSWORD"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
USERS_FILE="$PROJECT_ROOT/data/users.json"

echo "==> Syncing users from $USERS_FILE to MySQL database '$MYSQL_DATABASE'"

if [ ! -f "$USERS_FILE" ]; then
    echo "Error: Users file not found at $USERS_FILE"
    exit 1
fi

# Create temporary SQL file
TEMP_SQL=$(mktemp)

cat > "$TEMP_SQL" << 'EOF'
-- Upsert users from JSON file
EOF

# Parse JSON and generate SQL (using node.js for JSON parsing)
USERS_FILE_PATH="$USERS_FILE" node >> "$TEMP_SQL" <<'NODE'
const fs = require('fs');
const usersPath = process.env.USERS_FILE_PATH;
function fmt(d){
  if(!d) return null;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return null;
  const pad = n=> String(n).padStart(2,'0');
  const s = `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
  return s;
}
const esc = (s)=> String(s).replace(/'/g, "''");
const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
users.forEach(u=>{
  const created = fmt(u.createdAt);
  const lastLogin = fmt(u.lastLogin);
  const createdSql = created ? `STR_TO_DATE('${created}','%Y-%m-%d %H:%i:%s')` : 'CURRENT_TIMESTAMP';
  const lastLoginSql = lastLogin ? `STR_TO_DATE('${lastLogin}','%Y-%m-%d %H:%i:%s')` : 'NULL';
  const sql = `INSERT INTO users (id, username, email, password, role, status, created_at, last_login)\n`
    + `VALUES ('${esc(u.id)}','${esc(u.username||u.email)}','${esc(u.email)}','${esc(u.password)}','${esc(u.role||'user')}','${esc(u.status||'active')}', ${createdSql}, ${lastLoginSql})\n`
    + `ON DUPLICATE KEY UPDATE username=VALUES(username), password=VALUES(password), role=VALUES(role), status=VALUES(status), last_login=VALUES(last_login);`;
  console.log(sql);
});
NODE

# Execute SQL
mysql -h"$MYSQL_HOST" -P"$MYSQL_PORT" -u"$MYSQL_USER" $PASS_ARG -D "$MYSQL_DATABASE" < "$TEMP_SQL"

# Cleanup
rm "$TEMP_SQL"

echo "==> Users synced successfully!"
echo "==> Admin users available:"
mysql -h"$MYSQL_HOST" -P"$MYSQL_PORT" -u"$MYSQL_USER" $PASS_ARG -D "$MYSQL_DATABASE" -e "SELECT username, email, role FROM users WHERE role = 'admin';"
