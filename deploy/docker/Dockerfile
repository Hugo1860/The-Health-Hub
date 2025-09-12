# 健闻局 The Health Hub - Docker 镜像
# 多阶段构建，优化镜像大小

# 构建阶段
FROM node:22-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apk add --no-cache \
    python3 \
    make \
    g++

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production && npm cache clean --force

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产阶段
FROM node:22-alpine AS production

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# 创建应用用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# 安装运行时依赖
RUN apk add --no-cache \
    curl \
    bash \
    ffmpeg

# 设置工作目录
WORKDIR /app

# 从构建阶段复制文件
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

RUN mkdir -p uploads logs && \
    chown -R nextjs:nodejs uploads logs

# 由外部 PostgreSQL 服务提供数据库，不在镜像内初始化

# 切换到应用用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# 启动命令
CMD ["npm", "start"]