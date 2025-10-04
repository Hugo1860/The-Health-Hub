# 认证和权限中间件使用指南

## 概述

本指南介绍如何使用新的认证和权限中间件系统来保护API路由。该系统提供了统一、灵活且安全的认证和授权机制。

## 核心组件

### 1. 认证中间件 (`auth-middleware.ts`)
- `withAuth` - 基础认证中间件
- `withUserAuth` - 用户认证中间件
- `withAdminAuth` - 管理员认证中间件
- `authMiddleware` - 便捷方法集合

### 2. 权限中间件 (`permission-middleware.ts`)
- `PermissionValidator` - 权限验证器
- `withPermissions` - 权限验证中间件
- `withOperationPermission` - 基于操作的权限中间件
- `withResourceOwnership` - 资源所有权中间件
- `permissionMiddleware` - 便捷方法集合

## 基础使用

### 公开API（无需认证）
```typescript
import { authMiddleware } from '@/lib/auth-middleware'

export const GET = authMiddleware.public(
  async (request, context) => {
    // 公开访问的逻辑
    return AuthResponseBuilder.success({ message: 'Public data' })
  }
)
```

### 用户认证API
```typescript
import { authMiddleware } from '@/lib/auth-middleware'

export const GET = authMiddleware.user(
  async (request, context) => {
    // 需要用户登录的逻辑
    const userId = context.user?.id
    return AuthResponseBuilder.success({ userId })
  }
)
```

### 管理员认证API
```typescript
import { authMiddleware } from '@/lib/auth-middleware'

export const POST = authMiddleware.admin(
  async (request, context) => {
    // 需要管理员权限的逻辑
    const adminId = context.user?.id
    return AuthResponseBuilder.success({ adminId })
  }
)
```

## 权限控制

### 基于权限的访问控制
```typescript
import { authMiddleware } from '@/lib/auth-middleware'
import { permissionMiddleware, Permission } from '@/lib/permission-middleware'

export const DELETE = authMiddleware.admin(
  permissionMiddleware.require([Permission.DELETE_USER])(
    async (request, context) => {
      // 需要DELETE_USER权限的逻辑
      return AuthResponseBuilder.success({ message: 'User deleted' })
    }
  )
)
```

### 多权限要求
```typescript
// 需要任一权限（默认）
export const GET = authMiddleware.user(
  permissionMiddleware.require([
    Permission.VIEW_USERS, 
    Permission.VIEW_CONTENT
  ])(handler)
)

// 需要所有权限
export const POST = authMiddleware.admin(
  permissionMiddleware.require([
    Permission.CREATE_USER, 
    Permission.MANAGE_SETTINGS
  ], true)(handler) // true表示需要所有权限
)
```

### 基于角色的访问控制
```typescript
import { Role } from '@/lib/permission-middleware'

export const GET = authMiddleware.user(
  permissionMiddleware.role([Role.ADMIN, Role.SUPER_ADMIN])(
    async (request, context) => {
      // 只有管理员和超级管理员可以访问
      return AuthResponseBuilder.success({ data: 'Admin data' })
    }
  )
)
```

### 基于操作的权限控制
```typescript
import { Operation } from '@/lib/permission-middleware'

export const PUT = authMiddleware.user(
  permissionMiddleware.operation(Operation.write, 'user')(
    async (request, context) => {
      // 需要对用户资源的写权限
      return AuthResponseBuilder.success({ message: 'User updated' })
    }
  )
)
```

## 资源所有权验证

### 基础资源所有权
```typescript
export const GET = authMiddleware.user(
  permissionMiddleware.ownership(
    async (request) => {
      // 从请求中获取资源所有者ID
      const { searchParams } = new URL(request.url)
      const userId = searchParams.get('userId')
      return userId // 返回资源所有者ID
    }
  )(
    async (request, context) => {
      // 只有资源所有者或管理员可以访问
      return AuthResponseBuilder.success({ data: 'User data' })
    }
  )
)
```

