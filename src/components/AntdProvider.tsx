'use client';

import React, { useEffect } from 'react';
import { ConfigProvider, App } from 'antd';
import { usePathname } from 'next/navigation';
// 警告抑制将在 useEffect 中处理，避免 hydration 问题

interface AntdProviderProps {
  children: React.ReactNode;
}

export default function AntdProvider({ children }: AntdProviderProps) {
  const pathname = usePathname();
  
  // 在客户端抑制 Ant Design React 19 兼容性警告
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const originalError = console.error;
      const originalWarn = console.warn;
      
      console.error = (...args) => {
        const message = args[0];
        if (typeof message === 'string' &&
            (message.includes('[antd: compatible]') ||
             message.includes('antd v5 support React is 16 ~ 18') ||
             message.includes('Static function can not consume context like dynamic theme') ||
             message.includes('Instance created by `useForm` is not connected to any Form element'))) {
          return; // 忽略 Ant Design 兼容性警告和表单警告
        }
        originalError.apply(console, args);
      };
      
      console.warn = (...args) => {
        const message = args[0];
        if (typeof message === 'string' &&
            (message.includes('Instance created by `useForm` is not connected to any Form element') ||
             message.includes('Forget to pass `form` prop'))) {
          return; // 忽略 Form 警告
        }
        originalWarn.apply(console, args);
      };
    }
  }, []);
  
  // 使用 Ant Design 的页面：管理后台、认证页面、首页、browse页面等
  const shouldUseAntd = pathname?.startsWith('/admin') || 
                       pathname?.startsWith('/auth') ||
                       pathname === '/' ||
                       pathname?.startsWith('/browse') ||
                       pathname?.startsWith('/favorites') ||
                       pathname?.startsWith('/playlists') ||
                       pathname?.startsWith('/profile') ||
                       pathname?.startsWith('/search') ||
                       pathname?.startsWith('/audio/');
  
  if (shouldUseAntd) {
    return (
      <ConfigProvider 
        theme={{
          token: {
            // 主色调 - 青色系
            colorPrimary: '#13C2C2',
            colorSuccess: '#13C2C2',
            colorWarning: '#FAAD14',
            colorError: '#FF4D4F',
            colorInfo: '#13C2C2',
            
            // 背景色
            colorBgContainer: '#FFFFFF',
            colorBgLayout: '#F7F8FA',
            colorBgBase: '#F7F8FA',
            colorBgElevated: '#FFFFFF',
            
            // 文本颜色
            colorText: '#333333',
            colorTextSecondary: '#999999',
            colorTextTertiary: '#CCCCCC',
            colorTextQuaternary: '#F0F0F0',
            
            // 边框颜色
            colorBorder: '#E8E8E8',
            colorBorderSecondary: '#F0F0F0',
            
            // 链接颜色
            colorLink: '#13C2C2',
            colorLinkHover: '#36CFC9',
            colorLinkActive: '#08979C',
            
            // 其他设置
            borderRadius: 8,
            fontSize: 14,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          },
          components: {
            Layout: {
              headerBg: '#FFFFFF',
              siderBg: '#13C2C2',
              bodyBg: '#F7F8FA',
              footerBg: '#FFFFFF',
            },
            Card: {
              colorBgContainer: '#FFFFFF',
              borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
            },
            Button: {
              borderRadius: 8,
              primaryShadow: '0 2px 4px rgba(19, 194, 194, 0.2)',
            },
            Menu: {
              darkItemBg: '#13C2C2',
              darkItemSelectedBg: '#36CFC9',
              darkItemHoverBg: '#36CFC9',
              darkItemColor: 'rgba(255, 255, 255, 0.85)',
              darkItemSelectedColor: '#FFFFFF',
            },
            Tag: {
              colorWarning: '#FAAD14',
              colorWarningBg: '#FFF7E6',
              colorWarningBorder: '#FFD591',
            },
            Input: {
              borderRadius: 8,
              colorBgContainer: '#FFFFFF',
            },
            Select: {
              borderRadius: 8,
              colorBgContainer: '#FFFFFF',
            },
            Breadcrumb: {
              colorText: '#999999',
              colorTextDescription: '#CCCCCC',
              linkColor: '#13C2C2',
              linkHoverColor: '#36CFC9',
            },
          },
        }}
        // locale 配置可以在这里添加
      >
        <App>
          {children}
        </App>
      </ConfigProvider>
    );
  }
  
  // 对于其他页面，直接返回 children，不使用 Ant Design
  return <>{children}</>;
}