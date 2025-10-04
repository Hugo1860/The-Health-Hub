# 音频分享二维码卡片功能 - 部署指南

## 🚀 部署前检查清单

### 依赖检查
- [x] `qrcode` 库已安装 (v1.5.4)
- [x] `@types/qrcode` 类型定义已安装 (v1.5.5)
- [x] React 19+ 和 TypeScript 5+ 环境
- [x] Ant Design 5.26+ UI 组件库

### 文件完整性检查
```bash
# 核心功能文件
✓ src/lib/qrcode-generator.ts
✓ src/lib/card-template-engine.ts
✓ src/lib/card-templates.ts
✓ src/lib/share-card-service.ts
✓ src/lib/share-card-errors.ts

# 性能优化文件
✓ src/lib/canvas-pool.ts
✓ src/lib/image-cache.ts
✓ src/lib/memory-manager.ts
✓ src/lib/share-card-init.ts

# UI 组件文件
✓ src/components/ShareButton.tsx (已更新)
✓ src/components/ShareCardModal.tsx
✓ src/components/MobileShareCardModal.tsx
✓ src/components/TemplateSelector.tsx
✓ src/components/TemplateComparison.tsx

# 工具和测试文件
✓ src/hooks/useResponsive.ts
✓ src/styles/share-card-responsive.css
✓ src/lib/__tests__/share-card-tests.ts
```

## 📋 集成步骤

### 1. 应用初始化
在应用的主入口文件中添加初始化代码：

```tsx
// app/layout.tsx 或 _app.tsx
import { initializeShareCard } from '@/lib/share-card-init';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 初始化分享卡片功能
    initializeShareCard().catch(console.error);
  }, []);

  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
```

### 2. 样式文件导入
确保响应式样式被正确导入：

```tsx
// app/globals.css 或主样式文件
@import '../styles/share-card-responsive.css';
```

### 3. 更新现有组件
确保所有使用 `ShareButton` 的地方都传递了 `audioData` 属性：

```tsx
// 更新前
<ShareButton
  audioId={audio.id}
  audioTitle={audio.title}
  audioDescription={audio.description}
/>

// 更新后
<ShareButton
  audioId={audio.id}
  audioTitle={audio.title}
  audioDescription={audio.description}
  audioData={audio} // 添加完整的音频数据
/>
```

### 4. 环境变量配置
如果需要自定义配置，可以添加环境变量：

```bash
# .env.local
NEXT_PUBLIC_SHARE_CARD_DEBUG=false
NEXT_PUBLIC_SHARE_CARD_CANVAS_POOL_SIZE=10
NEXT_PUBLIC_SHARE_CARD_IMAGE_CACHE_SIZE=50
```

## 🧪 部署前测试

### 1. 功能测试
访问测试页面验证功能：
```
http://localhost:3000/test-share-card
```

### 2. 演示测试
访问演示页面进行完整测试：
```
http://localhost:3000/share-card-demo
```

### 3. 自动化测试
运行自动化测试脚本：
```tsx
import { runShareCardTests } from '@/lib/__tests__/share-card-tests';
await runShareCardTests();
```

### 4. 性能测试
监控性能指标：
```tsx
import { ShareCardService } from '@/lib/share-card-service';
const stats = ShareCardService.getPerformanceStats();
console.log('Performance Stats:', stats);
```

## 🌐 浏览器兼容性

### 支持的浏览器
- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+
- ⚠️ IE 不支持

### 功能降级策略
- Canvas 不支持 → 使用在线二维码服务
- Web Share API 不支持 → 复制链接到剪贴板
- 触摸事件不支持 → 使用鼠标事件

## 📱 移动端优化

### PWA 支持
如果应用支持 PWA，确保在 manifest.json 中添加相关权限：

```json
{
  "permissions": ["clipboard-write", "web-share"],
  "share_target": {
    "action": "/share",
    "method": "GET",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url"
    }
  }
}
```

### 安全区域适配
确保在移动端正确处理安全区域：

```css
/* 在 globals.css 中添加 */
:root {
  --sat: env(safe-area-inset-top);
  --sar: env(safe-area-inset-right);
  --sab: env(safe-area-inset-bottom);
  --sal: env(safe-area-inset-left);
}
```

## 🔧 性能优化配置

### 1. Canvas 池配置
根据预期用户量调整 Canvas 池大小：

```tsx
// 高流量站点
const pool = CanvasPool.getInstance({
  maxSize: 20,
  defaultWidth: 1080,
  defaultHeight: 1080
});

// 低流量站点
const pool = CanvasPool.getInstance({
  maxSize: 5,
  defaultWidth: 1080,
  defaultHeight: 1080
});
```

### 2. 图片缓存配置
根据用户行为调整缓存策略：

```tsx
// 用户经常重复访问
const cache = ImageCache.getInstance({
  maxSize: 100,
  maxAge: 30 * 60 * 1000 // 30分钟
});

// 用户很少重复访问
const cache = ImageCache.getInstance({
  maxSize: 20,
  maxAge: 5 * 60 * 1000 // 5分钟
});
```

### 3. 内存管理配置
设置内存监控阈值：

