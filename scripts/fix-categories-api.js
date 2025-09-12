#!/usr/bin/env node

/**
 * 修复分类 API 问题
 * 检查并修复数据库结构和 API 连接问题
 */

const http = require('http');

// 测试 API 连接
async function testCategoriesAPI() {
  console.log('🧪 测试分类 API...\n');

  const tests = [
    {
      name: '获取分类列表',
      url: 'http://localhost:3000/api/categories?format=flat&limit=5',
      method: 'GET'
    },
    {
      name: '获取分类树',
      url: 'http://localhost:3000/api/categories/tree',
      method: 'GET'
    },
    {
      name: '创建测试分类',
      url: 'http://localhost:3000/api/categories',
      method: 'POST',
      data: {
        name: '测试分类_' + Date.now(),
        description: '这是一个测试分类',
        color: '#3b82f6',
        icon: '🧪'
      }
    }
  ];

  for (const test of tests) {
    console.log(`📋 ${test.name}...`);
    
    try {
      const result = await makeRequest(test.url, test.method, test.data);
      
      if (result.status === 200 || result.status === 201) {
        console.log(`   ✅ 成功 (${result.status})`);
        
        if (result.data && typeof result.data === 'object') {
          if (result.data.success !== undefined) {
            console.log(`   📊 API响应: ${result.data.success ? '成功' : '失败'}`);
            if (result.data.error) {
              console.log(`   ❌ 错误: ${result.data.error.message}`);
            }
            if (result.data.data && Array.isArray(result.data.data)) {
              console.log(`   📈 数据量: ${result.data.data.length} 条记录`);
            }
          }
        }
      } else {
        console.log(`   ❌ 失败 (${result.status})`);
        if (result.data && result.data.error) {
          console.log(`   💬 错误信息: ${result.data.error.message || result.data.error}`);
        }
      }
    } catch (error) {
      console.log(`   ❌ 请求失败: ${error.message}`);
    }
    
    console.log('');
  }
}

// HTTP 请求函数
function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 3000,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Categories-API-Test'
      }
    };

    const req = http.request(options, (res) => {
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

// 检查数据库迁移状态
async function checkMigrationStatus() {
  console.log('🔍 检查数据库迁移状态...\n');

  try {
    const response = await makeRequest('http://localhost:3000/api/categories?format=flat&limit=1');
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ 分类 API 正常工作');
      
      if (response.data.data && response.data.data.length > 0) {
        const category = response.data.data[0];
        console.log('📊 分类数据结构检查:');
        console.log(`   ID: ${category.id ? '✅' : '❌'}`);
        console.log(`   名称: ${category.name ? '✅' : '❌'}`);
        console.log(`   层级: ${category.level !== undefined ? '✅' : '❌'}`);
        console.log(`   排序: ${category.sortOrder !== undefined ? '✅' : '❌'}`);
        console.log(`   激活: ${category.isActive !== undefined ? '✅' : '❌'}`);
        console.log(`   父ID: ${category.parentId !== undefined ? '✅' : '❌'}`);
        
        if (category.level !== undefined && category.sortOrder !== undefined) {
          console.log('\\n✅ 数据库迁移已完成');
        } else {
          console.log('\\n⚠️  数据库迁移可能未完成');
        }
      } else {
        console.log('📝 数据库中暂无分类数据');
      }
    } else {
      console.log('❌ 分类 API 响应异常');
      if (response.data && response.data.error) {
        console.log(`💬 错误: ${response.data.error.message}`);
      }
    }
  } catch (error) {
    console.log('❌ 无法连接到分类 API');
    console.log(`💬 错误: ${error.message}`);
    console.log('\\n💡 请确保应用正在运行 (npm run dev)');
  }
}

// 提供修复建议
function provideFixes() {
  console.log('\\n🔧 修复建议:\\n');
  
  console.log('1. 检查应用是否运行:');
  console.log('   npm run dev');
  console.log('');
  
  console.log('2. 检查数据库连接:');
  console.log('   确保 DATABASE_URL 环境变量正确设置');
  console.log('   检查 PostgreSQL 服务是否运行');
  console.log('');
  
  console.log('3. 运行数据库迁移:');
  console.log('   psql $DATABASE_URL -f database/migrations/001_add_category_hierarchy.sql');
  console.log('');
  
  console.log('4. 检查 API 路由:');
  console.log('   确保 src/app/api/categories/route.ts 文件存在且正确');
  console.log('');
  
  console.log('5. 重启开发服务器:');
  console.log('   Ctrl+C 停止服务器，然后重新运行 npm run dev');
}

// 主函数
async function main() {
  console.log('🚀 分类 API 诊断和修复工具\\n');
  
  await checkMigrationStatus();
  console.log('\\n' + '='.repeat(50));
  
  await testCategoriesAPI();
  console.log('='.repeat(50));
  
  provideFixes();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testCategoriesAPI, checkMigrationStatus };