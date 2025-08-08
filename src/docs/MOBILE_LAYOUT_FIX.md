# 移动端布局修复说明

## 问题描述
移动端访问时，顶部Logo栏遮挡了全局音频播放器的部分界面，两个组件重叠显示。

## 问题原因
1. **z-index冲突**: 移动端顶部Logo栏的z-index为1002，高于全局播放器的z-index 1000
2. **位置重叠**: 两个组件都使用`position: fixed`且都定位在页面顶部

## 解决方案

### 1. Logo栏固定在顶部
```typescript
// Logo栏始终在最顶部
top: 0, // Logo栏固定在顶部
```

### 2. 调整z-index层级
```typescript
zIndex: 1001, // 提高z-index，让Logo栏在播放器上方
```

### 3. 添加平滑过渡动画
```typescript
transition: 'top 0.3s ease' // 添加平滑过渡动画
```

### 4. 相应调整内容区域padding
```typescript
// 为移动端顶部Logo和播放器留出空间
paddingTop: isMobile ? (currentAudio ? 152 : 64) : 0 // (88 + 64)
```

## 修改的文件
- `src/components/AntdHomeLayout.tsx` - 主页布局
- `src/components/AntdAdminLayout.tsx` - 管理员布局

## 布局层次（从上到下）
1. **Logo栏** (top: 0, z-index: 1001) - 始终在最顶部
2. **播放器** (top: 72px when exists, z-index: 1000) - 在Logo栏下方
3. **页面内容** (paddingTop: 152px when player exists)

## 效果
- ✅ Logo栏始终显示在最顶部
- ✅ 播放器在Logo栏下方，不被遮挡
- ✅ 两个组件之间有合适的间隔
- ✅ 平滑的过渡动画效果
- ✅ 内容区域正确适配新的布局

## 测试场景
1. **无播放器时**: Logo栏在顶部 (top: 0)，内容从64px开始
2. **有播放器时**: Logo栏在顶部 (top: 0)，播放器在Logo下方 (top: 72px)
3. **播放器出现/消失**: 播放器位置动态调整
4. **内容滚动**: 不受影响，正常滚动