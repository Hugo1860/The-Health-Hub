/**
 * 用户管理API - 使用新的认证和权限中间件
 * 这是一个示例，展示如何使用统一的中间件系统
 */

import { NextRequest } from 'next/server'
import { withSecurity } from '@/lib/secureApiWrapper'
import { ANTD_ADMIN_PERMISSIONS } from '@/hooks/useAntdAdminAuth'
import { AuthResponseBuilder } from '@/lib/auth-response-builder'

// 模拟用户数据操作
const mockUsers = [
  { id: '1', name: 'User 1', email: 'user1@example.com', role: 'user' },
  { id: '2', name: 'User 2', email: 'user2@example.com', role: 'admin' }
]

/**
 * 获取用户列表 - 需要VIEW_USERS权限
 */
export const GET = withSecurity(
  async (request: NextRequest) => {
      try {
        // 这里可以添加查询参数处理
        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')
        
        // 模拟分页逻辑
        const startIndex = (page - 1) * limit
        const endIndex = startIndex + limit
        const paginatedUsers = mockUsers.slice(startIndex, endIndex)
        
        return AuthResponseBuilder.success({
          users: paginatedUsers,
          pagination: {
            page,
            limit,
            total: mockUsers.length,
            totalPages: Math.ceil(mockUsers.length / limit)
          },
          requestedBy: undefined
        })
      } catch (error) {
        return AuthResponseBuilder.fromError(error instanceof Error ? error : String(error))
      }
  }, { requireAuth: true, requiredPermissions: [ANTD_ADMIN_PERMISSIONS.VIEW_USERS], enableRateLimit: true, allowedMethods: ['GET'] }
)

/**
 * 创建用户 - 需要CREATE_USER权限
 */
export const POST = withSecurity(
  async (request: NextRequest) => {
      try {
        const userData = await request.json()
        
        // 验证输入数据
        if (!userData.name || !userData.email) {
          return AuthResponseBuilder.validationError(
            '用户名和邮箱是必填项',
            {
              name: !userData.name ? ['用户名是必填项'] : undefined,
              email: !userData.email ? ['邮箱是必填项'] : undefined
            }
          )
        }
        
        // 检查邮箱是否已存在
        const existingUser = mockUsers.find(user => user.email === userData.email)
        if (existingUser) {
          return AuthResponseBuilder.customError(
            '邮箱已被使用',
            'EMAIL_EXISTS',
            409
          )
        }
        
        // 创建新用户
        const newUser = {
          id: String(mockUsers.length + 1),
          name: userData.name,
          email: userData.email,
          role: userData.role || 'user'
        }
        
        mockUsers.push(newUser)
        
        return AuthResponseBuilder.created({
          message: '用户创建成功',
          user: newUser,
          createdBy: undefined
        })
      } catch (error) {
        return AuthResponseBuilder.fromError(error instanceof Error ? error : String(error))
      }
  }, { requireAuth: true, requiredPermissions: [ANTD_ADMIN_PERMISSIONS.CREATE_USER], requireCSRF: true, enableRateLimit: true, rateLimitMax: 10, rateLimitWindow: 60000, allowedMethods: ['POST'] }
)

/**
 * 批量操作用户 - 需要多个权限
 */
export const PATCH = withSecurity(
  async (request: NextRequest) => {
      try {
        const { action, userIds, data } = await request.json()
        
        if (!action || !userIds || !Array.isArray(userIds)) {
          return AuthResponseBuilder.validationError(
            '操作类型和用户ID列表是必填项'
          )
        }
        
        const results = []
        
        for (const userId of userIds) {
          const userIndex = mockUsers.findIndex(user => user.id === userId)
          
          if (userIndex === -1) {
            results.push({
              userId,
              success: false,
              error: '用户不存在'
            })
            continue
          }
          
          switch (action) {
            case 'update':
              if (data) {
                mockUsers[userIndex] = { ...mockUsers[userIndex], ...data }
                results.push({
                  userId,
                  success: true,
                  user: mockUsers[userIndex]
                })
              }
              break
              
            case 'activate':
              mockUsers[userIndex].status = 'active'
              results.push({
                userId,
                success: true,
                message: '用户已激活'
              })
              break
              
            case 'deactivate':
              mockUsers[userIndex].status = 'inactive'
              results.push({
                userId,
                success: true,
                message: '用户已停用'
              })
              break
              
            default:
              results.push({
                userId,
                success: false,
                error: '不支持的操作类型'
              })
          }
        }
        
        return AuthResponseBuilder.success({
          message: '批量操作完成',
          results,
          operatedBy: undefined
        })
      } catch (error) {
        return AuthResponseBuilder.fromError(error instanceof Error ? error : String(error))
      }
  }, { requireAuth: true, requiredPermissions: [ANTD_ADMIN_PERMISSIONS.UPDATE_USER, ANTD_ADMIN_PERMISSIONS.VIEW_USERS], enableRateLimit: true, allowedMethods: ['PATCH'] }
)