# 🔧 Docker 构建问题排查指南

## ❌ 常见错误1: Docker Hub 连接失败

### 错误信息
```
failed to solve: failed to fetch anonymous token: 
Get "https://auth.docker.io/token...": read tcp: connection reset by peer
```

### 原因
无法连接到 Docker Hub，可能是：
- 网络防火墙限制
- Docker Hub 在中国大陆访问受限
- 网络不稳定

### 解决方案

#### 方案1: 临时移除 syntax 声明（最快）

编辑 `Dockerfile`，注释掉第一行：

```dockerfile
# 注释掉这一行
# # syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
```

然后重新构建：
```bash
docker compose build
```

#### 方案2: 配置 Docker 镜像加速器（推荐）

**Mac Docker Desktop 配置：**

1. 打开 Docker Desktop
2. 点击 Settings (齿轮图标)
3. 选择 Docker Engine
4. 添加以下配置：

```json
{
  "builder": {
    "gc": {
      "defaultKeepStorage": "20GB",
      "enabled": true
    }
  },
  "experimental": false,
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ]
}
```

5. 点击 "Apply & Restart"

#### 方案3: 使用国内镜像源

创建 `Dockerfile.cn`（使用阿里云镜像）：

```dockerfile
FROM registry.cn-hangzhou.aliyuncs.com/acs/node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm config set registry https://registry.npmmirror.com && \
    npm ci --omit=dev --no-audit --no-fund

FROM registry.cn-hangzhou.aliyuncs.com/acs/node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN npm config set registry https://registry.npmmirror.com && \
    npm run build

FROM registry.cn-hangzhou.aliyuncs.com/acs/node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache libc6-compat curl tini
RUN addgroup -g 1001 nodejs && adduser -D -u 1001 nextjs
USER 1001
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
ENTRYPOINT ["/sbin/tini","--"]
CMD ["node", "server.js"]
```

使用：
```bash
docker build -f Dockerfile.cn -t health-hub:latest .
```

#### 方案4: 检查网络代理

如果您使用了代理：

```bash
# 检查代理设置
env | grep -i proxy

# 在 Docker Desktop 中配置代理
# Settings → Resources → Proxies
```

---

## ❌ 常见错误2: version 过时警告

### 错误信息
```
WARN[0000] the attribute `version` is obsolete
```

### 解决方案

编辑 `docker-compose.yml`，删除第一行的 version：

**修改前：**
```yaml
version: '3.9'

services:
  db:
    ...
```

**修改后：**
```yaml
services:
  db:
    ...
```

---

## 🚀 快速修复步骤

### 步骤1: 修改 Dockerfile

```bash
# 注释掉 syntax 行
sed -i.bak '1s/^# syntax=docker\/dockerfile:1$/# # syntax=docker\/dockerfile:1/' Dockerfile
```

### 步骤2: 修改 docker-compose.yml

```bash
# 删除 version 行
sed -i.bak '/^version:/d' docker-compose.yml
```

### 步骤3: 重新构建

```bash
# 清理缓存
docker builder prune -af

# 重新构建
docker compose build

# 启动服务
docker compose up -d
```

---

## 🔍 诊断命令

### 检查 Docker 状态

```bash
# Docker 是否运行
docker info

# 检查网络连接
ping -c 3 registry-1.docker.io

# 测试 Docker Hub 连接
docker pull hello-world

# 查看 Docker 配置
cat ~/.docker/config.json
```

### 检查构建日志

```bash
# 详细构建日志
docker compose build --progress=plain

# 查看构建历史
docker buildx ls
```

---

## 📦 离线构建方案

如果网络问题持续存在，可以使用预构建的镜像：

```bash
# 使用本地缓存的镜像
docker images | grep node

# 如果没有，手动下载
docker pull node:20-alpine

# 然后构建
docker compose build
```

---

## ✅ 验证修复

构建成功后，验证：

```bash
# 1. 检查镜像
docker images | grep health-hub

# 2. 启动服务
docker compose up -d

# 3. 查看状态
docker compose ps

# 4. 测试访问
curl http://localhost:3000
```

---

## 💡 最佳实践

1. **使用国内镜像加速器**（中国大陆用户）
2. **注释掉 syntax 声明**（避免额外网络请求）
3. **配置 npm 国内镜像**（加快依赖安装）
4. **定期清理 Docker 缓存**

---

## 🆘 仍然无法解决？

### 方案A: 跳过 Docker，使用本地开发

```bash
# 1. 启动本地 MySQL（使用 Docker）
docker run -d \
  --name mysql-dev \
  -e MYSQL_ROOT_PASSWORD=rootpass123! \
  -e MYSQL_DATABASE=health_hub \
  -e MYSQL_USER=health_app \
  -e MYSQL_PASSWORD=appPass123! \
  -p 3307:3306 \
  mysql:8.0

# 2. 本地运行应用
npm install
npm run dev
```

### 方案B: 使用预构建镜像

如果有其他机器已构建好镜像：

```bash
# 导出镜像（在其他机器上）
docker save health-hub:latest | gzip > health-hub.tar.gz

# 导入镜像（在当前机器上）
docker load < health-hub.tar.gz
```

---

## 📞 联系支持

如果问题持续，请提供：
1. `docker version` 输出
2. `docker info` 输出
3. 完整错误日志
4. 网络环境（是否使用代理/VPN）

