/**
 * Error Recovery and Retry Mechanisms
 * Implements automatic retry logic, circuit breaker pattern, and graceful degradation
 */

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringWindow: number;
}

interface ErrorRecoveryOptions {
  retryConfig?: Partial<RetryConfig>;
  circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
  fallbackValue?: any;
  onRetry?: (attempt: number, error: Error) => void;
  onFailure?: (error: Error, attempts: number) => void;
}

enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeout) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN - operation not allowed');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= 3) { // Require 3 successes to close
        this.state = CircuitBreakerState.CLOSED;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      successCount: this.successCount
    };
  }
}

class ErrorRecovery {
  private static circuitBreakers = new Map<string, CircuitBreaker>();

  private static defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryableErrors: [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      // PostgreSQL specific retryable errors
      'ECONNRESET',
      'ECONNREFUSED',
      'CONNECTION_LOST',
      'PROTOCOL_CONNECTION_LOST'
    ]
  };

  private static defaultCircuitBreakerConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    resetTimeout: 60000, // 1 minute
    monitoringWindow: 300000 // 5 minutes
  };

  /**
   * Execute operation with retry logic and circuit breaker protection
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: ErrorRecoveryOptions = {}
  ): Promise<T> {
    const retryConfig = { ...this.defaultRetryConfig, ...options.retryConfig };
    let lastError: Error;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Check if error is retryable
        if (!this.isRetryableError(lastError, retryConfig.retryableErrors)) {
          throw lastError;
        }

        // Don't retry on last attempt
        if (attempt === retryConfig.maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt),
          retryConfig.maxDelay
        );

        // Add jitter to prevent thundering herd
        const jitteredDelay = delay + Math.random() * 1000;

        console.warn(`Operation failed (attempt ${attempt + 1}/${retryConfig.maxRetries + 1}), retrying in ${jitteredDelay}ms:`, lastError.message);
        
        if (options.onRetry) {
          options.onRetry(attempt + 1, lastError);
        }

        await this.sleep(jitteredDelay);
      }
    }

    if (options.onFailure) {
      options.onFailure(lastError!, retryConfig.maxRetries + 1);
    }

    throw lastError!;
  }

  /**
   * Execute operation with circuit breaker protection
   */
  static async withCircuitBreaker<T>(
    operationName: string,
    operation: () => Promise<T>,
    options: ErrorRecoveryOptions = {}
  ): Promise<T> {
    const circuitBreakerConfig = { 
      ...this.defaultCircuitBreakerConfig, 
      ...options.circuitBreakerConfig 
    };

    if (!this.circuitBreakers.has(operationName)) {
      this.circuitBreakers.set(operationName, new CircuitBreaker(circuitBreakerConfig));
    }

    const circuitBreaker = this.circuitBreakers.get(operationName)!;
    
    try {
      return await circuitBreaker.execute(operation);
    } catch (error) {
      // If circuit breaker is open and we have a fallback, use it
      if (error.message.includes('Circuit breaker is OPEN') && options.fallbackValue !== undefined) {
        console.warn(`Circuit breaker is OPEN for ${operationName}, using fallback value`);
        return options.fallbackValue;
      }
      throw error;
    }
  }

  /**
   * Execute operation with both retry and circuit breaker protection
   */
  static async withFullRecovery<T>(
    operationName: string,
    operation: () => Promise<T>,
    options: ErrorRecoveryOptions = {}
  ): Promise<T> {
    return this.withCircuitBreaker(
      operationName,
      () => this.withRetry(operation, options),
      options
    );
  }

  /**
   * Get circuit breaker statistics for monitoring
   */
  static getCircuitBreakerStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [name, breaker] of this.circuitBreakers.entries()) {
      stats[name] = breaker.getStats();
    }
    
    return stats;
  }

  /**
   * Reset circuit breaker for a specific operation
   */
  static resetCircuitBreaker(operationName: string): void {
    this.circuitBreakers.delete(operationName);
  }

  /**
   * Reset all circuit breakers
   */
  static resetAllCircuitBreakers(): void {
    this.circuitBreakers.clear();
  }

  private static isRetryableError(error: Error, retryableErrors: string[]): boolean {
    const errorMessage = error.message.toLowerCase();
    const errorCode = (error as any).code;
    
    return retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError.toLowerCase()) ||
      errorCode === retryableError
    );
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export { ErrorRecovery, CircuitBreakerState };
export type { RetryConfig, CircuitBreakerConfig, ErrorRecoveryOptions };