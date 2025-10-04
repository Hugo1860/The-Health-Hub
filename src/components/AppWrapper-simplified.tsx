'use client';

import React from 'react';
import { App } from 'antd';

interface AppWrapperProps {
  children: React.ReactNode;
}

// 简化的 App 包装器组件
export default function AppWrapper({ children }: AppWrapperProps) {
  return <App>{children}</App>;
}

// 简化的 message hook
export function useMessage() {
  const { message } = App.useApp();
  return message;
}

// 简化的 notification hook
export function useNotification() {
  const { notification } = App.useApp();
  return notification;
}

// 简化的 modal hook
export function useModal() {
  const { modal } = App.useApp();
  return modal;
}