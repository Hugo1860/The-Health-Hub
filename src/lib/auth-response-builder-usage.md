# 认证响应构建器使用指南

## 概述

`AuthResponseBuilder` 提供了一套统一的API响应格式，确保所有认证相关的响应都遵循相同的结构和标准。

## 响应格式

### 错误响应格式
```typescript
{
  error: {
    type: AuthErrorType,
    code: string,
    message: string,
    details?: Record<string, any>
  },
  timestamp: string,
  path?: string
}
```

### 成功响应格式
```typescript
{
  success: true,
  data: T,
  timestamp: string
}
```

## 主要方法

### 1. 认证错误响应

#### `unauthorized()` - 401 未授权
```typescript
import { AuthResponseBuilder } from '@/lib/auth-response-builder'

// 基础用法
return AuthResponseBuilder.unauthorized()

// 自定义消息和类型
return AuthResponseBuilder.unauthorized(
  '会话已过期',
  AuthErrorType.SESSION_EXPIRED,
  { sessionId: 'abc123' }
)
```

#### `forbidden()` - 403 权限不足
```typescript
// 基础权限不足
return AuthResponseBuilder.forbidden()

// 带详细信息
return AuthResponseBuilder.forbidden(
  '需要管理员权限',
  { requiredRole: 'admin', currentRole: 'user' }
)
```

#### `sessionExpired()` - 401 会话过期
```typescript
return AuthResponseBuilder.sessionExpired()
// 或自定义消息
return AuthResponseBuilder.sessionExpired('登录已过期，请重新登录')
```

### 2. 账户状态错误

#### `accountBanned()` - 403 账户被封禁
```typescript
return AuthResponseBuilder.accountBanned(
  '账户已被封禁',
  '违反社区规则',
  '2024-12-31T23:59:59Z'
)
```

#### `accountInactive()` - 403 账户未激活
```typescript
return AuthResponseBuilder.accountInactive()
```

#### `accountDisabled()` - 403 账户被禁用
```typescript
return AuthResponseBuilder.accountDisabled(
  '账户已被管理员禁用',
  '违规操作'
)
```

### 3. 其他错误类型

#### `rateLimited()` - 429 频率限制
```typescript
return AuthResponseBuilder.rateLimited(
  '请求过于频繁，请稍后重试',
  60 // 重试间隔（秒）
)
```

#### `invalidCredentials()` - 401 无效凭据
```typescript
return AuthResponseBuilder.invalidCredentials('用户名或密码错误')
```

#### `validationError()` - 400 验证错误
```typescript
return AuthResponseBuilder.validationError(
  '输入验证失败',
  {
    email: ['邮箱格式不正确'],
    password: ['密码长度至少8位']
  }
)
```

### 4. 成功响应

#### `success()` - 200 成功
```typescript
return AuthResponseBuilder.success({
  user: { id: 1, name: 'John' },
  message: '操作成功'
})

// 自定义状态码
return AuthResponseBuilder.success(data, 202)
```

#### `created()` - 201 创建成功
```typescript
return AuthResponseBuilder.created({
  id: 123,
  message: '用户创建成功'
})
```

#### `noContent()` - 204 无内容
```typescript
return AuthResponseBuilder.noContent()
```

### 5. 智能错误处理

#### `fromError()` - 自动错误类型检测
```typescript
try {
  const user = await requireAuth()
  // 业务逻辑...
} catch (error) {
  // 自动根据错误消息选择合适的响应类型
  return AuthResponseBuilder.fromError(error)
}

// 手动指定错误类型
return AuthResponseBuilder.fromError(
  '自定义错误消息',
  AuthErrorType.RATE_LIMITED,
  { retryAfter: 30 }
)
```

#### `customError()` - 自定义错误
```typescript
return AuthResponseBuilder.customError(
  '自定义业务错误',
  'BUSINESS_ERROR',
  422,
  AuthErrorType.VALIDATION_ERROR,
  { field: 'email', value: 'invalid@' }
)
```

## 便捷导出

```typescript
import { authResponse } from '@/lib/auth-response-builder'

// 使用便捷对象
return authResponse.unauthorized('未登录')
return authResponse.forbidden('权限不足')
return authResponse.success({ data: 'success' })
```

