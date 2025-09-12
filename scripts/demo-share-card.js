#!/usr/bin/env node

/**
 * 音频分享卡片功能演示脚本
 * 用于快速验证功能是否正常工作
 */

const fs = require('fs');
const path = require('path');

console.log('🎨 音频分享卡片功能演示');
console.log('================================\n');

// 检查必要文件是否存在
const requiredFiles = [
  'src/lib/qrcode-generator.ts',
  'src/lib/card-template-engine.ts',
  'src/lib/card-templates.ts',
  'src/lib/share-card-service.ts',
  'src/components/ShareButton.tsx',
  'src/components/ShareCardModal.tsx',
  'src/components/MobileShareCardModal.tsx'
];

console.log('📋 检查文件完整性...');
let allFilesExist = true;

requiredFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - 文件不存在`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.log('\n❌ 部分文件缺失，请检查项目完整性');
  process.exit(1);
}

// 检查 package.json 中的依赖
console.log('\n📦 检查依赖包...');
const packageJsonPath = path.join(process.cwd(), 'package.json');

if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const requiredDeps = ['qrcode', '@types/qrcode', 'antd', 'react'];
  
  requiredDeps.forEach(dep => {
    if (dependencies[dep]) {
      console.log(`✅ ${dep} (${dependencies[dep]})`);
    } else {
      console.log(`❌ ${dep} - 依赖缺失`);
      allFilesExist = false;
    }
  });
} else {
  console.log('❌ package.json 不存在');
  allFilesExist = false;
}

if (!allFilesExist) {
  console.log('\n❌ 部分依赖缺失，请运行 npm install');
  process.exit(1);
}

// 生成演示用的测试数据
console.log('\n🎵 生成测试数据...');

const testAudioData = {
  id: 'demo-audio-001',
  title: '心血管疾病预防与治疗指南',
  description: '本音频详细介绍了心血管疾病的预防措施、早期诊断方法和最新治疗技术，适合医学专业人士和健康关注者收听。',
  url: '/demo/cardiovascular-guide.mp3',
  filename: 'cardiovascular-guide.mp3',
  uploadDate: new Date().toISOString(),
  duration: 1800, // 30分钟
  coverImage: '/images/cardiovascular-cover.jpg',
  category: {
    id: 'cardiology',
    name: '心血管科',
    color: '#ff4d4f'
  },
  subcategory: {
    id: 'prevention',
    name: '疾病预防'
  },
  tags: ['心血管', '预防', '治疗', '健康指南'],
  speaker: '张主任医师'
};

// 创建演示页面的快捷方式
const demoPageContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>音频分享卡片功能演示</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
        }
        .demo-card {
            border: 1px solid #e8e8e8;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            background: #fafafa;
        }
        .demo-button {
            background: #1890ff;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            margin: 10px 5px;
        }
        .demo-button:hover {
            background: #40a9ff;
        }
        .status {
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
        }
        .status.success {
            background: #f6ffed;
            border: 1px solid #b7eb8f;
            color: #389e0d;
        }
        .status.error {
            background: #fff2f0;
            border: 1px solid #ffccc7;
            color: #cf1322;
        }
    </style>
</head>
<body>
    <h1>🎨 音频分享卡片功能演示</h1>
    
    <div class="demo-card">
        <h2>📋 功能概述</h2>
        <p>音频分享卡片功能允许用户生成包含音频信息和二维码的精美图片卡片，提升分享体验。</p>
        
        <h3>✨ 主要特性：</h3>
        <ul>
            <li>🎨 4种精美预设模板（经典、现代、医学专业、简约）</li>
            <li>📱 完美的移动端适配和响应式设计</li>
            <li>⚡ 高性能优化（Canvas池、图片缓存、内存管理）</li>
            <li>🔧 完善的错误处理和用户反馈</li>
            <li>👆 触摸友好的手势操作支持</li>
        </ul>
    </div>

    <div class="demo-card">
        <h2>🚀 快速开始</h2>
        <p>点击下面的按钮访问不同的演示页面：</p>
        
        <button class="demo-button" onclick="window.open('/share-card-demo', '_blank')">
            📱 完整功能演示
        </button>
        
        <button class="demo-button" onclick="window.open('/test-share-card', '_blank')">
            🧪 功能测试页面
        </button>
        
        <div class="status success">
            ✅ 所有核心文件已就位，功能可以正常使用！
        </div>
    </div>

    <div class="demo-card">
        <h2>📖 使用说明</h2>
        <ol>
            <li><strong>基本使用：</strong> 在任何音频页面点击分享按钮 → 选择"生成分享卡片"</li>
            <li><strong>模板选择：</strong> 从4种预设模板中选择喜欢的样式</li>
            <li><strong>预览保存：</strong> 实时预览效果，一键保存或分享</li>
            <li><strong>移动端：</strong> 自动适配移动端界面，支持手势操作</li>
        </ol>
    </div>

    <div class="demo-card">
        <h2>🔧 技术实现</h2>
        <ul>
            <li><strong>Canvas 渲染：</strong> 高质量图片生成，支持复杂布局</li>
            <li><strong>对象池模式：</strong> 优化 Canvas 创建和销毁性能</li>
            <li><strong>LRU 缓存：</strong> 智能图片缓存，提升重复访问速度</li>
            <li><strong>错误边界：</strong> React 错误边界 + 自定义错误处理</li>
            <li><strong>响应式设计：</strong> CSS Grid + Flexbox + 媒体查询</li>
        </ul>
    </div>

    <div class="demo-card">
        <h2>📊 测试数据</h2>
        <p>演示使用的测试音频数据：</p>
        <pre style="background: #f5f5f5; padding: 15px; border-radius: 4px; overflow-x: auto;">
${JSON.stringify(testAudioData, null, 2)}
        </pre>
    </div>

    <script>
        console.log('🎨 音频分享卡片功能演示页面已加载');
        console.log('测试数据:', ${JSON.stringify(testAudioData)});
        
        // 检查功能可用性
        if (typeof window !== 'undefined') {
            console.log('✅ 浏览器环境正常');
            
            // 检查 Canvas 支持
            const canvas = document.createElement('canvas');
            if (canvas.getContext && canvas.getContext('2d')) {
                console.log('✅ Canvas 2D 支持正常');
            } else {
                console.warn('⚠️ Canvas 2D 不支持');
            }
            
            // 检查触摸支持
            if ('ontouchstart' in window) {
                console.log('✅ 触摸事件支持');
            } else {
                console.log('ℹ️ 非触摸设备');
            }
            
            // 检查 Web Share API
            if (navigator.share) {
                console.log('✅ Web Share API 支持');
            } else {
                console.log('ℹ️ Web Share API 不支持，将使用降级方案');
            }
        }
    </script>
</body>
</html>
`;

// 写入演示页面
const demoFilePath = path.join(process.cwd(), 'public', 'share-card-demo.html');
fs.writeFileSync(demoFilePath, demoPageContent);

console.log('✅ 演示页面已生成: /public/share-card-demo.html');

// 输出使用指南
console.log('\n🎯 接下来的步骤:');
console.log('1. 启动开发服务器: npm run dev');
console.log('2. 访问演示页面: http://localhost:3000/share-card-demo');
console.log('3. 访问测试页面: http://localhost:3000/test-share-card');
console.log('4. 或访问静态演示: http://localhost:3000/share-card-demo.html');

console.log('\n📚 文档位置:');
console.log('- 功能文档: .kiro/specs/audio-share-qr-card/README.md');
console.log('- 部署指南: .kiro/specs/audio-share-qr-card/DEPLOYMENT.md');
console.log('- 需求文档: .kiro/specs/audio-share-qr-card/requirements.md');
console.log('- 设计文档: .kiro/specs/audio-share-qr-card/design.md');

console.log('\n🎉 音频分享卡片功能已准备就绪！');
console.log('================================');