# GitHub 仓库设置指南

本文档指导您如何将健闻局 The Health Hub 项目上传到 GitHub。

## 📋 准备工作

### 1. 确保已安装 Git
```bash
# 检查 Git 版本
git --version

# 如果未安装，请访问 https://git-scm.com/ 下载安装
```

### 2. 配置 Git 用户信息
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## 🚀 上传到 GitHub

### 步骤 1: 初始化本地仓库
```bash
# 进入项目目录
cd audio-blog

# 初始化 Git 仓库
git init

# 添加所有文件到暂存区
git add .

# 创建初始提交
git commit -m "feat: 初始化健闻局 The Health Hub 项目

- 完整的音频播放平台功能
- Ant Design 统一界面设计
- 用户认证和权限管理系统
- 响应式移动端适配
- 管理后台功能完整"
```

### 步骤 2: 连接到 GitHub 仓库
```bash
# 添加远程仓库
git remote add origin https://github.com/Hugo1860/The-Health-Hub.git

# 推送到 GitHub
git push -u origin main
```

### 步骤 3: 验证上传
访问 https://github.com/Hugo1860/The-Health-Hub 确认文件已成功上传。

## 📁 项目文件结构

确保以下重要文件已包含在仓库中：

```
The-Health-Hub/
├── README.md                 # 项目说明文档
├── LICENSE                   # MIT 许可证
├── CONTRIBUTING.md           # 贡献指南
├── DEPLOYMENT.md            # 部署指南
├── .gitignore               # Git 忽略文件
├── .env.example             # 环境变量示例
├── .github/
│   └── workflows/
│       └── ci.yml           # GitHub Actions 工作流
└── audio-blog/              # 主项目目录
    ├── src/                 # 源代码
    ├── public/              # 静态资源
    ├── package.json         # 项目配置
    ├── next.config.js       # Next.js 配置
    ├── tailwind.config.js   # Tailwind CSS 配置
    └── tsconfig.json        # TypeScript 配置
```

## 🔧 GitHub 仓库设置

### 1. 仓库设置
- **仓库名称**: The-Health-Hub
- **描述**: 健闻局 The Health Hub - 专业的健康医学音频内容平台
- **可见性**: Public (公开)
- **主分支**: main

### 2. 分支保护规则
建议设置以下分支保护规则：

```
分支: main
☑️ Require a pull request before merging
☑️ Require status checks to pass before merging
☑️ Require branches to be up to date before merging
☑️ Include administrators
```

### 3. GitHub Pages (可选)
如果需要部署文档站点：
- 启用 GitHub Pages
- 源分支: main
- 文件夹: / (root)

### 4. 议题模板
创建 `.github/ISSUE_TEMPLATE/` 目录并添加模板：

**Bug 报告模板**:
```markdown
---
name: Bug 报告
about: 创建一个报告来帮助我们改进
title: '[BUG] '
labels: bug
assignees: ''
---

**描述 Bug**
清晰简洁地描述这个 bug。

**复现步骤**
复现行为的步骤：
1. 转到 '...'
2. 点击 '....'
3. 滚动到 '....'
4. 看到错误

**预期行为**
清晰简洁地描述您期望发生的事情。

**截图**
如果适用，添加截图来帮助解释您的问题。

**环境信息:**
 - 操作系统: [例如 iOS]
 - 浏览器 [例如 chrome, safari]
 - 版本 [例如 22]

**附加信息**
在此处添加有关问题的任何其他信息。
```

### 5. Pull Request 模板
创建 `.github/pull_request_template.md`：

```markdown
## 更改描述
简要描述此 PR 的更改内容。

## 更改类型
- [ ] Bug 修复
- [ ] 新功能
- [ ] 代码重构
- [ ] 文档更新
- [ ] 样式更改
- [ ] 测试添加/更新

## 测试
- [ ] 我已经测试了这些更改
- [ ] 我已经添加了必要的测试
- [ ] 所有现有测试都通过

## 检查清单
- [ ] 我的代码遵循项目的代码风格
- [ ] 我已经进行了自我审查
- [ ] 我已经添加了必要的注释
- [ ] 我已经更新了相关文档
- [ ] 我的更改不会产生新的警告

## 相关议题
修复 #(议题编号)

## 截图 (如果适用)
添加截图来展示更改效果。
```

## 🏷️ 版本标签

### 创建发布版本
```bash
# 创建标签
git tag -a v1.0.0 -m "健闻局 The Health Hub v1.0.0 正式发布

主要功能:
- 完整的音频播放系统
- 用户认证和管理
- 响应式界面设计
- 管理后台功能"

# 推送标签
git push origin v1.0.0
```

### 在 GitHub 上创建 Release
1. 访问仓库的 Releases 页面
2. 点击 "Create a new release"
3. 选择标签 v1.0.0
4. 填写发布说明
5. 发布

## 🔄 持续集成

GitHub Actions 工作流已配置，将自动：
- 运行代码检查和测试
- 构建项目
- 部署到预览环境 (PR)
- 部署到生产环境 (main 分支)

## 📊 项目统计

启用以下 GitHub 功能：
- **Insights**: 查看项目统计信息
- **Security**: 安全漏洞扫描
- **Dependabot**: 依赖项更新提醒

## 🎯 下一步

1. **完善文档**: 添加更多使用示例和 API 文档
2. **添加测试**: 编写单元测试和集成测试
3. **性能优化**: 监控和优化应用性能
4. **社区建设**: 鼓励贡献和反馈

## 📞 支持

如果在设置过程中遇到问题：
1. 查看 GitHub 官方文档
2. 搜索相关问题
3. 创建 Issue 寻求帮助

---

恭喜！您的健闻局 The Health Hub 项目现已成功上传到 GitHub！🎉