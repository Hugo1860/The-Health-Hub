#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

console.log('🚀 Testing Project Optimizations');
console.log('================================\n');

const BASE_URL = 'http://localhost:3001';

// 测试配置
const tests = [
  {
    name: '虚拟滚动测试页面',
    url: `${BASE_URL}/test-virtual-scroll`,
    description: '测试虚拟滚动组件的性能和功能'
  },
  {
    name: '性能监控仪表板',
    url: `${BASE_URL}/performance-dashboard`,
    description: '查看实时性能监控数据'
  },
  {
    name: '数据库统计API',
    url: `${BASE_URL}/api/database/stats`,
    description: '获取数据库性能统计信息'
  },
  {
    name: '优化的音频API',
    url: `${BASE_URL}/api/audio/optimized`,
    description: '测试优化后的音频列表API'
  },
  {
    name: '优化的用户API',
    url: `${BASE_URL}/api/users/optimized`,
    description: '测试优化后的用户列表API'
  },
  {
    name: '查询分析API',
    url: `${BASE_URL}/api/database/analyze`,
    description: '数据库查询分析工具'
  }
];

// 检查服务器是否运行
async function checkServer() {
  try {
    const response = await fetch(BASE_URL);
    if (response.ok) {
      console.log('✅ 开发服务器运行正常');
      return true;
    }
  } catch (error) {
    console.log('❌ 开发服务器未运行');
    console.log('请先运行: npm run dev');
    return false;
  }
}

// 测试API端点
async function testAPI(url, description) {
  try {
    console.log(`  🔍 测试: ${description}`);
    console.log(`  📍 URL: ${url}`);
    
    const startTime = Date.now();
    const response = await fetch(url);
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      let data = null;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
      
      console.log(`  ✅ 响应成功 (${response.status})`);
      console.log(`  ⏱️  响应时间: ${responseTime}ms`);
      
      if (typeof data === 'object' && data.success !== undefined) {
        console.log(`  📊 API状态: ${data.success ? '成功' : '失败'}`);
        if (data.meta && data.meta.executionTime) {
          console.log(`  🔧 执行时间: ${data.meta.executionTime}ms`);
        }
      }
      
      return { success: true, responseTime, data };
    } else {
      console.log(`  ❌ 响应失败 (${response.status})`);
      return { success: false, responseTime, status: response.status };
    }
  } catch (error) {
    console.log(`  ❌ 请求失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// 运行所有测试
async function runTests() {
  console.log('📋 开始测试优化功能...\n');
  
  const results = [];
  
  for (const test of tests) {
    console.log(`🧪 ${test.name}`);
    console.log('─'.repeat(test.name.length + 2));
    
    const result = await testAPI(test.url, test.description);
    results.push({
      name: test.name,
      url: test.url,
      ...result
    });
    
    console.log('');
    
    // 添加延迟避免请求过快
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return results;
}

// 生成测试报告
function generateReport(results) {
  console.log('📊 测试结果汇总');
  console.log('===============\n');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ 成功: ${successful.length}/${results.length}`);
  console.log(`❌ 失败: ${failed.length}/${results.length}\n`);
  
  if (successful.length > 0) {
    console.log('🎯 成功的测试:');
    successful.forEach(result => {
      console.log(`  ✅ ${result.name} (${result.responseTime}ms)`);
    });
    console.log('');
  }
  
  if (failed.length > 0) {
    console.log('⚠️  失败的测试:');
    failed.forEach(result => {
      console.log(`  ❌ ${result.name}`);
      if (result.error) {
        console.log(`     错误: ${result.error}`);
      } else if (result.status) {
        console.log(`     状态码: ${result.status}`);
      }
    });
    console.log('');
  }
  
  // 性能分析
  const responseTimes = successful
    .filter(r => r.responseTime)
    .map(r => r.responseTime);
  
  if (responseTimes.length > 0) {
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    const minResponseTime = Math.min(...responseTimes);
    
    console.log('📈 性能统计:');
    console.log(`  平均响应时间: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`  最快响应时间: ${minResponseTime}ms`);
    console.log(`  最慢响应时间: ${maxResponseTime}ms`);
    console.log('');
  }
  
  // 建议
  console.log('💡 建议:');
  if (failed.length === 0) {
    console.log('  🎉 所有测试都通过了！优化功能运行正常。');
  } else {
    console.log('  🔧 请检查失败的测试，确保相关功能正常工作。');
  }
  
  console.log('  🌐 访问以下页面进行手动测试:');
  tests.forEach(test => {
    if (test.url.startsWith('http') && !test.url.includes('/api/')) {
      console.log(`    - ${test.name}: ${test.url}`);
    }
  });
}

// 主函数
async function main() {
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('\n💡 启动开发服务器的步骤:');
    console.log('1. 打开新的终端窗口');
    console.log('2. 运行: npm run dev');
    console.log('3. 等待服务器启动完成');
    console.log('4. 重新运行此测试脚本');
    process.exit(1);
  }
  
  console.log('');
  
  const results = await runTests();
  generateReport(results);
  
  console.log('\n🎉 测试完成！');
  console.log('\n📚 更多测试选项:');
  console.log('  - 运行数据库性能测试: node scripts/performance-test.mjs');
  console.log('  - 运行查询优化测试: node scripts/test-query-optimization.mjs');
  console.log('  - 运行前端性能测试: node scripts/test-frontend-performance.mjs');
}

// 运行测试
main().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});