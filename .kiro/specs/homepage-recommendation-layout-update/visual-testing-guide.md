# 视觉回归测试指南

## 测试目标
验证首页推荐栏目的高度统一性和标题更改效果，确保视觉改进达到预期效果。

## 测试环境准备
1. 启动开发服务器: `npm run dev`
2. 打开浏览器访问首页
3. 准备不同设备尺寸的测试环境

## 核心测试项目

### 1. 高度一致性验证
**测试步骤**:
1. 在桌面端 (1920x1080) 访问首页
2. 使用浏览器开发者工具测量两个推荐栏目的高度
3. 验证精选推荐和特别推荐栏目的Card高度是否一致

**预期结果**:
- 两个推荐栏目的外层Card高度应该完全一致 (280px)
- 内容区域应该在固定高度内合理分布
- 不应该出现内容溢出或截断

**测量方法**:
```javascript
// 在浏览器控制台执行
const featuredCard = document.querySelector('.elegant-hover-lift.recommendation-card-unified');
const specialCard = document.querySelector('[style*="border: 2px solid #ff6b35"].recommendation-card-unified');

console.log('精选推荐高度:', featuredCard?.offsetHeight);
console.log('特别推荐高度:', specialCard?.offsetHeight);
```

### 2. 标题更改验证
**测试步骤**:
1. 检查右侧栏的推荐栏目标题
2. 确认显示为"最新更新"而不是"特别推荐"
3. 验证标题样式保持一致

**预期结果**:
- 标题文字应该显示为"最新更新"
- 渐变色效果应该正常显示
- 图标和字体样式应该保持不变

### 3. 响应式测试
**测试步骤**:
1. 测试桌面端 (>1024px)
2. 测试平板端 (768px-1024px)  
3. 测试移动端 (<768px)
4. 测试小屏移动端 (<480px)

**预期结果**:
- 桌面端: 280px 统一高度
- 平板端: 260px 统一高度
- 移动端: 240px 统一高度
- 小屏移动端: 220px 统一高度

**测试设备尺寸**:
```
桌面端: 1920x1080, 1366x768
平板端: 1024x768, 768x1024
移动端: 375x667, 414x896
小屏移动端: 320x568
```

### 4. 内容布局验证
**测试步骤**:
1. 检查精选推荐内容是否在固定高度内正确显示
2. 检查特别推荐内容的垂直分布是否合理
3. 验证文字是否被截断或溢出

**预期结果**:
- 精选推荐: 横向布局，内容居中对齐
- 特别推荐: 纵向布局，内容均匀分布
- 所有文字应该在指定行数内显示，使用省略号处理溢出

## 自动化测试脚本

### 高度测量脚本
```javascript
function measureRecommendationHeights() {
  const featured = document.querySelector('.elegant-hover-lift.recommendation-card-unified');
  const special = document.querySelector('[style*="border: 2px solid #ff6b35"].recommendation-card-unified');
  
  const results = {
    featured: featured?.offsetHeight || 0,
    special: special?.offsetHeight || 0,
    isConsistent: false
  };
  
  results.isConsistent = Math.abs(results.featured - results.special) <= 2; // 允许2px误差
  
  console.log('高度测量结果:', results);
  return results;
}
```

### 标题验证脚本
```javascript
function verifyTitleChange() {
  const titleElement = document.querySelector('[style*="border: 2px solid #ff6b35"] .ant-card-head-title span:last-child');
  const titleText = titleElement?.textContent?.trim();
  
  const result = {
    currentTitle: titleText,
    isCorrect: titleText === '最新更新'
  };
  
  console.log('标题验证结果:', result);
  return result;
}
```

### 响应式测试脚本
```javascript
function testResponsiveHeights() {
  const viewports = [
    { width: 1920, height: 1080, name: '桌面端' },
    { width: 1024, height: 768, name: '平板端' },
    { width: 768, height: 1024, name: '移动端' },
    { width: 320, height: 568, name: '小屏移动端' }
  ];
  
  viewports.forEach(viewport => {
    // 需要手动调整浏览器窗口大小或使用设备模拟器
    console.log(`测试 ${viewport.name} (${viewport.width}x${viewport.height})`);
    // 然后执行 measureRecommendationHeights()
  });
}
```

## 测试检查清单

### ✅ 桌面端测试
- [ ] 高度一致性 (280px)
- [ ] 标题显示正确 ("最新更新")
- [ ] 内容布局合理
- [ ] 无内容溢出

### ✅ 平板端测试  
- [ ] 高度一致性 (260px)
- [ ] 响应式样式生效
- [ ] 布局保持美观

### ✅ 移动端测试
- [ ] 高度一致性 (240px)
- [ ] 垂直堆叠布局正常
- [ ] 文字大小适配

### ✅ 小屏移动端测试
- [ ] 高度一致性 (220px)
- [ ] 内容仍然可读
- [ ] 交互功能正常

## 问题排查

### 常见问题及解决方案

1. **高度不一致**
   - 检查CSS类名是否正确应用
   - 验证CSS文件是否正确导入
   - 检查是否有其他样式覆盖

2. **标题未更改**
   - 确认组件代码中的文字已更新
   - 检查浏览器缓存
   - 验证组件是否重新渲染

3. **响应式失效**
   - 检查CSS媒体查询语法
   - 验证断点设置是否正确
   - 确认浏览器支持相关CSS特性

## 测试报告模板

```
# 视觉回归测试报告

## 测试环境
- 浏览器: [Chrome/Firefox/Safari] [版本号]
- 操作系统: [macOS/Windows/Linux]
- 屏幕分辨率: [分辨率]

## 测试结果
### 高度一致性
- 精选推荐高度: [数值]px
- 特别推荐高度: [数值]px  
- 一致性: [通过/失败]

### 标题验证
- 显示文字: [实际文字]
- 预期文字: 最新更新
- 验证结果: [通过/失败]

### 响应式测试
- 桌面端: [通过/失败]
- 平板端: [通过/失败]
- 移动端: [通过/失败]

## 问题记录
[记录发现的问题和解决方案]

## 总体评估
[通过/需要修复]
```