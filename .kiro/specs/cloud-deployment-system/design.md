# 云端部署系统设计文档

## 概述

本设计文档详细描述了健闻局 The Health Hub 音频平台的云端部署系统架构。该系统采用现代云原生技术栈，支持多云部署、自动扩展、高可用性和完整的 DevOps 流程。

## 架构设计

### 整体架构

```mermaid
graph TB
    subgraph "用户层"
        U1[Web用户]
        U2[移动用户]
        U3[管理员]
    end
    
    subgraph "CDN层"
        CDN[全球CDN网络]
    end
    
    subgraph "负载均衡层"
        LB[负载均衡器]
        WAF[Web应用防火墙]
    end
    
    subgraph "应用层"
        APP1[Next.js应用实例1]
        APP2[Next.js应用实例2]
        APP3[Next.js应用实例N]
    end
    
    subgraph "缓存层"
        REDIS[Redis集群]
        CACHE[应用缓存]
    end
    
    subgraph "数据层"
        DB1[主数据库]
        DB2[只读副本]
        BACKUP[备份存储]
    end
    
    subgraph "存储层"
        OSS[对象存储]
        NAS[网络附加存储]
    end
    
    subgraph "监控层"
        MON[监控系统]
        LOG[日志聚合]
        ALERT[告警系统]
    end
    
    U1 --> CDN
    U2 --> CDN
    U3 --> CDN
    CDN --> WAF
    WAF --> LB
    LB --> APP1
    LB --> APP2
    LB --> APP3
    APP1 --> REDIS
    APP2 --> REDIS
    APP3 --> REDIS
    APP1 --> DB1
    APP2 --> DB2
    APP3 --> DB2
    DB1 --> DB2
    DB1 --> BACKUP
    APP1 --> OSS
    APP2 --> OSS
    APP3 --> OSS
    APP1 --> MON
    APP2 --> MON
    APP3 --> MON
```

### 技术栈选择

#### 前端应用
- **框架**: Next.js 15.x (React 19)
- **UI库**: Ant Design 5.x
- **状态管理**: Zustand
- **样式**: Tailwind CSS 4.x
- **类型检查**: TypeScript 5.x

#### 后端服务
- **运行时**: Node.js 18+ LTS
- **API**: Next.js API Routes
- **认证**: NextAuth.js 4.x
- **文件处理**: FFmpeg, Sharp
- **验证**: Zod

#### 数据库
- **生产环境**: PostgreSQL 15+ (推荐) / MySQL 8.0+
- **开发环境**: SQLite 3.x (向后兼容)
- **缓存**: Redis 7.x
- **搜索**: Elasticsearch 8.x (可选)

#### 存储服务
- **对象存储**: AWS S3 / 阿里云OSS / 腾讯云COS
- **CDN**: CloudFront / 阿里云CDN / 腾讯云CDN
- **文件系统**: EFS / NAS (备用)

## 组件设计

### 1. 应用容器化

#### Dockerfile 优化设计
```dockerfile
# 多阶段构建优化
FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat ffmpeg
WORKDIR /app

# 依赖安装阶段
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# 构建阶段
FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 生产运行阶段
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制构建产物
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

#### Docker Compose 开发环境
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://user:pass@db:5432/healthhub
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./uploads:/app/uploads
    depends_on:
      - db
      - redis

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: healthhub
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 2. 数据库迁移系统

#### 迁移架构设计
```typescript
// src/lib/database/migrator.ts
export interface DatabaseMigrator {
  migrate(): Promise<void>;
  rollback(): Promise<void>;
  validateData(): Promise<boolean>;
}

export class SQLiteToPostgreSQLMigrator implements DatabaseMigrator {
  private sqliteDb: Database;
  private pgClient: Client;
  
  async migrate(): Promise<void> {
    // 1. 创建PostgreSQL表结构
    await this.createTables();
    
    // 2. 迁移数据
    await this.migrateUsers();
    await this.migrateAudios();
    await this.migrateComments();
    
    // 3. 验证数据完整性
    await this.validateData();
  }
  
