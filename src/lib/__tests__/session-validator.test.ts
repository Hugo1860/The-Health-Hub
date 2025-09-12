/**
 * 会话验证工具函数的单元测试
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { getServerSession } from 'next-auth'
import {
  validateSession,
  validateAdminSession,
  validateUserSession,
  hasPermission,
  canAccessResource,
  requireAuth,
  requireAdmin,
  requireUser,
  AuthenticatedUser
} from '../session-validator'

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('Session Validator', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Test User',
    role: 'user',
    status: 'active'
  }

  const mockAdmin: AuthenticatedUser = {
    id: 'admin-1',
    email: 'admin@example.com',
    name: 'Test Admin',
    role: 'admin',
    status: 'active'
  }

  describe('validateSession', () => {
    it('should return valid result for active user', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockUser,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })

      const result = await validateSession()

      expect(result.isValid).toBe(true)
      expect(result.user).toEqual(mockUser)
      expect(result.error).toBeUndefined()
    })

    it('should return invalid result when no session', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const result = await validateSession()

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('未找到有效会话')
      expect(result.errorCode).toBe('NO_SESSION')
    })

    it('should return invalid result for banned user', async () => {
      const bannedUser = { ...mockUser, status: 'banned' }
      mockGetServerSession.mockResolvedValue({
        user: bannedUser,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })

      const result = await validateSession()

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('账户已被禁用')
      expect(result.errorCode).toBe('ACCOUNT_BANNED')
    })

    it('should return invalid result for inactive user', async () => {
      const inactiveUser = { ...mockUser, status: 'inactive' }
      mockGetServerSession.mockResolvedValue({
        user: inactiveUser,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })

      const result = await validateSession()

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('账户未激活')
      expect(result.errorCode).toBe('ACCOUNT_INACTIVE')
    })
  })

  describe('validateAdminSession', () => {
    it('should return valid result for admin user', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockAdmin,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })

      const result = await validateAdminSession()

      expect(result.isValid).toBe(true)
      expect(result.user).toEqual(mockAdmin)
    })

    it('should return invalid result for non-admin user', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockUser,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })

      const result = await validateAdminSession()

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('需要管理员权限')
      expect(result.errorCode).toBe('INSUFFICIENT_PERMISSIONS')
    })
  })

  describe('validateUserSession', () => {
    it('should return valid result for regular user', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockUser,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })

      const result = await validateUserSession()

      expect(result.isValid).toBe(true)
      expect(result.user).toEqual(mockUser)
    })

    it('should return valid result for admin user', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockAdmin,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })

      const result = await validateUserSession()

      expect(result.isValid).toBe(true)
      expect(result.user).toEqual(mockAdmin)
    })
  })

  describe('hasPermission', () => {
    it('should return true for admin with admin permission', () => {
      expect(hasPermission(mockAdmin, 'admin')).toBe(true)
    })

    it('should return false for user with admin permission', () => {
      expect(hasPermission(mockUser, 'admin')).toBe(false)
    })

    it('should return true for user with user permission', () => {
      expect(hasPermission(mockUser, 'user')).toBe(true)
    })

    it('should return true for admin with user permission', () => {
      expect(hasPermission(mockAdmin, 'user')).toBe(true)
    })
  })

  describe('canAccessResource', () => {
    it('should allow admin to access any resource', () => {
      expect(canAccessResource(mockAdmin, 'other-user-id')).toBe(true)
    })

    it('should allow user to access own resource', () => {
      expect(canAccessResource(mockUser, mockUser.id)).toBe(true)
    })

    it('should not allow user to access other user resource', () => {
      expect(canAccessResource(mockUser, 'other-user-id')).toBe(false)
    })
  })

  describe('requireAuth', () => {
    it('should return user for valid session', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockUser,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })

      const user = await requireAuth()
      expect(user).toEqual(mockUser)
    })

    it('should throw error for invalid session', async () => {
      mockGetServerSession.mockResolvedValue(null)

      await expect(requireAuth()).rejects.toThrow('未找到有效会话')
    })
  })

  describe('requireAdmin', () => {
    it('should return admin user for valid admin session', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockAdmin,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })

      const user = await requireAdmin()
      expect(user).toEqual(mockAdmin)
    })

    it('should throw error for non-admin user', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockUser,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })

      await expect(requireAdmin()).rejects.toThrow('需要管理员权限')
    })
  })

  describe('requireUser', () => {
    it('should return user for valid user session', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockUser,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })

      const user = await requireUser()
      expect(user).toEqual(mockUser)
    })

    it('should return admin for valid admin session', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockAdmin,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })

      const user = await requireUser()
      expect(user).toEqual(mockAdmin)
    })
  })
})