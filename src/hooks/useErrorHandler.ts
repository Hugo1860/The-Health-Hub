'use client';

import { useCallback, useState } from 'react';

export interface ErrorInfo {
  message: string;
  code?: string;
  details?: any;
  timestamp?: string;
}

export interface UseErrorHandlerReturn {
  error: ErrorInfo | null;
  isError: boolean;
  handleError: (error: Error | ErrorInfo | string) => void;
  clearError: () => void;
  retryAction: (action: () => Promise<void> | void) => Promise<void>;
}

export const useErrorHandler = (showToast?: (message: string, type: 'error' | 'success' | 'warning' | 'info') => void): UseErrorHandlerReturn => {
  const [error, setError] = useState<ErrorInfo | null>(null);

  const handleError = useCallback((errorInput: Error | ErrorInfo | string) => {
    let errorInfo: ErrorInfo;

    if (typeof errorInput === 'string') {
      errorInfo = {
        message: errorInput,
        timestamp: new Date().toISOString(),
      };
    } else if (errorInput instanceof Error) {
      errorInfo = {
        message: errorInput.message,
        details: errorInput.stack,
        timestamp: new Date().toISOString(),
      };
    } else {
      errorInfo = {
        ...errorInput,
        timestamp: errorInput.timestamp || new Date().toISOString(),
      };
    }

    setError(errorInfo);

    // 显示用户友好的错误提示
    const userMessage = getUserFriendlyMessage(errorInfo);
    if (showToast) {
      showToast(userMessage, 'error');
    }

    // 记录错误到日志服务
    logError(errorInfo);
  }, [showToast]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const retryAction = useCallback(async (action: () => Promise<void> | void) => {
    try {
      clearError();
      await action();
    } catch (error) {
      handleError(error as Error);
    }
  }, [handleError, clearError]);

  return {
    error,
    isError: error !== null,
    handleError,
    clearError,
    retryAction,
  };
};

// 将技术错误转换为用户友好的消息
const getUserFriendlyMessage = (error: ErrorInfo): string => {
  const { message, code } = error;

  // 网络错误
  if (message.includes('fetch') || message.includes('network') || code === 'NETWORK_ERROR') {
    return '网络连接出现问题，请检查您的网络连接后重试';
  }

  // 认证错误
  if (code === 'UNAUTHORIZED' || message.includes('unauthorized')) {
    return '您的登录已过期，请重新登录';
  }

  // 权限错误
  if (code === 'FORBIDDEN' || message.includes('forbidden')) {
    return '您没有权限执行此操作';
  }

  // 文件上传错误
  if (message.includes('upload') || code === 'UPLOAD_ERROR') {
    return '文件上传失败，请检查文件格式和大小后重试';
  }

  // 音频播放错误
  if (message.includes('audio') || code === 'AUDIO_ERROR') {
    return '音频播放出现问题，请稍后重试';
  }

  // 数据加载错误
  if (message.includes('load') || code === 'LOAD_ERROR') {
    return '数据加载失败，请刷新页面重试';
  }

  // 服务器错误
  if (code === 'SERVER_ERROR' || message.includes('500')) {
    return '服务器暂时出现问题，请稍后重试';
  }

  // 默认错误消息
  return '操作失败，请稍后重试';
};

// 记录错误到日志服务
const logError = async (error: ErrorInfo) => {
  try {
    await fetch('/api/errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...error,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (logError) {
    console.error('Failed to log error:', logError);
  }
};

// API 请求错误处理工具
export const handleApiError = (response: Response): never => {
  const error: ErrorInfo = {
    message: `API request failed: ${response.status} ${response.statusText}`,
    code: getErrorCodeFromStatus(response.status),
    details: {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
    },
  };

  throw error;
};

// 根据 HTTP 状态码获取错误代码
const getErrorCodeFromStatus = (status: number): string => {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 500:
      return 'SERVER_ERROR';
    case 502:
    case 503:
    case 504:
      return 'SERVICE_UNAVAILABLE';
    default:
      return 'UNKNOWN_ERROR';
  }
};