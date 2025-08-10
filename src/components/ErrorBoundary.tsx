'use client';

import React, { Component, ReactNode } from 'react';
import { Result, Button, Typography, Card, Space, Alert } from 'antd';
import { 
  ExclamationCircleOutlined, 
  ReloadOutlined, 
  BugOutlined,
  HomeOutlined 
} from '@ant-design/icons';

const { Paragraph, Text } = Typography;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // 更新 state 使下一次渲染能够显示降级后的 UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 记录错误信息
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // 调用外部错误处理函数
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 在生产环境中，这里应该发送错误报告到监控服务
    if (process.env.NODE_ENV === 'production') {
      // 发送错误报告
      this.reportError(error, errorInfo);
    }
  }

  private reportError = (error: Error, errorInfo: React.ErrorInfo) => {
    // 这里可以集成错误监控服务，如 Sentry
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.log('Error Report:', errorReport);
    
    // 发送到错误监控服务
    // fetch('/api/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorReport)
    // }).catch(console.error);
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认错误 UI
      return (
        <Card style={{ margin: '16px 0' }}>
          <Result
            status="error"
            icon={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
            title="组件加载失败"
            subTitle="抱歉，此组件遇到了意外错误"
            extra={
              <Space direction="vertical" align="center">
                <Space>
                  <Button 
                    type="primary" 
                    icon={<ReloadOutlined />}
                    onClick={this.handleRetry}
                  >
                    重试
                  </Button>
                  <Button 
                    icon={<ReloadOutlined />}
                    onClick={this.handleReload}
                  >
                    刷新页面
                  </Button>
                  <Button 
                    icon={<HomeOutlined />}
                    onClick={() => window.location.href = '/'}
                  >
                    返回首页
                  </Button>
                </Space>
                
                {this.props.showDetails && this.state.error && (
                  <Alert
                    message="错误详情"
                    description={
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Text code>{this.state.error.message}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          错误ID: {this.state.errorId}
                        </Text>
                      </Space>
                    }
                    type="error"
                    showIcon
                    icon={<BugOutlined />}
                    style={{ textAlign: 'left', marginTop: 16 }}
                  />
                )}
              </Space>
            }
          />
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;