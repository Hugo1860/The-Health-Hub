# 会话验证工具函数使用指南

## 概述

`session-validator.ts` 提供了一套统一的会话验证工具函数，用于简化API路由中的用户认证和权限检查。

## 主要函数

### 1. 基础会话验证

#### `validateSession()`
验证基础会话，返回详细的验证结果。

```typescript
import { validateSession } from '@/lib/session-validator'

export async function GET(request: NextRequest) {
  const sessionResult = await validateSession()
  
  if (!sessionResult.isValid) {
    return NextResponse.json(
      { 
        error: {
          code: sessionResult.errorCode,
          message: sessionResult.error
        }
      },
      { status: 401 }
    )
  }
  
  const user = sessionResult.user!
  // 继续处理业务逻辑...
}
```

#### `requireAuth()`
便捷函数，直接返回用户信息或抛出错误。

```typescript
import { requireAuth } from '@/lib/session-validator'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    // 用户已认证，继续处理...
  } catch (error) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: 401 }
    )
  }
}
```

### 2. 管理员权限验证

#### `validateAdminSession()`
验证管理员会话。

```typescript
import { validateAdminSession } from '@/lib/session-validator'

export async function DELETE(request: NextRequest) {
  const sessionResult = await validateAdminSession()
  
  if (!sessionResult.isValid) {
    return NextResponse.json(
      { error: { message: sessionResult.error } },
      { status: sessionResult.errorCode === 'NO_SESSION' ? 401 : 403 }
    )
  }
  
  // 管理员操作...
}
```

#### `requireAdmin()`
便捷的管理员权限检查。

```typescript
import { requireAdmin } from '@/lib/session-validator'

export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    // 执行管理员操作...
  } catch (error) {
    const status = error.message.includes('权限') ? 403 : 401
    return NextResponse.json(
      { error: { message: error.message } },
      { status }
    )
  }
}
```

### 3. 用户权限验证

#### `validateUserSession()`
验证用户会话（包括普通用户和管理员）。

```typescript
import { validateUserSession } from '@/lib/session-validator'

export async function GET(request: NextRequest) {
  const sessionResult = await validateUserSession()
  
  if (!sessionResult.isValid) {
    return NextResponse.json(
      { error: { message: sessionResult.error } },
      { status: 401 }
    )
  }
  
  // 用户级别操作...
}
```

#### `requireUser()`
便捷的用户权限检查。

```typescript
import { requireUser } from '@/lib/session-validator'

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    // 执行用户操作...
  } catch (error) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: 401 }
    )
  }
}
```

## 权限检查工具函数

### `hasPermission(user, permission)`
检查用户是否有特定权限。

```typescript
import { hasPermission } from '@/lib/session-validator'

const user = await requireAuth()

if (hasPermission(user, 'admin')) {
  // 执行管理员操作
} else if (hasPermission(user, 'user')) {
  // 执行用户操作
}
```

### `canAccessResource(user, resourceOwnerId)`
检查用户是否可以访问特定资源。

```typescript
import { canAccessResource } from '@/lib/session-validator'

const user = await requireAuth()
const resourceOwnerId = 'some-user-id'

if (canAccessResource(user, resourceOwnerId)) {
  // 允许访问资源
} else {
  return NextResponse.json(
    { error: { message: '权限不足' } },
    { status: 403 }
  )
}
```

## 错误处理

### 错误代码

- `NO_SESSION`: 没有有效会话
- `ACCOUNT_BANNED`: 账户被禁用
- `ACCOUNT_INACTIVE`: 账户未激活
- `INSUFFICIENT_PERMISSIONS`: 权限不足
- `VALIDATION_ERROR`: 验证过程出错

### 统一错误响应格式

```typescript
{
  error: {
    code: string,
    message: string
  }
}
```

## 最佳实践

### 1. 选择合适的验证函数

- **公开API**: 不需要验证
- **用户API**: 使用 `requireUser()` 或 `validateUserSession()`
- **管理员API**: 使用 `requireAdmin()` 或 `validateAdminSession()`

### 2. 错误处理

```typescript
try {
  const user = await requireAuth()
  // 业务逻辑
} catch (error) {
  // 根据错误类型返回适当的状态码
  const status = error.message.includes('权限') ? 403 : 401
  return NextResponse.json(
    { error: { message: error.message } },
    { status }
  )
}
```

### 3. 资源访问控制

```typescript
const user = await requireAuth()
const resourceId = params.id

// 检查用户是否可以访问该资源
if (!canAccessResource(user, resourceOwnerId)) {
  return NextResponse.json(
    { error: { message: '权限不足' } },
    { status: 403 }
  )
}
```

## 迁移指南

### 从旧的认证方式迁移

**旧方式:**
```typescript
const session = await getServerSession(authOptions)
if (!session?.user?.id) {
  return NextResponse.json({ error: '未授权' }, { status: 401 })
}
```

**新方式:**
```typescript
try {
  const user = await requireAuth()
  // 使用 user 对象
} catch (error) {
  return NextResponse.json(
    { error: { message: error.message } },
    { status: 401 }
  )
}
```

### 管理员权限检查迁移

**旧方式:**
```typescript
const session = await getServerSession(authOptions)
if (!session?.user || session.user.role !== 'admin') {
  return NextResponse.json({ error: '需要管理员权限' }, { status: 403 })
}
```

**新方式:**
```typescript
try {
  const admin = await requireAdmin()
  // 使用 admin 对象
} catch (error) {
  const status = error.message.includes('权限') ? 403 : 401
  return NextResponse.json(
    { error: { message: error.message } },
    { status }
  )
}
```