/**
 * 认证响应构建器的单元测试
 */

import { describe, it, expect } from '@jest/globals'
import { NextResponse } from 'next/server'
import { 
  AuthResponseBuilder, 
  AuthErrorType,
  authResponse,
  AuthErrorResponse,
  AuthSuccessResponse
} from '../auth-response-builder'

describe('AuthResponseBuilder', () => {
  describe('unauthorized', () => {
    it('should create unauthorized response with default message', async () => {
      const response = AuthResponseBuilder.unauthorized()
      const data = await response.json() as AuthErrorResponse

      expect(response.status).toBe(401)
      expect(data.error.type).toBe(AuthErrorType.NO_SESSION)
      expect(data.error.code).toBe(AuthErrorType.NO_SESSION)
      expect(data.error.message).toBe('未授权访问')
      expect(data.timestamp).toBeDefined()
    })

    it('should create unauthorized response with custom message and type', async () => {
      const response = AuthResponseBuilder.unauthorized(
        '自定义错误消息',
        AuthErrorType.INVALID_SESSION,
        { userId: '123' }
      )
      const data = await response.json() as AuthErrorResponse

      expect(response.status).toBe(401)
      expect(data.error.type).toBe(AuthErrorType.INVALID_SESSION)
      expect(data.error.message).toBe('自定义错误消息')
      expect(data.error.details).toEqual({ userId: '123' })
    })

    it('should include WWW-Authenticate header', () => {
      const response = AuthResponseBuilder.unauthorized()
      expect(response.headers.get('WWW-Authenticate')).toBe('Bearer realm="API"')
    })
  })

  describe('forbidden', () => {
    it('should create forbidden response', async () => {
      const response = AuthResponseBuilder.forbidden('权限不足', { requiredRole: 'admin' })
      const data = await response.json() as AuthErrorResponse

      expect(response.status).toBe(403)
      expect(data.error.type).toBe(AuthErrorType.INSUFFICIENT_PERMISSIONS)
      expect(data.error.code).toBe('FORBIDDEN')
      expect(data.error.message).toBe('权限不足')
      expect(data.error.details).toEqual({ requiredRole: 'admin' })
    })
  })

  describe('sessionExpired', () => {
    it('should create session expired response', async () => {
      const response = AuthResponseBuilder.sessionExpired()
      const data = await response.json() as AuthErrorResponse

      expect(response.status).toBe(401)
      expect(data.error.type).toBe(AuthErrorType.SESSION_EXPIRED)
      expect(data.error.code).toBe('SESSION_EXPIRED')
      expect(data.error.message).toBe('会话已过期，请重新登录')
    })
  })

  describe('accountBanned', () => {
    it('should create account banned response', async () => {
      const response = AuthResponseBuilder.accountBanned(
        '账户被封禁',
        '违规行为',
        '2024-12-31T23:59:59Z'
      )
      const data = await response.json() as AuthErrorResponse

      expect(response.status).toBe(403)
      expect(data.error.type).toBe(AuthErrorType.ACCOUNT_BANNED)
      expect(data.error.details).toEqual({
        reason: '违规行为',
        expiresAt: '2024-12-31T23:59:59Z'
      })
    })
  })

  describe('rateLimited', () => {
    it('should create rate limited response with retry header', async () => {
      const response = AuthResponseBuilder.rateLimited('请求过于频繁', 60)
      const data = await response.json() as AuthErrorResponse

      expect(response.status).toBe(429)
      expect(data.error.type).toBe(AuthErrorType.RATE_LIMITED)
      expect(data.error.details).toEqual({ retryAfter: 60 })
      expect(response.headers.get('Retry-After')).toBe('60')
    })
  })

  describe('success', () => {
    it('should create success response', async () => {
      const testData = { id: 1, name: 'Test' }
      const response = AuthResponseBuilder.success(testData)
      const data = await response.json() as AuthSuccessResponse

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(testData)
      expect(data.timestamp).toBeDefined()
    })

    it('should create success response with custom status', async () => {
      const response = AuthResponseBuilder.success({ message: 'Updated' }, 202)
      expect(response.status).toBe(202)
    })
  })

  describe('created', () => {
    it('should create created response with 201 status', async () => {
      const testData = { id: 1, name: 'New Item' }
      const response = AuthResponseBuilder.created(testData)
      const data = await response.json() as AuthSuccessResponse

      expect(response.status).toBe(201)
      expect(data.data).toEqual(testData)
    })
  })

  describe('noContent', () => {
    it('should create no content response', () => {
      const response = AuthResponseBuilder.noContent()
      expect(response.status).toBe(204)
    })
  })

  describe('fromError', () => {
    it('should auto-detect error type from message', async () => {
      const response1 = AuthResponseBuilder.fromError('未登录用户')
      const data1 = await response1.json() as AuthErrorResponse
      expect(data1.error.type).toBe(AuthErrorType.NO_SESSION)

      const response2 = AuthResponseBuilder.fromError('需要管理员权限')
      const data2 = await response2.json() as AuthErrorResponse
      expect(data2.error.type).toBe(AuthErrorType.INSUFFICIENT_PERMISSIONS)

      const response3 = AuthResponseBuilder.fromError('账户已被禁用')
      const data3 = await response3.json() as AuthErrorResponse
      expect(data3.error.type).toBe(AuthErrorType.ACCOUNT_BANNED)
    })

    it('should use provided error type', async () => {
      const response = AuthResponseBuilder.fromError(
        '自定义错误',
        AuthErrorType.RATE_LIMITED
      )
      const data = await response.json() as AuthErrorResponse
      expect(data.error.type).toBe(AuthErrorType.RATE_LIMITED)
    })

    it('should handle Error objects', async () => {
      const error = new Error('测试错误')
      const response = AuthResponseBuilder.fromError(error)
      const data = await response.json() as AuthErrorResponse
      expect(data.error.message).toBe('测试错误')
    })
  })

  describe('customError', () => {
    it('should create custom error response', async () => {
      const response = AuthResponseBuilder.customError(
        '自定义错误',
        'CUSTOM_ERROR',
        422,
        AuthErrorType.VALIDATION_ERROR,
        { field: 'email' }
      )
      const data = await response.json() as AuthErrorResponse

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('CUSTOM_ERROR')
      expect(data.error.message).toBe('自定义错误')
      expect(data.error.type).toBe(AuthErrorType.VALIDATION_ERROR)
      expect(data.error.details).toEqual({ field: 'email' })
    })
  })

  describe('convenience exports', () => {
    it('should provide authResponse convenience object', async () => {
      const response = authResponse.unauthorized('测试')
      const data = await response.json() as AuthErrorResponse
      expect(data.error.message).toBe('测试')
    })
  })

  describe('response format consistency', () => {
    it('should have consistent error response format', async () => {
      const responses = [
        AuthResponseBuilder.unauthorized(),
        AuthResponseBuilder.forbidden(),
        AuthResponseBuilder.sessionExpired(),
        AuthResponseBuilder.accountBanned(),
        AuthResponseBuilder.rateLimited()
      ]

      for (const response of responses) {
        const data = await response.json() as AuthErrorResponse
        
        expect(data.error).toBeDefined()
        expect(data.error.type).toBeDefined()
        expect(data.error.code).toBeDefined()
        expect(data.error.message).toBeDefined()
        expect(data.timestamp).toBeDefined()
        
        // 验证时间戳格式
        expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp)
      }
    })

    it('should have consistent success response format', async () => {
      const response = AuthResponseBuilder.success({ test: 'data' })
      const data = await response.json() as AuthSuccessResponse

      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(data.timestamp).toBeDefined()
      expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp)
    })
  })
})