```tsx
// 在应用初始化时
const memoryManager = MemoryManager.getInstance();

// 设置更频繁的内存检查（高流量）
setInterval(() => {
  memoryManager.checkMemoryUsage();
}, 30000); // 每30秒检查一次
```

## 📊 监控和分析

### 1. 错误监控
集成错误监控服务：

```tsx
// 在 share-card-errors.ts 中添加
static handle(error: ShareCardError, context?: any): void {
  console.error(`ShareCard Error [${error}]:`, context);
  
  // 发送到错误监控服务
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'share_card_error', {
      error_type: error,
      error_context: JSON.stringify(context)
    });
  }
  
  // 发送到 Sentry 等服务
  if (typeof window !== 'undefined' && window.Sentry) {
    window.Sentry.captureException(new Error(error), {
      tags: { component: 'share_card' },
      extra: context
    });
  }
}
```

### 2. 使用统计
添加使用统计代码：

```tsx
// 在 ShareCardService.generateShareCard 中添加
static async generateShareCard(audio: AudioFile, options: ShareCardOptions = {}): Promise<ShareCardResult> {
  // 记录使用统计
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'share_card_generate', {
      template_id: options.template?.id || 'default',
      audio_category: audio.category?.name || 'unknown'
    });
  }
  
  // ... 现有代码
}
```

### 3. 性能监控
添加性能监控：

```tsx
// 在关键操作中添加性能标记
performance.mark('share-card-start');
// ... 执行操作
performance.mark('share-card-end');
performance.measure('share-card-duration', 'share-card-start', 'share-card-end');

// 发送性能数据
const measure = performance.getEntriesByName('share-card-duration')[0];
if (measure && typeof window !== 'undefined' && window.gtag) {
  window.gtag('event', 'timing_complete', {
    name: 'share_card_generation',
    value: Math.round(measure.duration)
  });
}
```

## 🔒 安全考虑

### 1. URL 验证
确保二维码中的 URL 是安全的：

```tsx
// 在 QRCodeGenerator.validateUrl 中增强验证
static validateUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    
    // 只允许 HTTPS 和当前域名
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      return false;
    }
    
    // 检查是否为当前域名或允许的域名
    const allowedHosts = [
      window.location.hostname,
      'your-domain.com',
      'www.your-domain.com'
    ];
    
    if (!allowedHosts.includes(parsedUrl.hostname)) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}
```

### 2. 内容安全策略 (CSP)
更新 CSP 头部以支持 Canvas 和 Blob：

```
Content-Security-Policy: 
  default-src 'self';
  img-src 'self' data: blob: https://api.qrserver.com;
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  connect-src 'self' https://api.qrserver.com;
```

### 3. 输入验证
对用户输入进行严格验证：

```tsx
// 在模板渲染前验证音频数据
static validateAudioData(audio: any): boolean {
  if (!audio || typeof audio !== 'object') return false;
  
  // 验证必需字段
  if (!audio.id || typeof audio.id !== 'string' || audio.id.length > 100) return false;
  if (!audio.title || typeof audio.title !== 'string' || audio.title.length > 200) return false;
  
  // 验证可选字段
  if (audio.description && (typeof audio.description !== 'string' || audio.description.length > 1000)) return false;
  
  // XSS 防护 - 移除潜在的恶意内容
  const sanitize = (str: string) => str.replace(/<[^>]*>/g, '').trim();
  audio.title = sanitize(audio.title);
  if (audio.description) audio.description = sanitize(audio.description);
  
  return true;
}
```

## 🚀 部署命令

### 开发环境
```bash
npm run dev
# 访问 http://localhost:3000/share-card-demo 进行测试
```

### 生产环境
```bash
# 构建
npm run build

# 启动
npm run start

# 或使用 PM2
pm2 start npm --name "health-hub" -- start
```

### Docker 部署
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# 构建和运行
docker build -t health-hub .
docker run -p 3000:3000 health-hub
```

## ✅ 部署后验证

### 1. 功能验证
- [ ] 分享按钮显示"生成分享卡片"选项
- [ ] 可以成功生成分享卡片
- [ ] 所有模板都能正常工作
- [ ] 移动端界面正常显示
- [ ] 保存和分享功能正常

### 2. 性能验证
- [ ] 卡片生成时间 < 5秒
- [ ] 内存使用稳定
- [ ] 无明显内存泄漏
- [ ] Canvas 池正常工作

### 3. 兼容性验证
- [ ] Chrome 浏览器正常
- [ ] Safari 浏览器正常
- [ ] Firefox 浏览器正常
- [ ] 移动端浏览器正常

### 4. 错误处理验证
- [ ] 网络异常时显示友好提示
- [ ] 无效数据时正确处理
- [ ] Canvas 不支持时有降级方案

## 📞 部署支持

如果在部署过程中遇到问题：

1. 检查浏览器控制台错误
2. 验证所有依赖是否正确安装
3. 确认文件路径和导入语句正确
4. 查看网络请求是否成功
5. 检查 CSP 和 CORS 配置

---

部署完成后，用户就可以享受全新的音频分享体验了！🎉