### 从路径参数获取资源ID
```typescript
export const PUT = authMiddleware.user(
  permissionMiddleware.ownership(
    async (request) => {
      // 从URL路径获取用户ID
      const url = new URL(request.url)
      const pathParts = url.pathname.split('/')
      const userId = pathParts[pathParts.length - 1]
      
      // 验证用户是否存在并返回所有者ID
      const user = await getUserById(userId)
      return user?.id || null
    }
  )(handler)
)
```

## 速率限制

### 用户API速率限制
```typescript
export const POST = authMiddleware.userWithRateLimit(
  async (request, context) => {
    // 处理逻辑
    return AuthResponseBuilder.success({ message: 'Success' })
  },
  100, // 每分钟最多100个请求
  60000 // 时间窗口：60秒
)
```

### 管理员API速率限制
```typescript
export const DELETE = authMiddleware.adminWithRateLimit(
  async (request, context) => {
    // 管理员操作逻辑
    return AuthResponseBuilder.success({ message: 'Deleted' })
  },
  50, // 每分钟最多50个请求
  60000
)
```

### 自定义速率限制
```typescript
export const POST = authMiddleware.user(
  async (request, context) => {
    // 处理逻辑
    return AuthResponseBuilder.success({ message: 'Success' })
  },
  {
    rateLimit: {
      maxRequests: 10,
      windowMs: 60000
    }
  }
)
```

## 组合使用

### 复杂权限组合
```typescript
export const PATCH = authMiddleware.admin(
  permissionMiddleware.require([Permission.UPDATE_USER, Permission.VIEW_USERS], true)(
    permissionMiddleware.ownership(
      async (request) => {
        const { userId } = await request.json()
        return userId
      }
    )(
      async (request, context) => {
        // 需要管理员权限 + 特定权限 + 资源所有权
        return AuthResponseBuilder.success({ message: 'Updated' })
      }
    )
  )
)
```

### 条件权限检查
```typescript
export const GET = authMiddleware.user(
  async (request, context) => {
    const { searchParams } = new URL(request.url)
    const includePrivate = searchParams.get('includePrivate') === 'true'
    
    // 如果需要私有数据，检查额外权限
    if (includePrivate) {
      const hasPermission = PermissionValidator.hasPermission(
        context.user!,
        Permission.VIEW_PRIVATE_DATA
      )
      
      if (!hasPermission) {
        return AuthResponseBuilder.forbidden('无权查看私有数据')
      }
    }
    
    // 返回数据
    return AuthResponseBuilder.success({
      data: 'Public data',
      privateData: includePrivate ? 'Private data' : undefined
    })
  }
)
```

## 错误处理

### 统一错误响应
```typescript
export const POST = authMiddleware.user(
  async (request, context) => {
    try {
      // 业务逻辑
      const result = await processData()
      return AuthResponseBuilder.success(result)
    } catch (error) {
      // 自动处理错误类型和响应格式
      return AuthResponseBuilder.fromError(error)
    }
  }
)
```

### 自定义错误处理
```typescript
export const PUT = authMiddleware.admin(
  async (request, context) => {
    try {
      const data = await request.json()
      
      if (!data.name) {
        return AuthResponseBuilder.validationError(
          '名称是必填项',
          { name: ['名称不能为空'] }
        )
      }
      
      // 处理逻辑...
      
    } catch (error) {
      if (error instanceof ValidationError) {
        return AuthResponseBuilder.validationError(error.message)
      }
      
      return AuthResponseBuilder.fromError(error)
    }
  }
)
```

## 日志和监控

### 启用访问日志
```typescript
export const GET = authMiddleware.user(
  async (request, context) => {
    // 处理逻辑
    return AuthResponseBuilder.success({ data: 'Success' })
  },
  {
    logAccess: true // 启用访问日志
  }
)
```

### 自定义日志
```typescript
export const POST = authMiddleware.admin(
  async (request, context) => {
    // 记录管理员操作
    console.log(`[ADMIN_ACTION] ${context.user?.id} performed action on ${request.url}`)
    
    // 处理逻辑...
    
    return AuthResponseBuilder.success({ message: 'Action completed' })
  }
)
```

