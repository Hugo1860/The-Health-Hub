# 🚀 部署方案总览 - 一页搞定

## 📦 项目背景

- **开发环境**: Mac M3 (ARM架构)
- **目标服务器**: Ubuntu 22.04 x86_64
- **数据库**: MySQL 8.0
- **部署方式**: Docker Compose

---

## ⚡ 3种部署方式速览

### 🥇 方式一：本地一键上传部署（最推荐）

**适合**: 有SSH访问权限，想要最省心的方式

```bash
# 在本地Mac上执行一条命令
./upload-and-deploy.sh ubuntu@your-server-ip
```

**耗时**: 3-5分钟 | **难度**: ⭐️

---

### 🥈 方式二：服务器上一键部署

**适合**: 已将代码上传到服务器，想要快速启动

```bash
# 1. 上传代码
scp health-hub.tar.gz user@server:~/
ssh user@server
tar -xzf health-hub.tar.gz && cd health-hub

# 2. 一键部署
./deploy-ubuntu-simple.sh
```

**耗时**: 5-10分钟 | **难度**: ⭐️⭐️

---

### 🥉 方式三：手动PM2部署

**适合**: 资源有限或不想用Docker

```bash
# 安装依赖
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs mysql-server -y

# 配置数据库
sudo mysql -e "CREATE DATABASE health_hub; CREATE USER 'health_app'@'localhost' IDENTIFIED BY 'password'; GRANT ALL ON health_hub.* TO 'health_app'@'localhost';"

# 启动应用
npm install && npm run build
npm install -g pm2
pm2 start npm --name health-hub -- start
```

**耗时**: 15-20分钟 | **难度**: ⭐️⭐️⭐️

---

## 📋 部署前准备清单

### 必需条件
- ✅ Ubuntu 22.04 LTS服务器
- ✅ 至少2GB内存，20GB硬盘
- ✅ SSH访问权限
- ✅ Root或sudo权限

### 可选项
- 🔹 域名（可用IP访问）
- 🔹 SSL证书（可后续配置）

---

## 🎯 推荐部署流程

### 第1步：选择部署方式

**如果你有SSH密钥配置好了** → 使用方式一（本地一键部署）  
**如果你想手动控制每一步** → 使用方式二（服务器一键部署）  
**如果你不想用Docker** → 使用方式三（PM2部署）

### 第2步：准备环境变量

**重要**: 必须修改以下配置

```bash
# 生成4个随机密钥
openssl rand -base64 32  # 复制为 NEXTAUTH_SECRET
openssl rand -base64 32  # 复制为 SESSION_SECRET
openssl rand -base64 32  # 复制为 JWT_SECRET
openssl rand -base64 32  # 复制为 CSRF_SECRET
```

编辑 `.env.production`:
```env
NEXTAUTH_URL=http://your-server-ip:3000
NEXTAUTH_SECRET=上面生成的第1个密钥
SESSION_SECRET=上面生成的第2个密钥
JWT_SECRET=上面生成的第3个密钥
CSRF_SECRET=上面生成的第4个密钥
MYSQL_ROOT_PASSWORD=your-secure-root-password
MYSQL_PASSWORD=your-secure-app-password
```

### 第3步：执行部署

选择对应的部署命令执行即可。

### 第4步：验证部署

```bash
# 检查服务状态
docker compose ps

# 访问应用
curl http://localhost:3000

# 运行健康检查
./server-health-check.sh
```

---

## 🔧 部署后必做事项

### 1. 安全配置（重要！）

```bash
# 配置防火墙
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. 配置域名和SSL（推荐）

```bash
# 安装Nginx
sudo apt install nginx -y

# 配置反向代理（见 DEPLOYMENT_GUIDE_UBUNTU.md）

# 申请SSL证书
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

### 3. 配置备份（重要！）

```bash
# 添加到crontab
crontab -e

# 每天2点备份数据库
0 2 * * * docker compose exec db mysqldump -u root -p health_hub > /backups/db_$(date +\%Y\%m\%d).sql

# 每天3点备份文件
0 3 * * * tar -czf /backups/uploads_$(date +\%Y\%m\%d).tar.gz /path/to/public/uploads/
```

