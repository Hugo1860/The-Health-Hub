import { AudioFile } from '@/store/audioStore';
import { QRCodeGenerator } from './qrcode-generator';
import { CardTemplateEngine, CardTemplate } from './card-template-engine';
import { CardTemplateManager } from './card-templates';
import { ShareCardError, ShareCardErrorHandler } from './share-card-errors';
import { MemoryManager } from './memory-manager';
import { ImageCache } from './image-cache';

export interface ShareCardOptions {
  template?: CardTemplate;
  qrOptions?: {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    margin?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  };
  onProgress?: (step: string, progress: number) => void;
}

export interface ShareCardResult {
  blob: Blob;
  url: string;
  template: CardTemplate;
}

export class ShareCardService {
  /**
   * 生成分享卡片
   */
  static async generateShareCard(
    audio: AudioFile,
    options: ShareCardOptions = {}
  ): Promise<ShareCardResult> {
    const { template, qrOptions, onProgress } = options;

    try {
      // 进度回调函数
      const updateProgress = (step: string, progress: number) => {
        onProgress?.(step, progress);
      };

      updateProgress('验证数据...', 10);

      // 验证 Canvas 支持
      if (!ShareCardErrorHandler.isCanvasSupported()) {
        throw new Error(ShareCardError.CANVAS_NOT_SUPPORTED);
      }

      // 验证音频数据
      if (!ShareCardErrorHandler.validateAudioData(audio)) {
        throw new Error(ShareCardError.INVALID_AUDIO_DATA);
      }

      updateProgress('准备模板...', 20);

      // 获取模板
      const selectedTemplate = template || CardTemplateManager.getDefaultTemplate();
      if (!CardTemplateManager.validateTemplate(selectedTemplate)) {
        throw new Error('Invalid template configuration');
      }

      updateProgress('生成二维码...', 40);

      // 生成二维码
      const qrCanvas = await QRCodeGenerator.generateAudioShareQR(
        audio.id,
        typeof window !== 'undefined' ? window.location.origin : undefined,
        selectedTemplate.layout.qrCode.size,
        {
          errorCorrectionLevel: qrOptions?.errorCorrectionLevel || 'M',
          margin: qrOptions?.margin || 0,
          color: qrOptions?.color || {
            dark: '#000000',
            light: '#FFFFFF'
          }
        }
      );

      updateProgress('渲染卡片...', 60);

      // 创建模板引擎并渲染卡片
      const templateEngine = new CardTemplateEngine(selectedTemplate);
      
      updateProgress('合成图片...', 80);
      
      const imageBlob = await templateEngine.renderCard(audio, qrCanvas);
      
      // 清理模板引擎资源
      templateEngine.dispose();
      
      updateProgress('完成生成...', 90);

      // 创建图片 URL
      const imageUrl = URL.createObjectURL(imageBlob);
      
      // 注册到内存管理器
      const memoryManager = MemoryManager.getInstance();
      memoryManager.registerBlobUrl(imageUrl);

      updateProgress('生成完成', 100);

      return {
        blob: imageBlob,
        url: imageUrl,
        template: selectedTemplate
      };

    } catch (error) {
      console.error('Card generation failed:', error);
      
      let errorType = ShareCardError.CARD_GENERATION_FAILED;
      
      if (error instanceof Error) {
        if (error.message.includes('QR')) {
          errorType = ShareCardError.QR_GENERATION_FAILED;
        } else if (error.message.includes('Canvas')) {
          errorType = ShareCardError.CANVAS_NOT_SUPPORTED;
        } else if (error.message.includes('Invalid')) {
          errorType = ShareCardError.INVALID_AUDIO_DATA;
        }
      }

      ShareCardErrorHandler.handle(errorType, error);
      throw error;
    }
  }

  /**
   * 批量生成多个模板的分享卡片
   */
  static async generateMultipleCards(
    audio: AudioFile,
    templates: CardTemplate[],
    options: Omit<ShareCardOptions, 'template'> = {}
  ): Promise<ShareCardResult[]> {
    const results: ShareCardResult[] = [];
    
    for (let i = 0; i < templates.length; i++) {
      const template = templates[i];
      const templateProgress = (i / templates.length) * 100;
      
      options.onProgress?.(`生成模板 ${i + 1}/${templates.length}`, templateProgress);
      
      try {
        const result = await this.generateShareCard(audio, {
          ...options,
          template,
          onProgress: (step, progress) => {
            const totalProgress = templateProgress + (progress / templates.length);
            options.onProgress?.(step, totalProgress);
          }
        });
        
        results.push(result);
      } catch (error) {
        console.error(`Failed to generate card with template ${template.id}:`, error);
        // 继续生成其他模板，不中断整个过程
      }
    }
    
    return results;
  }

