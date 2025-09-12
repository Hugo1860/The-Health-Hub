'use client';

import { logApiCall, logError } from './errorLogger';

export interface ApiMonitorConfig {
  logRequests?: boolean;
  logResponses?: boolean;
  logErrors?: boolean;
  logPerformance?: boolean;
  maxBodySize?: number;
  excludeUrls?: string[];
  includeHeaders?: boolean;
}

const DEFAULT_CONFIG: ApiMonitorConfig = {
  logRequests: true,
  logResponses: true,
  logErrors: true,
  logPerformance: true,
  maxBodySize: 1024, // 1KB
  excludeUrls: ['/api/logging', '/api/health'],
  includeHeaders: false
};

class ApiMonitor {
  private config: ApiMonitorConfig;
  private originalFetch: typeof fetch;

  constructor(config: Partial<ApiMonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.originalFetch = fetch;
    this.setupFetchInterceptor();
  }

  private setupFetchInterceptor(): void {
    if (typeof window === 'undefined') return;

    // 拦截 fetch 请求
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      
      // 检查是否需要排除此 URL
      if (this.shouldExcludeUrl(url)) {
        return this.originalFetch(input, init);
      }

      const startTime = performance.now();
      const method = init?.method || 'GET';
      let requestData: any;
      let responseData: any;
      let error: Error | undefined;

      try {
        // 记录请求数据
        if (this.config.logRequests && init?.body) {
          requestData = await this.safeParseBody(init.body);
        }

        // 执行原始请求
        const response = await this.originalFetch(input, init);
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);

        // 记录响应数据
        if (this.config.logResponses && response.ok) {
          try {
            const clonedResponse = response.clone();
            const text = await clonedResponse.text();
            responseData = this.safeParseJson(text);
          } catch (e) {
            // 忽略解析错误
          }
        }

        // 记录 API 调用
        logApiCall({
          url,
          method,
          status: response.status,
          duration,
          requestData: this.truncateData(requestData),
          responseData: this.truncateData(responseData)
        });

        return response;
      } catch (err) {
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        error = err instanceof Error ? err : new Error(String(err));

        // 记录错误的 API 调用
        logApiCall({
          url,
          method,
          status: 0,
          duration,
          error,
          requestData: this.truncateData(requestData)
        });

        throw err;
      }
    };
  }

  private shouldExcludeUrl(url: string): boolean {
    return this.config.excludeUrls?.some(excludeUrl => url.includes(excludeUrl)) || false;
  }

  private async safeParseBody(body: BodyInit): Promise<any> {
    try {
      if (typeof body === 'string') {
        return this.safeParseJson(body);
      } else if (body instanceof FormData) {
        const formObject: Record<string, any> = {};
        body.forEach((value, key) => {
          formObject[key] = value instanceof File ? `[File: ${value.name}]` : value;
        });
        return formObject;
      } else if (body instanceof URLSearchParams) {
        return Object.fromEntries(body.entries());
      }
      return '[Binary Data]';
    } catch (e) {
      return '[Parse Error]';
    }
  }

  private safeParseJson(text: string): any {
    try {
      return JSON.parse(text);
    } catch (e) {
      return text.length > 100 ? text.substring(0, 100) + '...' : text;
    }
  }

  private truncateData(data: any): any {
    if (!data || !this.config.maxBodySize) return data;

    const jsonString = JSON.stringify(data);
    if (jsonString.length > this.config.maxBodySize) {
      return JSON.parse(jsonString.substring(0, this.config.maxBodySize)) || '[Truncated]';
    }
    return data;
  }

  public updateConfig(newConfig: Partial<ApiMonitorConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): ApiMonitorConfig {
    return { ...this.config };
  }

  public disable(): void {
    if (typeof window !== 'undefined') {
      window.fetch = this.originalFetch;
    }
  }
}

// 创建全局实例
export const apiMonitor = new ApiMonitor();

// 便捷函数用于手动记录 API 调用
export const trackApiCall = async <T>(
  apiCall: () => Promise<T>,
  context: {
    name: string;
    method?: string;
    url?: string;
  }
): Promise<T> => {
  const startTime = performance.now();
  
  try {
    const result = await apiCall();
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);

    logApiCall({
      url: context.url || context.name,
      method: context.method || 'UNKNOWN',
      status: 200,
      duration,
      responseData: result
    });

    return result;
  } catch (error) {
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);

    logApiCall({
      url: context.url || context.name,
      method: context.method || 'UNKNOWN',
      status: 500,
      duration,
      error: error instanceof Error ? error : new Error(String(error))
    });

    throw error;
  }
};

// React Hook for API monitoring
export const useApiMonitor = () => {
  return {
    trackApiCall,
    updateConfig: (config: Partial<ApiMonitorConfig>) => apiMonitor.updateConfig(config),
    getConfig: () => apiMonitor.getConfig(),
    disable: () => apiMonitor.disable()
  };
};