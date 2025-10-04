# Health Hub 上传文件清单

## 📦 完整的云端部署包

使用以下命令生成完整的部署包：

```bash
# 生成云端部署包
./create-cloud-package.sh

# 或者使用快速部署脚本
./quick-cloud-deploy.sh
```

## 📋 上传文件清单

### 🗂️ 主要文件（必需）

#### 1. 部署包文件
```
📦 health-hub-cloud-YYYYMMDD_HHMMSS.tar.gz
   - 完整的应用和配置包
   - 包含所有必需文件
   - 大小约 150-300MB（取决于音频文件）

📦 health-hub-cloud-YYYYMMDD_HHMMSS.zip
   - Windows 兼容格式
   - 可选下载
```

#### 2. 数据库初始化脚本
```
🗄️ database/
   ├── cloud-init-mysql.sql           # MySQL 初始化脚本
   ├── cloud-init-postgresql.sql      # PostgreSQL 初始化脚本
   └── README-cloud-init.md           # 数据库文档
```

#### 3. 部署脚本
```
📜 scripts/
   ├── init-cloud-database.sh         # 云端数据库初始化
   ├── init-cloud-database-docker.sh  # Docker 环境初始化
   └── export-mysql.sh                # 数据库导出工具
```

#### 4. 配置和文档
```
⚙️ config/
   ├── env.cloud.template             # 环境配置模板
   └── CLOUD_DEPLOYMENT_GUIDE.md      # 详细部署指南

📖 README.md                           # 快速开始指南
📖 PACKAGE_INFO.json                   # 包信息
```

### 🐳 Docker 相关文件（可选）

```
🐳 docker/
   ├── Dockerfile                     # 应用镜像构建
   └── docker-compose.yml             # 服务编排配置
```

### 📜 部署脚本

```
📜 deploy.sh                           # 一键部署脚本
🐳 docker-deploy.sh                    # Docker 部署脚本
```

## 🚀 上传和部署步骤

### 步骤 1: 生成部署包
```bash
# 在本地运行
./create-cloud-package.sh
```

### 步骤 2: 上传到服务器
```bash
# 方法一：SCP（推荐）
scp dist/health-hub-cloud-*.tar.gz your-server:~/

# 方法二：rsync（大文件推荐）
rsync -avz dist/health-hub-cloud-*.tar.gz your-server:~/

# 方法三：FTP（如果 SSH 不可用）
# 使用 FTP 客户端上传文件
```

### 步骤 3: 服务器端部署
```bash
# SSH 到服务器
ssh your-server

# 解压文件
tar -xzf health-hub-cloud-*.tar.gz
cd health-hub-cloud-*

# 配置环境
cp .env.example .env
nano .env  # 编辑配置

# 部署应用
./deploy.sh
```

## 📊 文件大小估算

| 文件类型 | 大小估算 | 说明 |
|---------|---------|------|
| 应用代码 | 50-100MB | Next.js 应用 + 依赖 |
| 音频文件 | 50-200MB | 上传的音频内容 |
| 数据库脚本 | 1-5MB | SQL 初始化脚本 |
| Docker 配置 | 1MB | Dockerfile 和 Compose |
| 文档 | 1MB | README 和指南 |
| **总计** | **100-300MB** | 完整部署包 |

## 🔧 最小化部署

如果您想减少上传文件大小，可以选择以下策略：

### 选项 1: 仅上传必要文件
```bash
# 只上传核心文件
tar -czf health-hub-minimal.tar.gz \
    .next/ \
    public/ \
    src/ \
    database/cloud-init-mysql.sql \
    scripts/init-cloud-database.sh \
    config/env.cloud.template \
    CLOUD_DEPLOYMENT_GUIDE.md \
    README.md
```

### 选项 2: 分离静态资源
```bash
# 应用代码包
tar -czf health-hub-app.tar.gz .next/ src/ database/ scripts/ config/

# 音频文件包（单独上传）
tar -czf health-hub-media.tar.gz public/uploads/
```

