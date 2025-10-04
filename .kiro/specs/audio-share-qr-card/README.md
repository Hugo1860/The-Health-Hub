# 音频分享二维码卡片功能

## 📋 项目概述

音频分享二维码卡片功能为健闻局平台提供了一个强大的分享工具，用户可以生成包含音频信息和二维码的精美图片卡片，大大提升了分享体验和品牌传播效果。

## ✨ 核心功能

### 🎨 精美模板
- **经典模板**: 简洁的白色背景，左侧音频信息，右侧二维码
- **现代模板**: 渐变背景，居中布局，圆形二维码
- **医学专业模板**: 医学主题色彩，专业图标装饰
- **简约模板**: 极简设计，只包含核心信息

### 📱 响应式设计
- **桌面端**: 完整的模态框界面，支持模板对比功能
- **移动端**: 底部抽屉式界面，优化触摸操作
- **平板端**: 自适应布局，兼顾触摸和鼠标操作

### ⚡ 高性能优化
- **Canvas 对象池**: 复用 Canvas 元素，减少创建销毁开销
- **图片缓存**: LRU 缓存策略，提升重复访问速度
- **内存管理**: 自动清理 Blob URLs，防止内存泄漏
- **异步渲染**: 非阻塞式图片生成，保持界面响应

## 🚀 快速开始

### 基本使用

1. **触发分享卡片生成**
   ```tsx
   import ShareButton from '@/components/ShareButton';
   
   <ShareButton
     audioId="audio-123"
     audioTitle="心血管疾病预防"
     audioDescription="详细介绍心血管疾病的预防措施..."
     audioData={audioObject} // 完整的音频数据对象
   />
   ```

2. **直接使用分享卡片服务**
   ```tsx
   import { ShareCardService } from '@/lib/share-card-service';
   
   const result = await ShareCardService.generateShareCard(audioData, {
     template: selectedTemplate,
     onProgress: (step, progress) => {
       console.log(`${step}: ${progress}%`);
     }
   });
   
   // result.blob - 图片 Blob 对象
   // result.url - 图片 URL
   // result.template - 使用的模板
   ```

### 自定义模板

```tsx
import { CardTemplateManager } from '@/lib/card-templates';

// 创建自定义模板
const customTemplate = CardTemplateManager.createCustomTemplate(
  'my-template',
  '我的模板',
  baseTemplate,
  {
    backgroundColor: '#f0f9ff',
    layout: {
      title: {
        fontSize: 52,
        color: '#1e293b'
      }
    }
  }
);
```

## 📁 文件结构

```
src/
├── lib/
│   ├── qrcode-generator.ts          # 二维码生成服务
│   ├── card-template-engine.ts      # 卡片模板渲染引擎
│   ├── card-templates.ts            # 预设模板配置
│   ├── share-card-service.ts        # 分享卡片服务
│   ├── share-card-errors.ts         # 错误处理系统
│   ├── canvas-pool.ts               # Canvas 对象池
│   ├── image-cache.ts               # 图片缓存管理
│   ├── memory-manager.ts            # 内存管理器
│   ├── share-card-init.ts           # 初始化和兼容性检查
│   ├── placeholder-generator.ts     # 占位符生成器
│   └── acceptance-tests.ts          # 验收测试清单
├── components/
│   ├── ShareButton.tsx              # 分享按钮（已增强）
│   ├── ShareCardModal.tsx           # 桌面端模态框
│   ├── MobileShareCardModal.tsx     # 移动端模态框
│   ├── TemplateSelector.tsx         # 模板选择器
│   ├── TemplateComparison.tsx       # 模板对比功能
│   ├── TouchGestureHandler.tsx      # 触摸手势处理
│   ├── ShareCardErrorBoundary.tsx   # 错误边界组件
│   ├── ShareCardPerformanceMonitor.tsx # 性能监控
│   └── UserFeedbackCollector.tsx    # 用户反馈收集
├── hooks/
│   └── useResponsive.ts             # 响应式检测 Hook
├── styles/
│   └── share-card-responsive.css    # 响应式样式
└── app/
    ├── test-share-card/page.tsx     # 测试页面
    └── share-card-demo/page.tsx     # 演示页面
```

## 🔧 API 参考

### ShareCardService

#### generateShareCard(audio, options)
生成分享卡片

**参数:**
- `audio: AudioFile` - 音频数据对象
- `options: ShareCardOptions` - 生成选项
  - `template?: CardTemplate` - 使用的模板
  - `qrOptions?: QROptions` - 二维码选项
  - `onProgress?: (step: string, progress: number) => void` - 进度回调

**返回:**
- `Promise<ShareCardResult>` - 生成结果
  - `blob: Blob` - 图片 Blob 对象
  - `url: string` - 图片 URL
  - `template: CardTemplate` - 使用的模板

