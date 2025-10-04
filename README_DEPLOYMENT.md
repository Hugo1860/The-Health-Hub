# 🚀 Health Hub 部署文档导航

> **从 Mac M3 部署到 Ubuntu 22.04 x86_64 服务器的完整指南**

---

## 📖 文档结构

本项目包含完整的部署文档和自动化脚本，帮助您快速将应用从本地Mac部署到Ubuntu云服务器。

### 📚 核心文档

| 文档 | 用途 | 适合人群 | 阅读时间 |
|------|------|----------|----------|
| **[DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md)** | 一页纸总览 | 所有人 | 2分钟 ⭐️⭐️⭐️⭐️⭐️ |
| **[QUICK_START_UBUNTU.md](./QUICK_START_UBUNTU.md)** | 快速开始 | 想快速上手 | 5分钟 ⭐️⭐️⭐️⭐️⭐️ |
| **[DEPLOYMENT_GUIDE_UBUNTU.md](./DEPLOYMENT_GUIDE_UBUNTU.md)** | 详细手册 | 需要深入了解 | 20分钟 ⭐️⭐️⭐️⭐️ |
| **[DEPLOY_README.md](./DEPLOY_README.md)** | 方案对比 | 选择部署方式 | 10分钟 ⭐️⭐️⭐️⭐️ |
| **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** | 检查清单 | 确保完整部署 | 随时参考 ⭐️⭐️⭐️⭐️ |
| **[DEPLOY_COMMANDS.txt](./DEPLOY_COMMANDS.txt)** | 命令速查 | 快速查找命令 | 1分钟 ⭐️⭐️⭐️⭐️⭐️ |

### 🛠️ 自动化脚本

| 脚本 | 功能 | 使用场景 |
|------|------|----------|
| **[upload-and-deploy.sh](./upload-and-deploy.sh)** | 本地一键上传部署 | 最简单方式 ⭐️⭐️⭐️⭐️⭐️ |
| **[deploy-ubuntu-simple.sh](./deploy-ubuntu-simple.sh)** | 服务器一键部署 | 代码已在服务器 ⭐️⭐️⭐️⭐️⭐️ |
| **[server-health-check.sh](./server-health-check.sh)** | 健康检查 | 故障排查 ⭐️⭐️⭐️⭐️ |

### 📋 配置文件

| 文件 | 说明 |
|------|------|
| **[env.cloud.template](./env.cloud.template)** | 云端环境变量模板 |
| **[docker-compose.yml](./docker-compose.yml)** | Docker编排配置 |
| **[Dockerfile](./Dockerfile)** | Docker镜像构建 |

---

## 🎯 快速开始（3步搞定）

### 方式一：本地Mac一键部署（最推荐）

```bash
# 1. 赋予脚本执行权限
chmod +x upload-and-deploy.sh

# 2. 执行部署（替换为你的服务器地址）
./upload-and-deploy.sh ubuntu@your-server-ip

# 3. 完成！🎉
# 访问 http://your-server-ip:3000
```

### 方式二：服务器上部署

```bash
# 1. 上传代码到服务器
tar --exclude='node_modules' --exclude='.next' -czf health-hub.tar.gz .
scp health-hub.tar.gz user@server:~/

# 2. 在服务器上解压并部署
ssh user@server
tar -xzf health-hub.tar.gz -C ~/health-hub && cd ~/health-hub
chmod +x deploy-ubuntu-simple.sh
./deploy-ubuntu-simple.sh

# 3. 完成！🎉
```

---

## 📍 如何选择合适的文档？

### 🆕 第一次部署

**推荐阅读顺序**：
1. **DEPLOYMENT_SUMMARY.md** (2分钟) - 了解整体方案
2. **QUICK_START_UBUNTU.md** (5分钟) - 快速上手
3. **执行部署脚本** - 开始部署
4. **DEPLOYMENT_CHECKLIST.md** - 确认部署完整

### 🔧 需要详细配置

**推荐阅读**：
1. **DEPLOYMENT_GUIDE_UBUNTU.md** - 完整部署手册
2. **DEPLOY_README.md** - 方案详细对比
3. **env.cloud.template** - 环境变量说明

### 🆘 遇到问题

**推荐查看**：
1. **DEPLOYMENT_GUIDE_UBUNTU.md** 的故障排查章节
2. 运行 **server-health-check.sh** 健康检查
3. **DEPLOY_COMMANDS.txt** - 常用命令速查

### 📊 日常运维

**推荐使用**：
1. **DEPLOY_COMMANDS.txt** - 命令速查表
2. **server-health-check.sh** - 定期健康检查
3. **DEPLOYMENT_CHECKLIST.md** - 运维清单

---

## 🎬 部署流程图