## 在API路由中的使用示例

### 基础认证检查
```typescript
import { requireAuth } from '@/lib/session-validator'
import { AuthResponseBuilder } from '@/lib/auth-response-builder'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    // 业务逻辑...
    const data = await fetchUserData(user.id)
    
    return AuthResponseBuilder.success(data)
  } catch (error) {
    return AuthResponseBuilder.fromError(error)
  }
}
```

### 管理员权限检查
```typescript
import { requireAdmin } from '@/lib/session-validator'
import { AuthResponseBuilder } from '@/lib/auth-response-builder'

export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    
    // 执行删除操作...
    await deleteResource(resourceId)
    
    return AuthResponseBuilder.noContent()
  } catch (error) {
    return AuthResponseBuilder.fromError(error)
  }
}
```

### 输入验证
```typescript
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { email, name } = await request.json()
    
    // 验证输入
    const errors: Record<string, string[]> = {}
    if (!email) errors.email = ['邮箱是必填项']
    if (!name) errors.name = ['姓名是必填项']
    
    if (Object.keys(errors).length > 0) {
      return AuthResponseBuilder.validationError(
        '输入验证失败',
        errors
      )
    }
    
    // 创建资源...
    const newResource = await createResource({ email, name, userId: user.id })
    
    return AuthResponseBuilder.created(newResource)
  } catch (error) {
    return AuthResponseBuilder.fromError(error)
  }
}
```

### 资源访问控制
```typescript
import { canAccessResource } from '@/lib/session-validator'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth()
    const resource = await getResource(params.id)
    
    if (!resource) {
      return AuthResponseBuilder.customError(
        '资源不存在',
        'NOT_FOUND',
        404
      )
    }
    
    if (!canAccessResource(user, resource.ownerId)) {
      return AuthResponseBuilder.forbidden('无权访问此资源')
    }
    
    // 更新资源...
    const updatedResource = await updateResource(params.id, updateData)
    
    return AuthResponseBuilder.success(updatedResource)
  } catch (error) {
    return AuthResponseBuilder.fromError(error)
  }
}
```

## 错误类型映射

| 错误类型 | HTTP状态码 | 使用场景 |
|---------|-----------|----------|
| `NO_SESSION` | 401 | 未登录或无会话 |
| `INVALID_SESSION` | 401 | 会话无效 |
| `SESSION_EXPIRED` | 401 | 会话过期 |
| `INSUFFICIENT_PERMISSIONS` | 403 | 权限不足 |
| `ACCOUNT_BANNED` | 403 | 账户被封禁 |
| `ACCOUNT_INACTIVE` | 403 | 账户未激活 |
| `ACCOUNT_DISABLED` | 403 | 账户被禁用 |
| `RATE_LIMITED` | 429 | 请求频率限制 |
| `INVALID_CREDENTIALS` | 401 | 登录凭据错误 |
| `VALIDATION_ERROR` | 400 | 输入验证失败 |

## 最佳实践

### 1. 统一错误处理
```typescript
// 推荐：使用 fromError 自动处理
return AuthResponseBuilder.fromError(error)

// 避免：手动判断错误类型
if (error.message.includes('权限')) {
  return NextResponse.json({ error: '权限不足' }, { status: 403 })
}
```

### 2. 提供详细的错误信息
```typescript
// 好的做法
return AuthResponseBuilder.validationError(
  '输入验证失败',
  {
    email: ['邮箱格式不正确', '邮箱已被使用'],
    password: ['密码长度至少8位']
  }
)

// 避免：模糊的错误信息
return AuthResponseBuilder.validationError('验证失败')
```

### 3. 合理使用HTTP状态码
```typescript
// 创建资源成功
return AuthResponseBuilder.created(newResource)

// 更新成功
return AuthResponseBuilder.success(updatedResource)

// 删除成功（无返回内容）
return AuthResponseBuilder.noContent()
```

### 4. 安全考虑
```typescript
// 不要暴露敏感信息
return AuthResponseBuilder.unauthorized('未授权访问')

// 而不是
return AuthResponseBuilder.unauthorized('用户ID 123 的会话已过期')
```