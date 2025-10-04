/**
 * 权限中间件的单元测试
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import {
  PermissionValidator,
  Permission,
  Role,
  Operation,
  withPermissions,
  withOperationPermission,
  withResourceOwnership,
  permissionMiddleware
} from '../permission-middleware'
import { AuthContext } from '../auth-middleware'

describe('Permission Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockUser = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Test User',
    role: 'user' as const,
    status: 'active' as const
  }

  const mockAdmin = {
    id: 'admin-1',
    email: 'admin@example.com',
    name: 'Test Admin',
    role: 'admin' as const,
    status: 'active' as const
  }

  const createMockRequest = (url: string = 'http://localhost/api/test') => {
    return new NextRequest(url, {
      method: 'GET',
      headers: {
        'user-agent': 'test-agent',
        'x-forwarded-for': '127.0.0.1'
      }
    })
  }

  const createMockContext = (user: any, isAuthenticated: boolean = true): AuthContext => ({
    user,
    isAuthenticated,
    isAdmin: user?.role === 'admin',
    clientIP: '127.0.0.1',
    userAgent: 'test-agent',
    requestId: 'test-req-123'
  })

  describe('PermissionValidator', () => {
    describe('getUserPermissions', () => {
      it('should return user permissions for regular user', () => {
        const permissions = PermissionValidator.getUserPermissions(mockUser)
        expect(permissions).toContain(Permission.VIEW_CONTENT)
        expect(permissions).toContain(Permission.VIEW_SYSTEM_STATS)
        expect(permissions).not.toContain(Permission.DELETE_USER)
      })

      it('should return admin permissions for admin user', () => {
        const permissions = PermissionValidator.getUserPermissions(mockAdmin)
        expect(permissions).toContain(Permission.VIEW_USERS)
        expect(permissions).toContain(Permission.CREATE_USER)
        expect(permissions).toContain(Permission.DELETE_CONTENT)
        expect(permissions).toContain(Permission.MANAGE_SETTINGS)
      })
    })

    describe('hasPermission', () => {
      it('should return true for user with permission', () => {
        const result = PermissionValidator.hasPermission(mockUser, Permission.VIEW_CONTENT)
        expect(result).toBe(true)
      })

      it('should return false for user without permission', () => {
        const result = PermissionValidator.hasPermission(mockUser, Permission.DELETE_USER)
        expect(result).toBe(false)
      })

      it('should return true for admin with permission', () => {
        const result = PermissionValidator.hasPermission(mockAdmin, Permission.DELETE_USER)
        expect(result).toBe(true)
      })
    })

    describe('hasAnyPermission', () => {
      it('should return true if user has any of the permissions', () => {
        const result = PermissionValidator.hasAnyPermission(mockUser, [
          Permission.DELETE_USER,
          Permission.VIEW_CONTENT
        ])
        expect(result).toBe(true)
      })

      it('should return false if user has none of the permissions', () => {
        const result = PermissionValidator.hasAnyPermission(mockUser, [
          Permission.DELETE_USER,
          Permission.MANAGE_ADMINS
        ])
        expect(result).toBe(false)
      })
    })

    describe('hasAllPermissions', () => {
      it('should return true if user has all permissions', () => {
        const result = PermissionValidator.hasAllPermissions(mockUser, [
          Permission.VIEW_CONTENT,
          Permission.VIEW_SYSTEM_STATS
        ])
        expect(result).toBe(true)
      })

      it('should return false if user is missing any permission', () => {
        const result = PermissionValidator.hasAllPermissions(mockUser, [
          Permission.VIEW_CONTENT,
          Permission.DELETE_USER
        ])
        expect(result).toBe(false)
      })
    })

    describe('hasRole', () => {
      it('should return true for matching role', () => {
        const result = PermissionValidator.hasRole(mockUser, Role.USER)
        expect(result).toBe(true)
      })

      it('should return false for non-matching role', () => {
        const result = PermissionValidator.hasRole(mockUser, Role.ADMIN)
        expect(result).toBe(false)
      })
    })

    describe('canAccessResource', () => {
      it('should allow admin to access any resource', () => {
        const result = PermissionValidator.canAccessResource(mockAdmin, 'other-user-id')
        expect(result).toBe(true)
      })

      it('should allow user to access own resource', () => {
        const result = PermissionValidator.canAccessResource(mockUser, mockUser.id)
        expect(result).toBe(true)
      })

      it('should deny user access to other user resource', () => {
        const result = PermissionValidator.canAccessResource(mockUser, 'other-user-id')
        expect(result).toBe(false)
      })

      it('should deny user access when allowSelfAccess is false', () => {
        const result = PermissionValidator.canAccessResource(mockUser, mockUser.id, false)
        expect(result).toBe(false)
      })
    })

    describe('validatePermissions', () => {
      it('should grant access for user with required permissions', () => {
        const result = PermissionValidator.validatePermissions(mockUser, {
          permissions: [Permission.VIEW_CONTENT]
        })
        expect(result.granted).toBe(true)
      })

      it('should deny access for user without required permissions', () => {
        const result = PermissionValidator.validatePermissions(mockUser, {
          permissions: [Permission.DELETE_USER]
        })
        expect(result.granted).toBe(false)
        expect(result.reason).toBe('权限不足')
      })

      it('should grant access for user with required role', () => {
        const result = PermissionValidator.validatePermissions(mockUser, {
          roles: [Role.USER]
        })
        expect(result.granted).toBe(true)
      })

      it('should deny access for user without required role', () => {
        const result = PermissionValidator.validatePermissions(mockUser, {
          roles: [Role.ADMIN]
        })
        expect(result.granted).toBe(false)
        expect(result.reason).toBe('用户角色不足')
      })

      it('should validate resource ownership', () => {
        const result = PermissionValidator.validatePermissions(mockUser, {
          resourceOwnerId: mockUser.id,
          allowSelfAccess: true
        })
        expect(result.granted).toBe(true)
      })

      it('should deny access to other user resources', () => {
        const result = PermissionValidator.validatePermissions(mockUser, {
          resourceOwnerId: 'other-user-id',
          allowSelfAccess: true
        })
        expect(result.granted).toBe(false)
        expect(result.reason).toBe('无权访问此资源')
      })
    })
  })

  describe('withPermissions middleware', () => {
    it('should allow access for user with permissions', async () => {
      const mockHandler = jest.fn().mockResolvedValue(new Response('OK'))
      const middleware = withPermissions(mockHandler, {
        permissions: [Permission.VIEW_CONTENT]
      })
      const request = createMockRequest()
      const context = createMockContext(mockUser)

      await middleware(request, context)

      expect(mockHandler).toHaveBeenCalledWith(request, context)
    })

    it('should deny access for user without permissions', async () => {
      const mockHandler = jest.fn()
      const middleware = withPermissions(mockHandler, {
        permissions: [Permission.DELETE_USER]
      })
      const request = createMockRequest()
      const context = createMockContext(mockUser)

      const response = await middleware(request, context)

      expect(mockHandler).not.toHaveBeenCalled()
      expect(response.status).toBe(403)
    })

    it('should deny access for unauthenticated user', async () => {
      const mockHandler = jest.fn()
      const middleware = withPermissions(mockHandler, {
        permissions: [Permission.VIEW_CONTENT]
      })
      const request = createMockRequest()
      const context = createMockContext(null, false)

      const response = await middleware(request, context)

      expect(mockHandler).not.toHaveBeenCalled()
      expect(response.status).toBe(401)
    })
  })

  describe('withOperationPermission middleware', () => {
    it('should allow read operation for user', async () => {
      const mockHandler = jest.fn().mockResolvedValue(new Response('OK'))
      const middleware = withOperationPermission(mockHandler, Operation.read, 'content')
      const request = createMockRequest()
      const context = createMockContext(mockUser)

      await middleware(request, context)

      expect(mockHandler).toHaveBeenCalledWith(request, context)
    })

    it('should deny delete operation for user', async () => {
      const mockHandler = jest.fn()
      const middleware = withOperationPermission(mockHandler, Operation.delete, 'user')
      const request = createMockRequest()
      const context = createMockContext(mockUser)

      const response = await middleware(request, context)

      expect(mockHandler).not.toHaveBeenCalled()
      expect(response.status).toBe(403)
    })

    it('should allow admin operations for admin', async () => {
      const mockHandler = jest.fn().mockResolvedValue(new Response('OK'))
      const middleware = withOperationPermission(mockHandler, Operation.admin)
      const request = createMockRequest()
      const context = createMockContext(mockAdmin)

      await middleware(request, context)

      expect(mockHandler).toHaveBeenCalledWith(request, context)
    })
  })

  describe('withResourceOwnership middleware', () => {
    it('should allow access to own resource', async () => {
      const getResourceOwnerId = jest.fn().mockResolvedValue(mockUser.id)
      const mockHandler = jest.fn().mockResolvedValue(new Response('OK'))
      const middleware = withResourceOwnership(mockHandler, getResourceOwnerId)
      const request = createMockRequest()
      const context = createMockContext(mockUser)

      await middleware(request, context)

      expect(mockHandler).toHaveBeenCalledWith(request, context)
    })

    it('should deny access to other user resource', async () => {
      const getResourceOwnerId = jest.fn().mockResolvedValue('other-user-id')
      const mockHandler = jest.fn()
      const middleware = withResourceOwnership(mockHandler, getResourceOwnerId)
      const request = createMockRequest()
      const context = createMockContext(mockUser)

      const response = await middleware(request, context)

      expect(mockHandler).not.toHaveBeenCalled()
      expect(response.status).toBe(403)
    })

    it('should return 404 for non-existent resource', async () => {
      const getResourceOwnerId = jest.fn().mockResolvedValue(null)
      const mockHandler = jest.fn()
      const middleware = withResourceOwnership(mockHandler, getResourceOwnerId)
      const request = createMockRequest()
      const context = createMockContext(mockUser)

      const response = await middleware(request, context)

      expect(mockHandler).not.toHaveBeenCalled()
      expect(response.status).toBe(404)
    })

    it('should allow admin access to any resource', async () => {
      const getResourceOwnerId = jest.fn().mockResolvedValue('other-user-id')
      const mockHandler = jest.fn().mockResolvedValue(new Response('OK'))
      const middleware = withResourceOwnership(mockHandler, getResourceOwnerId)
      const request = createMockRequest()
      const context = createMockContext(mockAdmin)

      await middleware(request, context)

      expect(mockHandler).toHaveBeenCalledWith(request, context)
    })
  })

  describe('permissionMiddleware convenience methods', () => {
    it('should create permission requirement middleware', async () => {
      const mockHandler = jest.fn().mockResolvedValue(new Response('OK'))
      const middleware = permissionMiddleware.require([Permission.VIEW_CONTENT])(mockHandler)
      const request = createMockRequest()
      const context = createMockContext(mockUser)

      await middleware(request, context)

      expect(mockHandler).toHaveBeenCalled()
    })

    it('should create role requirement middleware', async () => {
      const mockHandler = jest.fn().mockResolvedValue(new Response('OK'))
      const middleware = permissionMiddleware.role([Role.USER])(mockHandler)
      const request = createMockRequest()
      const context = createMockContext(mockUser)

      await middleware(request, context)

      expect(mockHandler).toHaveBeenCalled()
    })

    it('should create admin middleware', async () => {
      const mockHandler = jest.fn().mockResolvedValue(new Response('OK'))
      const middleware = permissionMiddleware.admin(mockHandler)
      const request = createMockRequest()
      const context = createMockContext(mockAdmin)

      await middleware(request, context)

      expect(mockHandler).toHaveBeenCalled()
    })

    it('should deny non-admin access to admin middleware', async () => {
      const mockHandler = jest.fn()
      const middleware = permissionMiddleware.admin(mockHandler)
      const request = createMockRequest()
      const context = createMockContext(mockUser)

      const response = await middleware(request, context)

      expect(mockHandler).not.toHaveBeenCalled()
      expect(response.status).toBe(403)
    })
  })

  describe('logging', () => {
    it('should log permission denied events', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      const mockHandler = jest.fn()
      const middleware = withPermissions(mockHandler, {
        permissions: [Permission.DELETE_USER]
      })
      const request = createMockRequest()
      const context = createMockContext(mockUser)

      await middleware(request, context)

      expect(consoleSpy).toHaveBeenCalledWith(
        '[PERMISSION_DENIED]',
        expect.stringContaining('user-1')
      )

      consoleSpy.mockRestore()
    })

    it('should log permission granted events', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      const mockHandler = jest.fn().mockResolvedValue(new Response('OK'))
      const middleware = withPermissions(mockHandler, {
        permissions: [Permission.VIEW_CONTENT]
      })
      const request = createMockRequest()
      const context = createMockContext(mockUser)

      await middleware(request, context)

      expect(consoleSpy).toHaveBeenCalledWith(
        '[PERMISSION_GRANTED]',
        expect.stringContaining('user-1')
      )

      consoleSpy.mockRestore()
    })
  })
})