#### generatePreview(audio, template, size)
生成模板预览

**参数:**
- `audio: AudioFile` - 音频数据对象
- `template: CardTemplate` - 模板对象
- `size: number` - 预览尺寸（默认 300px）

**返回:**
- `Promise<string>` - 预览图片 URL

### QRCodeGenerator

#### generateQRCode(url, size, options)
生成二维码 Canvas

**参数:**
- `url: string` - 二维码内容 URL
- `size: number` - 二维码尺寸（默认 200px）
- `options: QROptions` - 二维码选项

**返回:**
- `Promise<HTMLCanvasElement>` - 二维码 Canvas 元素

#### validateUrl(url)
验证 URL 有效性

**参数:**
- `url: string` - 要验证的 URL

**返回:**
- `boolean` - 是否有效

### CardTemplateManager

#### getTemplate(id)
获取指定模板

**参数:**
- `id: string` - 模板 ID

**返回:**
- `CardTemplate | undefined` - 模板对象

#### getAllTemplates()
获取所有可用模板

**返回:**
- `CardTemplate[]` - 模板数组

#### validateTemplate(template)
验证模板配置

**参数:**
- `template: CardTemplate` - 模板对象

**返回:**
- `boolean` - 是否有效

## 🧪 测试

### 运行单元测试
```bash
# 访问测试页面
http://localhost:3000/test-share-card

# 或在浏览器控制台运行
import { runShareCardTests } from '@/lib/__tests__/share-card-tests';
await runShareCardTests();
```

### 功能演示
```bash
# 访问演示页面
http://localhost:3000/share-card-demo
```

### 验收测试
```tsx
import { AcceptanceTestRunner } from '@/lib/acceptance-tests';

const runner = new AcceptanceTestRunner();
const results = await runner.runAutomatedTests();
console.log(`通过: ${results.passed}/${results.total}`);
```

## 📊 性能监控

### 启用性能监控
```tsx
import ShareCardPerformanceMonitor from '@/components/ShareCardPerformanceMonitor';

<ShareCardPerformanceMonitor visible={true} />
```

### 获取性能统计
```tsx
import { ShareCardService } from '@/lib/share-card-service';

const stats = ShareCardService.getPerformanceStats();
console.log('内存使用:', stats.memory);
console.log('Canvas 池:', stats.canvas);
console.log('图片缓存:', stats.imageCache);
```

## 🔧 配置选项

### 初始化配置
```tsx
import { initializeShareCard } from '@/lib/share-card-init';

// 在应用启动时调用
await initializeShareCard();
```

### Canvas 池配置
```tsx
import { CanvasPool } from '@/lib/canvas-pool';

const pool = CanvasPool.getInstance({
  maxSize: 10,        // 最大池大小
  defaultWidth: 1080, // 默认宽度
  defaultHeight: 1080 // 默认高度
});
```

### 图片缓存配置
```tsx
import { ImageCache } from '@/lib/image-cache';

const cache = ImageCache.getInstance({
  maxSize: 50,              // 最大缓存数量
  maxAge: 10 * 60 * 1000   // 缓存过期时间（毫秒）
});
```

## 🐛 故障排除

### 常见问题

1. **Canvas 不支持**
   - 检查浏览器兼容性
   - 使用 `ShareCardErrorHandler.isCanvasSupported()` 检测

2. **二维码生成失败**
   - 检查网络连接
   - 验证 URL 格式
   - 使用降级方案 `generateFallbackQRUrl()`

3. **图片加载失败**
   - 检查图片 URL 可访问性
   - 确保 CORS 配置正确
   - 使用占位符图片

4. **内存使用过高**
   - 调用 `ShareCardService.cleanup()` 清理资源
   - 检查 Blob URL 是否正确释放
   - 监控 `MemoryManager.getMemoryStats()`

### 调试工具

```tsx
// 启用详细日志
localStorage.setItem('sharecard_debug', 'true');

// 查看错误历史
import { ShareCardErrorHandler } from '@/lib/share-card-errors';
const errors = ShareCardErrorHandler.getErrorHistory();

// 清理错误历史
ShareCardErrorHandler.clearErrorHistory();
```

## 🔄 更新日志

### v1.0.0 (2024-01-26)
- ✨ 初始版本发布
- 🎨 4种预设模板
- 📱 移动端适配
- ⚡ 性能优化
- 🧪 完整测试覆盖

## 📄 许可证

MIT License - 详见 LICENSE 文件

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📞 支持

如有问题或建议，请：
1. 查看本文档的故障排除部分
2. 访问演示页面进行测试
3. 提交 Issue 或 Pull Request
4. 使用应用内反馈功能

---

**健闻局 The Health Hub** - 专业的医学音频内容平台