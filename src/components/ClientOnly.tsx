'use client';

import { useState, useEffect, ReactNode, ErrorInfo } from 'react';
import { Spin, Alert } from 'antd';
import { StaticBoundaryChecker, isStaticContext } from '../lib/static-boundary';

interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
  showLoading?: boolean;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableBoundaryCheck?: boolean;
  componentName?: string;
}

/**
 * 增强版 ClientOnly 组件
 * - 解决 SSR 水合不匹配问题
 * - 集成静态边界检查
 * - 提供错误边界功能
 */
export default function ClientOnly({ 
  children, 
  fallback = null, 
  showLoading = false,
  onError,
  enableBoundaryCheck = process.env.NODE_ENV === 'development',
  componentName = 'ClientOnly'
}: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // 检查静态上下文违规
    if (enableBoundaryCheck && isStaticContext()) {
      const violation = 'ClientOnly component used in static context';
      StaticBoundaryChecker.reportViolation(componentName, violation);
      
      if (process.env.NODE_ENV === 'development') {
        console.warn(`⚠️ ${componentName}: ${violation}`);
      }
    }

    setHasMounted(true);
  }, [enableBoundaryCheck, componentName]);

  // 错误处理
  const handleError = (error: Error, errorInfo?: ErrorInfo) => {
    setError(error);
    
    if (enableBoundaryCheck) {
      StaticBoundaryChecker.reportViolation(
        componentName,
        `Runtime error: ${error.message}`,
        error
      );
    }

    if (onError) {
      onError(error, errorInfo || { componentStack: '' });
    }

    console.error(`ClientOnly error in ${componentName}:`, error);
  };

  // 如果有错误，显示错误信息
  if (error) {
    if (process.env.NODE_ENV === 'development') {
      return (
        <Alert
          message="ClientOnly 组件错误"
          description={error.message}
          type="error"
          showIcon
          style={{ margin: '8px 0' }}
        />
      );
    }
    return <>{fallback}</>;
  }

  // 服务端渲染时返回 fallback 或 loading
  if (!hasMounted) {
    if (showLoading) {
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100px' 
        }}>
          <Spin size="small" />
        </div>
      );
    }
    return <>{fallback}</>;
  }

  // 客户端渲染时返回实际内容，包装在错误边界中
  try {
    return <div data-client-only={componentName}>{children}</div>;
  } catch (error) {
    handleError(error instanceof Error ? error : new Error(String(error)));
    return <>{fallback}</>;
  }
}

// 导出静态边界安全版本
export function StaticSafeClientOnly(props: ClientOnlyProps) {
  return (
    <ClientOnly 
      {...props} 
      enableBoundaryCheck={true}
      componentName={props.componentName || 'StaticSafeClientOnly'}
    />
  );
}