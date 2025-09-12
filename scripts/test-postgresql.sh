#!/bin/bash

# PostgreSQL集成测试脚本

set -e

echo "🐘 Starting PostgreSQL Integration Tests"

# 检查PostgreSQL是否运行
echo "📋 Checking PostgreSQL connection..."

# 设置测试环境变量
export NODE_ENV=test
export DB_TYPE=postgresql
export TEST_DB_HOST=${TEST_DB_HOST:-localhost}
export TEST_DB_PORT=${TEST_DB_PORT:-5432}
export TEST_DB_DATABASE=${TEST_DB_DATABASE:-health_hub_test}
export TEST_DB_USERNAME=${TEST_DB_USERNAME:-postgres}
export TEST_DB_PASSWORD=${TEST_DB_PASSWORD:-}

echo "🔧 Test Configuration:"
echo "  Host: $TEST_DB_HOST"
echo "  Port: $TEST_DB_PORT"
echo "  Database: $TEST_DB_DATABASE"
echo "  Username: $TEST_DB_USERNAME"

# 检查PostgreSQL连接
if command -v psql &> /dev/null; then
    echo "📡 Testing PostgreSQL connection..."
    if PGPASSWORD=$TEST_DB_PASSWORD psql -h $TEST_DB_HOST -p $TEST_DB_PORT -U $TEST_DB_USERNAME -d postgres -c "SELECT 1;" &> /dev/null; then
        echo "✅ PostgreSQL connection successful"
    else
        echo "❌ PostgreSQL connection failed"
        echo "Please ensure PostgreSQL is running and accessible with the provided credentials"
        exit 1
    fi
else
    echo "⚠️  psql not found, skipping connection test"
fi

# 创建测试数据库（如果不存在）
echo "🗄️  Setting up test database..."
if command -v psql &> /dev/null; then
    PGPASSWORD=$TEST_DB_PASSWORD psql -h $TEST_DB_HOST -p $TEST_DB_PORT -U $TEST_DB_USERNAME -d postgres -c "CREATE DATABASE $TEST_DB_DATABASE;" 2>/dev/null || echo "Database $TEST_DB_DATABASE already exists or creation failed"
fi

# 运行测试
echo "🧪 Running PostgreSQL integration tests..."

# 使用自定义Jest配置运行测试
npx jest --config jest.postgresql.config.js --verbose --detectOpenHandles --forceExit

echo "✅ PostgreSQL integration tests completed"

# 清理（可选）
if [ "$CLEANUP_TEST_DB" = "true" ]; then
    echo "🧹 Cleaning up test database..."
    if command -v psql &> /dev/null; then
        PGPASSWORD=$TEST_DB_PASSWORD psql -h $TEST_DB_HOST -p $TEST_DB_PORT -U $TEST_DB_USERNAME -d postgres -c "DROP DATABASE IF EXISTS $TEST_DB_DATABASE;" 2>/dev/null || echo "Failed to cleanup test database"
    fi
fi

echo "🎉 All tests completed successfully!"