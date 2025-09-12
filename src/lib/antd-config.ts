/**
 * Ant Design 配置
 * 处理 React 19 兼容性警告
 */

// 抑制 Ant Design React 19 兼容性警告
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // 过滤掉 Ant Design React 兼容性警告
    const message = args[0];
    if (
      typeof message === 'string' && 
      (message.includes('[antd: compatible]') || 
       message.includes('antd v5 support React is 16 ~ 18'))
    ) {
      return; // 忽略这个警告
    }
    originalConsoleError.apply(console, args);
  };
}

export const antdConfig = {
  // Ant Design 主题配置
  theme: {
    token: {
      colorPrimary: '#1890ff',
      borderRadius: 6,
    },
  },
  // 其他配置
  locale: 'zh_CN',
};