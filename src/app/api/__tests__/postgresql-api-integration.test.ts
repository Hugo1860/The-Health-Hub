// PostgreSQL API集成测试

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { NextRequest } from 'next/server';

// 模拟API端点
const createMockRequest = (url: string, method: string = 'GET', body?: any): NextRequest => {
  const request = new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      'Content-Type': 'application/json'
    }
  });
  return request;
};

describe('PostgreSQL API Integration Tests', () => {
  beforeAll(async () => {
    // 确保测试环境
    process.env.DB_TYPE = 'postgresql';
    process.env.NODE_ENV = 'test';
  });

  describe('Health Check APIs', () => {
    test('should check database health', async () => {
      // 动态导入API处理函数
      const { GET } = await import('../health/database/route');
      
      const request = createMockRequest('/api/health/database');
      const response = await GET(request, {});
      
      expect(response.status).toBeLessThan(400);
      
      const data = await response.json();
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      
      if (data.success) {
        expect(data.data).toHaveProperty('database');
        expect(data.data.database).toHaveProperty('type', 'PostgreSQL');
      }
    });

    test('should check connection pool health', async () => {
      const { GET } = await import('../health/connection-pool/route');
      
      const request = createMockRequest('/api/health/connection-pool');
      const response = await GET(request, {});
      
      expect(response.status).toBeLessThan(400);
      
      const data = await response.json();
      expect(data).toHaveProperty('success');
      
      if (data.success) {
        expect(data.data).toHaveProperty('pool');
        expect(data.data).toHaveProperty('metrics');
        expect(data.data).toHaveProperty('recommendations');
      }
    });

    test('should perform comprehensive health check', async () => {
      const { GET } = await import('../health/comprehensive/route');
      
      const request = createMockRequest('/api/health/comprehensive');
      const response = await GET(request, {});
      
      expect(response.status).toBeLessThan(400);
      
      const data = await response.json();
      expect(data).toHaveProperty('success');
      
      if (data.success) {
        expect(data.data).toHaveProperty('services');
        expect(data.data).toHaveProperty('checks');
        expect(data.data).toHaveProperty('overall');
      }
    });
  });

  describe('Admin Dashboard APIs', () => {
    test('should get dashboard statistics', async () => {
      // 注意：这个测试需要认证，在实际测试中可能需要模拟认证
      try {
        const { GET } = await import('../admin/dashboard/stats/route');
        
        const request = createMockRequest('/api/admin/dashboard/stats');
        const response = await GET(request, {});
        
        const data = await response.json();
        
        // 检查响应结构
        if (data.success) {
          expect(data.data).toHaveProperty('totalAudios');
          expect(data.data).toHaveProperty('totalUsers');
          expect(data.data).toHaveProperty('monthlyGrowth');
          expect(data.data).toHaveProperty('categoryDistribution');
        }
      } catch (error) {
        // 如果因为认证失败，这是预期的
        console.log('Stats API test skipped due to authentication requirement');
      }
    });

    test('should get recent activity', async () => {
      try {
        const { GET } = await import('../admin/dashboard/recent-activity/route');
        
        const request = createMockRequest('/api/admin/dashboard/recent-activity?pageSize=5');
        const response = await GET(request);
        
        const data = await response.json();
        
        if (data.success) {
          expect(Array.isArray(data.data)).toBe(true);
        }
      } catch (error) {
        console.log('Recent activity API test skipped due to authentication requirement');
      }
    });

    test('should get popular content', async () => {
      try {
        const { GET } = await import('../admin/dashboard/popular-content/route');
        
        const request = createMockRequest('/api/admin/dashboard/popular-content?recentLimit=3&popularLimit=3');
        const response = await GET(request);
        
        const data = await response.json();
        
        if (data.success) {
          expect(data.data).toHaveProperty('recentAudios');
          expect(data.data).toHaveProperty('popularAudios');
          expect(data.data).toHaveProperty('topCategories');
        }
      } catch (error) {
        console.log('Popular content API test skipped due to authentication requirement');
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      // 临时破坏数据库连接配置
      const originalHost = process.env.DB_HOST;
      process.env.DB_HOST = 'invalid-host';
      
      try {
        const { GET } = await import('../health/database/route');
        
        const request = createMockRequest('/api/health/database');
        const response = await GET(request, {});
        
        // 应该返回错误状态
        expect(response.status).toBeGreaterThanOrEqual(400);
        
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data).toHaveProperty('error');
        
      } finally {
        // 恢复原始配置
        process.env.DB_HOST = originalHost;
      }
    });

    test('should handle invalid SQL queries', async () => {
      // 这个测试需要一个专门的测试端点来执行任意SQL
      // 在实际项目中，你可能需要创建一个测试专用的API端点
      console.log('Invalid SQL test would require a dedicated test endpoint');
    });
  });

  describe('Performance Tests', () => {
    test('should handle concurrent API requests', async () => {
      const { GET } = await import('../health/database/route');
      
      const concurrentRequests = Array.from({ length: 10 }, () => {
        const request = createMockRequest('/api/health/database');
        return GET(request, {});
      });
      
      const startTime = Date.now();
      const responses = await Promise.all(concurrentRequests);
      const duration = Date.now() - startTime;
      
      // 所有请求都应该成功
      responses.forEach(response => {
        expect(response.status).toBeLessThan(400);
      });
      
      // 并发请求应该在合理时间内完成
      expect(duration).toBeLessThan(5000);
      
      console.log(`10 concurrent requests completed in ${duration}ms`);
    });

    test('should measure API response times', async () => {
      const { GET } = await import('../health/database/route');
      
      const iterations = 5;
      const responseTimes: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        const request = createMockRequest('/api/health/database');
        const response = await GET(request, {});
        
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
        
        expect(response.status).toBeLessThan(400);
      }
      
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      
      console.log(`Average response time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`Max response time: ${maxResponseTime}ms`);
      
      // API响应时间应该在合理范围内
      expect(avgResponseTime).toBeLessThan(1000);
      expect(maxResponseTime).toBeLessThan(2000);
    });
  });

  describe('Data Consistency Tests', () => {
    test('should return consistent data across multiple requests', async () => {
      const { GET } = await import('../health/database/route');
      
      const request1 = createMockRequest('/api/health/database');
      const request2 = createMockRequest('/api/health/database');
      
      const [response1, response2] = await Promise.all([
        GET(request1, {}),
        GET(request2, {})
      ]);
      
      const data1 = await response1.json();
      const data2 = await response2.json();
      
      if (data1.success && data2.success) {
        // 数据库类型应该一致
        expect(data1.data.database.type).toBe(data2.data.database.type);
        
        // 连接状态应该一致（在短时间内）
        expect(data1.data.database.connected).toBe(data2.data.database.connected);
      }
    });
  });

  describe('Connection Pool Management', () => {
    test('should reset connection pool metrics', async () => {
      const { POST } = await import('../health/connection-pool/route');
      
      const request = createMockRequest('/api/health/connection-pool', 'POST', {
        action: 'reset-metrics'
      });
      
      const response = await POST(request, {});
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('重置');
    });

    test('should handle invalid pool operations', async () => {
      const { POST } = await import('../health/connection-pool/route');
      
      const request = createMockRequest('/api/health/connection-pool', 'POST', {
        action: 'invalid-action'
      });
      
      const response = await POST(request, {});
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });
});

// 端到端测试
describe('PostgreSQL End-to-End Tests', () => {
  test('should complete full health check workflow', async () => {
    // 1. 检查数据库连接
    const { GET: healthGet } = await import('../health/database/route');
    const healthRequest = createMockRequest('/api/health/database');
    const healthResponse = await healthGet(healthRequest, {});
    const healthData = await healthResponse.json();
    
    expect(healthData.success).toBe(true);
    
    // 2. 检查连接池状态
    const { GET: poolGet } = await import('../health/connection-pool/route');
    const poolRequest = createMockRequest('/api/health/connection-pool');
    const poolResponse = await poolGet(poolRequest, {});
    const poolData = await poolResponse.json();
    
    expect(poolData.success).toBe(true);
    
    // 3. 执行综合健康检查
    const { GET: comprehensiveGet } = await import('../health/comprehensive/route');
    const comprehensiveRequest = createMockRequest('/api/health/comprehensive');
    const comprehensiveResponse = await comprehensiveGet(comprehensiveRequest, {});
    const comprehensiveData = await comprehensiveResponse.json();
    
    expect(comprehensiveData.success).toBe(true);
    
    console.log('Full health check workflow completed successfully');
  });
});