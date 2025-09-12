#!/usr/bin/env node

/**
 * 分类层级功能测试脚本
 * 验证新的分类层级系统正常工作
 */

const http = require('http');
const https = require('https');

// 配置
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

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
        'User-Agent': 'Category-Hierarchy-Test'
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

// 测试分类层级功能
async function testCategoryHierarchy() {
  console.log('🏗️  测试分类层级功能...\n');
  
  const tests = [
    {
      name: '获取分类列表（扁平格式）',
      url: `${API_BASE}/categories?format=flat`,
      expectStatus: 200,
      validate: (data) => {
        return data.success && Array.isArray(data.data);
      }
    },
    {
      name: '获取分类树（树形格式）',
      url: `${API_BASE}/categories?format=tree&includeCount=true`,
      expectStatus: 200,
      validate: (data) => {
        return data.success && Array.isArray(data.data);
      }
    },
    {
      name: '获取分类树（专用接口）',
      url: `${API_BASE}/categories/tree`,
      expectStatus: 200,
      validate: (data) => {
        return data.success && Array.isArray(data.data);
      }
    },
    {
      name: '音频列表 - 按一级分类筛选',
      url: `${API_BASE}/audio?categoryId=test-category&limit=5`,
      expectStatus: 200,
      validate: (data) => {
        return data.success && Array.isArray(data.data);
      }
    },
    {
      name: '音频列表 - 按二级分类筛选',
      url: `${API_BASE}/audio?subcategoryId=test-subcategory&limit=5`,
      expectStatus: 200,
      validate: (data) => {
        return data.success && Array.isArray(data.data);
      }
    },
    {
      name: '音频列表 - 分类路径筛选',
      url: `${API_BASE}/audio?categoryPath=category1/subcategory1&limit=5`,
      expectStatus: 200,
      validate: (data) => {
        return data.success && Array.isArray(data.data);
      }
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`📋 ${test.name}`);
    console.log(`   URL: ${test.url}`);
    
    try {
      const response = await makeRequest(test.url);
      
      if (response.status !== test.expectStatus) {
        console.log(`   ❌ 状态码错误: 期望 ${test.expectStatus}, 实际 ${response.status}`);
        failed++;
        continue;
      }
      
      if (test.validate && !test.validate(response.data)) {
        console.log(`   ❌ 数据验证失败`);
        console.log(`   📄 响应: ${JSON.stringify(response.data, null, 2)}`);
        failed++;
        continue;
      }
      
      console.log(`   ✅ 测试通过`);
      if (response.data.data) {
        console.log(`   📊 返回 ${response.data.data.length} 条记录`);
      }
      
      passed++;
      
    } catch (error) {
      console.log(`   ❌ 请求失败: ${error.message}`);
      failed++;
    }
    
    console.log('');
  }

  return { passed, failed };
}

// 测试数据结构
async function testDataStructure() {
  console.log('🔍 测试数据结构...\n');
  
  try {
    // 测试分类数据结构
    const categoriesResponse = await makeRequest(`${API_BASE}/categories?format=tree&includeCount=true`);
    
    if (categoriesResponse.status === 200 && categoriesResponse.data.success) {
      const categories = categoriesResponse.data.data;
      
      console.log('📊 分类数据结构分析:');
      console.log(`   总分类数: ${categories.length}`);
      
      let level1Count = 0;
      let level2Count = 0;
      
      categories.forEach(category => {
        if (category.level === 1) {
          level1Count++;
          if (category.children) {
            level2Count += category.children.length;
          }
        }
      });
      
      console.log(`   一级分类: ${level1Count}`);
      console.log(`   二级分类: ${level2Count}`);
      
      // 检查数据结构完整性
      const hasRequiredFields = categories.every(cat => 
        cat.id && cat.name && typeof cat.level === 'number'
      );
      
      if (hasRequiredFields) {
        console.log('   ✅ 分类数据结构完整');
      } else {
        console.log('   ❌ 分类数据结构不完整');
      }
    }
    
    // 测试音频数据结构
    const audioResponse = await makeRequest(`${API_BASE}/audio?limit=1`);
    
    if (audioResponse.status === 200 && audioResponse.data.success && audioResponse.data.data.length > 0) {
      const audio = audioResponse.data.data[0];
      
      console.log('\n📊 音频数据结构分析:');
      console.log(`   包含分类字段: ${audio.categoryId ? '✅' : '❌'}`);
      console.log(`   包含子分类字段: ${audio.subcategoryId ? '✅' : '❌'}`);
      console.log(`   包含分类对象: ${audio.category ? '✅' : '❌'}`);
      console.log(`   移除subject字段: ${!audio.subject ? '✅' : '❌'}`);
      
      if (audio.category) {
        console.log(`   分类信息: ${audio.category.name} (${audio.category.id})`);
      }
      
      if (audio.subcategory) {
        console.log(`   子分类信息: ${audio.subcategory.name} (${audio.subcategory.id})`);
      }
    }
    
    return true;
    
  } catch (error) {
    console.log(`❌ 数据结构测试失败: ${error.message}`);
    return false;
  }
}

// 主函数
async function main() {
  console.log('🚀 分类层级功能测试\n');
  
  // 测试 API 功能
  const apiResults = await testCategoryHierarchy();
  
  // 测试数据结构
  const structureTest = await testDataStructure();
  
  // 总结
  console.log('\n' + '='.repeat(50));
  console.log('📊 测试总结:');
  console.log(`   API测试 - 通过: ${apiResults.passed}, 失败: ${apiResults.failed}`);
  console.log(`   数据结构测试: ${structureTest ? '✅ 通过' : '❌ 失败'}`);
  
  const totalTests = apiResults.passed + apiResults.failed;
  const successRate = totalTests > 0 ? ((apiResults.passed / totalTests) * 100).toFixed(1) : 0;
  console.log(`   总成功率: ${successRate}%`);
  
  if (apiResults.failed === 0 && structureTest) {
    console.log('\n🎉 所有测试通过！分类层级功能正常工作。');
    return true;
  } else {
    console.log('\n⚠️  部分测试失败，请检查实现。');
    return false;
  }
}

// 运行
if (require.main === module) {
  main()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('测试运行失败:', error);
      process.exit(1);
    });
}

module.exports = { testCategoryHierarchy, testDataStructure };