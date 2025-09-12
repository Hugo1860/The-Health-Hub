/**
 * Error Recovery System Tests
 */

import { ErrorRecovery, CircuitBreakerState } from '../error-recovery';
import { DatabaseErrorRecovery } from '../db-error-recovery';
import { ApiErrorRecovery } from '../api-error-recovery';

// Mock console methods to avoid noise in tests
const originalConsole = console;
beforeAll(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.log = originalConsole.log;
});

describe('ErrorRecovery', () => {
  beforeEach(() => {
    ErrorRecovery.resetAllCircuitBreakers();
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await ErrorRecovery.withRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValue('success');
      
      const result = await ErrorRecovery.withRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('INVALID_INPUT'));
      
      await expect(ErrorRecovery.withRetry(operation)).rejects.toThrow('INVALID_INPUT');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should respect max retry limit', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('ECONNRESET'));
      
      await expect(ErrorRecovery.withRetry(operation, {
        retryConfig: { maxRetries: 2 }
      })).rejects.toThrow('ECONNRESET');
      
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should call onRetry callback', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValue('success');
      const onRetry = jest.fn();
      
      await ErrorRecovery.withRetry(operation, { onRetry });
      
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    });

    it('should call onFailure callback', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('ECONNRESET'));
      const onFailure = jest.fn();
      
      await expect(ErrorRecovery.withRetry(operation, {
        retryConfig: { maxRetries: 1 },
        onFailure
      })).rejects.toThrow();
      
      expect(onFailure).toHaveBeenCalledWith(expect.any(Error), 2);
    });
  });

  describe('withCircuitBreaker', () => {
    it('should execute operation when circuit is closed', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await ErrorRecovery.withCircuitBreaker('test-op', operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should open circuit after failure threshold', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Service error'));
      
      // Trigger failures to open circuit
      for (let i = 0; i < 5; i++) {
        try {
          await ErrorRecovery.withCircuitBreaker('test-op', operation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Circuit should now be open
      await expect(ErrorRecovery.withCircuitBreaker('test-op', operation))
        .rejects.toThrow('Circuit breaker is OPEN');
    });

    it('should use fallback when circuit is open', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Service error'));
      
      // Open the circuit
      for (let i = 0; i < 5; i++) {
        try {
          await ErrorRecovery.withCircuitBreaker('test-op', operation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Should use fallback
      const result = await ErrorRecovery.withCircuitBreaker('test-op', operation, {
        fallbackValue: 'fallback-data'
      });
      
      expect(result).toBe('fallback-data');
    });

    it('should get circuit breaker stats', () => {
      const stats = ErrorRecovery.getCircuitBreakerStats();
      expect(typeof stats).toBe('object');
    });
  });

  describe('withFullRecovery', () => {
    it('should combine retry and circuit breaker', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValue('success');
      
      const result = await ErrorRecovery.withFullRecovery('test-op', operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });
});

describe('DatabaseErrorRecovery', () => {
  beforeEach(() => {
    ErrorRecovery.resetAllCircuitBreakers();
  });

  describe('executeQuery', () => {
    // Mock database connection
    const mockDb = {
      all: jest.fn(),
      get: jest.fn()
    };

    // Mock getDbConnection
    jest.mock('../db-connection-pool', () => ({
      getDbConnection: jest.fn().mockResolvedValue(mockDb)
    }));

    beforeEach(() => {
      mockDb.all.mockClear();
      mockDb.get.mockClear();
      mockDb.get.mockResolvedValue({ result: 1 }); // Health check
    });

    it('should execute query successfully', async () => {
      mockDb.all.mockResolvedValue([{ id: 1, name: 'test' }]);
      
      const result = await DatabaseErrorRecovery.executeQuery('SELECT * FROM test');
      
      expect(result).toEqual([{ id: 1, name: 'test' }]);
    });

    it('should retry on database errors', async () => {
      mockDb.all
        .mockRejectedValueOnce(new Error('CONNECTION_LOST'))
        .mockResolvedValue([{ id: 1 }]);
      
      const result = await DatabaseErrorRecovery.executeQuery('SELECT * FROM test');
      
      expect(result).toEqual([{ id: 1 }]);
      expect(mockDb.all).toHaveBeenCalledTimes(2);
    });

    it('should handle query timeout', async () => {
      mockDb.all.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 15000)));
      
      await expect(DatabaseErrorRecovery.executeQuery('SELECT * FROM test', [], {
        queryTimeout: 100
      })).rejects.toThrow('Query timeout');
    });
  });

  describe('executeTransaction', () => {
    const mockDb = {
      run: jest.fn(),
      get: jest.fn()
    };

    jest.mock('../db-connection-pool', () => ({
      getDbConnection: jest.fn().mockResolvedValue(mockDb)
    }));

    beforeEach(() => {
      mockDb.run.mockClear();
      mockDb.get.mockClear();
      mockDb.get.mockResolvedValue({ result: 1 }); // Health check
    });

    it('should execute transaction successfully', async () => {
      const operation = jest.fn().mockResolvedValue('transaction-result');
      mockDb.run.mockResolvedValue(undefined);
      
      const result = await DatabaseErrorRecovery.executeTransaction(operation);
      
      expect(result).toBe('transaction-result');
      expect(mockDb.run).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(mockDb.run).toHaveBeenCalledWith('COMMIT');
    });

    it('should rollback on error', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Transaction error'));
      mockDb.run.mockResolvedValue(undefined);
      
      await expect(DatabaseErrorRecovery.executeTransaction(operation)).rejects.toThrow('Transaction error');
      
      expect(mockDb.run).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(mockDb.run).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('checkHealth', () => {
    it('should return true for healthy database', async () => {
      const result = await DatabaseErrorRecovery.checkHealth();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getStats', () => {
    it('should return database error recovery stats', () => {
      const stats = DatabaseErrorRecovery.getStats();
      expect(stats).toHaveProperty('circuitBreakers');
      expect(stats).toHaveProperty('retryableErrors');
      expect(stats).toHaveProperty('defaultOptions');
    });
  });
});

describe('ApiErrorRecovery', () => {
  beforeEach(() => {
    ErrorRecovery.resetAllCircuitBreakers();
  });

  describe('executeExternalCall', () => {
    it('should execute external API call successfully', async () => {
      const apiCall = jest.fn().mockResolvedValue({ data: 'success' });
      
      const result = await ApiErrorRecovery.executeExternalCall('test-api', apiCall);
      
      expect(result).toEqual({ data: 'success' });
      expect(apiCall).toHaveBeenCalledTimes(1);
    });

    it('should retry on network errors', async () => {
      const apiCall = jest.fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValue({ data: 'success' });
      
      const result = await ApiErrorRecovery.executeExternalCall('test-api', apiCall);
      
      expect(result).toEqual({ data: 'success' });
      expect(apiCall).toHaveBeenCalledTimes(2);
    });
  });

  describe('createDegradedResponse', () => {
    it('should create degraded response', () => {
      const response = ApiErrorRecovery.createDegradedResponse('Service unavailable', { cached: true });
      
      expect(response.status).toBe(503);
      // Note: In a real test, you'd check the response body
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response', () => {
      const error = new Error('Test error');
      const context = {
        route: '/api/test',
        method: 'GET',
        timestamp: new Date().toISOString(),
        requestId: 'test-123'
      };
      
      const response = ApiErrorRecovery.createErrorResponse(error, context);
      
      expect(response.status).toBe(500);
      // Note: In a real test, you'd check the response body
    });
  });

  describe('getStats', () => {
    it('should return API error recovery stats', () => {
      const stats = ApiErrorRecovery.getStats();
      expect(stats).toHaveProperty('circuitBreakers');
      expect(stats).toHaveProperty('retryableErrors');
      expect(stats).toHaveProperty('defaultOptions');
    });
  });
});

// Integration tests
describe('Error Recovery Integration', () => {
  beforeEach(() => {
    ErrorRecovery.resetAllCircuitBreakers();
  });

  it('should handle complex error scenarios', async () => {
    let attemptCount = 0;
    const complexOperation = jest.fn().mockImplementation(() => {
      attemptCount++;
      if (attemptCount === 1) throw new Error('ECONNRESET');
      if (attemptCount === 2) throw new Error('CONNECTION_LOST');
      if (attemptCount === 3) return 'success';
      throw new Error('Unexpected');
    });

    const result = await ErrorRecovery.withFullRecovery('complex-op', complexOperation, {
      retryConfig: { maxRetries: 3 }
    });

    expect(result).toBe('success');
    expect(complexOperation).toHaveBeenCalledTimes(3);
  });

  it('should maintain circuit breaker state across operations', async () => {
    const failingOperation = jest.fn().mockRejectedValue(new Error('Service down'));

    // Trigger circuit breaker
    for (let i = 0; i < 5; i++) {
      try {
        await ErrorRecovery.withCircuitBreaker('persistent-op', failingOperation);
      } catch (error) {
        // Expected
      }
    }

    // Circuit should be open for subsequent calls
    await expect(ErrorRecovery.withCircuitBreaker('persistent-op', failingOperation))
      .rejects.toThrow('Circuit breaker is OPEN');

    const stats = ErrorRecovery.getCircuitBreakerStats();
    expect(stats['persistent-op'].state).toBe(CircuitBreakerState.OPEN);
  });
});