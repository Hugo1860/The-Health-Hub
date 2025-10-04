'use client'

import React, { Component, ReactNode } from 'react';
import { Alert, Button, Space, Typography, Collapse } from 'antd';
import { ReloadOutlined, BugOutlined } from '@ant-design/icons';
import { ShareCardErrorHandler } from '@/lib/share-card-errors';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

export class ShareCardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ShareCard Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // 记录错误
    ShareCardErrorHandler.handle('CARD_GENERATION_FAILED' as any, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReportError = () => {
    const errorDetails = {
      error: this.state.error?.message,
      stack: this.state.error?.stack,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };

    // 复制错误信息到剪贴板
    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      .then(() => {
        alert('错误信息已复制到剪贴板，您可以将其发送给技术支持团队');
      })
      .catch(() => {
        alert('复制失败，请手动复制以下错误信息：\n\n' + JSON.stringify(errorDetails, null, 2));
      });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
          <Alert
            message="分享卡片生成失败"
            description="生成分享卡片时遇到了问题，请尝试以下解决方案："
            type="error"
            showIcon
            style={{ marginBottom: '16px' }}
          />

          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Paragraph>
                <Text strong>常见解决方案：</Text>
              </Paragraph>
              <ul>
                <li>刷新页面重试</li>
                <li>检查网络连接</li>
                <li>尝试使用其他浏览器</li>
                <li>清除浏览器缓存</li>
              </ul>
            </div>

            <Space>
              <Button 
                type="primary" 
                icon={<ReloadOutlined />} 
                onClick={this.handleRetry}
              >
                重试
              </Button>
              <Button 
                icon={<BugOutlined />} 
                onClick={this.handleReportError}
              >
                报告问题
              </Button>
            </Space>

            <Collapse ghost>
              <Panel header="技术详情" key="1">
                <div style={{ 
                  backgroundColor: '#f5f5f5', 
                  padding: '12px', 
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  overflow: 'auto'
                }}>
                  <div><strong>错误信息:</strong> {this.state.error?.message}</div>
                  {this.state.error?.stack && (
                    <div style={{ marginTop: '8px' }}>
                      <strong>堆栈跟踪:</strong>
                      <pre style={{ whiteSpace: 'pre-wrap', margin: '4px 0' }}>
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </Panel>
            </Collapse>
          </Space>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook 版本的错误边界
export const useShareCardErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: Error) => {
    setError(error);
    ShareCardErrorHandler.handle('CARD_GENERATION_FAILED' as any, error);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  const retry = React.useCallback(async (operation: () => Promise<any>) => {
    try {
      clearError();
      return await ShareCardErrorHandler.retryOperation(operation);
    } catch (err) {
      handleError(err instanceof Error ? err : new Error('Unknown error'));
      throw err;
    }
  }, [clearError, handleError]);

  return {
    error,
    handleError,
    clearError,
    retry
  };
};