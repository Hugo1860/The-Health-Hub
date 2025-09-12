// 分享卡片功能初始化

import { ShareCardService } from './share-card-service';
import { CanvasPool } from './canvas-pool';
import { ImageCache } from './image-cache';
import { MemoryManager } from './memory-manager';

let isInitialized = false;

/**
 * 初始化分享卡片功能
 */
export async function initializeShareCard(): Promise<void> {
  if (isInitialized) {
    return;
  }

  try {
    console.log('Initializing ShareCard functionality...');

    // 检查浏览器兼容性
    const compatibility = await checkBrowserCompatibility();
    console.log('Browser compatibility:', compatibility);

    // 预热服务
    await ShareCardService.warmUp();

    // 设置性能监控
    setupPerformanceMonitoring();

    isInitialized = true;
    console.log('ShareCard functionality initialized successfully');
  } catch (error) {
    console.error('Failed to initialize ShareCard functionality:', error);
    throw error;
  }
}

/**
 * 检查浏览器兼容性
 */
async function checkBrowserCompatibility(): Promise<{
  canvas: boolean;
  webp: boolean;
  clipboard: boolean;
  share: boolean;
  performance: boolean;
}> {
  const compatibility = {
    canvas: checkCanvasSupport(),
    webp: await checkWebPSupport(),
    clipboard: checkClipboardSupport(),
    share: checkNativeShareSupport(),
    performance: checkPerformanceAPISupport()
  };

  // 记录不支持的功能
  const unsupported = Object.entries(compatibility)
    .filter(([, supported]) => !supported)
    .map(([feature]) => feature);

  if (unsupported.length > 0) {
    console.warn('Unsupported browser features:', unsupported);
  }

  return compatibility;
}

function checkCanvasSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext && canvas.getContext('2d'));
  } catch {
    return false;
  }
}

async function checkWebPSupport(): Promise<boolean> {
  return new Promise((resolve) => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
}

function checkClipboardSupport(): boolean {
  return !!(typeof navigator !== 'undefined' && navigator.clipboard);
}

function checkNativeShareSupport(): boolean {
  return !!(typeof navigator !== 'undefined' && 'share' in navigator);
}

function checkPerformanceAPISupport(): boolean {
  return !!(typeof performance !== 'undefined' && (performance as any).memory);
}

/**
 * 设置性能监控
 */
function setupPerformanceMonitoring(): void {
  // 监听页面可见性变化
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // 页面隐藏时，清理一些资源
        const memoryManager = MemoryManager.getInstance();
        memoryManager.checkMemoryUsage();
      }
    });
  }

  // 监听内存压力事件（如果支持）
  if (typeof window !== 'undefined' && 'onmemorywarning' in window) {
    (window as any).addEventListener('memorywarning', () => {
      console.warn('Memory warning detected, triggering cleanup');
      ShareCardService.cleanup();
    });
  }

  // 定期性能检查
  setInterval(() => {
    const memoryManager = MemoryManager.getInstance();
    memoryManager.checkMemoryUsage();
  }, 60000); // 每分钟检查一次
}

/**
 * 获取初始化状态
 */
export function isShareCardInitialized(): boolean {
  return isInitialized;
}

/**
 * 重置初始化状态（用于测试）
 */
export function resetInitialization(): void {
  isInitialized = false;
}