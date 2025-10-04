'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Skeleton } from 'antd';
import AntdHomeLayout from '../components/AntdHomeLayout';
import ResourcePreloader from '../components/ResourcePreloader';
import CriticalCSS from '../components/CriticalCSS';
import FontOptimizer from '../components/FontOptimizer';
import PerformanceMonitor from '../components/PerformanceMonitor';

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
  // 预加载关键资源
  const criticalResources = [
    // 预加载关键图片（如果有的话）
  ];

  const prefetchRoutes = [
    '/api/home-fast',
    '/api/simple-categories'
  ];

  return (
    <PerformanceMonitor onMetrics={(metrics) => {
      // 可以在这里添加性能指标上报逻辑
      console.log('📈 性能指标收集完成:', metrics);
    }}>
      {/* 关键CSS注入 - 提高首屏渲染性能 */}
      <CriticalCSS />

      {/* 字体优化 - 防止FOUC */}
      <FontOptimizer />

      {/* 资源预加载 - 提前加载关键资源 */}
      <ResourcePreloader
        resources={criticalResources}
        prefetchRoutes={prefetchRoutes}
      />

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
    </PerformanceMonitor>
  );
}