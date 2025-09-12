'use client';

import { Typography } from 'antd';
import ClientOnly from './ClientOnly';
import { useStaticSafeState, useStaticSafeEffect, useClientMounted } from '../hooks/useStaticSafe';

const { Text } = Typography;

interface SafeTimeDisplayProps {
  timestamp: string;
  format?: 'relative' | 'date' | 'datetime';
  type?: 'secondary' | 'success' | 'warning' | 'danger';
  fallback?: string;
}

/**
 * SafeTimeDisplay 组件用于安全地显示时间，避免 SSR 水合问题
 * 使用静态边界安全的 Hook 来防止静态上下文违规
 */
export default function SafeTimeDisplay({ 
  timestamp, 
  format = 'relative',
  type = 'secondary',
  fallback = '--'
}: SafeTimeDisplayProps) {
  const componentName = 'SafeTimeDisplay';
  const [formattedTime, setFormattedTime] = useStaticSafeState<string>(fallback, componentName);
  const hasMounted = useClientMounted(componentName);

  useStaticSafeEffect(() => {
    if (!hasMounted) return;

    try {
      const date = new Date(timestamp);
      
      if (isNaN(date.getTime())) {
        setFormattedTime(fallback);
        return;
      }

      switch (format) {
        case 'relative':
          setFormattedTime(getTimeAgo(date));
          break;
        case 'date':
          setFormattedTime(date.toLocaleDateString('zh-CN'));
          break;
        case 'datetime':
          setFormattedTime(date.toLocaleString('zh-CN'));
          break;
        default:
          setFormattedTime(date.toLocaleDateString('zh-CN'));
      }
    } catch (error) {
      console.warn('SafeTimeDisplay: Invalid timestamp', timestamp, error);
      setFormattedTime(fallback);
    }
  }, [timestamp, format, fallback, hasMounted], componentName);

  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}天前`;
    } else if (diffHours > 0) {
      return `${diffHours}小时前`;
    } else {
      return '刚刚';
    }
  };

  return (
    <ClientOnly 
      fallback={<Text type={type}>{fallback}</Text>}
      componentName={componentName}
      enableBoundaryCheck={true}
    >
      <Text type={type}>{formattedTime}</Text>
    </ClientOnly>
  );
}