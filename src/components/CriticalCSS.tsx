'use client';

import { useEffect } from 'react';

interface CriticalCSSProps {
  children: React.ReactNode;
}

export default function CriticalCSS({ children }: CriticalCSSProps) {
  useEffect(() => {
    // 注入关键CSS
    const injectCriticalCSS = () => {
      const criticalCSS = `
        /* 关键CSS - 内联样式用于首屏渲染 */
        .medical-theme-override {
          --ant-primary-color: #13C2C2 !important;
          --ant-primary-color-hover: #36CFC9 !important;
          --ant-primary-color-active: #08979C !important;
          --ant-primary-color-outline: rgba(19, 194, 194, 0.2) !important;
          --ant-primary-1: #E6FFFB !important;
          --ant-primary-2: #B5F5EC !important;
          --ant-primary-3: #87E8DE !important;
          --ant-primary-4: #5CDBD3 !important;
          --ant-primary-5: #36CFC9 !important;
          --ant-primary-6: #13C2C2 !important;
          --ant-primary-7: #08979C !important;
          --ant-primary-8: #006D75 !important;
          --ant-primary-9: #00504F !important;
          --ant-primary-10: #003638 !important;
        }

        /* 优化滚动性能 */
        * {
          -webkit-overflow-scrolling: touch;
        }

        /* 优化字体渲染 */
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
        }

        /* 优化图片加载 */
        img {
          max-width: 100%;
          height: auto;
        }

        /* 减少重绘 */
        .ant-layout-sider {
          will-change: transform;
        }
      `;

      const style = document.createElement('style');
      style.textContent = criticalCSS;
      style.setAttribute('data-critical', 'true');
      document.head.appendChild(style);
    };

    injectCriticalCSS();

    // 延迟加载非关键CSS
    const loadNonCriticalCSS = () => {
      setTimeout(() => {
        // 这里可以加载其他非关键的CSS文件
        const nonCriticalCSS = [
          // 例如：'/styles/non-critical.css'
        ];

        nonCriticalCSS.forEach(href => {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = href;
          link.media = 'print'; // 先设为print避免阻塞渲染
          link.onload = () => {
            link.media = 'all'; // 加载完成后设为all
          };
          document.head.appendChild(link);
        });
      }, 100);
    };

    loadNonCriticalCSS();
  }, []);

  return <>{children}</>;
}
