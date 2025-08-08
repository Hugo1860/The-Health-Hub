'use client';

import { ReactNode } from 'react';
import RetryButton from './RetryButton';

interface ErrorFallbackProps {
  error?: Error | string;
  onRetry?: () => void;
  title?: string;
  description?: string;
  showRetry?: boolean;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  children?: ReactNode;
}

export default function ErrorFallback({
  error,
  onRetry,
  title = '出现了问题',
  description,
  showRetry = true,
  className = '',
  size = 'medium',
  children,
}: ErrorFallbackProps) {
  const errorMessage = error instanceof Error ? error.message : error;
  const defaultDescription = description || '很抱歉，加载内容时出现了错误。请稍后重试。';

  const sizeClasses = {
    small: {
      container: 'p-4',
      icon: 'w-8 h-8',
      title: 'text-lg',
      description: 'text-sm',
    },
    medium: {
      container: 'p-6',
      icon: 'w-12 h-12',
      title: 'text-xl',
      description: 'text-base',
    },
    large: {
      container: 'p-8',
      icon: 'w-16 h-16',
      title: 'text-2xl',
      description: 'text-lg',
    },
  };

  const classes = sizeClasses[size];

  return (
    <div className={`
      flex flex-col items-center justify-center text-center
      bg-gray-50 border border-gray-200 rounded-lg
      ${classes.container}
      ${className}
    `}>
      {/* 错误图标 */}
      <div className={`
        ${classes.icon} mb-4 text-red-500 flex items-center justify-center
        bg-red-50 rounded-full p-2
      `}>
        <svg
          className="w-full h-full"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>

      {/* 错误标题 */}
      <h3 className={`${classes.title} font-semibold text-gray-900 mb-2`}>
        {title}
      </h3>

      {/* 错误描述 */}
      <p className={`${classes.description} text-gray-600 mb-4 max-w-md`}>
        {defaultDescription}
      </p>

      {/* 开发环境下显示详细错误信息 */}
      {process.env.NODE_ENV === 'development' && errorMessage && (
        <details className="mb-4 text-left w-full max-w-md">
          <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 mb-2">
            错误详情 (开发模式)
          </summary>
          <div className="p-3 bg-gray-100 rounded text-xs font-mono text-gray-800 overflow-auto max-h-32">
            {errorMessage}
          </div>
        </details>
      )}

      {/* 自定义内容 */}
      {children}

      {/* 重试按钮 */}
      {showRetry && onRetry && (
        <RetryButton
          onRetry={onRetry}
          className="mt-2"
        />
      )}
    </div>
  );
}

// 预设的错误类型组件
export function NetworkErrorFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorFallback
      title="网络连接失败"
      description="无法连接到服务器，请检查您的网络连接后重试。"
      onRetry={onRetry}
    />
  );
}

export function NotFoundErrorFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorFallback
      title="内容不存在"
      description="您访问的内容可能已被删除或移动。"
      onRetry={onRetry}
    />
  );
}

export function PermissionErrorFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorFallback
      title="权限不足"
      description="您没有权限访问此内容，请联系管理员。"
      showRetry={false}
      onRetry={onRetry}
    />
  );
}

export function LoadingErrorFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorFallback
      title="加载失败"
      description="内容加载失败，请稍后重试。"
      onRetry={onRetry}
    />
  );
}