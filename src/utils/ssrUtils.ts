/**
 * SSR 相关工具函数
 * 用于处理服务端渲染和客户端渲染的差异
 */

/**
 * 检查是否在浏览器环境中
 */
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined';
};

/**
 * 检查是否在服务端环境中
 */
export const isServer = (): boolean => {
  return typeof window === 'undefined';
};

/**
 * 安全地访问 window 对象
 */
export const safeWindow = (): Window | undefined => {
  return isBrowser() ? window : undefined;
};

/**
 * 安全地访问 document 对象
 */
export const safeDocument = (): Document | undefined => {
  return isBrowser() ? document : undefined;
};

/**
 * 安全地访问 localStorage
 */
export const safeLocalStorage = (): Storage | undefined => {
  try {
    return isBrowser() ? localStorage : undefined;
  } catch (error) {
    console.warn('localStorage is not available:', error);
    return undefined;
  }
};

/**
 * 安全地访问 sessionStorage
 */
export const safeSessionStorage = (): Storage | undefined => {
  try {
    return isBrowser() ? sessionStorage : undefined;
  } catch (error) {
    console.warn('sessionStorage is not available:', error);
    return undefined;
  }
};

/**
 * 延迟执行函数，确保在客户端环境中执行
 */
export const runOnClient = (callback: () => void): void => {
  if (isBrowser()) {
    // 使用 setTimeout 确保在下一个事件循环中执行
    setTimeout(callback, 0);
  }
};

/**
 * 获取安全的用户代理字符串
 */
export const getSafeUserAgent = (): string => {
  const window = safeWindow();
  return window?.navigator?.userAgent || '';
};

/**
 * 检查是否为移动设备（SSR 安全）
 */
export const isMobileDevice = (): boolean => {
  const userAgent = getSafeUserAgent();
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
};