## 最佳实践

### 1. 选择合适的中间件
```typescript
// ✅ 好的做法
export const GET = authMiddleware.public(handler) // 公开API
export const POST = authMiddleware.user(handler)  // 用户API
export const DELETE = authMiddleware.admin(handler) // 管理员API

// ❌ 避免的做法
export const GET = authMiddleware.admin(handler) // 公开数据不需要管理员权限
```

### 2. 合理使用权限检查
```typescript
// ✅ 好的做法 - 细粒度权限
export const DELETE = authMiddleware.admin(
  permissionMiddleware.require([Permission.DELETE_USER])(handler)
)

// ❌ 避免的做法 - 过于宽泛的权限
export const DELETE = authMiddleware.admin(handler) // 没有具体权限检查
```

### 3. 适当的速率限制
```typescript
// ✅ 好的做法 - 根据操作类型设置限制
export const POST = authMiddleware.userWithRateLimit(handler, 10, 60000) // 创建操作
export const GET = authMiddleware.userWithRateLimit(handler, 100, 60000) // 查询操作

// ❌ 避免的做法 - 所有操作使用相同限制
```

### 4. 清晰的错误信息
```typescript
// ✅ 好的做法
if (!data.email) {
  return AuthResponseBuilder.validationError(
    '邮箱是必填项',
    { email: ['请提供有效的邮箱地址'] }
  )
}

// ❌ 避免的做法
if (!data.email) {
  return AuthResponseBuilder.validationError('验证失败')
}
```

## 迁移指南

### 从旧的认证方式迁移

**旧方式:**
```typescript
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }
  
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: '权限不足' }, { status: 403 })
  }
  
  // 业务逻辑...
}
```

**新方式:**
```typescript
export const GET = authMiddleware.admin(
  async (request, context) => {
    // 业务逻辑...
    return AuthResponseBuilder.success(data)
  }
)
```

### 逐步迁移策略

1. **第一阶段**: 新API使用新中间件
2. **第二阶段**: 重构现有API使用新中间件
3. **第三阶段**: 移除旧的认证代码

## 性能考虑

### 1. 中间件顺序
```typescript
// ✅ 好的做法 - 先检查认证，再检查权限
export const POST = authMiddleware.admin(
  permissionMiddleware.require([Permission.CREATE_USER])(handler)
)
```

### 2. 缓存权限检查
```typescript
// 在复杂的权限检查中，可以缓存结果
const permissionCache = new Map()

export const GET = authMiddleware.user(
  async (request, context) => {
    const cacheKey = `${context.user?.id}:${request.url}`
    
    if (permissionCache.has(cacheKey)) {
      return permissionCache.get(cacheKey)
    }
    
    // 执行权限检查...
    const result = await checkPermissions()
    
    permissionCache.set(cacheKey, result)
    return result
  }
)
```

## 安全注意事项

### 1. 敏感操作的额外验证
```typescript
export const DELETE = authMiddleware.admin(
  permissionMiddleware.require([Permission.DELETE_USER])(
    async (request, context) => {
      // 对于敏感操作，添加额外验证
      const { confirmationToken } = await request.json()
      
      if (!verifyConfirmationToken(confirmationToken, context.user?.id)) {
        return AuthResponseBuilder.forbidden('需要确认令牌')
      }
      
      // 执行删除操作...
    }
  )
)
```

### 2. 防止权限提升
```typescript
export const PUT = authMiddleware.admin(
  async (request, context) => {
    const { userId, newRole } = await request.json()
    
    // 防止管理员将自己的角色降级
    if (userId === context.user?.id && newRole !== 'admin') {
      return AuthResponseBuilder.forbidden('不能修改自己的角色')
    }
    
    // 防止创建超级管理员（除非当前用户是超级管理员）
    if (newRole === 'super_admin' && context.user?.role !== 'super_admin') {
      return AuthResponseBuilder.forbidden('权限不足')
    }
    
    // 执行角色更新...
  }
)
```

这个中间件系统提供了强大而灵活的认证和授权机制，帮助你构建安全、可维护的API。