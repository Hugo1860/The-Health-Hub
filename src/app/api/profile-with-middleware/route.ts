/**
 * 用户个人资料API - 展示资源所有权验证
 */

import { NextRequest } from 'next/server'
import { withSecurity } from '@/lib/secureApiWrapper'
import { Operation } from '@/lib/permission-middleware'
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
export const GET = withSecurity(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url)
      const targetUserId = searchParams.get('userId')
      const requesterId = (request.headers.get('x-user-id') || '').trim()
      const requesterRole = (request.headers.get('x-user-role') || '').toLowerCase()

      if (!targetUserId && !requesterId) {
        return AuthResponseBuilder.validationError('用户ID是必填项')
      }

      const userId = targetUserId || requesterId
      const profile = mockProfiles.get(userId)

      if (!profile) {
        return AuthResponseBuilder.customError('用户资料不存在', 'PROFILE_NOT_FOUND', 404)
      }

      const isOwnProfile = requesterId === userId
      const isAdmin = requesterRole === 'admin'

      const responseData: any = { ...profile }
      if (!isOwnProfile && !isAdmin) {
        delete responseData.email
        delete responseData.preferences
      }

      return AuthResponseBuilder.success({
        profile: responseData,
        accessLevel: isOwnProfile ? 'owner' : isAdmin ? 'admin' : 'public'
      })
    } catch (error) {
      return AuthResponseBuilder.fromError(error instanceof Error ? error : String(error))
    }
  }, { requireAuth: true, enableRateLimit: true, allowedMethods: ['GET'] }
)

/**
 * 更新用户资料 - 只能更新自己的资料
 */
export const PUT = withSecurity(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url)
      const targetUserId = searchParams.get('userId')
      const requesterId = (request.headers.get('x-user-id') || '').trim()

      if (!targetUserId && !requesterId) {
        return AuthResponseBuilder.validationError('用户ID是必填项')
      }

      const userId = targetUserId || requesterId
      if (userId !== requesterId) {
        return AuthResponseBuilder.forbidden('只能更新自己的资料')
      }

      const updateData = await request.json()
      const currentProfile = mockProfiles.get(userId)
      if (!currentProfile) {
        return AuthResponseBuilder.customError('用户资料不存在', 'PROFILE_NOT_FOUND', 404)
      }

      const allowedFields = ['name', 'bio', 'avatar', 'preferences']
      const updateFields = Object.keys(updateData || {})
      const invalidFields = updateFields.filter(field => !allowedFields.includes(field))
      if (invalidFields.length > 0) {
        return AuthResponseBuilder.validationError('包含不允许更新的字段', { invalidFields: [`不允许更新字段: ${invalidFields.join(', ')}`] })
      }

      const updatedProfile = { ...currentProfile, ...updateData, id: userId, email: currentProfile.email }
      mockProfiles.set(userId, updatedProfile)

      return AuthResponseBuilder.success({ message: '资料更新成功', profile: updatedProfile })
    } catch (error) {
      return AuthResponseBuilder.fromError(error instanceof Error ? error : String(error))
    }
  }, { requireAuth: true, requireCSRF: true, enableRateLimit: true, rateLimitMax: 20, rateLimitWindow: 60000, allowedMethods: ['PUT'] }
)

/**
 * 删除用户资料 - 需要特殊权限或管理员权限
 */
export const DELETE = withSecurity(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url)
      const userId = searchParams.get('userId')
      const requesterId = (request.headers.get('x-user-id') || '').trim()
      const requesterRole = (request.headers.get('x-user-role') || '').toLowerCase()

      if (!userId) {
        return AuthResponseBuilder.validationError('用户ID是必填项')
      }

      const isOwnProfile = requesterId === userId
      const isAdmin = requesterRole === 'admin'
      if (!isOwnProfile && !isAdmin) {
        return AuthResponseBuilder.forbidden('只能删除自己的资料')
      }

      const profile = mockProfiles.get(userId)
      if (!profile) {
        return AuthResponseBuilder.customError('用户资料不存在', 'PROFILE_NOT_FOUND', 404)
      }

      if (isAdmin && !isOwnProfile) {
        console.log(`[ADMIN_DELETE] Admin ${requesterId} deleted profile ${userId}`)
      }

      mockProfiles.delete(userId)
      return AuthResponseBuilder.success({ message: '用户资料已删除', deletedBy: { userId: requesterId, isAdmin } })
    } catch (error) {
      return AuthResponseBuilder.fromError(error instanceof Error ? error : String(error))
    }
  }, { requireAuth: true, requireCSRF: true, enableRateLimit: true, allowedMethods: ['DELETE'] }
)