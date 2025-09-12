import { useState, useEffect } from 'react';

export interface ResponsiveInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
}

export const useResponsive = (): ResponsiveInfo => {
  const [responsiveInfo, setResponsiveInfo] = useState<ResponsiveInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    screenWidth: 1920,
    screenHeight: 1080,
    orientation: 'landscape'
  });

  useEffect(() => {
    const updateResponsiveInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;
      const isDesktop = width >= 1024;
      const orientation = width > height ? 'landscape' : 'portrait';

      setResponsiveInfo({
        isMobile,
        isTablet,
        isDesktop,
        screenWidth: width,
        screenHeight: height,
        orientation
      });
    };

    // 初始化
    updateResponsiveInfo();

    // 监听窗口大小变化
    window.addEventListener('resize', updateResponsiveInfo);
    
    // 监听屏幕方向变化
    window.addEventListener('orientationchange', () => {
      // 延迟执行，等待方向变化完成
      setTimeout(updateResponsiveInfo, 100);
    });

    return () => {
      window.removeEventListener('resize', updateResponsiveInfo);
      window.removeEventListener('orientationchange', updateResponsiveInfo);
    };
  }, []);

  return responsiveInfo;
};

// 检测是否为触摸设备
export const useTouchDevice = (): boolean => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouchDevice = () => {
      return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        (navigator as any).msMaxTouchPoints > 0
      );
    };

    setIsTouchDevice(checkTouchDevice());
  }, []);

  return isTouchDevice;
};

// 获取安全区域信息（用于处理刘海屏等）
export const useSafeArea = () => {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  });

  useEffect(() => {
    const updateSafeArea = () => {
      const computedStyle = getComputedStyle(document.documentElement);
      
      setSafeArea({
        top: parseInt(computedStyle.getPropertyValue('--sat') || '0', 10),
        right: parseInt(computedStyle.getPropertyValue('--sar') || '0', 10),
        bottom: parseInt(computedStyle.getPropertyValue('--sab') || '0', 10),
        left: parseInt(computedStyle.getPropertyValue('--sal') || '0', 10)
      });
    };

    updateSafeArea();
    window.addEventListener('resize', updateSafeArea);
    
    return () => {
      window.removeEventListener('resize', updateSafeArea);
    };
  }, []);

  return safeArea;
};