```
开始部署
    │
    ├─ 选择部署方式
    │   ├─ 方式一: 本地一键部署 (./upload-and-deploy.sh)
    │   ├─ 方式二: 服务器部署 (./deploy-ubuntu-simple.sh)
    │   └─ 方式三: 手动部署 (参考文档)
    │
    ├─ 自动执行
    │   ├─ 安装Docker
    │   ├─ 配置环境变量
    │   ├─ 构建镜像 (x86_64)
    │   ├─ 启动服务
    │   └─ 初始化数据库
    │
    ├─ 验证部署
    │   ├─ 访问应用 (http://server-ip:3000)
    │   ├─ 运行健康检查 (./server-health-check.sh)
    │   └─ 测试核心功能
    │
    └─ 后续配置
        ├─ 修改默认密码 ✅
        ├─ 配置防火墙 ✅
        ├─ 配置域名+SSL (可选)
        ├─ 设置自动备份 ✅
        └─ 完成！🎉
```

---

## 💡 核心特性

### ✅ 架构兼容性
- 自动处理 **ARM (M3) → x86_64** 架构转换
- Docker 多平台构建支持
- 无需手动配置交叉编译

### ✅ 一键自动化
- 自动安装所有依赖
- 自动配置环境变量
- 自动初始化数据库
- 自动健康检查

### ✅ 安全配置
- 密钥自动生成
- 防火墙配置指南
- SSL 证书配置
- 安全检查清单

### ✅ 完整文档
- 适合不同场景的文档
- 命令速查表
- 故障排查指南
- 运维检查清单

---

## 🔐 安全提醒

### 🚨 部署前必做

1. **生成新的认证密钥**
   ```bash
   openssl rand -base64 32  # 执行4次，分别用于各个密钥
   ```

2. **修改默认密码**
   - MySQL root 密码
   - MySQL app 密码
   - 管理员账号密码

3. **配置防火墙**
   ```bash
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

---

## 📊 系统要求

### 服务器最低配置
- **操作系统**: Ubuntu 22.04 LTS x86_64
- **CPU**: 2核
- **内存**: 2GB (推荐 4GB)
- **硬盘**: 20GB 可用空间
- **网络**: 稳定的网络连接

### 服务器推荐配置
- **CPU**: 4核
- **内存**: 4GB+
- **硬盘**: 50GB+ SSD
- **带宽**: 5Mbps+

---

## 🎯 部署时间估算

| 部署方式 | 准备时间 | 执行时间 | 总计 |
|---------|---------|---------|------|
| **本地一键部署** | 2分钟 | 3-5分钟 | **5-7分钟** ⭐️⭐️⭐️⭐️⭐️ |
| **服务器一键部署** | 5分钟 | 5-10分钟 | **10-15分钟** ⭐️⭐️⭐️⭐️ |
| **手动Docker部署** | 10分钟 | 10-15分钟 | **20-25分钟** ⭐️⭐️⭐️ |
| **PM2手动部署** | 15分钟 | 15-20分钟 | **30-35分钟** ⭐️⭐️ |

---

## 📞 获取帮助

### 📚 查阅文档
根据你的情况选择合适的文档（见上方文档结构表）

### 🔍 运行诊断
```bash
./server-health-check.sh
```

### 📋 查看日志
```bash
docker compose logs -f app
```

### 💬 常见问题
查看 **DEPLOYMENT_GUIDE_UBUNTU.md** 的故障排查章节

---

## ✅ 部署成功标志

当你看到以下内容时，说明部署成功：

- ✅ `docker compose ps` 所有容器状态为 `Up`
- ✅ 浏览器可访问 `http://server-ip:3000`
- ✅ 健康检查 `curl http://localhost:3000/api/health` 返回成功
- ✅ 可以登录后台管理
- ✅ 可以播放音频文件

---

## 🎉 下一步

部署成功后，建议完成以下配置：

1. ✅ **安全配置** - 修改密码、配置防火墙
2. 🌐 **域名配置** - 绑定域名（可选）
3. 🔒 **SSL证书** - 启用HTTPS（推荐）
4. 💾 **自动备份** - 配置数据库和文件备份
5. 📊 **监控告警** - 设置健康检查和告警

详见 **DEPLOYMENT_GUIDE_UBUNTU.md** 相关章节。

---

## 🚀 立即开始

```bash
# 选择最简单的方式 - 本地一键部署
chmod +x upload-and-deploy.sh
./upload-and-deploy.sh ubuntu@your-server-ip
```

或者

```bash
# 先快速了解部署方案
cat DEPLOYMENT_SUMMARY.md
```

---

**祝部署顺利！** 🎊

*如有问题，请参考相应文档或运行健康检查脚本。*

---

*最后更新: 2025-10-01*  
*适用版本: Health Hub v1.0*  
*部署目标: Ubuntu 22.04 x86_64*  
*开发环境: Mac M3 ARM*

