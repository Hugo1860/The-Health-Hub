'use client';

import { useEffect, useState } from 'react';

interface FontOptimizerProps {
  children: React.ReactNode;
}

export default function FontOptimizer({ children }: FontOptimizerProps) {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    // 预加载关键字体
    const preloadFonts = async () => {
      try {
        // 预加载系统字体（通常更快）
        if ('fonts' in document) {
          // 等待系统字体加载
          await document.fonts.ready;
        }

        // 预加载自定义字体（如果有的话）
        const fontPreloads = [
          // 这里可以添加自定义字体的URL
        ];

        await Promise.all(
          fontPreloads.map(url => {
            return new Promise((resolve, reject) => {
              const link = document.createElement('link');
              link.rel = 'preload';
              link.as = 'font';
              link.type = 'font/woff2';
              link.crossOrigin = 'anonymous';
              link.onload = resolve;
              link.onerror = reject;
              link.href = url;
              document.head.appendChild(link);
            });
          })
        );

        setFontsLoaded(true);
      } catch (error) {
        console.warn('字体预加载失败，使用后备字体:', error);
        setFontsLoaded(true);
      }
    };

    preloadFonts();
  }, []);

  // 在字体加载完成前，使用系统字体避免FOUC
  if (!fontsLoaded) {
    return (
      <div
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          fontDisplay: 'swap'
        }}
      >
        {children}
      </div>
    );
  }

  return <>{children}</>;
}
