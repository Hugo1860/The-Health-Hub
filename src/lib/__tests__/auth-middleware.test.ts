/**
 * 认证中间件的单元测试
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import { validateSession, validateAdminSession, validateUserSession } from '../session-validator'
import { withAuth, withUserAuth, withAdminAuth, authMiddleware } from '../auth-middleware'

// Mock dependencies
jest.mock('../session-validator')
jest.mock('../auth-response-builder')

const mockValidateSession = validateSession as jest.MockedFunction<typeof validateSession>
const mockValidateAdminSession = validateAdminSession as jest.MockedFunction<typeof validateAdminSession>
const mockValidateUserSession = validateUserSession as jest.MockedFunction<typeof validateUserSession>

describe('Auth Middleware', () => {
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

  describe('withAuth', () => {
    it('should allow public access when allowPublic is true', async () => {
      const mockHandler = jest.fn().mockResolvedValue(new Response('OK'))
      const middleware = withAuth(mockHandler, { allowPublic: true })
      const request = createMockRequest()

      await middleware(request)

      expect(mockHandler).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          isAuthenticated: false,
          isAdmin: false,
          clientIP: '127.0.0.1',
          userAgent: 'test-agent'
        })
      )
    })

    it('should authenticate user when session is valid', async () => {
      mockValidateSession.mockResolvedValue({
        isValid: true,
        user: mockUser
      })

      const mockHandler = jest.fn().mockResolvedValue(new Response('OK'))
      const middleware = withAuth(mockHandler)
      const request = createMockRequest()

      await middleware(request)

      expect(mockHandler).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          user: mockUser,
          isAuthenticated: true,
          isAdmin: false
        })
      )
    })

    it('should return unauthorized when requireAuth is true and no session', async () => {
      mockValidateSession.mockResolvedValue({
        isValid: false,
        error: 'No session'
      })

      const mockHandler = jest.fn()
      const middleware = withAuth(mockHandler, { requireAuth: true })
      const request = createMockRequest()

      const response = await middleware(request)

      expect(mockHandler).not.toHaveBeenCalled()
      expect(response.status).toBe(401)
    })
  })

  describe('withUserAuth', () => {
    it('should allow access for valid user', async () => {
      mockValidateUserSession.mockResolvedValue({
        isValid: true,
        user: mockUser
      })

      const mockHandler = jest.fn().mockResolvedValue(new Response('OK'))
      const middleware = withUserAuth(mockHandler)
      const request = createMockRequest()

      await middleware(request)

      expect(mockHandler).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          user: mockUser,
          isAuthenticated: true,
          isAdmin: false
        })
      )
    })

    it('should allow access for admin user', async () => {
      mockValidateUserSession.mockResolvedValue({
        isValid: true,
        user: mockAdmin
      })

      const mockHandler = jest.fn().mockResolvedValue(new Response('OK'))
      const middleware = withUserAuth(mockHandler)
      const request = createMockRequest()

      await middleware(request)

      expect(mockHandler).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          user: mockAdmin,
          isAuthenticated: true,
          isAdmin: true
        })
      )
    })

    it('should return unauthorized for invalid session', async () => {
      mockValidateUserSession.mockResolvedValue({
        isValid: false,
        error: 'Invalid session'
      })

      const mockHandler = jest.fn()
      const middleware = withUserAuth(mockHandler)
      const request = createMockRequest()

      const response = await middleware(request)

      expect(mockHandler).not.toHaveBeenCalled()
      expect(response.status).toBe(401)
    })

    it('should apply rate limiting', async () => {
      mockValidateUserSession.mockResolvedValue({
        isValid: true,
        user: mockUser
      })

      const mockHandler = jest.fn().mockResolvedValue(new Response('OK'))
      const middleware = withUserAuth(mockHandler, {
        rateLimit: { maxRequests: 1, windowMs: 60000 }
      })
      const request = createMockRequest()

      // First request should succeed
      await middleware(request)
      expect(mockHandler).toHaveBeenCalledTimes(1)

      // Second request should be rate limited
      const response = await middleware(request)
      expect(response.status).toBe(429)
      expect(mockHandler).toHaveBeenCalledTimes(1)
    })
  })

  describe('withAdminAuth', () => {
    it('should allow access for admin user', async () => {
      mockValidateAdminSession.mockResolvedValue({
        isValid: true,
        user: mockAdmin
      })

      const mockHandler = jest.fn().mockResolvedValue(new Response('OK'))
      const middleware = withAdminAuth(mockHandler)
      const request = createMockRequest()

      await middleware(request)

      expect(mockHandler).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          user: mockAdmin,
          isAuthenticated: true,
          isAdmin: true
        })
      )
    })

    it('should return forbidden for non-admin user', async () => {
      mockValidateAdminSession.mockResolvedValue({
        isValid: false,
        error: 'Insufficient permissions'
      })

      const mockHandler = jest.fn()
      const middleware = withAdminAuth(mockHandler)
      const request = createMockRequest()

      const response = await middleware(request)

      expect(mockHandler).not.toHaveBeenCalled()
      expect(response.status).toBe(403)
    })
  })

  describe('authMiddleware convenience methods', () => {
    it('should create public middleware', async () => {
      const mockHandler = jest.fn().mockResolvedValue(new Response('OK'))
      const middleware = authMiddleware.public(mockHandler)
      const request = createMockRequest()

      await middleware(request)

      expect(mockHandler).toHaveBeenCalled()
    })

    it('should create user middleware with rate limiting', async () => {
      mockValidateUserSession.mockResolvedValue({
        isValid: true,
        user: mockUser
      })

      const mockHandler = jest.fn().mockResolvedValue(new Response('OK'))
      const middleware = authMiddleware.userWithRateLimit(mockHandler, 5, 60000)
      const request = createMockRequest()

      await middleware(request)

      expect(mockHandler).toHaveBeenCalled()
    })

    it('should create admin middleware with rate limiting', async () => {
      mockValidateAdminSession.mockResolvedValue({
        isValid: true,
        user: mockAdmin
      })

      const mockHandler = jest.fn().mockResolvedValue(new Response('OK'))
      const middleware = authMiddleware.adminWithRateLimit(mockHandler, 3, 60000)
      const request = createMockRequest()

      await middleware(request)

      expect(mockHandler).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should handle middleware errors gracefully', async () => {
      mockValidateSession.mockRejectedValue(new Error('Database error'))

      const mockHandler = jest.fn()
      const middleware = withAuth(mockHandler)
      const request = createMockRequest()

      const response = await middleware(request)

      expect(mockHandler).not.toHaveBeenCalled()
      expect(response.status).toBe(500)
    })

    it('should handle handler errors gracefully', async () => {
      mockValidateUserSession.mockResolvedValue({
        isValid: true,
        user: mockUser
      })

      const mockHandler = jest.fn().mockRejectedValue(new Error('Handler error'))
      const middleware = withUserAuth(mockHandler)
      const request = createMockRequest()

      const response = await middleware(request)

      expect(response.status).toBe(500)
    })
  })

  describe('logging', () => {
    it('should log API access when logAccess is enabled', async () => {
      mockValidateSession.mockResolvedValue({
        isValid: true,
        user: mockUser
      })

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      const mockHandler = jest.fn().mockResolvedValue(new Response('OK'))
      const middleware = withAuth(mockHandler, { logAccess: true })
      const request = createMockRequest()

      await middleware(request)

      expect(consoleSpy).toHaveBeenCalledWith(
        '[API_ACCESS]',
        expect.stringContaining('user-1')
      )

      consoleSpy.mockRestore()
    })

    it('should log admin API access', async () => {
      mockValidateAdminSession.mockResolvedValue({
        isValid: true,
        user: mockAdmin
      })

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      const mockHandler = jest.fn().mockResolvedValue(new Response('OK'))
      const middleware = withAdminAuth(mockHandler)
      const request = createMockRequest()

      await middleware(request)

      expect(consoleSpy).toHaveBeenCalledWith(
        '[ADMIN_API_ACCESS]',
        expect.stringContaining('admin-1')
      )

      consoleSpy.mockRestore()
    })
  })
})