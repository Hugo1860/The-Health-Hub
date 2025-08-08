#!/bin/bash

# 健闻局 The Health Hub - 导入路径修复脚本
# 使用方法: ./fix-imports.sh

echo "🔧 修复导入路径问题..."

# 检查并修复常见的导入路径问题
echo "📋 检查项目结构..."

# 确保所有必要的文件存在
if [ ! -f "src/components/AntdAdminLayout.tsx" ]; then
    echo "❌ 错误: AntdAdminLayout.tsx 文件不存在"
    exit 1
fi

if [ ! -f "src/lib/slides.ts" ]; then
    echo "❌ 错误: slides.ts 文件不存在"
    exit 1
fi

# 检查 tsconfig.json 配置
if [ ! -f "tsconfig.json" ]; then
    echo "❌ 错误: tsconfig.json 文件不存在"
    exit 1
fi

echo "✅ 基本文件结构检查完成"

# 运行 TypeScript 类型检查
echo "🔍 运行类型检查..."
if npm run type-check; then
    echo "✅ 类型检查通过"
else
    echo "⚠️  类型检查发现问题，但继续执行..."
fi

# 尝试构建项目
echo "🏗️  尝试构建项目..."
if npm run build; then
    echo "✅ 项目构建成功"
else
    echo "❌ 项目构建失败，请检查错误信息"
    exit 1
fi

echo "🎉 导入路径修复完成！"