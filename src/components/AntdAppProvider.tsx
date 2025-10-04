/**
 * Ant Design App Provider
 * 为所有管理页面提供统一的App上下文，解决静态方法警告问题
 */

'use client';

import { App } from 'antd';
import { ReactNode } from 'react';

interface AntdAppProviderProps {
  children: ReactNode;
}

export default function AntdAppProvider({ children }: AntdAppProviderProps) {
  return (
    <App>
      {children}
    </App>
  );
}