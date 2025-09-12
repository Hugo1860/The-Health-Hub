#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000';

async function testAdminAudioAPI() {
  console.log('🧪 测试管理员音频API...');
  
  try {
    // 测试公共音频API（不需要认证）
    console.log('\n1. 测试公共音频API...');
    const publicResponse = await fetch(`${API_BASE}/api/audio?limit=2`);
    const publicData = await publicResponse.json();
    
    if (publicResponse.ok) {
      console.log('✅ 公共音频API正常');
      console.log(`   找到 ${publicData.data.length} 条音频记录`);
      console.log(`   总计 ${publicData.pagination.totalItems} 条记录`);
    } else {
      console.log('❌ 公共音频API失败:', publicData);
      return;
    }
    
    // 测试管理员音频API（需要认证，预期会失败）
    console.log('\n2. 测试管理员音频API（无认证）...');
    const adminResponse = await fetch(`${API_BASE}/api/admin/simple-audio`);
    const adminData = await adminResponse.json();
    
    if (adminResponse.status === 401) {
      console.log('✅ 管理员API正确要求认证');
      console.log('   错误信息:', adminData.error?.message || adminData.error);
    } else if (adminResponse.ok) {
      console.log('⚠️  管理员API意外成功（可能认证有问题）');
      console.log('   数据:', adminData);
    } else {
      console.log('❌ 管理员API出现其他错误:', adminData);
    }
    
    // 测试数据库连接
    console.log('\n3. 测试数据库健康状态...');
    const healthResponse = await fetch(`${API_BASE}/api/health/database`);
    const healthData = await healthResponse.json();
    
    if (healthResponse.ok) {
      console.log('✅ 数据库连接正常');
      console.log('   数据库类型:', healthData.database?.type || '未知');
      console.log('   连接状态:', healthData.database?.connected ? '已连接' : '未连接');
    } else {
      console.log('❌ 数据库健康检查失败:', healthData);
    }
    
    // 检查PostgreSQL表结构
    console.log('\n4. 检查PostgreSQL表结构...');
    try {
      const { Pool } = require('pg');
      const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_DATABASE || 'health_hub',
        user: process.env.DB_USERNAME || process.env.USER,
        password: process.env.DB_PASSWORD || '',
      });
      
      const result = await pool.query('SELECT COUNT(*) as count FROM audios');
      console.log('✅ PostgreSQL直接查询成功');
      console.log(`   音频表记录数: ${result.rows[0].count}`);
      
      await pool.end();
    } catch (error) {
      console.log('❌ PostgreSQL直接查询失败:', error.message);
    }
    
  } catch (error) {
    console.error('❌ 测试过程出错:', error);
  }
}

async function main() {
  console.log('🚀 管理员音频API测试工具\n');
  
  // 等待服务器启动
  console.log('⏳ 等待服务器响应...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testAdminAudioAPI();
  
  console.log('\n📝 总结：');
  console.log('- 如果公共API正常但管理员API失败，说明PostgreSQL连接正常');
  console.log('- 管理员API需要登录认证才能访问');
  console.log('- 可以通过浏览器登录后再测试管理面板');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testAdminAudioAPI };