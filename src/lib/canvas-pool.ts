// Canvas 对象池，用于复用 Canvas 元素，避免频繁创建销毁

export interface CanvasPoolOptions {
  maxSize: number;
  defaultWidth: number;
  defaultHeight: number;
}

export class CanvasPool {
  private static instance: CanvasPool;
  private pool: HTMLCanvasElement[] = [];
  private inUse: Set<HTMLCanvasElement> = new Set();
  private options: CanvasPoolOptions;

  private constructor(options: CanvasPoolOptions) {
    this.options = options;
  }

  static getInstance(options?: CanvasPoolOptions): CanvasPool {
    if (!CanvasPool.instance) {
      CanvasPool.instance = new CanvasPool(options || {
        maxSize: 10,
        defaultWidth: 1080,
        defaultHeight: 1080
      });
    }
    return CanvasPool.instance;
  }

  /**
   * 获取一个 Canvas 元素
   */
  acquire(width?: number, height?: number): HTMLCanvasElement {
    let canvas: HTMLCanvasElement;

    // 尝试从池中获取
    if (this.pool.length > 0) {
      canvas = this.pool.pop()!;
    } else {
      // 创建新的 Canvas
      canvas = document.createElement('canvas');
    }

    // 设置尺寸
    const targetWidth = width || this.options.defaultWidth;
    const targetHeight = height || this.options.defaultHeight;
    
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    // 清空画布
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // 标记为使用中
    this.inUse.add(canvas);

    return canvas;
  }

  /**
   * 释放 Canvas 元素回池中
   */
  release(canvas: HTMLCanvasElement): void {
    if (!this.inUse.has(canvas)) {
      console.warn('Trying to release a canvas that is not in use');
      return;
    }

    // 从使用中移除
    this.inUse.delete(canvas);

    // 如果池未满，放回池中
    if (this.pool.length < this.options.maxSize) {
      // 清空画布
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      
      this.pool.push(canvas);
    }
    // 如果池已满，让 Canvas 被垃圾回收
  }

  /**
   * 清空池
   */
  clear(): void {
    this.pool = [];
    this.inUse.clear();
  }

  /**
   * 获取池状态
   */
  getStats(): {
    poolSize: number;
    inUseCount: number;
    maxSize: number;
  } {
    return {
      poolSize: this.pool.length,
      inUseCount: this.inUse.size,
      maxSize: this.options.maxSize
    };
  }

  /**
   * 预热池（预创建一些 Canvas）
   */
  warmUp(count: number = 3): void {
    for (let i = 0; i < count && this.pool.length < this.options.maxSize; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = this.options.defaultWidth;
      canvas.height = this.options.defaultHeight;
      this.pool.push(canvas);
    }
  }
}