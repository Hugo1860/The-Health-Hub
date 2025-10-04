# 健闻局 The Health Hub 🏥

一个专业的健康医学音频内容平台，提供高质量的医学教育和健康资讯音频内容。

## 🌟 项目特色

- **专业内容**: 专注于健康医学领域的音频内容
- **现代 iOS 风格 UI**: Apple 设计语言 + 毛玻璃效果 + 柔和动画
- **响应式设计**: 完美适配桌面端和移动端，支持深色模式
- **音频播放器**: 功能完整的音频播放系统，支持进度控制、速度调节等
- **用户管理**: 完整的用户认证和权限管理系统
- **管理后台**: 功能强大的内容管理系统

## 🚀 技术栈

## 前端技术
- **框架**: Next.js 15.x + React 19.x
- **UI 组件**: Ant Design 5.x
- **样式**: Tailwind CSS + 自定义 CSS
- **状态管理**: Zustand
- **认证**: NextAuth.js

### 后端技术
- **API**: Next.js API Routes
- **数据存储**: MySQL 数据库（兼容适配）+ JSON 文件系统
- **文件上传**: 多媒体文件处理
- **安全**: withSecurity 安全封装（鉴权/RBAC/限流/CSRF）+ Zod 输入校验与清洗
- **认证**: NextAuth.js（会话）

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
- 统一认证系统

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
│   │   ├── secureApiWrapper.ts         # withSecurity 安全封装
│   │   └── ...
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

### 本地 MySQL 快速启动（可选）
如果你希望在本地用 MySQL 直接跑通后端接口：

```bash
# 1) 初始化本地 MySQL（默认使用 root@localhost:3306，无密码）
chmod +x scripts/init-mysql-local.sh
./scripts/init-mysql-local.sh

# 2) 设置环境变量并启动开发服务器
export DATABASE_URL='mysql://root@localhost:3306/health_hub'
export DB_DRIVER=mysql
npm run dev
```

脚本会创建最小必要的 `categories` 和 `audios` 表，并导入少量示例数据，以便接口如 `/api/categories/simple`、`/api/audio-simple` 能立即返回结果。

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

## 🎨 现代 iOS 风格 UI 设计

### 设计理念
项目采用现代 Apple iOS 设计语言，提供优雅、流畅的用户体验：

