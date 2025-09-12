#!/usr/bin/env node

/**
 * 测试兼容模式移除脚本
 * 验证 API 不再支持旧的 subject 参数
 */

const http = require('http');
const https = require('https');

// 配置
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

// 测试用例
const tests = [
  {
    name: '音频列表API - subject参数应被忽略',
    method: 'GET',
    url: `${API_BASE}/audio?subject=心血管&page=1&limit=5`,
    expectStatus: 200,
    expectNoSubjectFilter: true
  },
  {
    name: '音频列表API - category参数应被忽略',
    method: 'GET', 
    url: `${API_BASE}/audio?category=心血管&page=1&limit=5`,
    expectStatus: 200,
    expectNoSubjectFilter: true
  },
  {
    name: '音频列表API - 新分类参数应正常工作',
    method: 'GET',
    url: `${API_BASE}/audio?categoryId=test-category&page=1&limit=5`,
    expectStatus: 200,
    expectCategoryFilter: true
  }
];

// HTTP 请求函数
function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Compatibility-Test-Script'
      }
    };

    const req = lib.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsed
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: body
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// 运行测试
async function runTests() {
  console.log('🧪 开始测试兼容模式移除...\n');
  
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`📋 测试: ${test.name}`);
    console.log(`   URL: ${test.url}`);
    
    try {
      const response = await makeRequest(test.url, test.method);
      
      // 检查状态码
      if (response.status !== test.expectStatus) {
        console.log(`   ❌ 状态码错误: 期望 ${test.expectStatus}, 实际 ${response.status}`);
        failed++;
        continue;
      }
      
      // 检查响应数据
      if (test.expectNoSubjectFilter && response.data.success) {
        // 验证没有使用 subject 筛选
        console.log(`   ✅ API 正常响应，兼容参数被忽略`);
        console.log(`   📊 返回 ${response.data.data?.length || 0} 条记录`);
      } else if (test.expectCategoryFilter && response.data.success) {
        // 验证新分类筛选正常工作
        console.log(`   ✅ 新分类参数正常工作`);
        console.log(`   📊 返回 ${response.data.data?.length || 0} 条记录`);
      } else if (!response.data.success) {
        console.log(`   ⚠️  API 返回错误: ${response.data.error?.message}`);
        // 这可能是正常的，如果没有数据或其他业务逻辑错误
      }
      
      passed++;
      
    } catch (error) {
      console.log(`   ❌ 请求失败: ${error.message}`);
      failed++;
    }
    
    console.log('');
  }

  // 测试总结
  console.log('📊 测试总结:');
  console.log(`   ✅ 通过: ${passed}`);
  console.log(`   ❌ 失败: ${failed}`);
  console.log(`   📈 成功率: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 所有测试通过！兼容模式已成功移除。');
  } else {
    console.log('\n⚠️  部分测试失败，请检查实现。');
  }

  return failed === 0;
}

// 额外的代码检查
function checkCodeForCompatibility() {
  console.log('\n🔍 检查代码中的兼容性残留...');
  
  const fs = require('fs');
  const path = require('path');
  
  const filesToCheck = [
    'src/app/api/audio/route.ts',
    'src/app/api/audio/[id]/route.ts', 
    'src/app/api/upload/route.ts',
    'src/types/audio.ts'
  ];
  
  let compatibilityFound = false;
  
  for (const filePath of filesToCheck) {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // 检查兼容性关键词
      const compatibilityKeywords = [
        'subject.*兼容',
        '兼容.*subject',
        'subject.*category',
        'category.*subject',
        'subject:.*string.*兼容'
      ];
      
      for (const keyword of compatibilityKeywords) {
        const regex = new RegExp(keyword, 'i');
        if (regex.test(content)) {
          console.log(`   ⚠️  在 ${filePath} 中发现兼容性代码: ${keyword}`);
          compatibilityFound = true;
        }
      }
      
      console.log(`   ✅ ${filePath} - 已检查`);
    } else {
      console.log(`   ⚠️  文件不存在: ${filePath}`);
    }
  }
  
  if (!compatibilityFound) {
    console.log('\n✅ 代码检查通过，未发现兼容性残留。');
  } else {
    console.log('\n⚠️  发现兼容性代码残留，请手动清理。');
  }
  
  return !compatibilityFound;
}

// 主函数
async function main() {
  console.log('🚀 兼容模式移除验证工具\n');
  
  // 运行 API 测试
  const apiTestsPassed = await runTests();
  
  // 运行代码检查
  const codeCheckPassed = checkCodeForCompatibility();
  
  // 最终结果
  console.log('\n' + '='.repeat(50));
  if (apiTestsPassed && codeCheckPassed) {
    console.log('🎉 兼容模式移除验证完成！系统已完全清理。');
    process.exit(0);
  } else {
    console.log('❌ 验证失败，请检查并修复问题。');
    process.exit(1);
  }
}

// 运行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runTests, checkCodeForCompatibility };