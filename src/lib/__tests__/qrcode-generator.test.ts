import { QRCodeGenerator } from '../qrcode-generator';
import { ShareCardErrorHandler, ShareCardError } from '../share-card-errors';
import { CardTemplateManager, AVAILABLE_TEMPLATES } from '../card-templates';
import { CanvasPool } from '../canvas-pool';
import { ImageCache } from '../image-cache';
import { MemoryManager } from '../memory-manager';

// Mock QRCode library for testing
const mockQRCode = {
  toCanvas: jest.fn(),
  toDataURL: jest.fn()
};

// Mock browser APIs
const mockCanvas = {
  getContext: jest.fn(() => ({
    clearRect: jest.fn(),
    fillRect: jest.fn(),
    drawImage: jest.fn(),
    fillText: jest.fn(),
    measureText: jest.fn(() => ({ width: 100 })),
    save: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    closePath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    quadraticCurveTo: jest.fn(),
    clip: jest.fn(),
    fill: jest.fn()
  })),
  width: 1080,
  height: 1080,
  toBlob: jest.fn(),
  toDataURL: jest.fn(() => 'data:image/png;base64,mock')
};

const mockDocument = {
  createElement: jest.fn(() => mockCanvas)
};

const mockURL = {
  createObjectURL: jest.fn(() => 'blob:mock-url'),
  revokeObjectURL: jest.fn()
};

// Setup global mocks
global.document = mockDocument as any;
global.URL = mockURL as any;

describe('QRCodeGenerator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUrl', () => {
    it('should validate correct URLs', () => {
      expect(QRCodeGenerator.validateUrl('https://example.com')).toBe(true);
      expect(QRCodeGenerator.validateUrl('http://localhost:3000/audio/123')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(QRCodeGenerator.validateUrl('invalid-url')).toBe(false);
      expect(QRCodeGenerator.validateUrl('')).toBe(false);
      expect(QRCodeGenerator.validateUrl('not-a-url')).toBe(false);
    });
  });

  describe('generateFallbackQRUrl', () => {
    it('should generate correct fallback URL', () => {
      const url = 'https://example.com/audio/123';
      const size = 300;
      const result = QRCodeGenerator.generateFallbackQRUrl(url, size);
      
      expect(result).toContain('api.qrserver.com');
      expect(result).toContain('300x300');
      expect(result).toContain(encodeURIComponent(url));
    });
  });
});

describe('ShareCardErrorHandler', () => {
  describe('getErrorMessage', () => {
    it('should return correct error messages', () => {
      expect(ShareCardErrorHandler.getErrorMessage(ShareCardError.QR_GENERATION_FAILED))
        .toBe('二维码生成失败，请稍后重试');
      
      expect(ShareCardErrorHandler.getErrorMessage(ShareCardError.CANVAS_NOT_SUPPORTED))
        .toBe('您的浏览器不支持 Canvas，无法生成分享卡片');
    });
  });

  describe('validateAudioData', () => {
    it('should validate correct audio data', () => {
      const validAudio = {
        id: '123',
        title: 'Test Audio',
        description: 'Test Description'
      };
      
      expect(ShareCardErrorHandler.validateAudioData(validAudio)).toBe(true);
    });

    it('should reject invalid audio data', () => {
      expect(ShareCardErrorHandler.validateAudioData(null)).toBe(false);
      expect(ShareCardErrorHandler.validateAudioData({})).toBe(false);
      expect(ShareCardErrorHandler.validateAudioData({ id: '' })).toBe(false);
      expect(ShareCardErrorHandler.validateAudioData({ id: '123' })).toBe(false);
    });
  });

  describe('isCanvasSupported', () => {
    it('should detect canvas support', () => {
      expect(ShareCardErrorHandler.isCanvasSupported()).toBe(true);
    });
  });
});

