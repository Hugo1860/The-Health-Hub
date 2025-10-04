/**
 * 抑制开发环境中的特定警告
 * 主要用于抑制 Ant Design React 19 兼容性警告
 */

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // 保存原始的 console.error 方法
  const originalConsoleError = console.error;
  
  // 重写 console.error 来过滤特定警告
  console.error = function(...args) {
    // 检查是否是 Ant Design 兼容性警告
    const message = args[0];
    
    if (typeof message === 'string') {
      // 过滤 Ant Design React 兼容性警告
      if (
        message.includes('[antd: compatible]') ||
        message.includes('antd v5 support React is 16 ~ 18') ||
        message.includes('see https://u.ant.design/v5-for-19')
      ) {
        // 静默忽略这些警告
        return;
      }
      
      // 过滤其他已知的无害警告
      if (
        message.includes('Warning: [antd: compatible]') ||
        message.includes('compatible.at createConsoleError')
      ) {
        return;
      }
    }
    
    // 对于其他错误，正常输出
    originalConsoleError.apply(console, args);
  };
  
  // 同样处理 console.warn
  const originalConsoleWarn = console.warn;
  console.warn = function(...args) {
    const message = args[0];
    
    if (typeof message === 'string') {
      // 过滤 Ant Design 相关警告
      if (
        message.includes('[antd: compatible]') ||
        message.includes('antd v5 support React')
      ) {
        return;
      }
    }
    
    originalConsoleWarn.apply(console, args);
  };
  
  console.log('🔇 已启用开发环境警告过滤器 (Ant Design React 19 兼容性警告已抑制)');
}