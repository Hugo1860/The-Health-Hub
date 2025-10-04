import { AudioFile } from '@/store/audioStore';
import { ShareCardError, ShareCardErrorHandler } from './share-card-errors';
import { CanvasPool } from './canvas-pool';
import { ImageCache } from './image-cache';
import { MemoryManager } from './memory-manager';

export interface TextConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  align: 'left' | 'center' | 'right';
  maxLines: number;
  lineHeight?: number;
}

export interface ImageConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius: number;
  placeholder: string;
}

export interface QRConfig {
  x: number;
  y: number;
  size: number;
  backgroundColor: string;
  padding: number;
  borderRadius?: number;
}

export interface BrandingConfig {
  logo: {
    x: number;
    y: number;
    width: number;
    height: number;
    url: string;
  };
  text: {
    x: number;
    y: number;
    fontSize: number;
    color: string;
    text: string;
    fontFamily: string;
  };
}

export interface LayoutConfig {
  title: TextConfig;
  description: TextConfig;
  qrCode: QRConfig;
  cover: ImageConfig;
  branding: BrandingConfig;
  metadata: {
    duration: TextConfig;
    category: TextConfig;
  };
}

export interface CardTemplate {
  id: string;
  name: string;
  width: number;
  height: number;
  backgroundColor: string;
  backgroundImage?: string;
  layout: LayoutConfig;
}

