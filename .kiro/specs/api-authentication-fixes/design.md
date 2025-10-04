# API认证修复设计文档

## Overview

本设计文档旨在解决当前系统中API路由认证机制不一致的问题。通过分析现有代码，发现以下主要问题：

1. **缺失authOptions参数**：部分API路由使用`getServerSession()`而不是`getServerSession(authOptions)`
2. **认证逻辑重复**：多个API路由都有相似的认证检查代码
3. **错误处理不统一**：不同API返回的认证错误格式不一致
4. **权限验证缺失**：部分管理员API缺少适当的权限验证

## Architecture

### 认证架构层次

```
┌─────────────────────────────────────┐
│           API Routes                │
├─────────────────────────────────────┤
│      Authentication Middleware     │
├─────────────────────────────────────┤
│       Permission Validators        │
├─────────────────────────────────────┤
│         Session Manager            │
├─────────────────────────────────────┤
│        NextAuth Core               │
└─────────────────────────────────────┘
```

### 认证流程

1. **请求接收** → API路由接收请求
2. **会话验证** → 使用统一的会话验证中间件
3. **权限检查** → 根据API类型检查相应权限
4. **业务逻辑** → 执行具体的业务操作
5. **响应返回** → 返回统一格式的响应

## Components and Interfaces

### 1. 统一认证中间件 (Unified Auth Middleware)

```typescript
// 基础认证接口
interface AuthResult {
  isAuthenticated: boolean;
  user?: AuthenticatedUser;
  error?: string;
}

// 权限验证接口
interface PermissionResult {
  hasPermission: boolean;
  error?: string;
}

// 认证中间件选项
interface AuthMiddlewareOptions {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  permissions?: AdminPermission[];
  allowPublic?: boolean;
}
```

### 2. 会话验证器 (Session Validator)

```typescript
class SessionValidator {
  static async validateSession(request: NextRequest): Promise<AuthResult>
  static async validateAdminSession(request: NextRequest): Promise<AuthResult>
  static async validateUserSession(request: NextRequest): Promise<AuthResult>
}
```

### 3. 权限管理器 (Permission Manager)

```typescript
class PermissionManager {
  static checkUserPermission(user: AuthenticatedUser, resource: string): PermissionResult
  static checkAdminPermission(user: AuthenticatedUser, operation: AdminOperation): PermissionResult
  static hasRole(user: AuthenticatedUser, role: UserRole): boolean
}
```

### 4. 响应构建器 (Response Builder)

```typescript
class AuthResponseBuilder {
  static unauthorized(message?: string): NextResponse
  static forbidden(message?: string): NextResponse
  static sessionExpired(): NextResponse
  static success<T>(data: T): NextResponse
}
```

## Data Models

### 认证用户模型

```typescript
interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  role: 'user' | 'admin' | 'moderator';
  status: 'active' | 'inactive' | 'banned';
  permissions: string[];
  sessionId: string;
  lastActivity: Date;
}
```

### 认证上下文模型

```typescript
interface AuthContext {
  user: AuthenticatedUser;
  session: Session;
  permissions: string[];
  isAdmin: boolean;
  canAccess: (resource: string) => boolean;
}
```

### API认证配置模型

```typescript
interface ApiAuthConfig {
  path: string;
  method: HttpMethod;
  authType: 'public' | 'user' | 'admin';
  permissions?: string[];
  rateLimit?: RateLimitConfig;
}
```

## Error Handling

### 错误类型定义

```typescript
enum AuthErrorType {
  NO_SESSION = 'NO_SESSION',
  INVALID_SESSION = 'INVALID_SESSION',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',
  RATE_LIMITED = 'RATE_LIMITED'
}
```

### 统一错误响应格式

```typescript
interface AuthErrorResponse {
  error: {
    type: AuthErrorType;
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  timestamp: string;
  path: string;
}
```

### 错误处理策略

1. **认证失败** → 返回401状态码，清除客户端会话
2. **权限不足** → 返回403状态码，记录安全日志
3. **会话过期** → 返回401状态码，提示重新登录
4. **账户异常** → 返回403状态码，记录安全事件
5. **频率限制** → 返回429状态码，提供重试时间

## Testing Strategy

### 单元测试

1. **会话验证测试**
   - 有效会话验证
   - 无效会话处理
   - 过期会话处理
   - 恶意会话检测

2. **权限检查测试**
   - 管理员权限验证
   - 用户权限验证
   - 角色权限映射
   - 权限继承测试

3. **中间件测试**
   - 认证中间件功能
   - 权限中间件功能
   - 错误处理中间件
   - 速率限制中间件

### 集成测试

1. **API端点测试**
   - 公开API访问测试
   - 用户API认证测试
   - 管理员API权限测试
   - 跨角色访问测试

2. **安全测试**
   - 会话劫持防护
   - CSRF攻击防护
   - 权限提升攻击
   - 暴力破解防护

### 端到端测试

1. **用户认证流程**
   - 登录 → API访问 → 登出
   - 会话过期处理
   - 多设备登录

2. **管理员操作流程**
   - 管理员登录 → 权限验证 → 操作执行
   - 权限变更影响
   - 安全日志记录

## Implementation Plan

### Phase 1: 核心认证修复
- 修复所有缺失authOptions的API路由
- 创建统一的会话验证函数
- 实现基础的错误响应格式

### Phase 2: 中间件重构
- 开发认证中间件系统
- 重构现有API使用新中间件
- 实现权限验证逻辑

### Phase 3: 安全增强
- 添加速率限制功能
- 实现安全日志记录
- 添加异常检测机制

### Phase 4: 测试和优化
- 编写全面的测试用例
- 性能优化和监控
- 文档完善和部署

## Security Considerations

### 会话安全
- 使用安全的会话存储
- 实现会话超时机制
- 防止会话固定攻击

### 权限安全
- 最小权限原则
- 权限验证缓存
- 权限变更审计

### API安全
- 输入验证和清理
- 输出编码和过滤
- 防止注入攻击

### 监控和审计
- 认证事件日志
- 异常行为检测
- 安全指标监控