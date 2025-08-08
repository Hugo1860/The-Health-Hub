# 医学生物科技音频博客 - 新版地址列表

## 🏠 前台用户地址

### 主页和浏览
- **主页**: http://localhost:3001/
- **音频浏览**: http://localhost:3001/browse
- **搜索页面**: http://localhost:3001/search

### 用户功能
- **用户注册**: http://localhost:3001/auth/signup
- **用户登录**: http://localhost:3001/auth/signin
- **个人资料**: http://localhost:3001/profile
- **收藏夹**: http://localhost:3001/favorites
- **播放列表**: http://localhost:3001/playlists
- **订阅管理**: http://localhost:3001/subscriptions

### 音频相关
- **音频详情**: http://localhost:3001/audio/[id]
- **播放列表详情**: http://localhost:3001/playlists/[id]

## 🔐 管理后台地址 (全新 Ant Design 版本)

### 登录入口
- **管理员登录**: http://localhost:3001/auth/signin
  - 需要使用管理员账户登录（role: 'admin', 'moderator', 或 'editor'）

### 核心管理页面 (Ant Design 版本)
- **管理后台首页**: http://localhost:3001/admin
- **音频管理**: http://localhost:3001/admin/audio
- **用户管理**: http://localhost:3001/admin/users
- **系统设置**: http://localhost:3001/admin/system

### 其他管理功能
- **分类管理**: http://localhost:3001/admin/categories
- **日志管理**: http://localhost:3001/admin/logs
- **错误日志**: http://localhost:3001/admin/errors
- **数据分析**: http://localhost:3001/admin/analytics
- **资源管理**: http://localhost:3001/admin/resources
- **幻灯片管理**: http://localhost:3001/admin/slides

## 🗂️ 旧版本归档

所有旧版本的管理页面已移动到 `legacy-backup/` 目录：
- `legacy-backup/upload/` - 旧版音频上传页面
- `legacy-backup/users/` - 旧版用户管理页面
- `legacy-backup/system/` - 旧版系统设置页面
- `legacy-backup/system-simple/` - 简化版系统设置
- `legacy-backup/AdminLayout.tsx` - 旧版管理布局组件
- `legacy-backup/test-*` - 各种测试页面

## 🎨 新版特性

### 统一的 Ant Design 界面
- 所有管理页面使用统一的 Ant Design 组件
- 响应式设计，支持桌面、平板、移动端
- 统一的权限管理系统
- 现代化的用户界面和交互体验

### 权限管理系统
- **管理员 (admin)**: 拥有所有权限
- **版主 (moderator)**: 用户管理、音频管理、分类管理、数据分析
- **编辑 (editor)**: 音频管理、分类管理

### 主要改进
1. **界面统一**: 所有页面使用相同的设计语言
2. **权限清晰**: 统一的权限管理，避免混乱
3. **用户体验**: 更好的交互和视觉效果
4. **维护性**: 代码结构更清晰，易于维护

## 🚀 快速访问

**推荐的访问流程**：
1. 前台主页: http://localhost:3001/
2. 管理员登录: http://localhost:3001/auth/signin
3. 管理后台: http://localhost:3001/admin
4. 音频管理: http://localhost:3001/admin/audio
5. 用户管理: http://localhost:3001/admin/users
6. 系统设置: http://localhost:3001/admin/system

## 📝 注意事项

1. **旧版本已归档**: 不再维护旧版本的管理页面
2. **权限统一**: 所有管理功能使用统一的权限系统
3. **界面一致**: 所有页面使用 Ant Design 组件
4. **响应式**: 支持各种设备尺寸
5. **安全性**: 增强的权限验证和安全措施

所有地址都基于本地开发服务器 `localhost:3001`，如果你的端口不同，请相应调整。