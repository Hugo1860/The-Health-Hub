'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Skeleton } from 'antd';
import AntdHomeLayout from '../components/AntdHomeLayout';

// 动态导入超优化的主内容组件，启用懒加载
const UltraOptimizedMainContent = dynamic(() => import('../components/UltraOptimizedMainContent'), {
  loading: () => (
    <div style={{ paddingTop: 164, paddingBottom: 120 }}>
      <Skeleton active paragraph={{ rows: 2 }} />
      <div style={{ margin: '16px 0' }} />
      <Skeleton active paragraph={{ rows: 3 }} />
    </div>
  ),
  ssr: false // 禁用服务端渲染以提高首次加载速度
});

export default function Home() {
  return (
    <div style={{ 
      backgroundColor: '#FFFFFF',
      minHeight: '100vh'
    }}>
      <AntdHomeLayout>
        <Suspense fallback={
          <div style={{ paddingTop: 164, paddingBottom: 120 }}>
            <Skeleton active paragraph={{ rows: 2 }} />
            <div style={{ margin: '16px 0' }} />
            <Skeleton active paragraph={{ rows: 3 }} />
          </div>
        }>
          <UltraOptimizedMainContent />
        </Suspense>
      </AntdHomeLayout>
    </div>
  );
}