  /**
   * 预览模板效果（生成小尺寸预览图）
   */
  static async generatePreview(
    audio: AudioFile,
    template: CardTemplate,
    previewSize: number = 300
  ): Promise<string> {
    // 创建缩小版本的模板
    const scale = previewSize / Math.max(template.width, template.height);
    const previewTemplate: CardTemplate = {
      ...template,
      width: Math.round(template.width * scale),
      height: Math.round(template.height * scale),
      layout: {
        ...template.layout,
        title: {
          ...template.layout.title,
          x: Math.round(template.layout.title.x * scale),
          y: Math.round(template.layout.title.y * scale),
          width: Math.round(template.layout.title.width * scale),
          height: Math.round(template.layout.title.height * scale),
          fontSize: Math.round(template.layout.title.fontSize * scale)
        },
        description: {
          ...template.layout.description,
          x: Math.round(template.layout.description.x * scale),
          y: Math.round(template.layout.description.y * scale),
          width: Math.round(template.layout.description.width * scale),
          height: Math.round(template.layout.description.height * scale),
          fontSize: Math.round(template.layout.description.fontSize * scale)
        },
        qrCode: {
          ...template.layout.qrCode,
          x: Math.round(template.layout.qrCode.x * scale),
          y: Math.round(template.layout.qrCode.y * scale),
          size: Math.round(template.layout.qrCode.size * scale),
          padding: Math.round(template.layout.qrCode.padding * scale)
        },
        cover: {
          ...template.layout.cover,
          x: Math.round(template.layout.cover.x * scale),
          y: Math.round(template.layout.cover.y * scale),
          width: Math.round(template.layout.cover.width * scale),
          height: Math.round(template.layout.cover.height * scale),
          borderRadius: Math.round(template.layout.cover.borderRadius * scale)
        },
        branding: {
          logo: {
            ...template.layout.branding.logo,
            x: Math.round(template.layout.branding.logo.x * scale),
            y: Math.round(template.layout.branding.logo.y * scale),
            width: Math.round(template.layout.branding.logo.width * scale),
            height: Math.round(template.layout.branding.logo.height * scale)
          },
          text: {
            ...template.layout.branding.text,
            x: Math.round(template.layout.branding.text.x * scale),
            y: Math.round(template.layout.branding.text.y * scale),
            fontSize: Math.round(template.layout.branding.text.fontSize * scale)
          }
        },
        metadata: {
          duration: {
            ...template.layout.metadata.duration,
            x: Math.round(template.layout.metadata.duration.x * scale),
            y: Math.round(template.layout.metadata.duration.y * scale),
            width: Math.round(template.layout.metadata.duration.width * scale),
            height: Math.round(template.layout.metadata.duration.height * scale),
            fontSize: Math.round(template.layout.metadata.duration.fontSize * scale)
          },
          category: {
            ...template.layout.metadata.category,
            x: Math.round(template.layout.metadata.category.x * scale),
            y: Math.round(template.layout.metadata.category.y * scale),
            width: Math.round(template.layout.metadata.category.width * scale),
            height: Math.round(template.layout.metadata.category.height * scale),
            fontSize: Math.round(template.layout.metadata.category.fontSize * scale)
          }
        }
      }
    };

    const result = await this.generateShareCard(audio, { template: previewTemplate });
    return result.url;
  }

  /**
   * 清理生成的 URL 资源
   */
  static cleanupUrl(url: string): void {
    const memoryManager = MemoryManager.getInstance();
    memoryManager.cleanupBlobUrl(url);
  }

  /**
   * 预热缓存和对象池
   */
  static async warmUp(): Promise<void> {
    try {
      // 预热 Canvas 池
      const canvasPool = CanvasPool.getInstance();
      canvasPool.warmUp(3);

      // 预加载常用图片
      const imageCache = ImageCache.getInstance();
      const commonImages = [
        // 这里可以添加常用的品牌图片、占位符等
      ];
      
      if (commonImages.length > 0) {
        await imageCache.preloadImages(commonImages);
      }

      console.log('ShareCard service warmed up successfully');
    } catch (error) {
      console.warn('Failed to warm up ShareCard service:', error);
    }
  }

  /**
   * 获取性能统计信息
   */
  static getPerformanceStats(): {
    memory: any;
    canvas: any;
    imageCache: any;
  } {
    const memoryManager = MemoryManager.getInstance();
    const canvasPool = CanvasPool.getInstance();
    const imageCache = ImageCache.getInstance();

    return {
      memory: memoryManager.getMemoryStats(),
      canvas: canvasPool.getStats(),
      imageCache: imageCache.getStats()
    };
  }

  /**
   * 清理所有资源
   */
  static cleanup(): void {
    const memoryManager = MemoryManager.getInstance();
    const canvasPool = CanvasPool.getInstance();
    const imageCache = ImageCache.getInstance();

    memoryManager.cleanup();
    canvasPool.clear();
    imageCache.clear();
  }
}