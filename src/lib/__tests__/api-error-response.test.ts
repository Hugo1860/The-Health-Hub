/**
 * API错误响应格式一致性测试
 * 验证所有API端点返回一致的错误响应格式
 */

import { ApiResponse, DatabaseErrorHandler } from '@/lib/api-response';

describe('API Error Response Format Tests', () => {
  describe('Standard Error Response Formats', () => {
    test('404 Not Found responses should have consistent format', async () => {
      const response = ApiResponse.notFound('Resource not found');
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Resource not found');
    });

    test('400 Bad Request responses should have consistent format', async () => {
      const response = ApiResponse.badRequest('Invalid input data', { field: 'validation error' });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('details');
      expect(data.error).toBe('Invalid input data');
      expect(data.details).toEqual({ field: 'validation error' });
    });

    test('401 Unauthorized responses should have consistent format', async () => {
      const response = ApiResponse.unauthorized('Authentication required');
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Authentication required');
    });

    test('403 Forbidden responses should have consistent format', async () => {
      const response = ApiResponse.forbidden('Insufficient permissions');
      const data = await response.json();
      
      expect(response.status).toBe(403);
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Insufficient permissions');
    });

    test('500 Internal Server Error responses should have consistent format', async () => {
      const response = ApiResponse.internalError('Internal server error');
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('Success Response Formats', () => {
    test('Success responses with data should have consistent format', async () => {
      const testData = { id: '123', name: 'Test Item' };
      const response = ApiResponse.success(testData);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toEqual(testData);
    });

    test('Success responses with message should have consistent format', async () => {
      const response = ApiResponse.success(null, 'Operation completed successfully');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('message');
      expect(data.message).toBe('Operation completed successfully');
    });

    test('Created responses should have consistent format', async () => {
      const testData = { id: '123', name: 'New Item' };
      const response = ApiResponse.created(testData, 'Item created successfully');
      const data = await response.json();
      
      expect(response.status).toBe(201);
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('message');
      expect(data.data).toEqual(testData);
      expect(data.message).toBe('Item created successfully');
    });
  });

  describe('Database Error Handling', () => {
    test('should handle generic database errors consistently', () => {
      const mockError = new Error('Database connection failed');
      const response = DatabaseErrorHandler.handle(mockError, 'Test operation');
      
      expect(response.status).toBe(500);
    });

    test('should handle constraint violation errors consistently', () => {
      const mockError = { code: '23505', message: 'duplicate key value violates unique constraint' };
      const response = DatabaseErrorHandler.handle(mockError, 'Insert operation');
      
      expect(response.status).toBe(400);
    });

    test('should include operation context in error handling', async () => {
      const mockError = new Error('Connection timeout');
      const response = DatabaseErrorHandler.handle(mockError, 'User creation');
      const data = await response.json();
      
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('User creation failed');
    });
  });

  describe('HTTP Status Code Consistency', () => {
    const statusCodeTests = [
      { method: 'notFound', expectedStatus: 404 },
      { method: 'badRequest', expectedStatus: 400 },
      { method: 'unauthorized', expectedStatus: 401 },
      { method: 'forbidden', expectedStatus: 403 },
      { method: 'internalError', expectedStatus: 500 },
    ];

    statusCodeTests.forEach(({ method, expectedStatus }) => {
      test(`${method} should return status ${expectedStatus}`, () => {
        const response = (ApiResponse as any)[method]('Test message');
        expect(response.status).toBe(expectedStatus);
      });
    });
  });

  describe('Error Message Localization Support', () => {
    test('should support Chinese error messages', async () => {
      const response = ApiResponse.notFound('资源不存在');
      const data = await response.json();
      
      expect(data.error).toBe('资源不存在');
    });

    test('should support English error messages', async () => {
      const response = ApiResponse.notFound('Resource not found');
      const data = await response.json();
      
      expect(data.error).toBe('Resource not found');
    });
  });

  describe('Error Response Structure Validation', () => {
    test('all error responses should have required fields', async () => {
      const errorMethods = ['notFound', 'badRequest', 'unauthorized', 'forbidden', 'internalError'];
      
      for (const method of errorMethods) {
        const response = (ApiResponse as any)[method]('Test error');
        const data = await response.json();
        
        expect(data).toHaveProperty('error');
        expect(typeof data.error).toBe('string');
        expect(data.error.length).toBeGreaterThan(0);
      }
    });

    test('error responses should not expose sensitive information', async () => {
      const response = DatabaseErrorHandler.handle(
        new Error('Database password: secret123'),
        'Database operation'
      );
      const data = await response.json();
      
      // 确保敏感信息不会暴露在错误响应中
      expect(data.error).not.toContain('secret123');
      expect(data.error).not.toContain('password');
    });
  });
});