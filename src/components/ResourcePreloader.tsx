'use client';

import { useEffect } from 'react';

interface ResourcePreloaderProps {
  resources?: string[];
  prefetchRoutes?: string[];
}

export default function ResourcePreloader({
  resources = [],
  prefetchRoutes = []
}: ResourcePreloaderProps) {
  useEffect(() => {
    // 预加载关键资源
    const preloadResources = () => {
      resources.forEach(resource => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = resource.startsWith('/') && !resource.includes('.') ? 'fetch' : 'image';
        link.crossOrigin = 'anonymous';
        link.href = resource;
        document.head.appendChild(link);
      });
    };

    // 预取关键路由
    const prefetchRoutesData = () => {
      prefetchRoutes.forEach(route => {
        // 预取路由数据
        fetch(route, {
          priority: 'low'
        }).catch(() => {
          // 忽略预取失败
        });
      });
    };

    // 预连接到关键域名
    const preconnectDomains = () => {
      // 如果有外部CDN或其他域名，可以在这里预连接
      const domains = [
        // 例如：'https://cdn.example.com'
      ];

      domains.forEach(domain => {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = domain;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      });
    };

    // DNS 预解析
    const dnsPrefetchDomains = () => {
      const domains = [
        // 外部API域名等
      ];

      domains.forEach(domain => {
        const link = document.createElement('link');
        link.rel = 'dns-prefetch';
        link.href = domain;
        document.head.appendChild(link);
      });
    };

    preloadResources();
    prefetchRoutesData();
    preconnectDomains();
    dnsPrefetchDomains();
  }, [resources, prefetchRoutes]);

  return null; // 这个组件不渲染任何内容
}
