import * as QRCode from 'qrcode';

export interface QROptions {
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
  width?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

export class QRCodeGenerator {
  /**
   * 生成二维码并返回 Canvas 元素
   */
  static async generateQRCode(
    url: string, 
    size: number = 200, 
    options: QROptions = {}
  ): Promise<HTMLCanvasElement> {
    try {
      const canvas = document.createElement('canvas');
      
      const qrOptions = {
        errorCorrectionLevel: options.errorCorrectionLevel || 'M',
        margin: options.margin || 4,
        width: options.width || size,
        color: {
          dark: options.color?.dark || '#000000',
          light: options.color?.light || '#FFFFFF'
        }
      };

      await QRCode.toCanvas(canvas, url, qrOptions);
      return canvas;
    } catch (error) {
      console.error('QR Code generation failed:', error);
      throw new Error(`Failed to generate QR code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 生成二维码并返回 Data URL
   */
  static async generateQRCodeDataURL(
    url: string, 
    size: number = 200, 
    options: QROptions = {}
  ): Promise<string> {
    try {
      const qrOptions = {
        errorCorrectionLevel: options.errorCorrectionLevel || 'M',
        margin: options.margin || 4,
        width: options.width || size,
        color: {
          dark: options.color?.dark || '#000000',
          light: options.color?.light || '#FFFFFF'
        }
      };

      return await QRCode.toDataURL(url, qrOptions);
    } catch (error) {
      console.error('QR Code data URL generation failed:', error);
      throw new Error(`Failed to generate QR code data URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 验证 URL 是否有效
   */
  static validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 生成音频分享链接的二维码（带验证）
   */
  static async generateAudioShareQR(
    audioId: string,
    baseUrl?: string,
    size: number = 200,
    options: QROptions = {}
  ): Promise<HTMLCanvasElement> {
    // 构建音频分享链接
    const shareUrl = baseUrl 
      ? `${baseUrl}/audio/${audioId}`
      : `${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/audio/${audioId}`;

    // 验证 URL
    if (!this.validateUrl(shareUrl)) {
      throw new Error('Invalid share URL generated');
    }

    return this.generateQRCode(shareUrl, size, options);
  }

  /**
   * 使用在线服务作为降级方案
   */
  static generateFallbackQRUrl(url: string, size: number = 200): string {
    const encodedUrl = encodeURIComponent(url);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedUrl}`;
  }

  /**
   * 带降级方案的二维码生成
   */
  static async generateQRCodeWithFallback(
    url: string,
    size: number = 200,
    options: QROptions = {}
  ): Promise<HTMLCanvasElement | string> {
    try {
      // 首先尝试本地生成
      return await this.generateQRCode(url, size, options);
    } catch (error) {
      console.warn('Local QR generation failed, using fallback service:', error);
      // 降级到在线服务
      return this.generateFallbackQRUrl(url, size);
    }
  }
}