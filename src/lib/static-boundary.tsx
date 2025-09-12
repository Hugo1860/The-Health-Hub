import React, { ComponentType, ReactNode } from 'react';

// 静态边界错误类型
export class StaticBoundaryError extends Error {
  constructor(message: string, componentName?: string) {
    super(`Static Boundary Violation: ${message}${componentName ? ` in ${componentName}` : ''}`);
    this.name = 'StaticBoundaryError';
  }
}

// 静态组件属性接口
export interface StaticComponentProps {
  data?: any;
  config?: Record<string, any>;
  children?: ReactNode;
}

// 动态组件属性接口
export interface DynamicComponentProps {
  children?: ReactNode;
  context?: any;
}

// 边界组件属性接口
export interface BoundaryProps {
  staticData?: any;
  dynamicContent?: () => ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
}

// 静态边界包装器
export function withStaticBoundary<T extends StaticComponentProps>(
  WrappedComponent: ComponentType<T>,
  componentName?: string
): ComponentType<T> {
  const StaticBoundaryWrapper = (props: T) => {
    // 在开发环境中检查是否违反静态边界
    if (process.env.NODE_ENV === 'development') {
      // 检查是否尝试使用 React Context
      const originalUseContext = React.useContext;
      React.useContext = (context: any) => {
        const error = new StaticBoundaryError(
          'Attempted to use React Context in static component',
          componentName || WrappedComponent.name
        );
        console.error(error);
        
        // 在开发环境中抛出错误，生产环境中返回默认值
        if (process.env.NODE_ENV === 'development') {
          throw error;
        }
        
        return null;
      };

      try {
        const result = React.createElement(WrappedComponent, props);
        // 恢复原始的 useContext
        React.useContext = originalUseContext;
        return result;
      } catch (error) {
        // 恢复原始的 useContext
        React.useContext = originalUseContext;
        throw error;
      }
    }

    return React.createElement(WrappedComponent, props);
  };

  StaticBoundaryWrapper.displayName = `withStaticBoundary(${componentName || WrappedComponent.name || 'Component'})`;
  
  return StaticBoundaryWrapper;
}

// 静态/动态边界组件
export function StaticDynamicBoundary({
  staticData,
  dynamicContent,
  fallback = null,
  onError
}: BoundaryProps): JSX.Element {
  try {
    // 如果有静态数据，渲染静态内容
    if (staticData !== undefined) {
      return (
        <div data-static-boundary="true">
          {typeof staticData === 'function' ? staticData() : staticData}
        </div>
      );
    }

    // 如果有动态内容函数，在客户端渲染
    if (dynamicContent && typeof window !== 'undefined') {
      return (
        <div data-dynamic-boundary="true">
          {dynamicContent()}
        </div>
      );
    }

    // 服务端或没有动态内容时返回 fallback
    return <>{fallback}</>;

  } catch (error) {
    if (onError) {
      onError(error instanceof Error ? error : new Error(String(error)));
    }

    console.error('StaticDynamicBoundary error:', error);
    return <>{fallback}</>;
  }
}

// 检查是否在静态上下文中
export function isStaticContext(): boolean {
  // 检查是否在服务端
  if (typeof window === 'undefined') {
    return true;
  }

  // 检查是否在 Next.js 静态生成过程中
  if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
    // 在生产环境中，如果 window 存在但某些属性不可用，可能是在静态生成过程中
    try {
      // 尝试访问一些只在真正的浏览器环境中可用的属性
      return !window.requestAnimationFrame || !window.localStorage;
    } catch {
      return true;
    }
  }

  return false;
}

// 安全的上下文消费器
export function safeUseContext<T>(
  context: React.Context<T>,
  defaultValue: T,
  componentName?: string
): T {
  try {
    if (isStaticContext()) {
      console.warn(
        `safeUseContext: Using default value in static context${componentName ? ` for ${componentName}` : ''}`
      );
      return defaultValue;
    }

    return React.useContext(context);
  } catch (error) {
    console.error(
      `safeUseContext: Error accessing context${componentName ? ` in ${componentName}` : ''}:`,
      error
    );
    return defaultValue;
  }
}

// 静态安全的 Hook 包装器
export function withStaticSafety<T extends any[], R>(
  hook: (...args: T) => R,
  defaultValue: R,
  hookName?: string
): (...args: T) => R {
  return (...args: T): R => {
    try {
      if (isStaticContext()) {
        console.warn(
          `withStaticSafety: Using default value for ${hookName || 'hook'} in static context`
        );
        return defaultValue;
      }

      return hook(...args);
    } catch (error) {
      console.error(
        `withStaticSafety: Error in ${hookName || 'hook'}:`,
        error
      );
      return defaultValue;
    }
  };
}

// 开发时的静态边界检查器
export class StaticBoundaryChecker {
  private static violations: Array<{
    component: string;
    violation: string;
    timestamp: number;
    stack?: string;
  }> = [];

  static reportViolation(
    component: string,
    violation: string,
    error?: Error
  ): void {
    const report = {
      component,
      violation,
      timestamp: Date.now(),
      stack: error?.stack
    };

    this.violations.push(report);

    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Static Boundary Violation in ${component}`);
      console.error(violation);
      if (error?.stack) {
        console.error('Stack trace:', error.stack);
      }
      console.groupEnd();
    }
  }

  static getViolations(): typeof StaticBoundaryChecker.violations {
    return [...this.violations];
  }

  static clearViolations(): void {
    this.violations = [];
  }

  static getViolationSummary(): {
    total: number;
    byComponent: Record<string, number>;
    recent: typeof StaticBoundaryChecker.violations;
  } {
    const byComponent: Record<string, number> = {};
    
    this.violations.forEach(violation => {
      byComponent[violation.component] = (byComponent[violation.component] || 0) + 1;
    });

    const recent = this.violations
      .filter(v => Date.now() - v.timestamp < 60000) // 最近1分钟
      .slice(-10); // 最近10个

    return {
      total: this.violations.length,
      byComponent,
      recent
    };
  }
}

// 所有功能已在上面单独导出，这里不需要重复导出