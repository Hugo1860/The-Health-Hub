'use client';

import { useEffect } from 'react';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { useToast } from './ToastContainer';

export default function GlobalErrorHandler() {
  const { showToast } = useToast();
  const { handleError } = useErrorHandler(showToast);

  useEffect(() => {
    // 监听全局未捕获的错误
    const handleGlobalError = (event: ErrorEvent) => {
      handleError({
        message: event.message,
        details: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
        },
      });
    };

    // 监听未处理的 Promise 拒绝
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      handleError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        details: {
          reason: event.reason,
          promise: event.promise,
        },
      });
    };

    // 监听资源加载错误
    const handleResourceError = (event: Event) => {
      const target = event.target as HTMLElement;
      if (target && target.tagName) {
        handleError({
          message: `Resource loading failed: ${target.tagName}`,
          details: {
            tagName: target.tagName,
            src: (target as any).src || (target as any).href,
          },
        });
      }
    };

    // 添加事件监听器
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleResourceError, true);

    // 清理函数
    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleResourceError, true);
    };
  }, [handleError]);

  // 这个组件不渲染任何内容
  return null;
}