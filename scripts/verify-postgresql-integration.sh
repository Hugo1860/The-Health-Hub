#!/bin/bash

# PostgreSQL集成验证脚本

set -e

echo "🔍 Verifying PostgreSQL Integration..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 计数器
CHECKS_PASSED=0
CHECKS_FAILED=0
WARNINGS=0

# 检查函数
check_pass() {
    echo -e "${GREEN}✅ $1${NC}"
    ((CHECKS_PASSED++))
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
    ((CHECKS_FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

echo -e "${BLUE}📋 Starting PostgreSQL Integration Verification${NC}"
echo ""

# 1. 检查PostgreSQL相关文件是否存在
echo "1. Checking PostgreSQL implementation files..."

REQUIRED_FILES=(
    "src/lib/postgresql-manager.ts"
    "src/lib/database.ts"
    "src/lib/query-adapter.ts"
    "src/lib/postgresql-error-handler.ts"
    "src/lib/postgresql-api-middleware.ts"
    "src/lib/db-postgresql.ts"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        check_pass "Found $file"
    else
        check_fail "Missing $file"
    fi
done

echo ""

# 2. 检查API端点是否已更新
echo "2. Checking API endpoints for PostgreSQL integration..."

API_FILES=(
    "src/app/api/health/database/route.ts"
    "src/app/api/health/connection-pool/route.ts"
    "src/app/api/health/comprehensive/route.ts"
    "src/app/api/admin/dashboard/stats/route.ts"
    "src/app/api/admin/dashboard/recent-activity/route.ts"
    "src/app/api/admin/dashboard/popular-content/route.ts"
)

for file in "${API_FILES[@]}"; do
    if [ -f "$file" ]; then
        # 检查是否使用了PostgreSQL导入
        if grep -q "from.*database\|from.*postgresql" "$file"; then
            check_pass "API $file uses PostgreSQL imports"
        else
            check_warn "API $file may not be using PostgreSQL imports"
        fi
        
        # 检查是否还有SQLite残留
        if grep -q "better-sqlite3\|sqlite_master" "$file"; then
            check_fail "API $file still contains SQLite references"
        fi
    else
        check_fail "Missing API file $file"
    fi
done

echo ""

# 3. 检查环境配置
echo "3. Checking environment configuration..."

if [ -f ".env.local" ]; then
    if grep -q "DB_TYPE=postgresql" ".env.local"; then
        check_pass "Environment configured for PostgreSQL"
    else
        check_warn "DB_TYPE not set to postgresql in .env.local"
    fi
    
    if grep -q "DB_HOST\|DB_PORT\|DB_DATABASE" ".env.local"; then
        check_pass "PostgreSQL connection parameters found"
    else
        check_fail "Missing PostgreSQL connection parameters"
    fi
else
    check_warn ".env.local file not found"
fi

echo ""

# 4. 检查测试文件
echo "4. Checking test files..."

TEST_FILES=(
    "src/lib/__tests__/postgresql-integration.test.ts"
    "src/app/api/__tests__/postgresql-api-integration.test.ts"
    "jest.postgresql.config.js"
    "jest.env.js"
    "scripts/test-postgresql.sh"
)

for file in "${TEST_FILES[@]}"; do
    if [ -f "$file" ]; then
        check_pass "Found test file $file"
    else
        check_fail "Missing test file $file"
    fi
done

echo ""

# 5. 检查SQLite残留
echo "5. Checking for SQLite remnants..."

# 检查better-sqlite3导入
SQLITE_IMPORTS=$(grep -r "from.*better-sqlite3\|import.*better-sqlite3" src/ --include="*.ts" --exclude="*.deprecated" --exclude="*.test.ts" 2>/dev/null || true)

if [ -z "$SQLITE_IMPORTS" ]; then
    check_pass "No SQLite imports found in main code"
else
    check_fail "Found SQLite imports in main code:"
    echo "$SQLITE_IMPORTS"
fi

# 检查sqlite_master引用
SQLITE_MASTER_REFS=$(grep -r "sqlite_master" src/ --include="*.ts" --exclude="*.deprecated" --exclude="*.test.ts" 2>/dev/null || true)

if [ -z "$SQLITE_MASTER_REFS" ]; then
    check_pass "No sqlite_master references found in main code"
else
    check_warn "Found sqlite_master references (may be in query adapter):"
    echo "$SQLITE_MASTER_REFS"
fi

echo ""

# 6. 检查package.json依赖
echo "6. Checking package dependencies..."

if [ -f "package.json" ]; then
    if grep -q "\"pg\"" package.json; then
        check_pass "PostgreSQL (pg) dependency found"
    else
        check_fail "PostgreSQL (pg) dependency missing"
    fi
    
    if grep -q "@types/pg" package.json; then
        check_pass "PostgreSQL types dependency found"
    else
        check_warn "PostgreSQL types dependency missing"
    fi
    
    if grep -q "better-sqlite3" package.json; then
        check_warn "SQLite dependency still present (should be removed)"
    else
        check_pass "No SQLite dependency found"
    fi
else
    check_fail "package.json not found"
fi

echo ""

# 7. 语法检查
echo "7. Performing syntax checks..."

# 检查TypeScript编译
if command -v npx &> /dev/null; then
    echo "   Checking TypeScript compilation..."
    if npx tsc --noEmit --skipLibCheck 2>/dev/null; then
        check_pass "TypeScript compilation successful"
    else
        check_fail "TypeScript compilation failed"
    fi
else
    check_warn "npx not available, skipping TypeScript check"
fi

echo ""

# 8. 检查数据库连接（如果可能）
echo "8. Testing database connection (if available)..."

if [ -n "$DB_HOST" ] && [ -n "$DB_DATABASE" ]; then
    if command -v psql &> /dev/null; then
        echo "   Testing PostgreSQL connection..."
        if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "${DB_USERNAME:-postgres}" -d "$DB_DATABASE" -c "SELECT 1;" &>/dev/null; then
            check_pass "PostgreSQL connection successful"
        else
            check_warn "PostgreSQL connection failed (database may not be running)"
        fi
    else
        check_warn "psql not available, skipping connection test"
    fi
else
    check_warn "Database connection parameters not set, skipping connection test"
fi

echo ""

# 生成报告
echo -e "${BLUE}📊 Verification Summary${NC}"
echo "=================================="
echo -e "✅ Checks Passed: ${GREEN}$CHECKS_PASSED${NC}"
echo -e "❌ Checks Failed: ${RED}$CHECKS_FAILED${NC}"
echo -e "⚠️  Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}🎉 All checks passed! PostgreSQL integration is complete.${NC}"
        exit 0
    else
        echo -e "${YELLOW}✅ Integration mostly complete, but there are some warnings to review.${NC}"
        exit 0
    fi
else
    echo -e "${RED}❌ Integration incomplete. Please address the failed checks.${NC}"
    echo ""
    echo "Common fixes:"
    echo "1. Run the cleanup script: ./scripts/cleanup-sqlite.sh"
    echo "2. Install PostgreSQL dependencies: npm install pg @types/pg"
    echo "3. Remove SQLite dependencies: npm uninstall better-sqlite3"
    echo "4. Update environment variables in .env.local"
    echo "5. Run tests: ./scripts/test-postgresql.sh"
    exit 1
fi