'use client';

import React from 'react';
import { ConfigProvider, App } from 'antd';
import { usePathname } from 'next/navigation';
import { antdConfig } from '../lib/antdConfig';

interface AntdProviderProps {
  children: React.ReactNode;
}

export default function AntdProvider({ children }: AntdProviderProps) {
  const pathname = usePathname();
  
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
        locale={antdConfig.locale}
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