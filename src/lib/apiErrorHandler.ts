// API 错误处理工具库

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
  retryable?: boolean;
  retryAfter?: number; // 建议重试间隔（毫秒）
  errorCode?: string; // 错误代码
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean; // 添加随机抖动
  retryCondition?: (error: any, attempt: number) => boolean;
}

export interface ErrorState {
  hasError: boolean;
  message: string;
  type: 'network' | 'api' | 'auth' | 'validation' | 'rate_limit' | 'server' | 'unknown';
  retryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  errorCode?: string;
  retryAfter?: number;
  context?: Record<string, any>;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  jitter: true
};

// 网络状态检测
export function isOnline(): boolean {
  if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
    return navigator.onLine;
  }
  return true; // 服务器端默认为在线
}

// 延迟函数
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 计算重试延迟（指数退避 + 抖动）
function calculateDelay(attempt: number, config: RetryConfig): number {
  let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
  delay = Math.min(delay, config.maxDelay);
  
  // 添加抖动以避免惊群效应
  if (config.jitter) {
    delay = delay * (0.5 + Math.random() * 0.5);
  }
  
  return Math.round(delay);
}

// 错误分类和严重程度映射
const ERROR_CLASSIFICATION = {
  // 网络相关错误
  NETWORK_ERROR: { type: 'network' as const, severity: 'high' as const, retryable: true },
  TIMEOUT_ERROR: { type: 'network' as const, severity: 'medium' as const, retryable: true },
  CONNECTION_ERROR: { type: 'network' as const, severity: 'high' as const, retryable: true },
  
  // 认证相关错误
  UNAUTHORIZED: { type: 'auth' as const, severity: 'medium' as const, retryable: false },
  FORBIDDEN: { type: 'auth' as const, severity: 'medium' as const, retryable: false },
  TOKEN_EXPIRED: { type: 'auth' as const, severity: 'low' as const, retryable: false },
  
  // 客户端错误
  BAD_REQUEST: { type: 'validation' as const, severity: 'low' as const, retryable: false },
  NOT_FOUND: { type: 'api' as const, severity: 'low' as const, retryable: false },
  VALIDATION_ERROR: { type: 'validation' as const, severity: 'low' as const, retryable: false },
  
  // 服务器错误
  INTERNAL_ERROR: { type: 'server' as const, severity: 'critical' as const, retryable: true },
  BAD_GATEWAY: { type: 'server' as const, severity: 'high' as const, retryable: true },
  SERVICE_UNAVAILABLE: { type: 'server' as const, severity: 'high' as const, retryable: true },
  GATEWAY_TIMEOUT: { type: 'server' as const, severity: 'high' as const, retryable: true },
  
  // 限流错误
  RATE_LIMITED: { type: 'rate_limit' as const, severity: 'medium' as const, retryable: true },
  
  // 未知错误
  UNKNOWN: { type: 'unknown' as const, severity: 'medium' as const, retryable: false }
};

