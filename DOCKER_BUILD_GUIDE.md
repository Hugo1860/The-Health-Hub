# 🐳 Docker 打包指南 - Mac M3 开发环境

> 本指南介绍如何在 Mac M3 (ARM) 环境下构建适用于 x86_64 服务器的 Docker 镜像

---

## 📋 目录

- [基础知识](#基础知识)
- [本地测试（ARM架构）](#本地测试arm架构)
- [构建生产镜像（x86_64架构）](#构建生产镜像x86_64架构)
- [多架构构建](#多架构构建)
- [镜像优化](#镜像优化)
- [常见问题](#常见问题)

---

## 基础知识

### 架构说明

- **开发环境**: Mac M3 = ARM64 (Apple Silicon)
- **生产环境**: Ubuntu 22.04 = AMD64 (x86_64)
- **需要**: 跨平台构建支持

### Docker BuildKit

Mac M3 的 Docker Desktop 默认支持多平台构建，无需额外配置。

---

## 本地测试（ARM架构）

### 1. 快速构建本地测试版

```bash
# 构建本地ARM版本（用于Mac M3测试）
docker compose build

# 启动服务
docker compose up -d

# 查看日志
docker compose logs -f app

# 测试
curl http://localhost:3000
```

### 2. 仅构建应用镜像

```bash
# 构建单个服务
docker compose build app

# 查看镜像
docker images | grep health-hub
```

### 3. 使用Dockerfile直接构建

```bash
# 构建ARM版本（本地测试）
docker build -t health-hub:latest .

# 指定构建阶段
docker build --target runner -t health-hub:latest .

# 查看镜像大小
docker images health-hub
```

---

## 构建生产镜像（x86_64架构）

### 方法1: 使用 --platform 参数（推荐）

```bash
# 为x86_64平台构建镜像
docker compose build --platform linux/amd64

# 或者单独构建应用镜像
docker build --platform linux/amd64 -t health-hub:amd64 .

# 查看镜像架构
docker inspect health-hub:amd64 | grep Architecture
```

### 方法2: 使用 docker buildx

```bash
# 创建多平台构建器（首次需要）
docker buildx create --name multiplatform --use

# 构建并加载到本地
docker buildx build \
  --platform linux/amd64 \
  -t health-hub:amd64 \
  --load \
  .

# 构建完整服务（推荐用于生产）
docker buildx build \
  --platform linux/amd64 \
  -t health-hub:production \
  --no-cache \
  --load \
  .
```

### 方法3: 完整生产构建

```bash
# 清理旧构建缓存
docker builder prune -af

# 完整构建（无缓存）
docker compose build --no-cache --platform linux/amd64

# 验证镜像
docker images | grep health-hub
docker inspect $(docker images -q health-hub:latest) | grep Architecture
```

---

## 多架构构建

### 同时构建 ARM64 和 AMD64

```bash
# 创建并使用多平台构建器
docker buildx create --name multiarch --use

# 同时构建两个架构
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t health-hub:multi \
  --load \
  .

# 注意: --load 只能加载一个平台，如需多平台推送到registry
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t your-registry/health-hub:latest \
  --push \
  .
```

---

## 镜像优化

### 1. 查看镜像大小

```bash
# 查看镜像层级
docker history health-hub:latest

# 查看详细大小
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | grep health-hub
```

### 2. 优化构建（已在Dockerfile中实现）

当前 Dockerfile 已包含以下优化：

```dockerfile
# ✅ 多阶段构建（减少最终镜像大小）
FROM node:20-alpine AS deps
FROM node:20-alpine AS builder
FROM node:20-alpine AS runner

# ✅ 使用 alpine 基础镜像（体积小）
# ✅ 使用 Next.js standalone 输出（只包含必要文件）
# ✅ 非root用户运行（安全）
```

### 3. 进一步优化

```bash
# 构建时排除开发依赖
docker build \
  --platform linux/amd64 \
  --build-arg NODE_ENV=production \
  -t health-hub:optimized \
  .

# 压缩镜像（可选，需要 docker-squash）
docker save health-hub:optimized | docker load
```

---

## 开发工作流

### 完整的本地开发测试流程

```bash
# 1. 修改代码后重新构建
docker compose build app

# 2. 重启服务
docker compose up -d

# 3. 查看日志
docker compose logs -f app

# 4. 测试
curl http://localhost:3000/api/health

# 5. 进入容器调试
docker compose exec app sh

# 6. 检查环境变量
docker compose exec app env | grep DB_

# 7. 停止服务
docker compose down
```

### 快速重建脚本

```bash
#!/bin/bash
# 保存为 rebuild.sh

echo "🔄 重新构建应用..."
docker compose build app --no-cache

echo "♻️  重启服务..."
docker compose up -d

echo "📊 等待服务启动..."
sleep 5

echo "✅ 查看状态..."
docker compose ps

echo "📝 最近日志..."
docker compose logs --tail=20 app
```

---

## 生产环境打包

### 准备发布镜像

```bash
# 1. 清理环境
docker compose down -v
docker system prune -af

# 2. 完整构建生产镜像
docker build \
  --platform linux/amd64 \
  --no-cache \
  -t health-hub:production-$(date +%Y%m%d) \
  .

# 3. 标记版本
docker tag health-hub:production-$(date +%Y%m%d) health-hub:latest
docker tag health-hub:production-$(date +%Y%m%d) health-hub:v1.0

# 4. 导出镜像（用于手动上传）
docker save health-hub:latest | gzip > health-hub-latest.tar.gz

# 5. 查看导出文件
ls -lh health-hub-latest.tar.gz
```

### 上传镜像到服务器

```bash
# 方法1: 直接上传tar.gz
scp health-hub-latest.tar.gz user@server:~/

# 在服务器上加载
ssh user@server
docker load < health-hub-latest.tar.gz
docker images | grep health-hub

# 方法2: 推送到Docker Hub
docker login
docker tag health-hub:latest your-username/health-hub:latest
docker push your-username/health-hub:latest

# 在服务器上拉取
ssh user@server
docker pull your-username/health-hub:latest
```

---

## 测试镜像

### 本地测试构建的镜像

```bash
# 1. 停止当前服务
docker compose down

# 2. 运行测试容器
docker run -it --rm \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e NEXTAUTH_URL=http://localhost:3000 \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=3307 \
  health-hub:latest

# 3. 测试访问
curl http://localhost:3000
```

### 测试x86_64镜像（在ARM Mac上）

```bash
# Docker Desktop 可以在ARM上运行x86镜像（通过Rosetta 2）
docker run --platform linux/amd64 -it --rm \
  -p 3000:3000 \
  health-hub:amd64 \
  node --version

# 注意: 性能会比原生ARM慢，但可以验证镜像可用性
```

---

## 常用命令速查

### 构建命令

```bash
# 本地测试（ARM）
docker compose build

# 生产构建（x86_64）
docker compose build --platform linux/amd64

# 无缓存构建
docker compose build --no-cache

# 只构建app服务
docker compose build app

# 使用buildx构建
docker buildx build --platform linux/amd64 -t health-hub:amd64 --load .
```

### 镜像管理

```bash
# 查看镜像
docker images | grep health-hub

# 查看镜像架构
docker inspect health-hub:latest | grep -i arch

# 删除镜像
docker rmi health-hub:latest

# 清理未使用镜像
docker image prune -a

# 清理所有（包括卷）
docker system prune -af --volumes
```

### 容器管理

```bash
# 启动服务
docker compose up -d

# 查看状态
docker compose ps

# 查看日志
docker compose logs -f app

# 进入容器
docker compose exec app sh

# 重启服务
docker compose restart app

# 停止服务
docker compose down
```

---

## 故障排查

### 构建失败

```bash
# 1. 清理缓存重试
docker builder prune -af
docker compose build --no-cache

# 2. 查看详细构建日志
docker compose build --progress=plain

# 3. 检查Dockerfile语法
docker build --check .
```

### 架构问题

```bash
# 检查当前系统架构
uname -m  # 应该显示 arm64

# 检查Docker支持的架构
docker buildx ls

# 检查镜像架构
docker inspect image-name | grep Architecture

# 强制指定平台
docker build --platform linux/amd64 .
```

### 体积过大

```bash
# 查看镜像层级
docker history health-hub:latest --no-trunc

# 查找大文件
docker run --rm health-hub:latest du -sh /* | sort -hr

# 优化建议
# 1. 使用 .dockerignore
# 2. 清理npm缓存
# 3. 使用多阶段构建（已实现）
# 4. 使用alpine基础镜像（已实现）
```

---

## Docker Compose 配置

### 开发环境 (docker-compose.yml)

当前配置已针对开发和生产优化：

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    # 可以添加平台指定
    # platform: linux/amd64  # 取消注释以强制x86_64
```

### 覆盖配置（可选）

创建 `docker-compose.override.yml` 用于本地开发：

```yaml
version: '3.9'

services:
  app:
    # 本地开发使用ARM
    platform: linux/arm64
    # 挂载源代码（热重载）
    volumes:
      - ./src:/app/src:ro
      - ./public:/app/public
    # 开发模式
    command: npm run dev
    environment:
      NODE_ENV: development
```

---

## 最佳实践

### ✅ 推荐做法

1. **本地开发使用ARM镜像**（快）
   ```bash
   docker compose build
   ```

2. **生产构建使用x86_64镜像**
   ```bash
   docker compose build --platform linux/amd64
   ```

3. **使用版本标签**
   ```bash
   docker tag health-hub:latest health-hub:v1.0.0
   ```

4. **定期清理**
   ```bash
   docker system prune -a
   ```

5. **使用 .dockerignore**（已创建）
   ```
   node_modules
   .next
   .git
   *.log
   ```

### ❌ 避免的做法

1. ❌ 不要在ARM上测试x86镜像（慢）
2. ❌ 不要构建时包含大文件
3. ❌ 不要使用latest标签在生产环境
4. ❌ 不要跳过健康检查

---

## 自动化脚本

### 完整构建脚本

创建 `build-docker.sh`:

```bash
#!/bin/bash
set -e

VERSION=${1:-latest}
PLATFORM=${2:-linux/amd64}

echo "🐳 构建 Health Hub Docker 镜像"
echo "版本: $VERSION"
echo "平台: $PLATFORM"
echo ""

# 清理
echo "🧹 清理旧镜像..."
docker compose down
docker image rm health-hub:$VERSION 2>/dev/null || true

# 构建
echo "🔨 开始构建..."
docker build \
  --platform $PLATFORM \
  --no-cache \
  -t health-hub:$VERSION \
  .

# 验证
echo "✅ 构建完成"
docker images | grep health-hub

# 架构检查
echo ""
echo "📊 镜像信息:"
docker inspect health-hub:$VERSION | grep -A5 Architecture

echo ""
echo "🎉 完成！"
echo "运行: docker run -p 3000:3000 health-hub:$VERSION"
```

使用方法：
```bash
chmod +x build-docker.sh

# 构建ARM版本（本地测试）
./build-docker.sh latest linux/arm64

# 构建x86_64版本（生产）
./build-docker.sh v1.0.0 linux/amd64
```

---

## 总结

### 快速参考

| 场景 | 命令 |
|------|------|
| 本地开发测试 | `docker compose build && docker compose up -d` |
| 生产环境构建 | `docker compose build --platform linux/amd64` |
| 导出镜像 | `docker save health-hub:latest \| gzip > image.tar.gz` |
| 清理环境 | `docker system prune -af` |
| 查看日志 | `docker compose logs -f app` |

### 推荐工作流

```bash
# 1. 开发阶段 - 使用本地ARM
docker compose up -d

# 2. 测试阶段 - 重新构建
docker compose build && docker compose up -d

# 3. 准备发布 - 构建生产镜像
docker compose build --platform linux/amd64 --no-cache

# 4. 部署到服务器 - 使用部署脚本
./upload-and-deploy.sh ubuntu@server-ip
```

---

**需要帮助？** 查看 [DEPLOYMENT_GUIDE_UBUNTU.md](./DEPLOYMENT_GUIDE_UBUNTU.md) 了解完整部署流程。

