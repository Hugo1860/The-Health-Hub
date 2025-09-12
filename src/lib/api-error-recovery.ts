/**
 * API Error Recovery Middleware
 * Provides error recovery and graceful degradation for API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { ErrorRecovery, type ErrorRecoveryOptions } from './error-recovery';

interface ApiErrorRecoveryOptions extends ErrorRecoveryOptions {
  operationName?: string;
  gracefulDegradation?: boolean;
  fallbackResponse?: any;
  logErrors?: boolean;
  includeErrorDetails?: boolean;
}

interface ApiErrorContext {
  route: string;
  method: string;
  timestamp: string;
  requestId: string;
  userAgent?: string;
  ip?: string;
}

class ApiErrorRecovery {
  private static readonly API_RETRYABLE_ERRORS = [
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',

    'CONNECTION_LOST',
    'PROTOCOL_CONNECTION_LOST',
    'FETCH_ERROR',
    'NETWORK_ERROR'
  ];

  private static readonly DEFAULT_OPTIONS: ApiErrorRecoveryOptions = {
    retryConfig: {
      maxRetries: 2, // Lower retries for API calls to avoid long response times
      baseDelay: 1000,
      maxDelay: 3000,
      backoffMultiplier: 1.5,
      retryableErrors: ApiErrorRecovery.API_RETRYABLE_ERRORS
    },
    circuitBreakerConfig: {
      failureThreshold: 10,
      resetTimeout: 60000, // 1 minute
      monitoringWindow: 300000 // 5 minutes
    },
    gracefulDegradation: true,
    logErrors: true,
    includeErrorDetails: process.env.NODE_ENV === 'development'
  };

  /**
   * Wrap API route handler with error recovery
   */
  static withRecovery(
    handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
    options: ApiErrorRecoveryOptions = {}
  ) {
    return async (req: NextRequest, context?: any): Promise<NextResponse> => {
      const mergedOptions = { ...this.DEFAULT_OPTIONS, ...options };
      const errorContext = this.createErrorContext(req);
      const operationName = mergedOptions.operationName || `api-${req.method}-${this.getRoutePattern(req.url)}`;

      try {
        return await ErrorRecovery.withFullRecovery(
          operationName,
          () => handler(req, context),
          {
            ...mergedOptions,
            onRetry: (attempt, error) => {
              if (mergedOptions.logErrors) {
                console.warn(`API retry attempt ${attempt}:`, {
                  ...errorContext,
                  error: error.message,
                  operationName
                });
              }
              
              if (mergedOptions.onRetry) {
                mergedOptions.onRetry(attempt, error);
              }
            },
            onFailure: (error, attempts) => {
              if (mergedOptions.logErrors) {
                console.error(`API operation failed after ${attempts} attempts:`, {
                  ...errorContext,
                  error: error.message,
                  stack: mergedOptions.includeErrorDetails ? error.stack : undefined,
                  operationName
                });
              }
              
              if (mergedOptions.onFailure) {
                mergedOptions.onFailure(error, attempts);
              }
            }
          }
        );
      } catch (error) {
        return this.handleFinalError(error as Error, errorContext, mergedOptions);
      }
    };
  }

  /**
   * Execute external API call with recovery
   */
  static async executeExternalCall<T>(
    operationName: string,
    apiCall: () => Promise<T>,
    options: ApiErrorRecoveryOptions = {}
  ): Promise<T> {
    const mergedOptions = { ...this.DEFAULT_OPTIONS, ...options };

    return ErrorRecovery.withFullRecovery(
      `external-${operationName}`,
      apiCall,
      {
        ...mergedOptions,
        onRetry: (attempt, error) => {
          if (mergedOptions.logErrors) {
            console.warn(`External API retry attempt ${attempt} for ${operationName}:`, error.message);
          }
          
          if (mergedOptions.onRetry) {
            mergedOptions.onRetry(attempt, error);
          }
        },
        onFailure: (error, attempts) => {
          if (mergedOptions.logErrors) {
            console.error(`External API call failed after ${attempts} attempts for ${operationName}:`, {
              error: error.message,
              stack: mergedOptions.includeErrorDetails ? error.stack : undefined
            });
          }
          
          if (mergedOptions.onFailure) {
            mergedOptions.onFailure(error, attempts);
          }
        }
      }
    );
  }

  /**
   * Create graceful degradation response
   */
  static createDegradedResponse(
    message: string = 'Service temporarily unavailable',
    fallbackData: any = null,
    status: number = 503
  ): NextResponse {
    return NextResponse.json({
      success: false,
      degraded: true,
      message,
      data: fallbackData,
      timestamp: new Date().toISOString()
    }, { status });
  }

  /**
   * Create error response with appropriate details
   */
  static createErrorResponse(
    error: Error,
    context: ApiErrorContext,
    includeDetails: boolean = false,
    status: number = 500
  ): NextResponse {
    const response: any = {
      success: false,
      error: {
        message: error.message,
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: context.timestamp,
        requestId: context.requestId
      }
    };

    if (includeDetails) {
      response.error.stack = error.stack;
      response.error.context = context;
    }

    return NextResponse.json(response, { status });
  }

  /**
   * Get API error recovery statistics
   */
  static getStats() {
    return {
      circuitBreakers: ErrorRecovery.getCircuitBreakerStats(),
      retryableErrors: this.API_RETRYABLE_ERRORS,
      defaultOptions: this.DEFAULT_OPTIONS
    };
  }

  /**
   * Reset API error recovery state
   */
  static reset(): void {
    ErrorRecovery.resetAllCircuitBreakers();
  }

  private static createErrorContext(req: NextRequest): ApiErrorContext {
    return {
      route: req.url,
      method: req.method,
      timestamp: new Date().toISOString(),
      requestId: this.generateRequestId(),
      userAgent: req.headers.get('user-agent') || undefined,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined
    };
  }

  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static getRoutePattern(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.replace(/\/api\//, '').replace(/\//g, '-') || 'root';
    } catch {
      return 'unknown';
    }
  }

  private static handleFinalError(
    error: Error,
    context: ApiErrorContext,
    options: ApiErrorRecoveryOptions
  ): NextResponse {
    // Check if we should use graceful degradation
    if (options.gracefulDegradation && options.fallbackResponse !== undefined) {
      if (options.logErrors) {
        console.warn('Using graceful degradation for API error:', {
          ...context,
          error: error.message
        });
      }
      
      return NextResponse.json({
        success: true,
        degraded: true,
        data: options.fallbackResponse,
        message: 'Using cached or fallback data due to service issues',
        timestamp: context.timestamp
      });
    }

    // Check if circuit breaker is open
    if (error.message.includes('Circuit breaker is OPEN')) {
      return this.createDegradedResponse(
        'Service temporarily unavailable due to high error rate',
        options.fallbackResponse
      );
    }

    // Return standard error response
    return this.createErrorResponse(
      error,
      context,
      options.includeErrorDetails
    );
  }
}

export { ApiErrorRecovery };
export type { ApiErrorRecoveryOptions, ApiErrorContext };