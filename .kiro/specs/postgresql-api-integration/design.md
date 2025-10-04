# Design Document

## Overview

本设计文档描述了如何将现有的SQLite API集成完全迁移到PostgreSQL，确保所有数据库连接、查询和错误处理都正确使用PostgreSQL。系统将采用统一的PostgreSQL连接池管理，标准化的查询语法转换，以及一致的错误处理机制。

## Architecture

### 数据库连接架构

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   API Routes    │───▶│  Database Layer  │───▶│   PostgreSQL    │
│                 │    │                  │    │   Connection    │
│ - Health Check  │    │ - Connection Pool│    │      Pool       │
│ - Stats API     │    │ - Query Builder  │    │                 │
│ - Admin APIs    │    │ - Error Handler  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### 连接池管理

- **主连接池**: 使用 `pg.Pool` 管理PostgreSQL连接
- **连接配置**: 从环境变量读取数据库配置
- **健康检查**: 定期检查连接池状态
- **自动重连**: 连接失败时自动重试机制

## Components and Interfaces

### 1. PostgreSQL连接管理器

```typescript
interface PostgreSQLManager {
  // 获取数据库连接
  getConnection(): Promise<PoolClient>;
  
  // 执行查询
  query<T>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  
  // 健康检查
  healthCheck(): Promise<HealthStatus>;
  
  // 关闭连接池
  close(): Promise<void>;
}
```

### 2. 查询适配器

```typescript
interface QueryAdapter {
  // SQLite查询转PostgreSQL
  adaptQuery(sqliteQuery: string): string;
  
  // 参数占位符转换
  adaptParameters(params: any[]): any[];
  
  // 结果格式转换
  adaptResult<T>(pgResult: QueryResult): T[];
}
```

### 3. API响应标准化

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: any;
  };
  meta: {
    requestId: string;
    timestamp: string;
    responseTime: number;
  };
}
```

## Data Models

### 数据库表映射

基于现有PostgreSQL schema，主要表结构：

```sql
-- audios表 (音频文件)
CREATE TABLE audios (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  uploadDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  filename VARCHAR(255),
  duration INTEGER,
  filesize BIGINT
);

-- users表 (用户)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- categories表 (分类)
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 查询语法转换

| SQLite语法 | PostgreSQL语法 | 说明 |
|-----------|---------------|------|
| `?` | `$1, $2, $3` | 参数占位符 |
| `AUTOINCREMENT` | `SERIAL` | 自增主键 |
| `datetime('now')` | `CURRENT_TIMESTAMP` | 当前时间 |
| `COUNT(*)` | `COUNT(*)` | 计数查询 |

## Error Handling

### 错误分类和处理

1. **连接错误**
   - 数据库服务不可用
   - 连接超时
   - 认证失败

2. **查询错误**
   - SQL语法错误
   - 表或列不存在
   - 数据类型不匹配

3. **业务逻辑错误**
   - 数据验证失败
   - 权限不足
   - 资源不存在

### 错误响应格式

```typescript
interface DatabaseError {
  type: 'CONNECTION' | 'QUERY' | 'BUSINESS';
  code: string;
  message: string;
  originalError?: any;
  query?: string;
  parameters?: any[];
}
```

## Testing Strategy

### 单元测试

1. **连接池测试**
   - 连接创建和销毁
   - 连接池限制测试
   - 连接超时处理

2. **查询适配器测试**
   - SQLite到PostgreSQL语法转换
   - 参数绑定测试
   - 结果格式转换

3. **API端点测试**
   - 健康检查API
   - 统计数据API
   - 错误处理测试

### 集成测试

1. **数据库集成测试**
   - 真实PostgreSQL连接测试
   - 查询性能测试
   - 并发连接测试

2. **API集成测试**
   - 端到端API测试
   - 错误场景测试
   - 负载测试

### 测试数据

使用测试专用的PostgreSQL数据库，包含：
- 示例音频数据
- 测试用户账户
- 分类数据
- 统计测试数据

## Implementation Plan

### Phase 1: 核心连接层
- 实现PostgreSQL连接管理器
- 创建查询适配器
- 建立错误处理机制

### Phase 2: API迁移
- 迁移健康检查API
- 迁移统计API
- 迁移管理员API

### Phase 3: 测试和优化
- 编写全面测试
- 性能优化
- 错误处理完善

### Phase 4: 部署和监控
- 生产环境部署
- 监控和日志
- 文档更新