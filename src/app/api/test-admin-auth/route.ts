// 测试管理员认证的简单API端点

import { NextRequest } from 'next/server'
import { AdminApiResponseBuilder } from '@/lib/adminApiUtils'
import { createAdminMiddleware, AdminPermission } from '@/lib/adminAuthMiddleware'
import { withErrorHandling } from '@/lib/adminErrorMiddleware'

// 简单的测试处理函数
async function handleGet(request: NextRequest): Promise<Response> {
  const admin = (request as any).admin
  
  return AdminApiResponseBuilder.success({
    message: '认证成功',
    admin: {
      id: admin.id,
      username: admin.username,
      role: admin.role
    }
  })
}

// 导出处理函数
export const GET = createAdminMiddleware({
  permissions: [AdminPermission.VIEW_SYSTEM_STATS]
})(withErrorHandling(handleGet))