  private async createTables(): Promise<void> {
    const schema = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS audios (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        filename VARCHAR(255) NOT NULL,
        url VARCHAR(500) NOT NULL,
        cover_image VARCHAR(500),
        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        subject VARCHAR(200),
        tags JSONB,
        size BIGINT,
        duration INTEGER,
        speaker VARCHAR(255),
        recording_date TIMESTAMP
      );
      
      CREATE INDEX idx_audios_subject ON audios(subject);
      CREATE INDEX idx_audios_upload_date ON audios(upload_date);
      CREATE INDEX idx_audios_tags ON audios USING GIN(tags);
    `;
    
    await this.pgClient.query(schema);
  }
}
```

### 3. 云存储适配器

#### 存储服务抽象层
```typescript
// src/lib/storage/StorageAdapter.ts
export interface StorageAdapter {
  upload(file: Buffer, key: string, options?: UploadOptions): Promise<UploadResult>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expires?: number): Promise<string>;
}

export class S3StorageAdapter implements StorageAdapter {
  private s3Client: S3Client;
  
  constructor(config: S3Config) {
    this.s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }
  
  async upload(file: Buffer, key: string, options?: UploadOptions): Promise<UploadResult> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file,
      ContentType: options?.contentType,
      Metadata: options?.metadata,
    });
    
    const result = await this.s3Client.send(command);
    
    return {
      key,
      url: `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`,
      etag: result.ETag,
    };
  }
}

// 工厂模式创建存储适配器
export class StorageFactory {
  static create(provider: string, config: any): StorageAdapter {
    switch (provider) {
      case 'aws-s3':
        return new S3StorageAdapter(config);
      case 'aliyun-oss':
        return new OSSStorageAdapter(config);
      case 'tencent-cos':
        return new COSStorageAdapter(config);
      default:
        throw new Error(`Unsupported storage provider: ${provider}`);
    }
  }
}
```

### 4. 配置管理系统

#### 环境配置架构
```typescript
// src/lib/config/ConfigManager.ts
export interface AppConfig {
  database: DatabaseConfig;
  storage: StorageConfig;
  cache: CacheConfig;
  monitoring: MonitoringConfig;
  security: SecurityConfig;
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;
  
  private constructor() {
    this.loadConfig();
  }
  
  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }
  
  private loadConfig(): void {
    const env = process.env.NODE_ENV || 'development';
    
    this.config = {
      database: {
        type: process.env.DB_TYPE || 'sqlite',
        url: process.env.DATABASE_URL || 'data/local.db',
        pool: {
          min: parseInt(process.env.DB_POOL_MIN || '2'),
          max: parseInt(process.env.DB_POOL_MAX || '10'),
        },
      },
      storage: {
        provider: process.env.STORAGE_PROVIDER || 'local',
        bucket: process.env.STORAGE_BUCKET || 'uploads',
        region: process.env.STORAGE_REGION || 'us-east-1',
        cdnDomain: process.env.CDN_DOMAIN,
      },
      cache: {
        provider: process.env.CACHE_PROVIDER || 'memory',
        url: process.env.REDIS_URL,
        ttl: parseInt(process.env.CACHE_TTL || '3600'),
      },
      monitoring: {
        enabled: process.env.MONITORING_ENABLED === 'true',
        endpoint: process.env.MONITORING_ENDPOINT,
        apiKey: process.env.MONITORING_API_KEY,
      },
      security: {
        jwtSecret: process.env.NEXTAUTH_SECRET || 'dev-secret',
        corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
        rateLimiting: {
          enabled: process.env.RATE_LIMITING_ENABLED === 'true',
          windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'),
          max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
        },
      },
    };
  }
  
  getConfig(): AppConfig {
    return this.config;
  }
  
  reloadConfig(): void {
    this.loadConfig();
  }
}
```

## 数据模型

### 数据库架构设计

#### PostgreSQL 表结构
```sql
-- 用户表
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    password_hash VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    status VARCHAR(20) DEFAULT 'active',
    avatar_url VARCHAR(500),
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 音频内容表
CREATE TABLE audios (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    filename VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    cover_image VARCHAR(500),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    subject VARCHAR(200),
    tags JSONB DEFAULT '[]',
    size BIGINT,
    duration INTEGER,
    speaker VARCHAR(255),
    recording_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'published',
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 分类表
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES categories(id),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 音频分类关联表
CREATE TABLE audio_categories (
    audio_id VARCHAR(255) REFERENCES audios(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (audio_id, category_id)
);

-- 评论表
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    audio_id VARCHAR(255) REFERENCES audios(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES comments(id),
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'published',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 播放历史表
CREATE TABLE play_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    audio_id VARCHAR(255) REFERENCES audios(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, audio_id)
);

-- 收藏表
CREATE TABLE favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    audio_id VARCHAR(255) REFERENCES audios(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, audio_id)
);

-- 索引优化
CREATE INDEX idx_audios_subject ON audios(subject);
CREATE INDEX idx_audios_upload_date ON audios(upload_date DESC);
CREATE INDEX idx_audios_status ON audios(status);
CREATE INDEX idx_audios_tags ON audios USING GIN(tags);
CREATE INDEX idx_comments_audio_id ON comments(audio_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_play_history_user_id ON play_history(user_id);
CREATE INDEX idx_play_history_played_at ON play_history(played_at DESC);
```

### 缓存策略设计

#### Redis 缓存架构
```typescript
// src/lib/cache/CacheManager.ts
export class CacheManager {
  private redis: Redis;
  
  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);
  }
  
  // 音频列表缓存
  async getAudioList(page: number = 1, limit: number = 20): Promise<Audio[]> {
    const cacheKey = `audio:list:${page}:${limit}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    // 从数据库获取数据
    const audios = await this.fetchAudiosFromDB(page, limit);
    
    // 缓存5分钟
    await this.redis.setex(cacheKey, 300, JSON.stringify(audios));
    
    return audios;
  }
  
