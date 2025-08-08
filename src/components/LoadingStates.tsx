'use client';

import React from 'react';
import { Skeleton, Card, Spin, Progress } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

// 基础加载指示器
export const LoadingSpinner: React.FC<{ size?: 'small' | 'default' | 'large'; tip?: string }> = ({ 
  size = 'default', 
  tip = '加载中...' 
}) => (
  <div className="flex flex-col items-center justify-center py-8">
    <Spin 
      size={size} 
      tip={tip}
      indicator={<LoadingOutlined style={{ fontSize: size === 'large' ? 32 : size === 'small' ? 16 : 24 }} spin />}
    />
  </div>
);

// 进度加载器
export const ProgressLoader: React.FC<{ 
  percent: number; 
  status?: 'normal' | 'exception' | 'active' | 'success';
  text?: string;
}> = ({ percent, status = 'active', text = '加载中...' }) => (
  <div className="flex flex-col items-center justify-center py-8 px-4">
    <div className="w-full max-w-md">
      <p className="text-center text-gray-600 mb-4">{text}</p>
      <Progress 
        percent={percent} 
        status={status}
        strokeColor={{
          '0%': '#108ee9',
          '100%': '#87d068',
        }}
      />
    </div>
  </div>
);

// 音频卡片骨架
export const AudioCardSkeleton: React.FC = () => (
  <Card className="overflow-hidden">
    <Skeleton.Image style={{ width: '100%', height: 192 }} active />
    <div className="p-4">
      <Skeleton active paragraph={{ rows: 2, width: ['60%', '80%'] }} title={{ width: '90%' }} />
      <div className="mt-4">
        <Skeleton.Button active size="small" />
      </div>
    </div>
  </Card>
);

// 音频网格骨架
export const AudioGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
    {[...Array(count)].map((_, index) => (
      <AudioCardSkeleton key={index} />
    ))}
  </div>
);

// 筛选控件骨架
export const FilterControlsSkeleton: React.FC = () => (
  <Card className="mb-8">
    <div className="flex flex-col md:flex-row gap-4">
      <div className="flex-grow">
        <Skeleton.Input active style={{ width: '100%', height: 48 }} />
      </div>
      <div className="flex gap-4">
        <Skeleton.Input active style={{ width: 200, height: 48 }} />
        <Skeleton.Button active style={{ height: 48, width: 80 }} />
      </div>
    </div>
  </Card>
);

// 分页骨架
export const PaginationSkeleton: React.FC = () => (
  <div className="flex justify-center items-center space-x-4 mt-12">
    <Skeleton.Button active size="default" />
    <Skeleton.Input active style={{ width: 120, height: 32 }} />
    <Skeleton.Button active size="default" />
  </div>
);

// 页面头部骨架
export const PageHeaderSkeleton: React.FC = () => (
  <div className="mb-8">
    <Skeleton.Input active style={{ width: 300, height: 40 }} className="mb-2" />
    <Skeleton.Input active style={{ width: 500, height: 24 }} />
  </div>
);

// 完整的浏览页面骨架
export const BrowsePageSkeleton: React.FC<{ text?: string }> = ({ text = "加载中..." }) => (
  <div className="space-y-8">
    <div className="text-center">
      <p className="text-gray-500 mb-4">{text}</p>
      <LoadingSpinner size="large" />
    </div>
    
    <PageHeaderSkeleton />
    <FilterControlsSkeleton />
    <AudioGridSkeleton />
    <PaginationSkeleton />
  </div>
);

// 列表项骨架
export const ListItemSkeleton: React.FC = () => (
  <div className="flex items-center space-x-4 p-4 border-b border-gray-100">
    <Skeleton.Avatar active size="large" />
    <div className="flex-1">
      <Skeleton active paragraph={{ rows: 1, width: '60%' }} title={{ width: '40%' }} />
    </div>
    <Skeleton.Button active size="small" />
  </div>
);

// 表格骨架
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 4 
}) => (
  <div className="space-y-4">
    {/* 表头 */}
    <div className="flex space-x-4 p-4 bg-gray-50 rounded">
      {[...Array(columns)].map((_, index) => (
        <Skeleton.Input key={index} active style={{ width: `${100/columns}%`, height: 32 }} />
      ))}
    </div>
    
    {/* 表格行 */}
    {[...Array(rows)].map((_, rowIndex) => (
      <div key={rowIndex} className="flex space-x-4 p-4 border-b border-gray-100">
        {[...Array(columns)].map((_, colIndex) => (
          <Skeleton.Input key={colIndex} active style={{ width: `${100/columns}%`, height: 24 }} />
        ))}
      </div>
    ))}
  </div>
);

// 内容块骨架
export const ContentBlockSkeleton: React.FC<{ 
  title?: boolean; 
  paragraph?: boolean; 
  image?: boolean;
  actions?: boolean;
}> = ({ 
  title = true, 
  paragraph = true, 
  image = false, 
  actions = false 
}) => (
  <Card>
    {image && (
      <Skeleton.Image style={{ width: '100%', height: 200 }} active className="mb-4" />
    )}
    <Skeleton 
      active 
      title={title}
      paragraph={paragraph ? { rows: 3 } : false}
    />
    {actions && (
      <div className="flex space-x-2 mt-4">
        <Skeleton.Button active size="default" />
        <Skeleton.Button active size="default" />
      </div>
    )}
  </Card>
);

// 响应式加载状态
export const ResponsiveLoader: React.FC<{ 
  mobile?: React.ReactNode;
  desktop?: React.ReactNode;
  text?: string;
}> = ({ mobile, desktop, text = "加载中..." }) => (
  <div className="w-full">
    <div className="block md:hidden">
      {mobile || <LoadingSpinner tip={text} />}
    </div>
    <div className="hidden md:block">
      {desktop || <BrowsePageSkeleton text={text} />}
    </div>
  </div>
);

// 延迟加载包装器
export const DelayedLoader: React.FC<{ 
  delay?: number; 
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ delay = 300, children, fallback }) => {
  const [showLoader, setShowLoader] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoader(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  if (!showLoader) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
};

// 智能加载状态（根据加载时间显示不同内容）
export const SmartLoader: React.FC<{ 
  text?: string;
  showProgressAfter?: number;
  showDetailAfter?: number;
}> = ({ 
  text = "加载中...", 
  showProgressAfter = 2000,
  showDetailAfter = 5000 
}) => {
  const [phase, setPhase] = React.useState<'initial' | 'progress' | 'detail'>('initial');
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const progressTimer = setTimeout(() => {
      setPhase('progress');
      
      // 模拟进度
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + Math.random() * 10;
        });
      }, 200);

      return () => clearInterval(interval);
    }, showProgressAfter);

    const detailTimer = setTimeout(() => {
      setPhase('detail');
    }, showDetailAfter);

    return () => {
      clearTimeout(progressTimer);
      clearTimeout(detailTimer);
    };
  }, [showProgressAfter, showDetailAfter]);

  switch (phase) {
    case 'initial':
      return <LoadingSpinner tip={text} />;
    
    case 'progress':
      return <ProgressLoader percent={Math.round(progress)} text="正在加载数据..." />;
    
    case 'detail':
      return (
        <div className="text-center py-8">
          <LoadingSpinner size="large" />
          <div className="mt-4 space-y-2">
            <p className="text-gray-600">加载时间较长，请稍候...</p>
            <p className="text-sm text-gray-400">
              如果持续无法加载，请检查网络连接或刷新页面
            </p>
          </div>
        </div>
      );
    
    default:
      return <LoadingSpinner tip={text} />;
  }
};