- **Soft Corner Geometry（柔和圆角）**: 12-16px 一致圆角设计
- **Vibrant Gradient Accent（渐变强调色）**: 蓝紫渐变 (#34c9ff → #6366f1)
- **Glassmorphism（毛玻璃效果）**: 半透明背景 + 模糊效果
- **Soft Elevation（柔和提升）**: 多层次环境阴影
- **Minimalist Palette（极简配色）**: 白色/浅灰渐变背景

### 核心设计特性

#### 1. 卡片与容器
- **主卡片**: 16px 圆角 + 毛玻璃效果 + 悬停提升
- **音频卡片**: 14px 圆角 + 悬停放大 (1.01x)
- **列表项**: 无边框设计 + 悬停平移效果

#### 2. 按钮系统
- **主按钮**: 蓝紫渐变背景 + 提升阴影
- **播放按钮**: 圆形渐变 + 悬停放大 (1.1x)
- **次要按钮**: 药丸形状 + 微妙边框

#### 3. 音频播放器
- **播放器卡片**: 16px 圆角 + 毛玻璃效果 + 多层阴影
- **控制按钮**: 圆形设计 + 悬停提升效果
- **进度条**: 渐变轨道 + 流畅的拖拽手柄
- **间距设计**: 与精选推荐保持 20px 统一间隔

#### 4. 输入组件
- **搜索框**: 柔和边框 + 聚焦时蓝色光环效果
- **文本输入**: 单一浅灰边框 + 平滑过渡

#### 5. 交互反馈
- **悬停效果**: 平滑的 cubic-bezier 缓动 (0.2-0.3s)
- **点击反馈**: 轻微缩放动画
- **加载动画**: 柔和的渐变骨架屏

### 响应式适配
- **移动端**: 自适应圆角和按钮尺寸
- **深色模式**: 完整的深色主题支持
- **触摸优化**: 44px 最小触摸目标

### 使用方式

在组件中应用现代样式：

```typescript
import '../styles/modern-home.css';

// 使用预定义样式类
<Card className="modern-card">
  <Button className="modern-btn-primary">
    播放
  </Button>
</Card>
```

### 自定义主题

编辑 `src/styles/modern-home.css` 自定义：
- **圆角大小**: 搜索 `border-radius`
- **渐变颜色**: 搜索 `linear-gradient`  
- **阴影效果**: 搜索 `box-shadow`
- **动画时长**: 搜索 `transition`

详细设计文档: [UI_OPTIMIZATION_SUMMARY.md](UI_OPTIMIZATION_SUMMARY.md)

## 🔧 开发指南

### 添加新功能
1. 在 `src/components/` 中创建新组件
2. 在 `src/app/` 中添加新页面
3. 在 `src/app/api/` 中添加 API 路由

### 认证系统使用（withSecurity）
项目使用 `withSecurity/withSecurityAndValidation` 统一封装，确保所有 API 具备一致的认证/权限/防护：

```ts
import { withSecurity } from '@/lib/secureApiWrapper'

// 管理端示例（需要权限 VIEW_ANALYTICS）
export const GET = withSecurity(async (req) => {
  // ... 业务逻辑
  return NextResponse.json({ success: true })
}, { requireAuth: true, requiredPermissions: ['view_analytics'], enableRateLimit: true })
```

```ts
import { withSecurityAndValidation } from '@/lib/secureApiWrapper'
import { z } from 'zod'

// 用户端写操作（启用 CSRF + Zod 校验）
const schema = z.object({ title: z.string().min(1) })
export const POST = withSecurityAndValidation(async (req, data) => {
  // data 为已校验数据
  return NextResponse.json({ success: true, data })
}, schema, { requireAuth: true, requireCSRF: true, enableRateLimit: true })
```

### 样式定制
- 修改 `tailwind.config.js` 自定义 Tailwind CSS
- 编辑 `src/app/globals.css` 添加全局样式
- 使用 Ant Design 主题定制

### 数据管理
- MySQL 数据库存储用户和音频数据
- JSON 文件存储在 `data/` 目录（备用）
- 上传文件存储在 `uploads/` 目录
- 统一的数据访问接口

### 数据库结构
项目采用 MySQL 8.0+ 数据库，包含 **19张表**，覆盖完整的业务功能：

#### 📊 数据表分类
- **核心业务表 (5张)**: users, categories, audios, audio_resume_states, transcriptions
- **内容管理表 (4张)**: chapters, slides, related_resources, markers
- **互动功能表 (6张)**: comments, questions, answers, ratings, favorites, notifications
- **系统管理表 (4张)**: subscriptions, logs, query_performance, api_metrics

#### 🔗 核心关系
```
users (用户中心)
  ├── 创建: comments, questions, answers, markers
  ├── 管理: ratings, favorites, subscriptions
  └── 记录: audio_resume_states, notifications

audios (音频核心)
  ├── 分类: category_id, subcategory_id → categories
  ├── 内容: chapters, slides, transcriptions
  ├── 互动: comments, questions, ratings, favorites
  └── 扩展: related_resources, markers
```

#### ✨ 主要特性
- ✅ **用户权限系统**: role (user/admin) + status (active/inactive/banned)
- ✅ **两级分类体系**: 一级分类 + 二级分类（子分类）
- ✅ **音频生命周期**: draft/published/archived
- ✅ **播放进度追踪**: 自动保存播放位置
- ✅ **评论嵌套回复**: 支持多层级评论
- ✅ **问答系统**: 提问 + 回答 + 采纳功能
- ✅ **防重复约束**: 评分、收藏防止重复操作
- ✅ **性能监控**: 查询性能 + API 指标实时追踪

#### 📄 详细文档
完整的数据库结构分析请查看: **[DATABASE_STRUCTURE_ANALYSIS.md](DATABASE_STRUCTURE_ANALYSIS.md)**

该文档包含：
- 📋 每张表的详细字段说明
- 🔗 完整的外键关系图
- 📈 索引策略和性能优化建议
- 🔧 数据维护和清理策略
- 📝 PostgreSQL → MySQL 迁移说明

### 认证系统
- 使用 NextAuth.js 进行会话管理
- 统一认证中间件确保API安全性
- 支持用户和管理员权限控制
- 统一的错误响应格式

## 🔐 认证系统修复

### 问题解决
项目已修复登录后台经常退出到登录界面的问题，通过以下改进：

1. **withSecurity 安全封装** - 创建并落地 `src/lib/secureApiWrapper.ts`
2. **API 端点标准化** - 端点统一迁移到 `withSecurity/withSecurityAndValidation`
3. **错误响应统一** - 标准化的错误格式便于前端处理
4. **数据库一致性** - 统一的数据查询和验证方式

### 修复的API端点
- `src/app/api/admin/users-simple/route.ts` - 管理员用户管理
- `src/app/api/test-admin/route.ts` - 管理员测试API
- 更多API端点正在迁移到统一认证系统

### 测试认证系统
```bash
# 测试未认证状态
curl -s "http://localhost:3000/api/test-admin" | jq '.error.code'
# 应该返回: "UNAUTHORIZED"

# 测试会话检查
curl -s "http://localhost:3000/api/check-session" | jq '.hasSession'
# 应该返回: false
```

详细修复说明请查看：[AUTH_FIX_SUMMARY.md](AUTH_FIX_SUMMARY.md)

## 🔒 安全封装与权限映射（withSecurity）

本项目所有 API 已统一迁移到 `withSecurity` 安全封装：
- 统一鉴权：支持登录校验、角色/权限点（RBAC）
- 统一防护：速率限制（RateLimit）、可选 CSRF 校验
- 统一校验：Zod 校验与输入清洗（sanitize*）

### 端点与权限（摘要）
- 管理端（需登录 + 权限点）
  - /api/admin/simple-upload: GET(UPLOAD_AUDIO), POST(UPLOAD_AUDIO, EDIT_AUDIO)
  - /api/admin/upload-cover: POST(EDIT_AUDIO)
  - /api/admin/dashboard/stats: GET(VIEW_ANALYTICS)
  - /api/admin/dashboard/stats-simple: GET(VIEW_ANALYTICS)
  - /api/admin/performance: GET(VIEW_ANALYTICS), DELETE(VIEW_ANALYTICS)
  - /api/admin/users: GET(VIEW_USERS), POST(CREATE_USER)
  - /api/admin/users/[id]: GET(VIEW_USERS), PUT(UPDATE_USER), DELETE(DELETE_USER)
  - /api/admin/simple-categories: GET/POST(MANAGE_CATEGORIES)
  - /api/related-resources: GET(公开,限流), POST(MANAGE_RESOURCES)
  - /api/related-resources/[id]: PUT/DELETE(MANAGE_RESOURCES)

- 用户端（需登录）
  - /api/csrf-token: GET
  - /api/user/notifications: GET
  - /api/user/subscriptions: GET/POST/PUT/DELETE
  - /api/user/progress: GET/POST
  - /api/user/social: GET/POST
  - /api/user/insights: GET
  - /api/user/profile: GET/PUT
  - /api/user/change-password: POST
  - /api/user/stats: GET
  - /api/playlists: GET/POST
  - /api/playlists/[id]/items: POST/DELETE/PUT
  - /api/notifications: GET/PUT
  - /api/notifications/[id]: PUT/DELETE
  - /api/favorites: GET/POST/DELETE
  - /api/upload: POST（登录 + 限流）

- 公共端（无需登录）
  - /api/comments: GET
  - /api/questions: GET
  - /api/questions/[id]: GET
  - /api/answers: GET
  - /api/ratings: GET
  - /api/markers: GET（功能已移除，返回空）

### 写操作的 CSRF 与频控
- 写操作（POST/PUT/DELETE）默认已启用限流；以下关键端点已开启 CSRF：
  - 管理端：simple-upload(POST), upload-cover(POST), performance(DELETE), users(POST), users/[id](PUT/DELETE), simple-categories(POST), related-resources(POST/PUT/DELETE)
  - 用户端：user/notifications(PUT), user/subscriptions(POST/PUT/DELETE), user/progress(POST), user/social(POST), user/profile(PUT), user/change-password(POST), playlists(POST), playlists/[id]/items(POST/DELETE/PUT), notifications/[id](PUT/DELETE), comments(POST), comments/[id](PUT/DELETE), questions(POST), questions/[id](DELETE), answers(POST), answers/[id](PUT/DELETE), ratings(POST)

- 典型频控（示例）：
  - user/change-password POST: 每分钟最多 3 次
  - user/notifications PUT(标记全部已读): 每分钟最多 20 次
  - answers POST: 每分钟最多 10 次
  - questions POST: 每分钟最多 5 次
  - ratings POST: 每分钟最多 10 次
  - playlists POST: 每分钟最多 10 次
  - markers POST: 每分钟最多 30 次

### 用户标识获取
- 统一封装内部会优先从会话获取用户；部分端点支持从请求头读取（如 `x-user-id`, `x-user-role`, `x-user-email`）。
- 前端或边缘层需确保已登录场景正确传递用户标识，或在路由内通过 `getServerSession` 获取会话。

## 🚀 部署

### Docker 一键部署（生产推荐）
1. 服务器安装 Docker & Compose v2
2. 上传并解压打包文件 `health-hub-docker_*.tar.gz`
3. 配置 `deploy/docker/.env`（POSTGRES_*/DATABASE_URL/NEXTAUTH_*/JWT/SESSION 等）
4. 运行一键脚本：
```bash
cd deploy/docker
chmod +x one-click-docker.sh
./one-click-docker.sh
```

### 云端打包与数据库导出

导出 MySQL（本地/云端均可运行）：

```bash
# 基于环境变量
MYSQL_HOST=localhost MYSQL_PORT=3306 MYSQL_USER=root MYSQL_PASSWORD=xxx MYSQL_DATABASE=health_hub \
  ./scripts/export-mysql.sh

# 或通过 DATABASE_URL
DATABASE_URL='mysql://root:xxx@localhost:3306/health_hub' ./scripts/export-mysql.sh
```

Docker 部署并附带导出能力：

```bash
cd docker
docker compose up -d --build

# 进入容器运行导出（导出后的文件位于容器 /app/database/exports，可挂载卷持久化）
docker compose exec app export-mysql
```

### 接口与数据结构
- 完整 API 清单见：`docs/API_ENDPOINTS.md`
- 数据库实体关系图（ERD）见上方文档或部署文档。

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