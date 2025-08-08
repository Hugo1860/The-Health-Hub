'use client';

import React, { Component, ReactNode } from 'react';
import { Alert, Button, Card, Typography } from 'antd';
import { ReloadOutlined, BugOutlined, HomeOutlined } from '@ant-design/icons';
import { logError, createErrorState } from '../lib/apiErrorHandler';

const { Title, Paragraph } = Typography;

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showErrorDetails?: boolean;
  level?: 'page' | 'component' | 'section';
}

interface ErrorFallbackProps {
  error: Error;
  errorInfo: React.ErrorInfo;
  resetError: () => void;
  errorId: string;
  level: 'page' | 'component' | 'section';
}

// 默认错误回退组件
const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  errorInfo, 
  resetError, 
  errorId,
  level 
}) => {
  const isPageLevel = level === 'page';
  
  return (
    <div className={`flex items-center justify-center ${isPageLevel ? 'min-h-screen' : 'min-h-64'} p-4`}>
      <Card className="max-w-lg w-full">
        <div className="text-center">
          <BugOutlined className="text-4xl text-red-500 mb-4" />
          <Title level={isPageLevel ? 3 : 4} className="text-gray-800">
            {isPageLevel ? '页面出现错误' : '组件加载失败'}
          </Title>
          <Paragraph className="text-gray-600 mb-6">
            {isPageLevel 
              ? '抱歉，页面遇到了一些问题。我们已经记录了这个错误，请稍后重试。'
              : '这个部分暂时无法显示，请尝试刷新页面。'
            }
          </Paragraph>
          
          <div className="space-y-3">
            <Button 
              type="primary" 
              icon={<ReloadOutlined />} 
              onClick={resetError}
              size="large"
            >
              重试
            </Button>
            
            {isPageLevel && (
              <Button 
                icon={<HomeOutlined />} 
                onClick={() => window.location.href = '/'}
                size="large"
                className="ml-2"
              >
                返回首页
              </Button>
            )}
          </div>

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                错误详情 (开发模式)
              </summary>
              <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono">
                <div className="mb-2">
                  <strong>错误ID:</strong> {errorId}
                </div>
                <div className="mb-2">
                  <strong>错误信息:</strong> {error.message}
                </div>
                <div className="mb-2">
                  <strong>错误堆栈:</strong>
                  <pre className="whitespace-pre-wrap mt-1">{error.stack}</pre>
                </div>
                {errorInfo.componentStack && (
                  <div>
                    <strong>组件堆栈:</strong>
                    <pre className="whitespace-pre-wrap mt-1">{errorInfo.componentStack}</pre>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      </Card>
    </div>
  );
};

// 简化的错误回退组件（用于小组件）
const MinimalErrorFallback: React.FC<ErrorFallbackProps> = ({ resetError }) => (
  <div className="p-4 text-center">
    <Alert
      message="加载失败"
      description="这个部分暂时无法显示"
      type="error"
      showIcon
      action={
        <Button size="small" onClick={resetError}>
          重试
        </Button>
      }
    />
  </div>
);

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // 生成唯一的错误ID
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    // 记录错误
    const errorState = createErrorState(error, 'React Error Boundary');
    logError(errorState, {
      errorId: this.state.errorId,
      componentStack: errorInfo.componentStack,
      level: this.props.level || 'component',
      timestamp: new Date().toISOString()
    });

    // 调用自定义错误处理函数
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 在生产环境中发送错误报告
    if (process.env.NODE_ENV === 'production') {
      this.sendErrorReport(error, errorInfo);
    }
  }

  private sendErrorReport = (error: Error, errorInfo: React.ErrorInfo) => {
    // 发送错误报告到监控服务
    const errorReport = {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      level: this.props.level || 'component',
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    // 这里可以集成错误监控服务，如 Sentry
    console.error('Error Report:', errorReport);
  };

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  render() {
    if (this.state.hasError && this.state.error && this.state.errorInfo) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      
      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
          errorId={this.state.errorId}
          level={this.props.level || 'component'}
        />
      );
    }

    return this.props.children;
  }
}

// 高阶组件：为组件添加错误边界
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Hook：在函数组件中使用错误边界
export function useErrorHandler() {
  return (error: Error, errorInfo?: any) => {
    // 在函数组件中，我们需要抛出错误让错误边界捕获
    throw error;
  };
}

// 预定义的错误边界配置
export const PageErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="page" showErrorDetails={process.env.NODE_ENV === 'development'}>
    {children}
  </ErrorBoundary>
);

export const ComponentErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="component" fallback={MinimalErrorFallback}>
    {children}
  </ErrorBoundary>
);

export const SectionErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="section">
    {children}
  </ErrorBoundary>
);

export default ErrorBoundary;
export type { ErrorBoundaryProps, ErrorFallbackProps };