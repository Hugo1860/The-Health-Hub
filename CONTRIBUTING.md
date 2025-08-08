# 贡献指南

感谢您对健闻局 The Health Hub 项目的关注！我们欢迎任何形式的贡献。

## 🤝 如何贡献

### 报告问题
- 使用 [GitHub Issues](https://github.com/Hugo1860/The-Health-Hub/issues) 报告 bug
- 提供详细的问题描述和复现步骤
- 包含相关的错误信息和截图

### 功能建议
- 在 Issues 中提出新功能建议
- 详细描述功能需求和使用场景
- 讨论实现方案

### 代码贡献

#### 开发环境设置
1. Fork 项目到您的 GitHub 账户
2. 克隆您的 fork 到本地
```bash
git clone https://github.com/YOUR_USERNAME/The-Health-Hub.git
cd The-Health-Hub
```

3. 安装依赖
```bash
npm install
```

4. 创建功能分支
```bash
git checkout -b feature/your-feature-name
```

#### 开发规范

**代码风格**
- 使用 TypeScript
- 遵循 ESLint 和 Prettier 配置
- 组件使用 PascalCase 命名
- 文件使用 camelCase 命名

**提交规范**
使用语义化提交信息：
- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建过程或辅助工具的变动

示例：
```bash
git commit -m "feat: 添加音频播放速度控制功能"
git commit -m "fix: 修复移动端播放器显示问题"
```

**代码审查**
- 确保代码通过所有测试
- 添加必要的注释和文档
- 保持代码简洁和可读性
- 遵循现有的架构模式

#### 提交 Pull Request

1. 推送您的分支到 GitHub
```bash
git push origin feature/your-feature-name
```

2. 在 GitHub 上创建 Pull Request
3. 填写 PR 模板，详细描述更改内容
4. 等待代码审查和反馈

## 📋 开发指南

### 项目结构
```
src/
├── app/                 # Next.js App Router 页面
├── components/          # React 组件
├── hooks/              # 自定义 Hooks
├── lib/                # 工具函数
├── store/              # 状态管理
└── contexts/           # React Context
```

### 组件开发
- 使用函数式组件和 Hooks
- 优先使用 Ant Design 组件
- 确保组件的可复用性
- 添加 TypeScript 类型定义

### API 开发
- 使用 Next.js API Routes
- 实现适当的错误处理
- 添加输入验证
- 遵循 RESTful 设计原则

### 样式开发
- 优先使用 Ant Design 组件样式
- 使用 Tailwind CSS 进行自定义样式
- 确保响应式设计
- 保持设计一致性

## 🧪 测试

### 运行测试
```bash
npm run test
```

### 测试覆盖率
```bash
npm run test:coverage
```

### 添加测试
- 为新功能添加单元测试
- 确保测试覆盖率不降低
- 使用 Jest 和 React Testing Library

## 📚 文档

### 更新文档
- 更新 README.md（如果需要）
- 添加 JSDoc 注释
- 更新 API 文档

### 文档风格
- 使用清晰简洁的语言
- 提供代码示例
- 包含必要的截图

## 🚀 发布流程

1. 功能开发完成
2. 通过所有测试
3. 代码审查通过
4. 合并到主分支
5. 自动部署到生产环境

## 📞 联系方式

如果您有任何问题或建议，请通过以下方式联系我们：

- GitHub Issues: [项目 Issues](https://github.com/Hugo1860/The-Health-Hub/issues)
- 邮件: [项目邮箱]

## 🙏 致谢

感谢所有贡献者的努力和支持！

---

再次感谢您对健闻局 The Health Hub 项目的贡献！🏥✨