---

## 📊 常用命令速查

### 服务管理

```bash
# 启动服务
docker compose up -d

# 停止服务
docker compose down

# 重启服务
docker compose restart

# 查看状态
docker compose ps

# 查看日志
docker compose logs -f app
```

### 数据库管理

```bash
# 进入数据库
docker compose exec db mysql -u health_app -p health_hub

# 备份数据库
docker compose exec db mysqldump -u root -p health_hub > backup.sql

# 恢复数据库
docker compose exec -T db mysql -u health_app -p health_hub < backup.sql
```

### 应用更新

```bash
# 拉取最新代码
git pull

# 重新构建
docker compose build app

# 重启服务
docker compose up -d
```

---

## 🆘 常见问题

### Q1: 端口3000被占用怎么办？

**A**: 编辑 `docker-compose.yml`，修改端口映射：
```yaml
ports:
  - "8080:3000"  # 改成8080或其他端口
```

### Q2: 数据库连接失败？

**A**: 检查以下几点：
1. 数据库容器是否运行：`docker compose ps db`
2. 密码是否正确：检查 `.env.production`
3. 网络是否正常：`docker compose exec app ping db`

### Q3: 应用构建失败？

**A**: 
1. 清理缓存：`docker compose down -v`
2. 重新构建：`docker compose build --no-cache`
3. 查看日志：`docker compose logs app`

### Q4: 如何查看错误日志？

**A**:
```bash
# 应用日志
docker compose logs app --tail=100

# 数据库日志
docker compose logs db --tail=50

# 实时日志
docker compose logs -f
```

### Q5: 内存不足怎么办？

**A**: 
1. 增加swap空间：
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

2. 或升级服务器配置

---

## 📚 详细文档索引

| 文档 | 说明 | 阅读时间 |
|------|------|----------|
| **QUICK_START_UBUNTU.md** | 快速开始指南 | 5分钟 |
| **DEPLOYMENT_GUIDE_UBUNTU.md** | 详细部署手册 | 20分钟 |
| **DEPLOY_README.md** | 部署方案对比 | 10分钟 |
| **DEPLOYMENT_CHECKLIST.md** | 部署检查清单 | 随时参考 |
| **env.cloud.template** | 环境变量模板 | 2分钟 |

---

## 🎯 快速决策树

```
开始部署
    │
    ├─ 想最省心？
    │   └─ 使用: ./upload-and-deploy.sh
    │
    ├─ 已上传代码到服务器？
    │   └─ 使用: ./deploy-ubuntu-simple.sh
    │
    ├─ 不想用Docker？
    │   └─ 使用: PM2手动部署
    │
    └─ 需要自定义配置？
        └─ 参考: DEPLOYMENT_GUIDE_UBUNTU.md
```

---

## ✅ 部署成功标志

当你看到以下内容时，说明部署成功：

1. ✅ `docker compose ps` 显示所有容器为 `Up` 状态
2. ✅ 浏览器访问 `http://server-ip:3000` 可以打开首页
3. ✅ `curl http://localhost:3000/api/health` 返回成功
4. ✅ 可以登录后台管理
5. ✅ 可以播放音频文件

---

## 🚨 紧急救援命令

如果出现问题，按顺序尝试：

```bash
# 1. 重启所有服务
docker compose restart

# 2. 查看错误日志
docker compose logs app --tail=100

# 3. 停止并重新启动
docker compose down
docker compose up -d

# 4. 完全重建
docker compose down -v
docker compose build --no-cache
docker compose up -d

# 5. 运行健康检查
./server-health-check.sh
```

---

## 📞 获取帮助

1. **查看详细文档**: 根据上面的索引选择相应文档
2. **运行健康检查**: `./server-health-check.sh`
3. **查看日志**: `docker compose logs -f`
4. **检查配置**: `docker compose config`

---

## 🎉 总结

- **最快部署**: 5分钟（使用一键脚本）
- **推荐方式**: Docker Compose
- **必做事项**: 修改密码、配置防火墙、设置备份
- **可选项**: 域名、SSL、Nginx

**开始部署吧！** 🚀

---

*最后更新: 2025-10-01*
*适用版本: Health Hub v1.0*

