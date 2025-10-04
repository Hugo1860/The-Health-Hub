export enum ShareCardError {
  CANVAS_NOT_SUPPORTED = 'CANVAS_NOT_SUPPORTED',
  QR_GENERATION_FAILED = 'QR_GENERATION_FAILED',
  IMAGE_LOAD_FAILED = 'IMAGE_LOAD_FAILED',
  CARD_GENERATION_FAILED = 'CARD_GENERATION_FAILED',
  SAVE_FAILED = 'SAVE_FAILED',
  SHARE_FAILED = 'SHARE_FAILED',
  INVALID_URL = 'INVALID_URL',
  INVALID_AUDIO_DATA = 'INVALID_AUDIO_DATA'
}

export class ShareCardErrorHandler {
  private static errorMessages: Record<ShareCardError, string> = {
    [ShareCardError.CANVAS_NOT_SUPPORTED]: '您的浏览器不支持 Canvas，无法生成分享卡片',
    [ShareCardError.QR_GENERATION_FAILED]: '二维码生成失败，请稍后重试',
    [ShareCardError.IMAGE_LOAD_FAILED]: '图片加载失败，将使用默认图片',
    [ShareCardError.CARD_GENERATION_FAILED]: '分享卡片生成失败，请稍后重试',
    [ShareCardError.SAVE_FAILED]: '保存图片失败，请检查浏览器权限',
    [ShareCardError.SHARE_FAILED]: '分享失败，请尝试复制链接',
    [ShareCardError.INVALID_URL]: '无效的分享链接',
    [ShareCardError.INVALID_AUDIO_DATA]: '音频数据无效，无法生成分享卡片'
  };

  private static errorSolutions: Record<ShareCardError, string> = {
    [ShareCardError.CANVAS_NOT_SUPPORTED]: '请尝试使用现代浏览器（Chrome、Firefox、Safari 等）',
    [ShareCardError.QR_GENERATION_FAILED]: '请检查网络连接，或尝试刷新页面重试',
    [ShareCardError.IMAGE_LOAD_FAILED]: '请检查网络连接，图片将使用默认样式',
    [ShareCardError.CARD_GENERATION_FAILED]: '请尝试选择其他模板，或刷新页面重试',
    [ShareCardError.SAVE_FAILED]: '请确保浏览器允许下载文件，或尝试右键保存图片',
    [ShareCardError.SHARE_FAILED]: '您可以复制链接手动分享，或截图保存分享卡片',
    [ShareCardError.INVALID_URL]: '请刷新页面重试，或联系技术支持',
    [ShareCardError.INVALID_AUDIO_DATA]: '请刷新页面重新加载音频信息'
  };

  static handle(error: ShareCardError, context?: any): void {
    console.error(`ShareCard Error [${error}]:`, context);
    
    // 错误统计
    this.recordError(error, context);
    
    // 这里可以添加错误上报逻辑
    // 例如发送到错误监控服务
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'share_card_error', {
        error_type: error,
        error_context: JSON.stringify(context)
      });
    }
  }

  static getErrorMessage(error: ShareCardError): string {
    return this.errorMessages[error] || '未知错误，请稍后重试';
  }

  static getErrorSolution(error: ShareCardError): string {
    return this.errorSolutions[error] || '请尝试刷新页面重试';
  }

  static showUserFriendlyError(error: ShareCardError, showToast?: (message: string) => void): void {
    const message = this.getErrorMessage(error);
    const solution = this.getErrorSolution(error);
    const fullMessage = `${message}\n\n解决方案：${solution}`;
    
    if (showToast) {
      showToast(fullMessage);
    } else {
      // 降级到 alert
      alert(fullMessage);
    }
  }

  static isCanvasSupported(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext && canvas.getContext('2d'));
    } catch {
      return false;
    }
  }

  static validateAudioData(audio: any): boolean {
    return !!(
      audio &&
      typeof audio.id === 'string' &&
      typeof audio.title === 'string' &&
      audio.id.length > 0 &&
      audio.title.length > 0
    );
  }

  static async checkBrowserCompatibility(): Promise<{
    canvas: boolean;
    webp: boolean;
    clipboard: boolean;
    share: boolean;
  }> {
    const compatibility = {
      canvas: this.isCanvasSupported(),
      webp: await this.checkWebPSupport(),
      clipboard: this.checkClipboardSupport(),
      share: this.checkNativeShareSupport()
    };

    return compatibility;
  }

  private static async checkWebPSupport(): Promise<boolean> {
    return new Promise((resolve) => {
      const webP = new Image();
      webP.onload = webP.onerror = () => {
        resolve(webP.height === 2);
      };
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  }

  private static checkClipboardSupport(): boolean {
    return !!(typeof navigator !== 'undefined' && navigator.clipboard);
  }

  private static checkNativeShareSupport(): boolean {
    return !!(typeof navigator !== 'undefined' && 'share' in navigator);
  }

  private static recordError(error: ShareCardError, context?: any): void {
    try {
      const errorRecord = {
        error,
        context,
        timestamp: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown'
      };

      // 存储到本地存储（用于调试）
      if (typeof localStorage !== 'undefined') {
        const errors = JSON.parse(localStorage.getItem('sharecard_errors') || '[]');
        errors.push(errorRecord);
        
        // 只保留最近的50个错误
        if (errors.length > 50) {
          errors.splice(0, errors.length - 50);
        }
        
        localStorage.setItem('sharecard_errors', JSON.stringify(errors));
      }
    } catch (e) {
      console.warn('Failed to record error:', e);
    }
  }

  static getErrorHistory(): any[] {
    try {
      if (typeof localStorage !== 'undefined') {
        return JSON.parse(localStorage.getItem('sharecard_errors') || '[]');
      }
    } catch (e) {
      console.warn('Failed to get error history:', e);
    }
    return [];
  }

  static clearErrorHistory(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('sharecard_errors');
      }
    } catch (e) {
      console.warn('Failed to clear error history:', e);
    }
  }

  // 重试机制
  static async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (i < maxRetries - 1) {
          // 等待后重试
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }
    
    throw lastError!;
  }
}