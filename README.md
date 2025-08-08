# 健闻局 The Health Hub 🏥

一个专业的健康医学音频内容平台，提供高质量的医学教育和健康资讯音频内容。

## 🌟 项目特色

- **专业内容**: 专注于健康医学领域的音频内容
- **现代化界面**: 使用 Ant Design 构建的专业用户界面
- **响应式设计**: 完美适配桌面端和移动端
- **音频播放器**: 功能完整的音频播放系统，支持进度控制、速度调节等
- **用户管理**: 完整的用户认证和权限管理系统
- **管理后台**: 功能强大的内容管理系统

## 🚀 技术栈

### 前端技术
- **框架**: Next.js 15.x + React 19.x
- **UI 组件**: Ant Design 5.x
- **样式**: Tailwind CSS + 自定义 CSS
- **状态管理**: Zustand
- **认证**: NextAuth.js

### 后端技术
- **API**: Next.js API Routes
- **数据存储**: JSON 文件系统 (可扩展至数据库)
- **文件上传**: 多媒体文件处理
- **安全**: CSRF 保护、输入验证

## 📦 主要功能

### 🎵 音频播放系统
- 全功能音频播放器
- 播放进度控制和时间显示
- 播放速度调节 (0.5x - 2.0x)
- 音量控制
- 播放列表管理
- 持久化播放状态

### 👥 用户系统
- 用户注册和登录
- 个人资料管理
- 收藏和播放历史
- 评论和评分系统

### 🛠️ 管理后台
- 音频内容管理
- 用户管理
- 分类管理
- 系统监控
- 数据分析

### 📱 响应式设计
- 移动端优化界面
- 触摸友好的交互
- 自适应布局

## 🏗️ 项目结构

```
audio-blog/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── admin/             # 管理后台页面
│   │   ├── auth/              # 认证页面
│   │   ├── api/               # API 路由
│   │   └── ...
│   ├── components/            # React 组件
│   │   ├── AntdHomeLayout.tsx # 前台布局
│   │   ├── AntdAdminLayout.tsx# 后台布局
│   │   ├── AudioPlayer.tsx    # 音频播放器
│   │   └── ...
│   ├── hooks/                 # 自定义 Hooks
│   ├── lib/                   # 工具库
│   ├── store/                 # 状态管理
│   └── contexts/              # React Context
├── data/                      # 数据文件
├── public/                    # 静态资源
└── uploads/                   # 上传文件
```

## 🚀 快速开始

### 环境要求
- Node.js 18.x 或更高版本
- npm 或 yarn 包管理器

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/Hugo1860/The-Health-Hub.git
cd The-Health-Hub
```

2. **安装依赖**
```bash
npm install
# 或
yarn install
```

3. **环境配置**
```bash
# 复制环境变量文件
cp .env.example .env.local

# 编辑环境变量
# NEXTAUTH_SECRET=your-secret-key
# NEXTAUTH_URL=http://localhost:3000
```

4. **启动开发服务器**
```bash
npm run dev
# 或
yarn dev
```

5. **访问应用**
- 前台: http://localhost:3000
- 管理后台: http://localhost:3000/admin

### 默认管理员账户
- 邮箱: admin@example.com
- 密码: admin123

## 📖 使用指南

### 用户功能
1. **浏览音频**: 在首页浏览最新和热门音频内容
2. **播放音频**: 点击任意音频开始播放，支持全功能播放控制
3. **用户注册**: 创建账户以使用收藏、评论等功能
4. **个人中心**: 管理个人信息和播放历史

### 管理员功能
1. **内容管理**: 上传、编辑、删除音频内容
2. **用户管理**: 管理用户账户和权限
3. **分类管理**: 创建和管理音频分类
4. **系统监控**: 查看系统状态和使用统计

## 🎨 界面预览

### 前台界面
- **首页**: Apple Podcasts 风格的现代化布局
- **音频播放器**: 功能完整的播放控制界面
- **移动端**: 优化的触摸友好界面

### 管理后台
- **仪表盘**: 数据统计和系统概览
- **内容管理**: 直观的音频管理界面
- **用户管理**: 完整的用户权限控制

## 🔧 开发指南

### 添加新功能
1. 在 `src/components/` 中创建新组件
2. 在 `src/app/` 中添加新页面
3. 在 `src/app/api/` 中添加 API 路由

### 样式定制
- 修改 `tailwind.config.js` 自定义 Tailwind CSS
- 编辑 `src/app/globals.css` 添加全局样式
- 使用 Ant Design 主题定制

### 数据管理
- JSON 文件存储在 `data/` 目录
- 上传文件存储在 `uploads/` 目录
- 可扩展至数据库系统

## 🚀 部署

### Vercel 部署 (推荐)
1. 连接 GitHub 仓库到 Vercel
2. 配置环境变量
3. 自动部署

### 其他平台
- 支持任何 Node.js 托管平台
- 需要配置文件上传存储
- 设置环境变量

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 联系方式

- 项目链接: [https://github.com/Hugo1860/The-Health-Hub](https://github.com/Hugo1860/The-Health-Hub)
- 问题反馈: [Issues](https://github.com/Hugo1860/The-Health-Hub/issues)

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者和用户！

---

**健闻局 The Health Hub** - 让健康知识触手可及 🏥✨