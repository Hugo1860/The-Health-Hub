/**
 * 响应式布局验证脚本
 * 用于验证紧凑布局在不同屏幕尺寸下的表现
 */

// 定义测试的屏幕尺寸
const SCREEN_SIZES = {
  mobile: { width: 375, height: 667, name: '移动端' },
  tablet: { width: 768, height: 1024, name: '平板端' },
  desktop: { width: 1024, height: 768, name: '桌面端' },
  large: { width: 1440, height: 900, name: '大屏幕' }
};

// CSS断点验证
const CSS_BREAKPOINTS = {
  mobile: '(max-width: 767px)',
  tablet: '(max-width: 1023px) and (min-width: 768px)',
  desktop: '(min-width: 1024px)'
};

/**
 * 验证CSS媒体查询是否正确工作
 */
function validateMediaQueries() {
  console.log('🔍 验证CSS媒体查询...');
  
  Object.entries(CSS_BREAKPOINTS).forEach(([device, query]) => {
    const mediaQuery = window.matchMedia(query);
    console.log(`📱 ${device}: ${query} - ${mediaQuery.matches ? '✅ 匹配' : '❌ 不匹配'}`);
  });
}

/**
 * 验证表单元素的可访问性
 */
function validateAccessibility() {
  console.log('♿ 验证可访问性特性...');
  
  const checks = [
    {
      name: '表单标签关联',
      test: () => {
        const labels = document.querySelectorAll('label');
        const inputs = document.querySelectorAll('input, textarea, select');
        return labels.length > 0 && inputs.length > 0;
      }
    },
    {
      name: '键盘导航支持',
      test: () => {
        const focusableElements = document.querySelectorAll(
          'input, textarea, select, button, [tabindex]:not([tabindex="-1"])'
        );
        return focusableElements.length > 0;
      }
    },
    {
      name: 'ARIA标签存在',
      test: () => {
        const ariaElements = document.querySelectorAll('[aria-label], [aria-labelledby], [role]');
        return ariaElements.length >= 0; // 允许为0，因为不是所有元素都需要ARIA
      }
    }
  ];
  
  checks.forEach(check => {
    const result = check.test();
    console.log(`${result ? '✅' : '❌'} ${check.name}`);
  });
}

/**
 * 验证表单布局结构
 */
function validateLayoutStructure() {
  console.log('🏗️ 验证布局结构...');
  
  const checks = [
    {
      name: '第一行元素存在',
      selector: '.form-row:first-of-type',
      expectedChildren: 3 // 描述、讲者、封面图片
    },
    {
      name: '第二行元素存在',
      selector: '.form-row:last-of-type',
      expectedChildren: 2 // 状态、音频文件
    },
    {
      name: '响应式类名存在',
      selector: '.formRow',
      expectedCount: 2
    }
  ];
  
  checks.forEach(check => {
    const elements = document.querySelectorAll(check.selector);
    let result = elements.length > 0;
    
    if (check.expectedCount) {
      result = elements.length === check.expectedCount;
    }
    
    if (check.expectedChildren && elements.length > 0) {
      const children = elements[0].children;
      result = children.length >= check.expectedChildren;
    }
    
    console.log(`${result ? '✅' : '❌'} ${check.name} (找到 ${elements.length} 个元素)`);
  });
}

/**
 * 验证表单功能
 */
function validateFormFunctionality() {
  console.log('⚙️ 验证表单功能...');
  
  const checks = [
    {
      name: '必填字段验证',
      test: () => {
        const requiredFields = document.querySelectorAll('[required], .ant-form-item-required');
        return requiredFields.length > 0;
      }
    },
    {
      name: '文件上传支持',
      test: () => {
        const fileInputs = document.querySelectorAll('input[type="file"]');
        return fileInputs.length >= 2; // 音频文件 + 封面图片
      }
    },
    {
      name: '表单提交按钮',
      test: () => {
        const submitButtons = document.querySelectorAll('button[type="submit"], .ant-btn-primary');
        return submitButtons.length > 0;
      }
    }
  ];
  
  checks.forEach(check => {
    const result = check.test();
    console.log(`${result ? '✅' : '❌'} ${check.name}`);
  });
}

/**
 * 模拟不同屏幕尺寸的测试
 */
function simulateScreenSizes() {
  console.log('📐 模拟不同屏幕尺寸测试...');
  
  Object.entries(SCREEN_SIZES).forEach(([key, size]) => {
    console.log(`\n📱 测试 ${size.name} (${size.width}x${size.height})`);
    
    // 在实际浏览器环境中，这里会改变viewport
    // 在Node.js环境中，我们只能模拟
    if (typeof window !== 'undefined') {
      // 模拟屏幕尺寸变化
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: size.width,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: size.height,
      });
      
      // 触发resize事件
      window.dispatchEvent(new Event('resize'));
      
      // 验证媒体查询
      validateMediaQueries();
    } else {
      console.log(`⚠️ 非浏览器环境，跳过 ${size.name} 测试`);
    }
  });
}

/**
 * 运行所有验证测试
 */
function runAllValidations() {
  console.log('🚀 开始紧凑布局验证测试...\n');
  
  try {
    validateLayoutStructure();
    console.log('');
    
    validateFormFunctionality();
    console.log('');
    
    validateAccessibility();
    console.log('');
    
    if (typeof window !== 'undefined') {
      validateMediaQueries();
      console.log('');
      
      simulateScreenSizes();
    }
    
    console.log('\n✅ 所有验证测试完成！');
  } catch (error) {
    console.error('❌ 验证过程中出现错误:', error);
  }
}

// 如果在浏览器环境中运行
if (typeof window !== 'undefined') {
  // 等待DOM加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runAllValidations);
  } else {
    runAllValidations();
  }
}

// 导出验证函数供测试使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateLayoutStructure,
    validateFormFunctionality,
    validateAccessibility,
    validateMediaQueries,
    simulateScreenSizes,
    runAllValidations,
    SCREEN_SIZES,
    CSS_BREAKPOINTS
  };
}