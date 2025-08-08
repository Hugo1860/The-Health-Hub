#!/bin/bash

# 健闻局 The Health Hub - GitHub 上传脚本
# 使用方法: ./upload-to-github.sh

echo "🏥 健闻局 The Health Hub - GitHub 上传脚本"
echo "=========================================="

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请在项目根目录 (audio-blog) 中运行此脚本"
    exit 1
fi

# 检查 Git 是否已安装
if ! command -v git &> /dev/null; then
    echo "❌ 错误: Git 未安装，请先安装 Git"
    exit 1
fi

# 检查是否已配置 Git 用户信息
if [ -z "$(git config --global user.name)" ] || [ -z "$(git config --global user.email)" ]; then
    echo "⚠️  警告: Git 用户信息未配置"
    echo "请运行以下命令配置:"
    echo "git config --global user.name \"Your Name\""
    echo "git config --global user.email \"your.email@example.com\""
    exit 1
fi

echo "📋 准备上传项目到 GitHub..."

# 初始化 Git 仓库 (如果尚未初始化)
if [ ! -d ".git" ]; then
    echo "🔧 初始化 Git 仓库..."
    git init
fi

# 添加所有文件
echo "📁 添加文件到暂存区..."
git add .

# 检查是否有文件需要提交
if git diff --staged --quiet; then
    echo "ℹ️  没有新的更改需要提交"
else
    # 创建提交
    echo "💾 创建提交..."
    git commit -m "feat: 初始化健闻局 The Health Hub 项目

- 完整的音频播放平台功能
- Ant Design 统一界面设计  
- 用户认证和权限管理系统
- 响应式移动端适配
- 管理后台功能完整
- 播放器时间显示和进度控制
- 移动端界面优化"
fi

# 检查是否已添加远程仓库
if ! git remote get-url origin &> /dev/null; then
    echo "🔗 添加远程仓库..."
    git remote add origin https://github.com/Hugo1860/The-Health-Hub.git
fi

# 推送到 GitHub
echo "🚀 推送到 GitHub..."
if git push -u origin main; then
    echo "✅ 成功上传到 GitHub!"
    echo ""
    echo "🎉 项目已成功上传到:"
    echo "   https://github.com/Hugo1860/The-Health-Hub"
    echo ""
    echo "📋 下一步建议:"
    echo "   1. 访问 GitHub 仓库确认文件已上传"
    echo "   2. 设置仓库描述和标签"
    echo "   3. 启用 GitHub Pages (如需要)"
    echo "   4. 配置分支保护规则"
    echo "   5. 创建第一个 Release 版本"
else
    echo "❌ 上传失败，请检查:"
    echo "   1. 网络连接是否正常"
    echo "   2. GitHub 仓库是否存在"
    echo "   3. 是否有推送权限"
    echo ""
    echo "💡 如果仓库已存在内容，请尝试:"
    echo "   git pull origin main --allow-unrelated-histories"
    echo "   然后重新运行此脚本"
fi

echo ""
echo "🏥 健闻局 The Health Hub 上传完成!"