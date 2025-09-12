/**
 * 用户个人资料API - 展示资源所有权验证
 */

import { NextRequest } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { permissionMiddleware, Operation } from '@/lib/permission-middleware'
import { AuthResponseBuilder } from '@/lib/auth-response-builder'

// 模拟用户资料数据
const mockProfiles = new Map([
  ['user-1', { 
    id: 'user-1', 
    name: 'John Doe', 
    email: 'john@example.com', 
    bio: 'Software Developer',
    avatar: '/avatars/john.jpg',
    preferences: {
      theme: 'dark',
      notifications: true
    }
  }],
  ['user-2', { 
    id: 'user-2', 
    name: 'Jane Smith', 
    email: 'jane@example.com', 
    bio: 'Product Manager',
    avatar: '/avatars/jane.jpg',
    preferences: {
      theme: 'light',
      notifications: false
    }
  }]
])

/**
 * 获取用户资料 - 用户只能查看自己的资料，管理员可以查看所有
 */
export const GET = authMiddleware.user(
  permissionMiddleware.ownership(
    async (request: NextRequest) => {
      const { searchParams } = new URL(request.url)
      const userId = searchParams.get('userId')
      
      if (!userId) {
        return null // 资源不存在
      }
      
      const profile = mockProfiles.get(userId)
      return profile?.id || null
    }
  )(
    async (request: NextRequest, context) => {
      try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('userId') || context.user?.id
        
        if (!userId) {
          return AuthResponseBuilder.validationError('用户ID是必填项')
        }
        
        const profile = mockProfiles.get(userId)
        
        if (!profile) {
          return AuthResponseBuilder.customError(
            '用户资料不存在',
            'PROFILE_NOT_FOUND',
            404
          )
        }
        
        // 根据用户权限返回不同的数据
        const isOwnProfile = context.user?.id === userId
        const isAdmin = context.isAdmin
        
        let responseData = { ...profile }
        
        // 非本人且非管理员时，隐藏敏感信息
        if (!isOwnProfile && !isAdmin) {
          delete responseData.email
          delete responseData.preferences
        }
        
        return AuthResponseBuilder.success({
          profile: responseData,
          accessLevel: isOwnProfile ? 'owner' : isAdmin ? 'admin' : 'public'
        })
      } catch (error) {
        return AuthResponseBuilder.fromError(error)
      }
    }
  )
)

/**
 * 更新用户资料 - 只能更新自己的资料
 */
export const PUT = authMiddleware.userWithRateLimit(
  permissionMiddleware.ownership(
    async (request: NextRequest) => {
      const { searchParams } = new URL(request.url)
      const userId = searchParams.get('userId')
      
      if (!userId) {
        return null
      }
      
      const profile = mockProfiles.get(userId)
      return profile?.id || null
    }
  )(
    async (request: NextRequest, context) => {
      try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('userId') || context.user?.id
        
        if (!userId) {
          return AuthResponseBuilder.validationError('用户ID是必填项')
        }
        
        const updateData = await request.json()
        const currentProfile = mockProfiles.get(userId)
        
        if (!currentProfile) {
          return AuthResponseBuilder.customError(
            '用户资料不存在',
            'PROFILE_NOT_FOUND',
            404
          )
        }
        
        // 验证更新数据
        const allowedFields = ['name', 'bio', 'avatar', 'preferences']
        const updateFields = Object.keys(updateData)
        const invalidFields = updateFields.filter(field => !allowedFields.includes(field))
        
        if (invalidFields.length > 0) {
          return AuthResponseBuilder.validationError(
            '包含不允许更新的字段',
            { invalidFields: [`不允许更新字段: ${invalidFields.join(', ')}`] }
          )
        }
        
        // 更新资料
        const updatedProfile = {
          ...currentProfile,
          ...updateData,
          id: userId, // 确保ID不被覆盖
          email: currentProfile.email // 确保邮箱不被覆盖
        }
        
        mockProfiles.set(userId, updatedProfile)
        
        return AuthResponseBuilder.success({
          message: '资料更新成功',
          profile: updatedProfile
        })
      } catch (error) {
        return AuthResponseBuilder.fromError(error)
      }
    }
  ),
  20, // 每分钟最多20个更新请求
  60000
)

/**
 * 删除用户资料 - 需要特殊权限或管理员权限
 */
export const DELETE = authMiddleware.user(
  permissionMiddleware.operation(Operation.delete, 'user')(
    async (request: NextRequest, context) => {
      try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('userId')
        
        if (!userId) {
          return AuthResponseBuilder.validationError('用户ID是必填项')
        }
        
        // 检查是否为本人或管理员
        const isOwnProfile = context.user?.id === userId
        const isAdmin = context.isAdmin
        
        if (!isOwnProfile && !isAdmin) {
          return AuthResponseBuilder.forbidden('只能删除自己的资料')
        }
        
        const profile = mockProfiles.get(userId)
        
        if (!profile) {
          return AuthResponseBuilder.customError(
            '用户资料不存在',
            'PROFILE_NOT_FOUND',
            404
          )
        }
        
        // 管理员删除其他用户时需要记录
        if (isAdmin && !isOwnProfile) {
          console.log(`[ADMIN_DELETE] Admin ${context.user?.id} deleted profile ${userId}`)
        }
        
        mockProfiles.delete(userId)
        
        return AuthResponseBuilder.success({
          message: '用户资料已删除',
          deletedBy: {
            userId: context.user?.id,
            isAdmin: context.isAdmin
          }
        })
      } catch (error) {
        return AuthResponseBuilder.fromError(error)
      }
    }
  )
)