// 根据错误信息分类错误
function classifyError(error: any): typeof ERROR_CLASSIFICATION[keyof typeof ERROR_CLASSIFICATION] & { errorCode?: string; retryAfter?: number } {
  // 网络错误
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return { ...ERROR_CLASSIFICATION.NETWORK_ERROR, errorCode: 'FETCH_ERROR' };
  }
  
  if (error.name === 'AbortError') {
    return { ...ERROR_CLASSIFICATION.TIMEOUT_ERROR, errorCode: 'REQUEST_ABORTED' };
  }
  
  // HTTP 状态码错误
  if (error.status) {
    const retryAfter = error.headers?.get?.('Retry-After');
    const retryAfterMs = retryAfter ? parseInt(retryAfter) * 1000 : undefined;
    
    switch (error.status) {
      case 400:
        return { ...ERROR_CLASSIFICATION.BAD_REQUEST, errorCode: 'BAD_REQUEST' };
      case 401:
        return { ...ERROR_CLASSIFICATION.UNAUTHORIZED, errorCode: 'UNAUTHORIZED' };
      case 403:
        return { ...ERROR_CLASSIFICATION.FORBIDDEN, errorCode: 'FORBIDDEN' };
      case 404:
        return { ...ERROR_CLASSIFICATION.NOT_FOUND, errorCode: 'NOT_FOUND' };
      case 408:
        return { ...ERROR_CLASSIFICATION.TIMEOUT_ERROR, errorCode: 'REQUEST_TIMEOUT' };
      case 422:
        return { ...ERROR_CLASSIFICATION.VALIDATION_ERROR, errorCode: 'VALIDATION_ERROR' };
      case 429:
        return { ...ERROR_CLASSIFICATION.RATE_LIMITED, errorCode: 'RATE_LIMITED', retryAfter: retryAfterMs };
      case 500:
        return { ...ERROR_CLASSIFICATION.INTERNAL_ERROR, errorCode: 'INTERNAL_ERROR' };
      case 502:
        return { ...ERROR_CLASSIFICATION.BAD_GATEWAY, errorCode: 'BAD_GATEWAY' };
      case 503:
        return { ...ERROR_CLASSIFICATION.SERVICE_UNAVAILABLE, errorCode: 'SERVICE_UNAVAILABLE', retryAfter: retryAfterMs };
      case 504:
        return { ...ERROR_CLASSIFICATION.GATEWAY_TIMEOUT, errorCode: 'GATEWAY_TIMEOUT' };
      default:
        if (error.status >= 500) {
          return { ...ERROR_CLASSIFICATION.INTERNAL_ERROR, errorCode: `HTTP_${error.status}` };
        }
        return { ...ERROR_CLASSIFICATION.UNKNOWN, errorCode: `HTTP_${error.status}` };
    }
  }
  
  return ERROR_CLASSIFICATION.UNKNOWN;
}

// 判断错误是否可重试
function isRetryableError(error: any, attempt: number = 1): boolean {
  const classification = classifyError(error);
  
  // 基本的可重试性检查
  if (!classification.retryable) {
    return false;
  }
  
  // 对于某些错误类型，限制重试次数
  if (classification.type === 'rate_limit' && attempt > 2) {
    return false;
  }
  
  if (classification.severity === 'critical' && attempt > 5) {
    return false;
  }
  
  return true;
}

// 错误消息映射
const ERROR_MESSAGES = {
  // 网络错误
  NETWORK_ERROR: '网络连接失败，请检查网络设置',
  TIMEOUT_ERROR: '请求超时，请稍后重试',
  CONNECTION_ERROR: '连接服务器失败',
  FETCH_ERROR: '网络请求失败',
  REQUEST_ABORTED: '请求被取消',
  
  // 认证错误
  UNAUTHORIZED: '登录已过期，请重新登录',
  FORBIDDEN: '没有权限访问此资源',
  TOKEN_EXPIRED: '登录凭证已过期',
  
  // 客户端错误
  BAD_REQUEST: '请求参数错误',
  NOT_FOUND: '请求的资源不存在',
  VALIDATION_ERROR: '数据验证失败',
  
  // 服务器错误
  INTERNAL_ERROR: '服务器内部错误，请稍后重试',
  BAD_GATEWAY: '网关错误，请稍后重试',
  SERVICE_UNAVAILABLE: '服务暂时不可用，请稍后重试',
  GATEWAY_TIMEOUT: '网关超时，请稍后重试',
  
  // 限流错误
  RATE_LIMITED: '请求过于频繁，请稍后重试',
  
  // 默认错误
  UNKNOWN: '发生未知错误'
};

// 创建错误状态对象
export function createErrorState(error: any, context?: string): ErrorState {
  if (!isOnline()) {
    return {
      hasError: true,
      message: '网络连接已断开，请检查网络设置',
      type: 'network',
      severity: 'high',
      retryable: true,
      errorCode: 'OFFLINE'
    };
  }

  const classification = classifyError(error);
  const errorCode = classification.errorCode || 'UNKNOWN';
  const baseMessage = ERROR_MESSAGES[errorCode as keyof typeof ERROR_MESSAGES] || 
                     error.message || 
                     ERROR_MESSAGES.UNKNOWN;

  let message = baseMessage;
  if (context) {
    message = `${context}: ${message}`;
  }

  return {
    hasError: true,
    message,
    type: classification.type,
    severity: classification.severity,
    retryable: classification.retryable,
    errorCode,
    retryAfter: classification.retryAfter,
    context: { originalError: error.message, status: error.status }
  };
}

