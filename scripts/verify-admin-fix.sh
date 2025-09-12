#!/bin/bash

# 管理员数据显示修复验证脚本

echo "🔍 开始验证管理员数据显示修复..."
echo ""

# 检查服务器是否运行
echo "1. 检查服务器状态..."
if curl -s http://localhost:3000/api/health >/dev/null 2>&1; then
    echo "✅ 服务器正在运行"
else
    echo "❌ 服务器未运行，请先启动服务器"
    exit 1
fi

# 检查数据库连接
echo ""
echo "2. 检查数据库连接..."
DB_STATUS=$(curl -s http://localhost:3000/api/health/database | grep -o '"connected":true' || echo "false")
if [[ "$DB_STATUS" == *"true"* ]]; then
    echo "✅ 数据库连接正常"
else
    echo "❌ 数据库连接失败"
    exit 1
fi

# 检查用户管理API
echo ""
echo "3. 检查用户管理API..."
USER_API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/admin/users-simple)
if [[ "$USER_API_STATUS" == "401" ]] || [[ "$USER_API_STATUS" == "403" ]]; then
    echo "✅ 用户管理API端点存在 (状态码: $USER_API_STATUS - 需要认证)"
elif [[ "$USER_API_STATUS" == "200" ]]; then
    echo "✅ 用户管理API端点存在且可访问"
else
    echo "❌ 用户管理API端点异常 (状态码: $USER_API_STATUS)"
fi

# 检查音频管理API
echo ""
echo "4. 检查音频管理API..."
AUDIO_API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/admin/simple-audio)
if [[ "$AUDIO_API_STATUS" == "401" ]] || [[ "$AUDIO_API_STATUS" == "403" ]]; then
    echo "✅ 音频管理API端点存在 (状态码: $AUDIO_API_STATUS - 需要认证)"
elif [[ "$AUDIO_API_STATUS" == "200" ]]; then
    echo "✅ 音频管理API端点存在且可访问"
else
    echo "❌ 音频管理API端点异常 (状态码: $AUDIO_API_STATUS)"
fi

# 检查测试页面
echo ""
echo "5. 检查测试页面..."
TEST_PAGES=("/test-admin-data" "/test-api-direct" "/test-db-users")
for page in "${TEST_PAGES[@]}"; do
    PAGE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$page")
    if [[ "$PAGE_STATUS" == "200" ]]; then
        echo "✅ 测试页面 $page 可访问"
    else
        echo "❌ 测试页面 $page 异常 (状态码: $PAGE_STATUS)"
    fi
done

echo ""
echo "🎉 验证完成！"
echo ""
echo "📋 下一步操作："
echo "1. 访问 http://localhost:3000/test-db-users 检查管理员用户"
echo "2. 如果没有管理员，点击'创建管理员用户'按钮"
echo "3. 使用 admin@example.com / admin123 登录"
echo "4. 访问 /admin/users 和 /admin/audio 测试管理功能"
echo ""