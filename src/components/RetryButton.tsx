'use client';

import { useState } from 'react';

interface RetryButtonProps {
  onRetry: () => Promise<void> | void;
  maxRetries?: number;
  retryDelay?: number;
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
}

export default function RetryButton({
  onRetry,
  maxRetries = 3,
  retryDelay = 1000,
  className = '',
  children = '重试',
  disabled = false,
}: RetryButtonProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const handleRetry = async () => {
    if (isRetrying || disabled || retryCount >= maxRetries) {
      return;
    }

    setIsRetrying(true);
    setLastError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      await onRetry();
      setRetryCount(0); // 成功后重置计数
    } catch (error) {
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);
      setLastError(error instanceof Error ? error.message : '操作失败');
      
      if (newRetryCount >= maxRetries) {
        console.error(`重试失败，已达到最大重试次数 (${maxRetries}):`, error);
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const canRetry = retryCount < maxRetries && !disabled;
  const hasReachedMaxRetries = retryCount >= maxRetries;

  return (
    <div className="flex flex-col items-center space-y-2">
      <button
        onClick={handleRetry}
        disabled={isRetrying || !canRetry}
        className={`
          px-4 py-2 rounded-lg font-medium transition-all duration-200
          ${canRetry && !isRetrying
            ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }
          ${isRetrying ? 'animate-pulse' : ''}
          ${className}
        `}
      >
        {isRetrying ? (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>重试中...</span>
          </div>
        ) : (
          children
        )}
      </button>

      {retryCount > 0 && (
        <div className="text-center">
          <p className="text-sm text-gray-600">
            已重试 {retryCount}/{maxRetries} 次
          </p>
          {lastError && (
            <p className="text-xs text-red-600 mt-1">
              {lastError}
            </p>
          )}
        </div>
      )}

      {hasReachedMaxRetries && (
        <div className="text-center">
          <p className="text-sm text-red-600">
            已达到最大重试次数，请稍后再试或联系技术支持
          </p>
        </div>
      )}
    </div>
  );
}