// 带重试的 fetch 函数
export async function fetchWithRetry<T>(
  url: string,
  options: RequestInit = {},
  retryConfig: Partial<RetryConfig> = {}
): Promise<ApiResponse<T>> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  let lastError: any;
  let lastErrorState: ErrorState;

  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    try {
      // 添加超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.error || `HTTP ${response.status}`);
        (error as any).status = response.status;
        (error as any).headers = response.headers;
        throw error;
      }

      const data = await response.json();
      return {
        data,
        success: true
      };
    } catch (error) {
      lastError = error;
      lastErrorState = createErrorState(error, `API请求失败 (尝试 ${attempt}/${config.maxRetries + 1})`);
      
      console.error(`API request failed (attempt ${attempt}/${config.maxRetries + 1}):`, {
        url,
        error: lastErrorState,
        attempt
      });

      // 检查自定义重试条件
      const shouldRetry = config.retryCondition ? 
        config.retryCondition(error, attempt) : 
        isRetryableError(error, attempt);

      // 如果是最后一次尝试或错误不可重试，直接返回错误
      if (attempt > config.maxRetries || !shouldRetry) {
        break;
      }

      // 计算延迟时间，考虑服务器建议的重试时间
      let delayMs = calculateDelay(attempt, config);
      if (lastErrorState.retryAfter) {
        delayMs = Math.max(delayMs, lastErrorState.retryAfter);
      }

      console.log(`Retrying in ${delayMs}ms...`);
      await delay(delayMs);
    }
  }

  // 所有重试都失败了
  return {
    success: false,
    error: lastErrorState!.message,
    retryable: lastErrorState!.retryable,
    errorCode: lastErrorState!.errorCode,
    retryAfter: lastErrorState!.retryAfter
  };
}

// 并行请求处理
export async function fetchMultiple<T extends Record<string, any>>(
  requests: Record<keyof T, { url: string; options?: RequestInit; retryConfig?: Partial<RetryConfig> }>
): Promise<{ [K in keyof T]: ApiResponse<T[K]> }> {
  const promises = Object.entries(requests).map(async ([key, config]) => {
    const result = await fetchWithRetry(
      config.url,
      config.options,
      config.retryConfig
    );
    return [key, result];
  });

  const results = await Promise.all(promises);
  return Object.fromEntries(results) as { [K in keyof T]: ApiResponse<T[K]> };
}

// 错误日志记录
export function logError(error: ErrorState, context?: Record<string, any>) {
  const logData = {
    timestamp: new Date().toISOString(),
    error: error.message,
    type: error.type,
    retryable: error.retryable,
    context,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
    url: typeof window !== 'undefined' ? window.location.href : 'server'
  };

  console.error('API Error:', logData);

  // 在生产环境中，这里可以发送到错误监控服务
  if (process.env.NODE_ENV === 'production') {
    // 发送到错误监控服务（如 Sentry、LogRocket 等）
    // sendToErrorService(logData);
  }
}

// 网络状态监听器
export class NetworkStatusMonitor {
  private listeners: Array<(isOnline: boolean) => void> = [];
  private isListening = false;

  addListener(callback: (isOnline: boolean) => void) {
    this.listeners.push(callback);
    this.startListening();
  }

  removeListener(callback: (isOnline: boolean) => void) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
    if (this.listeners.length === 0) {
      this.stopListening();
    }
  }

  private startListening() {
    if (this.isListening || typeof window === 'undefined') return;

    this.isListening = true;
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  private stopListening() {
    if (!this.isListening || typeof window === 'undefined') return;

    this.isListening = false;
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  private handleOnline = () => {
    this.listeners.forEach(callback => callback(true));
  };

  private handleOffline = () => {
    this.listeners.forEach(callback => callback(false));
  };
}

export const networkMonitor = new NetworkStatusMonitor();