// 分享卡片功能的实际测试

import { QRCodeGenerator } from '../qrcode-generator';
import { ShareCardErrorHandler, ShareCardError } from '../share-card-errors';
import { CardTemplateManager } from '../card-templates';
import { CanvasPool } from '../canvas-pool';
import { ImageCache } from '../image-cache';
import { MemoryManager } from '../memory-manager';

// 简单的测试断言函数
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message || ''} - Expected ${expected}, got ${actual}`);
  }
}

function assertNotNull<T>(value: T | null | undefined, message?: string): void {
  if (value === null || value === undefined) {
    throw new Error(`Assertion failed: ${message || 'Value should not be null/undefined'}`);
  }
}

// 测试结果收集
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

class TestRunner {
  private results: TestResult[] = [];

  async runTest(name: string, testFn: () => void | Promise<void>): Promise<void> {
    const startTime = Date.now();
    
    try {
      await testFn();
      this.results.push({
        name,
        passed: true,
        duration: Date.now() - startTime
      });
      console.log(`✅ ${name}`);
    } catch (error) {
      this.results.push({
        name,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      });
      console.log(`❌ ${name}: ${error instanceof Error ? error.message : error}`);
    }
  }

  getResults(): TestResult[] {
    return this.results;
  }

  printSummary(): void {
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    
    console.log('\n📊 Test Summary:');
    console.log(`   Passed: ${passed}/${total}`);
    console.log(`   Failed: ${total - passed}/${total}`);
    
    if (passed === total) {
      console.log('🎉 All tests passed!');
    } else {
      console.log('⚠️  Some tests failed');
    }
  }
}

// 运行所有测试
export async function runShareCardTests(): Promise<void> {
  console.log('🧪 Running ShareCard Tests...\n');
  
  const runner = new TestRunner();

  // QRCodeGenerator 测试
  await runner.runTest('QRCodeGenerator.validateUrl - valid URLs', () => {
    assert(QRCodeGenerator.validateUrl('https://example.com'), 'Should validate https URL');
    assert(QRCodeGenerator.validateUrl('http://localhost:3000'), 'Should validate http URL');
  });

  await runner.runTest('QRCodeGenerator.validateUrl - invalid URLs', () => {
    assert(!QRCodeGenerator.validateUrl('invalid-url'), 'Should reject invalid URL');
    assert(!QRCodeGenerator.validateUrl(''), 'Should reject empty URL');
  });

  await runner.runTest('QRCodeGenerator.generateFallbackQRUrl', () => {
    const url = 'https://example.com/audio/123';
    const result = QRCodeGenerator.generateFallbackQRUrl(url, 300);
    
    assert(result.includes('api.qrserver.com'), 'Should use QR server API');
    assert(result.includes('300x300'), 'Should include size parameter');
    assert(result.includes(encodeURIComponent(url)), 'Should include encoded URL');
  });

  // ShareCardErrorHandler 测试
  await runner.runTest('ShareCardErrorHandler.getErrorMessage', () => {
    const message = ShareCardErrorHandler.getErrorMessage(ShareCardError.QR_GENERATION_FAILED);
    assert(message.length > 0, 'Should return non-empty error message');
    assert(message.includes('二维码'), 'Should contain relevant Chinese text');
  });

  await runner.runTest('ShareCardErrorHandler.validateAudioData - valid data', () => {
    const validAudio = {
      id: '123',
      title: 'Test Audio',
      description: 'Test Description'
    };
    
    assert(ShareCardErrorHandler.validateAudioData(validAudio), 'Should validate correct audio data');
  });

  await runner.runTest('ShareCardErrorHandler.validateAudioData - invalid data', () => {
    assert(!ShareCardErrorHandler.validateAudioData(null), 'Should reject null');
    assert(!ShareCardErrorHandler.validateAudioData({}), 'Should reject empty object');
    assert(!ShareCardErrorHandler.validateAudioData({ id: '' }), 'Should reject empty id');
  });

  await runner.runTest('ShareCardErrorHandler.isCanvasSupported', () => {
    // 在测试环境中，我们模拟 Canvas 支持
    const supported = ShareCardErrorHandler.isCanvasSupported();
    // 这个测试可能在不同环境中有不同结果，所以我们只检查它返回布尔值
    assert(typeof supported === 'boolean', 'Should return boolean value');
  });

  // CardTemplateManager 测试
  await runner.runTest('CardTemplateManager.getTemplate', () => {
    const template = CardTemplateManager.getTemplate('classic');
    assertNotNull(template, 'Should return classic template');
    assertEqual(template!.id, 'classic', 'Should have correct template id');
  });

  await runner.runTest('CardTemplateManager.getTemplate - non-existing', () => {
    const template = CardTemplateManager.getTemplate('non-existing');
    assert(template === undefined, 'Should return undefined for non-existing template');
  });

  await runner.runTest('CardTemplateManager.getAllTemplates', () => {
    const templates = CardTemplateManager.getAllTemplates();
    assert(templates.length > 0, 'Should return at least one template');
    
    const templateIds = templates.map(t => t.id);
    assert(templateIds.includes('classic'), 'Should include classic template');
    assert(templateIds.includes('modern'), 'Should include modern template');
  });

  await runner.runTest('CardTemplateManager.validateTemplate', () => {
    const validTemplate = CardTemplateManager.getDefaultTemplate();
    assert(CardTemplateManager.validateTemplate(validTemplate), 'Should validate default template');
    
    const invalidTemplate = {
      id: '',
      name: '',
      width: 0,
      height: 0
    } as any;
    
    assert(!CardTemplateManager.validateTemplate(invalidTemplate), 'Should reject invalid template');
  });

  // CanvasPool 测试
  await runner.runTest('CanvasPool.getInstance', () => {
    const pool1 = CanvasPool.getInstance();
    const pool2 = CanvasPool.getInstance();
    assert(pool1 === pool2, 'Should return same instance (singleton)');
  });

  await runner.runTest('CanvasPool.getStats', () => {
    const pool = CanvasPool.getInstance();
    const stats = pool.getStats();
    
    assert(typeof stats.poolSize === 'number', 'Should have poolSize');
    assert(typeof stats.inUseCount === 'number', 'Should have inUseCount');
    assert(typeof stats.maxSize === 'number', 'Should have maxSize');
  });

  // ImageCache 测试
  await runner.runTest('ImageCache.getInstance', () => {
    const cache1 = ImageCache.getInstance();
    const cache2 = ImageCache.getInstance();
    assert(cache1 === cache2, 'Should return same instance (singleton)');
  });

  await runner.runTest('ImageCache.getStats', () => {
    const cache = ImageCache.getInstance();
    const stats = cache.getStats();
    
    assert(typeof stats.cacheSize === 'number', 'Should have cacheSize');
    assert(typeof stats.totalSize === 'number', 'Should have totalSize');
    assert(typeof stats.maxSize === 'number', 'Should have maxSize');
    assert(typeof stats.hitRate === 'number', 'Should have hitRate');
  });

  await runner.runTest('ImageCache.getCachedImage - non-existing', () => {
    const cache = ImageCache.getInstance();
    const result = cache.getCachedImage('non-existing-url');
    assert(result === null, 'Should return null for non-cached image');
  });

  // MemoryManager 测试
  await runner.runTest('MemoryManager.getInstance', () => {
    const manager1 = MemoryManager.getInstance();
    const manager2 = MemoryManager.getInstance();
    assert(manager1 === manager2, 'Should return same instance (singleton)');
  });

  await runner.runTest('MemoryManager.getMemoryStats', () => {
    const manager = MemoryManager.getInstance();
    const stats = manager.getMemoryStats();
    
    assert(typeof stats.estimatedImageMemory === 'number', 'Should have estimatedImageMemory');
    assert(typeof stats.canvasCount === 'number', 'Should have canvasCount');
    assert(typeof stats.blobUrls === 'number', 'Should have blobUrls');
  });

  await runner.runTest('MemoryManager.registerBlobUrl', () => {
    const manager = MemoryManager.getInstance();
    const statsBefore = manager.getMemoryStats();
    
    manager.registerBlobUrl('blob:test-url');
    
    const statsAfter = manager.getMemoryStats();
    assert(statsAfter.blobUrls > statsBefore.blobUrls, 'Should increase blob URL count');
  });

  await runner.runTest('MemoryManager.addImageMemory', () => {
    const manager = MemoryManager.getInstance();
    const statsBefore = manager.getMemoryStats();
    
    manager.addImageMemory(1920, 1080, 4);
    
    const statsAfter = manager.getMemoryStats();
    assert(statsAfter.estimatedImageMemory > statsBefore.estimatedImageMemory, 'Should increase image memory estimate');
  });

  // 集成测试
  await runner.runTest('Integration - Template and Canvas Pool', () => {
    const template = CardTemplateManager.getDefaultTemplate();
    const pool = CanvasPool.getInstance();
    
    // 清空池以确保测试独立性
    pool.clear();
    
    const canvas = pool.acquire(template.width, template.height);
    assertNotNull(canvas, 'Should acquire canvas from pool');
    assertEqual(canvas.width, template.width, 'Canvas should have template width');
    assertEqual(canvas.height, template.height, 'Canvas should have template height');
    
    pool.release(canvas);
  });

  runner.printSummary();
}

// 如果直接运行此文件
if (typeof window !== 'undefined') {
  // 在浏览器环境中运行
  (window as any).runShareCardTests = runShareCardTests;
  console.log('ShareCard tests loaded. Run runShareCardTests() to execute tests.');
}