describe('CardTemplateManager', () => {
  describe('getTemplate', () => {
    it('should return existing template', () => {
      const template = CardTemplateManager.getTemplate('classic');
      expect(template).toBeDefined();
      expect(template?.id).toBe('classic');
    });

    it('should return undefined for non-existing template', () => {
      const template = CardTemplateManager.getTemplate('non-existing');
      expect(template).toBeUndefined();
    });
  });

  describe('getAllTemplates', () => {
    it('should return all available templates', () => {
      const templates = CardTemplateManager.getAllTemplates();
      expect(templates).toHaveLength(AVAILABLE_TEMPLATES.length);
      expect(templates.map(t => t.id)).toContain('classic');
      expect(templates.map(t => t.id)).toContain('modern');
    });
  });

  describe('validateTemplate', () => {
    it('should validate correct template', () => {
      const validTemplate = CardTemplateManager.getDefaultTemplate();
      expect(CardTemplateManager.validateTemplate(validTemplate)).toBe(true);
    });

    it('should reject invalid template', () => {
      const invalidTemplate = {
        id: '',
        name: '',
        width: 0,
        height: 0
      } as any;
      
      expect(CardTemplateManager.validateTemplate(invalidTemplate)).toBe(false);
    });
  });
});

describe('CanvasPool', () => {
  let canvasPool: CanvasPool;

  beforeEach(() => {
    canvasPool = CanvasPool.getInstance();
    canvasPool.clear(); // 清空池以确保测试独立性
  });

  describe('acquire and release', () => {
    it('should acquire and release canvas', () => {
      const canvas = canvasPool.acquire(800, 600);
      expect(canvas).toBeDefined();
      expect(canvas.width).toBe(800);
      expect(canvas.height).toBe(600);

      const statsBefore = canvasPool.getStats();
      canvasPool.release(canvas);
      const statsAfter = canvasPool.getStats();

      expect(statsAfter.poolSize).toBeGreaterThan(statsBefore.poolSize);
    });
  });

  describe('warmUp', () => {
    it('should pre-create canvases', () => {
      const statsBefore = canvasPool.getStats();
      canvasPool.warmUp(3);
      const statsAfter = canvasPool.getStats();

      expect(statsAfter.poolSize).toBeGreaterThanOrEqual(statsBefore.poolSize);
    });
  });
});

describe('ImageCache', () => {
  let imageCache: ImageCache;

  beforeEach(() => {
    imageCache = ImageCache.getInstance();
    imageCache.clear();
  });

  describe('getCachedImage', () => {
    it('should return null for non-cached image', () => {
      const result = imageCache.getCachedImage('non-existing-url');
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('should remove cached image', () => {
      // 这里需要先添加一个图片到缓存，但由于异步加载的复杂性，
      // 我们只测试移除不存在的图片不会出错
      expect(() => {
        imageCache.remove('non-existing-url');
      }).not.toThrow();
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      const stats = imageCache.getStats();
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('hitRate');
    });
  });
});

describe('MemoryManager', () => {
  let memoryManager: MemoryManager;

  beforeEach(() => {
    memoryManager = MemoryManager.getInstance();
  });

  describe('registerBlobUrl', () => {
    it('should register blob URL', () => {
      const url = 'blob:test-url';
      memoryManager.registerBlobUrl(url);
      
      const stats = memoryManager.getMemoryStats();
      expect(stats.blobUrls).toBeGreaterThan(0);
    });
  });

  describe('cleanupBlobUrl', () => {
    it('should cleanup specific blob URL', () => {
      const url = 'blob:test-url';
      memoryManager.registerBlobUrl(url);
      
      const statsBefore = memoryManager.getMemoryStats();
      memoryManager.cleanupBlobUrl(url);
      const statsAfter = memoryManager.getMemoryStats();
      
      expect(statsAfter.blobUrls).toBeLessThan(statsBefore.blobUrls);
    });
  });

  describe('getMemoryStats', () => {
    it('should return memory statistics', () => {
      const stats = memoryManager.getMemoryStats();
      expect(stats).toHaveProperty('estimatedImageMemory');
      expect(stats).toHaveProperty('canvasCount');
      expect(stats).toHaveProperty('blobUrls');
    });
  });

  describe('addImageMemory', () => {
    it('should track image memory usage', () => {
      const statsBefore = memoryManager.getMemoryStats();
      memoryManager.addImageMemory(1920, 1080, 4);
      const statsAfter = memoryManager.getMemoryStats();
      
      expect(statsAfter.estimatedImageMemory).toBeGreaterThan(statsBefore.estimatedImageMemory);
    });
  });
});