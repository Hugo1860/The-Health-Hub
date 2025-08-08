#!/bin/bash

# 使用国内镜像源安装 Ant Design 相关依赖
echo "正在安装 Ant Design 相关依赖..."

# 设置 npm 使用淘宝镜像
npm config set registry https://registry.npmmirror.com

# 安装所有依赖
npm install

echo "Ant Design 依赖安装完成！"
echo ""
echo "现在可以访问以下页面体验新的 Ant Design 界面："
echo "- 仪表盘: http://localhost:3000/admin/antd"
echo "- 用户管理: http://localhost:3000/admin/users-antd"
echo ""
echo "请运行 'npm run dev' 启动开发服务器"