### 选项 3: 使用 Git 克隆
```bash
# 在服务器上直接克隆
git clone https://your-repo/health-hub.git
cd health-hub

# 构建应用
npm install
npm run build

# 部署
./create-cloud-package.sh
```

## 📦 包内容详细说明

### 应用文件
```
📁 .next/                    # Next.js 构建输出
📁 public/                   # 静态资源
📁 src/                      # 源代码
📁 node_modules/             # 依赖包
📜 package.json              # 项目配置
📜 next.config.js            # Next.js 配置
📜 tailwind.config.js        # 样式配置
```

### 数据库文件
```
📁 database/
   📜 cloud-init-mysql.sql           # MySQL 完整初始化
   📜 cloud-init-postgresql.sql      # PostgreSQL 完整初始化
   📖 README-cloud-init.md           # 数据库使用说明
```

### 部署工具
```
📁 scripts/
   📜 init-cloud-database.sh         # 云端数据库初始化
   📜 init-cloud-database-docker.sh  # Docker 环境初始化
   📜 export-mysql.sh                # 数据库导出工具

📜 deploy.sh                         # 一键部署脚本
🐳 docker-deploy.sh                  # Docker 部署脚本
```

### 配置和文档
```
📁 config/
   📜 env.cloud.template             # 环境配置模板
   📖 CLOUD_DEPLOYMENT_GUIDE.md      # 详细部署指南

📖 README.md                         # 快速开始指南
📖 PACKAGE_INFO.json                 # 包信息
```

## 🔍 验证上传完整性

### 检查文件完整性
```bash
# 解压后检查
tar -tzf health-hub-cloud-*.tar.gz | wc -l

# 应该包含 500+ 个文件
```

### 验证关键文件
```bash
# 解压后检查
cd health-hub-cloud-*
ls -la deploy.sh database/cloud-init-mysql.sql config/
```

### 文件权限检查
```bash
# 确保脚本可执行
chmod +x deploy.sh
chmod +x scripts/init-cloud-database.sh
```

## 📋 部署前检查清单

- [ ] 部署包已生成 (`create-cloud-package.sh`)
- [ ] 文件已上传到服务器
- [ ] 服务器已安装 Docker/Node.js
- [ ] 数据库服务已准备就绪
- [ ] 域名和 SSL 已配置
- [ ] 防火墙已正确设置

## 🆘 故障排除

### 文件上传问题
```bash
# 检查文件大小
ls -lh dist/health-hub-cloud-*.tar.gz

# 重新生成包
./create-cloud-package.sh --clean

# 上传到临时目录
scp dist/health-hub-cloud-*.tar.gz your-server:/tmp/
```

### 文件损坏检查
```bash
# 验证文件完整性
tar -tzf health-hub-cloud-*.tar.gz >/dev/null && echo "文件完整"

# 检查 SHA256 校验和
cat health-hub-cloud-*.tar.gz.sha256
```

## 🎯 推荐上传方式

### 1. 大文件推荐：rsync
```bash
rsync -avz --progress dist/health-hub-cloud-*.tar.gz your-server:~/
```

### 2. 小文件推荐：scp
```bash
scp dist/health-hub-cloud-*.tar.gz your-server:~/
```

### 3. 网络受限：分批上传
```bash
# 拆分大文件
split -b 100m health-hub-cloud-*.tar.gz health-hub-part-

# 上传分片
scp health-hub-part-* your-server:~/

# 服务器端重组
cat health-hub-part-* > health-hub-cloud-*.tar.gz
```

## 📞 技术支持

如果遇到上传或部署问题：

1. **检查文件大小**: 确保包大小合理
2. **验证网络连接**: 测试服务器连接
3. **查看系统日志**: 检查上传过程
4. **分批上传**: 如果单个文件太大
5. **使用压缩**: 确保文件已正确压缩

---

**注意**: 上传前请确保服务器有足够的磁盘空间（建议 1GB+ 可用空间）。