  // 用户会话缓存
  async cacheUserSession(userId: string, sessionData: any): Promise<void> {
    const cacheKey = `session:${userId}`;
    await this.redis.setex(cacheKey, 3600, JSON.stringify(sessionData));
  }
  
  // 热门内容缓存
  async getPopularContent(): Promise<Audio[]> {
    const cacheKey = 'content:popular';
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    const popular = await this.fetchPopularFromDB();
    await this.redis.setex(cacheKey, 1800, JSON.stringify(popular)); // 30分钟
    
    return popular;
  }
}
```

## 错误处理

### 全局错误处理架构
```typescript
// src/lib/errors/ErrorHandler.ts
export class CloudDeploymentError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'CloudDeploymentError';
  }
}

export class ErrorHandler {
  static handle(error: Error, context: string): void {
    // 记录错误日志
    console.error(`[${context}] Error:`, {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    
    // 发送到监控系统
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(error, context);
    }
    
    // 根据错误类型进行不同处理
    if (error instanceof CloudDeploymentError) {
      this.handleCloudError(error);
    } else {
      this.handleGenericError(error);
    }
  }
  
  private static sendToMonitoring(error: Error, context: string): void {
    // 集成 Sentry, DataDog 等监控服务
    // 这里是示例实现
  }
}
```

## 测试策略

### 测试架构设计
```typescript
// src/__tests__/deployment/cloud-deployment.test.ts
describe('Cloud Deployment System', () => {
  describe('Database Migration', () => {
    it('should migrate SQLite to PostgreSQL successfully', async () => {
      const migrator = new SQLiteToPostgreSQLMigrator(config);
      await migrator.migrate();
      
      const isValid = await migrator.validateData();
      expect(isValid).toBe(true);
    });
  });
  
  describe('Storage Adapter', () => {
    it('should upload files to cloud storage', async () => {
      const adapter = StorageFactory.create('aws-s3', s3Config);
      const result = await adapter.upload(testFile, 'test-key');
      
      expect(result.url).toContain('s3.amazonaws.com');
    });
  });
  
  describe('Configuration Management', () => {
    it('should load environment-specific config', () => {
      process.env.NODE_ENV = 'production';
      const config = ConfigManager.getInstance().getConfig();
      
      expect(config.database.type).toBe('postgresql');
    });
  });
});
```

### 集成测试
```yaml
# .github/workflows/deployment-test.yml
name: Deployment Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test-deployment:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run deployment tests
        run: npm run test:deployment
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test
          REDIS_URL: redis://localhost:6379
```

这个设计文档涵盖了云端部署系统的核心架构、组件设计、数据模型和测试策略。它提供了一个完整的技术蓝图，支持多云部署、数据库迁移、存储云端化和完整的 DevOps 流程。