export class CardTemplateEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private template: CardTemplate;
  private canvasPool: CanvasPool;
  private imageCache: ImageCache;
  private memoryManager: MemoryManager;
  private isCanvasFromPool: boolean = false;

  constructor(template: CardTemplate) {
    this.template = template;
    this.canvasPool = CanvasPool.getInstance();
    this.imageCache = ImageCache.getInstance();
    this.memoryManager = MemoryManager.getInstance();
    
    // 尝试从池中获取 Canvas
    try {
      this.canvas = this.canvasPool.acquire(template.width, template.height);
      this.isCanvasFromPool = true;
    } catch (error) {
      // 降级到创建新的 Canvas
      this.canvas = document.createElement('canvas');
      this.canvas.width = template.width;
      this.canvas.height = template.height;
      this.isCanvasFromPool = false;
    }
    
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas context not available');
    }
    this.ctx = ctx;

    // 注册 Canvas 到内存管理器
    this.memoryManager.registerCanvas(this.canvas);
  }

  async renderCard(audio: AudioFile, qrCodeCanvas: HTMLCanvasElement): Promise<Blob> {
    try {
      // 清空画布
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      // 绘制背景
      await this.drawBackground();
      
      // 绘制封面图片
      if (audio.coverImage) {
        await this.drawCoverImage(audio.coverImage, this.template.layout.cover);
      } else {
        await this.drawCoverImage(this.template.layout.cover.placeholder, this.template.layout.cover);
      }
      
      // 绘制标题
      this.drawTitle(audio.title, this.template.layout.title);
      
      // 绘制描述
      if (audio.description) {
        this.drawDescription(audio.description, this.template.layout.description);
      }
      
      // 绘制二维码
      this.drawQRCode(qrCodeCanvas, this.template.layout.qrCode);
      
      // 绘制品牌信息
      await this.drawBranding(this.template.layout.branding);
      
      // 绘制元数据
      if (audio.duration) {
        this.drawMetadata('时长: ' + this.formatDuration(audio.duration), this.template.layout.metadata.duration);
      }
      
      if (audio.category?.name) {
        this.drawMetadata(audio.category.name, this.template.layout.metadata.category);
      }
      
      // 转换为 Blob
      return new Promise((resolve, reject) => {
        this.canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert canvas to blob'));
          }
        }, 'image/png', 1.0);
      });
    } catch (error) {
      ShareCardErrorHandler.handle(ShareCardError.CARD_GENERATION_FAILED, error);
      throw error;
    }
  }

  private async drawBackground(): Promise<void> {
    // 绘制背景色
    this.ctx.fillStyle = this.template.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 如果有背景图片，绘制背景图片
    if (this.template.backgroundImage) {
      try {
        const img = await this.loadImage(this.template.backgroundImage);
        this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
      } catch (error) {
        console.warn('Failed to load background image:', error);
        // 继续使用背景色
      }
    }
  }

  private drawTitle(text: string, config: TextConfig): void {
    this.ctx.font = `${config.fontSize}px ${config.fontFamily}`;
    this.ctx.fillStyle = config.color;
    this.ctx.textAlign = config.align as CanvasTextAlign;
    
    const lines = this.wrapText(text, config.width, config.fontSize, config.fontFamily);
    const lineHeight = config.lineHeight || config.fontSize * 1.2;
    
    let y = config.y;
    const maxLines = Math.min(lines.length, config.maxLines);
    
    for (let i = 0; i < maxLines; i++) {
      let x = config.x;
      if (config.align === 'center') {
        x = config.x + config.width / 2;
      } else if (config.align === 'right') {
        x = config.x + config.width;
      }
      
      let lineText = lines[i];
      // 如果是最后一行且还有更多文本，添加省略号
      if (i === maxLines - 1 && lines.length > maxLines) {
        lineText = this.truncateWithEllipsis(lineText, config.width, config.fontSize, config.fontFamily);
      }
      
      this.ctx.fillText(lineText, x, y);
      y += lineHeight;
    }
  }

  private drawDescription(text: string, config: TextConfig): void {
    this.ctx.font = `${config.fontSize}px ${config.fontFamily}`;
    this.ctx.fillStyle = config.color;
    this.ctx.textAlign = config.align as CanvasTextAlign;
    
    const lines = this.wrapText(text, config.width, config.fontSize, config.fontFamily);
    const lineHeight = config.lineHeight || config.fontSize * 1.2;
    
    let y = config.y;
    const maxLines = Math.min(lines.length, config.maxLines);
    
    for (let i = 0; i < maxLines; i++) {
      let x = config.x;
      if (config.align === 'center') {
        x = config.x + config.width / 2;
      } else if (config.align === 'right') {
        x = config.x + config.width;
      }
      
      let lineText = lines[i];
      // 如果是最后一行且还有更多文本，添加省略号
      if (i === maxLines - 1 && lines.length > maxLines) {
        lineText = this.truncateWithEllipsis(lineText, config.width, config.fontSize, config.fontFamily);
      }
      
      this.ctx.fillText(lineText, x, y);
      y += lineHeight;
    }
  }

  private async drawCoverImage(imageUrl: string, config: ImageConfig): Promise<void> {
    try {
      const img = await this.loadImage(imageUrl);
      
      // 保存当前状态
      this.ctx.save();
      
      // 如果有圆角，创建圆角路径
      if (config.borderRadius > 0) {
        this.createRoundedRectPath(config.x, config.y, config.width, config.height, config.borderRadius);
        this.ctx.clip();
      }
      
      // 计算图片缩放以适应容器
      const scale = Math.max(config.width / img.width, config.height / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      
      // 居中绘制
      const offsetX = config.x + (config.width - scaledWidth) / 2;
      const offsetY = config.y + (config.height - scaledHeight) / 2;
      
      this.ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
      
      // 恢复状态
      this.ctx.restore();
    } catch (error) {
      ShareCardErrorHandler.handle(ShareCardError.IMAGE_LOAD_FAILED, error);
      // 绘制占位符
      this.drawImagePlaceholder(config);
    }
  }

  private drawQRCode(qrCanvas: HTMLCanvasElement, config: QRConfig): void {
    // 绘制二维码背景
    this.ctx.fillStyle = config.backgroundColor;
    
    if (config.borderRadius && config.borderRadius > 0) {
      this.createRoundedRectPath(
        config.x - config.padding,
        config.y - config.padding,
        config.size + config.padding * 2,
        config.size + config.padding * 2,
        config.borderRadius
      );
      this.ctx.fill();
    } else {
      this.ctx.fillRect(
        config.x - config.padding,
        config.y - config.padding,
        config.size + config.padding * 2,
        config.size + config.padding * 2
      );
    }
    
    // 绘制二维码
    this.ctx.drawImage(qrCanvas, config.x, config.y, config.size, config.size);
  }

  private async drawBranding(config: BrandingConfig): Promise<void> {
    // 绘制品牌 Logo
    if (config.logo.url) {
      try {
        const logo = await this.loadImage(config.logo.url);
        this.ctx.drawImage(logo, config.logo.x, config.logo.y, config.logo.width, config.logo.height);
      } catch (error) {
        console.warn('Failed to load brand logo:', error);
      }
    }
    
    // 绘制品牌文字
    this.ctx.font = `${config.text.fontSize}px ${config.text.fontFamily}`;
    this.ctx.fillStyle = config.text.color;
    this.ctx.textAlign = 'left';
    this.ctx.fillText(config.text.text, config.text.x, config.text.y);
  }

  private drawMetadata(text: string, config: TextConfig): void {
    this.ctx.font = `${config.fontSize}px ${config.fontFamily}`;
    this.ctx.fillStyle = config.color;
    this.ctx.textAlign = config.align as CanvasTextAlign;
    
    let x = config.x;
    if (config.align === 'center') {
      x = config.x + config.width / 2;
    } else if (config.align === 'right') {
      x = config.x + config.width;
    }
    
    this.ctx.fillText(text, x, config.y);
  }

  private drawImagePlaceholder(config: ImageConfig): void {
    // 绘制占位符背景
    this.ctx.fillStyle = '#f0f0f0';
    this.ctx.fillRect(config.x, config.y, config.width, config.height);
    
    // 绘制占位符图标
    this.ctx.fillStyle = '#cccccc';
    this.ctx.font = `${Math.min(config.width, config.height) / 3}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🎵', config.x + config.width / 2, config.y + config.height / 2);
  }

  private createRoundedRectPath(x: number, y: number, width: number, height: number, radius: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }

  private wrapText(text: string, maxWidth: number, fontSize: number, fontFamily: string): string[] {
    this.ctx.font = `${fontSize}px ${fontFamily}`;
    
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = this.ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  }

  private truncateWithEllipsis(text: string, maxWidth: number, fontSize: number, fontFamily: string): string {
    this.ctx.font = `${fontSize}px ${fontFamily}`;
    
    if (this.ctx.measureText(text).width <= maxWidth) {
      return text;
    }
    
    let truncated = text;
    while (truncated.length > 0) {
      const testText = truncated + '...';
      if (this.ctx.measureText(testText).width <= maxWidth) {
        return testText;
      }
      truncated = truncated.slice(0, -1);
    }
    
    return '...';
  }

  private async loadImage(src: string): Promise<HTMLImageElement> {
    try {
      // 尝试从缓存加载
      const cachedImage = this.imageCache.getCachedImage(src);
      if (cachedImage) {
        return cachedImage;
      }

      // 从缓存加载（会自动缓存）
      const image = await this.imageCache.loadImage(src);
      
      // 更新内存估算
      this.memoryManager.addImageMemory(image.width, image.height);
      
      return image;
    } catch (error) {
      throw new Error(`Failed to load image: ${src}`);
    }
  }

  private formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getDataURL(): string {
    return this.canvas.toDataURL('image/png', 1.0);
  }

  /**
   * 清理资源
   */
  dispose(): void {
    // 如果 Canvas 来自池，释放回池中
    if (this.isCanvasFromPool) {
      this.canvasPool.release(this.canvas);
    }
    
    // 清理 Canvas 引用
    (this.canvas as any) = null;
    (this.ctx as any) = null;
  }
}