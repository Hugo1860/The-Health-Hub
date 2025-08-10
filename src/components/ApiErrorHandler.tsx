'use client';

import React from 'react';
import { Alert, Button, Space, Typography, Card } from 'antd';
import { 
  ExclamationCircleOutlined, 
  ReloadOutlined, 
  WifiOutlined,
  ClockCircleOutlined,
  DatabaseOutlined 
} from '@ant-design/icons';

const { Text } = Typography;

interface ApiErrorHandlerProps {
  error: string | Error | null;
  loading?: boolean;
  onRetry?: () => void;
  showRetry?: boolean;
  compact?: boolean;
}

const ApiErrorHandler: React.FC<ApiErrorHandlerProps> = ({
  error,
  loading = false,
  onRetry,
  showRetry = true,
  compact = false
}) => {
  if (!error) return null;

  const errorMessage = error instanceof Error ? error.message : error;
  
  // 根据错误消息确定错误类型和图标
  const getErrorInfo = (message: string) => {
    if (message.includes('网络') || message.includes('连接') || message.includes('Network')) {
      return {
        type: 'warning' as const,
        icon: <WifiOutlined />,
        title: '网络连接问题',
        description: '请检查网络连接后重试'
      };
    }
    
    if (message.includes('超时') || message.includes('timeout')) {
      return {
        type: 'warning' as const,
        icon: <ClockCircleOutlined />,
        title: '请求超时',
        description: '服务器响应时间过长，请稍后重试'
      };
    }
    
    if (message.includes('数据库') || message.includes('database')) {
      return {
        type: 'error' as const,
        icon: <DatabaseOutlined />,
        title: '数据库错误',
        description: '数据访问出现问题，请稍后重试'
      };
    }
    
    if (message.includes('404') || message.includes('不存在')) {
      return {
        type: 'warning' as const,
        icon: <ExclamationCircleOutlined />,
        title: '资源不存在',
        description: '请求的资源未找到'
      };
    }
    
    if (message.includes('403') || message.includes('权限')) {
      return {
        type: 'error' as const,
        icon: <ExclamationCircleOutlined />,
        title: '权限不足',
        description: '您没有权限访问此资源'
      };
    }
    
    // 默认错误
    return {
      type: 'error' as const,
      icon: <ExclamationCircleOutlined />,
      title: '请求失败',
      description: '服务器处理请求时出现错误'
    };
  };

  const errorInfo = getErrorInfo(errorMessage);

  if (compact) {
    return (
      <Alert
        message={errorInfo.title}
        description={
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {errorMessage}
            </Text>
            {showRetry && onRetry && (
              <Button 
                size="small" 
                type="link" 
                icon={<ReloadOutlined />}
                loading={loading}
                onClick={onRetry}
                style={{ padding: 0, height: 'auto' }}
              >
                重试
              </Button>
            )}
          </Space>
        }
        type={errorInfo.type}
        showIcon
        icon={errorInfo.icon}
        style={{ marginBottom: 16 }}
      />
    );
  }

  return (
    <Card style={{ margin: '16px 0' }}>
      <Alert
        message={errorInfo.title}
        description={
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Text>{errorInfo.description}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              错误详情: {errorMessage}
            </Text>
            {showRetry && onRetry && (
              <Button 
                type="primary" 
                icon={<ReloadOutlined />}
                loading={loading}
                onClick={onRetry}
              >
                重试
              </Button>
            )}
          </Space>
        }
        type={errorInfo.type}
        showIcon
        icon={errorInfo.icon}
      />
    </Card>
  );
};

export default ApiErrorHandler;