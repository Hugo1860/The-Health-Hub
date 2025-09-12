#!/usr/bin/env node

/**
 * 快速测试分类功能
 */

const http = require('http');

async function testCategoriesAPI() {
  console.log('🧪 快速测试分类 API...\n');

  try {
    // 测试获取分类列表
    console.log('📋 测试获取分类列表...');
    const response = await makeRequest('http://localhost:3000/api/categories?format=flat&limit=5');
    
    if (response.status === 200) {
      console.log('✅ 分类 API 响应正常');
      
      if (response.data && response.data.success) {
        console.log('✅ API 返回成功状态');
        console.log(`📊 返回数据: ${response.data.data ? response.data.data.length : 0} 条分类`);
        
        if (response.data.data && response.data.data.length > 0) {
          const category = response.data.data[0];
          console.log('📝 示例分类数据:');
          console.log(`   ID: ${category.id}`);
          console.log(`   名称: ${category.name}`);
          console.log(`   层级: ${category.level}`);
          console.log(`   激活: ${category.isActive}`);
        }
      } else {
        console.log('⚠️  API 返回失败状态');
        if (response.data.error) {
          console.log(`❌ 错误: ${response.data.error.message}`);
        }
      }
    } else {
      console.log(`❌ API 响应异常: ${response.status}`);
      if (response.data && response.data.error) {
        console.log(`💬 错误信息: ${response.data.error.message}`);
      }
    }

    // 测试创建分类
    console.log('\n📝 测试创建分类...');
    const createResponse = await makeRequest('http://localhost:3000/api/categories', 'POST', {
      name: `测试分类_${Date.now()}`,
      description: '这是一个测试分类',
      color: '#3b82f6',
      icon: '🧪'
    });

    if (createResponse.status === 201 || createResponse.status === 200) {
      console.log('✅ 分类创建成功');
      if (createResponse.data && createResponse.data.data) {
        console.log(`📝 创建的分类ID: ${createResponse.data.data.id}`);
      }
    } else {
      console.log(`❌ 分类创建失败: ${createResponse.status}`);
      if (createResponse.data && createResponse.data.error) {
        console.log(`💬 错误信息: ${createResponse.data.error.message}`);
      }
    }

  } catch (error) {
    console.log('❌ 测试失败:', error.message);
    console.log('\n💡 请确保应用正在运行: npm run dev');
  }
}

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
            data: parsed
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

if (require.main === module) {
  testCategoriesAPI();
}

module.exports = { testCategoriesAPI };