#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000';

async function registerPostgreSQLAdapter() {
  console.log('🔧 注册PostgreSQL数据库适配器...');
  
  const config = {
    name: 'postgres_main',
    template: 'postgresql_local',
    config: {
      connection: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_DATABASE || 'health_hub',
        username: process.env.DB_USERNAME || process.env.USER,
        password: process.env.DB_PASSWORD || '',
        ssl: process.env.DB_SSL === 'true'
      }
    },
    setAsDefault: true,
    testConnection: true
  };

  try {
    const response = await fetch(`${API_BASE}/api/database/adapters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ PostgreSQL适配器注册成功');
      console.log('📊 适配器信息:', JSON.stringify(data, null, 2));
    } else {
      console.error('❌ 适配器注册失败:', data);
    }

  } catch (error) {
    console.error('❌ 注册过程出错:', error);
  }
}

async function checkAdapterStatus() {
  console.log('\n🔍 检查适配器状态...');
  
  try {
    const response = await fetch(`${API_BASE}/api/database/adapters?health=true&info=true`);
    const data = await response.json();

    if (response.ok) {
      console.log('📊 适配器状态:', JSON.stringify(data, null, 2));
    } else {
      console.error('❌ 获取适配器状态失败:', data);
    }

  } catch (error) {
    console.error('❌ 检查状态出错:', error);
  }
}

async function main() {
  console.log('🚀 PostgreSQL适配器配置工具\n');
  
  // 等待服务器启动
  console.log('⏳ 等待服务器启动...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await registerPostgreSQLAdapter();
  await checkAdapterStatus();
  
  console.log('\n🎉 PostgreSQL适配器配置完成！');
  console.log('\n📝 下一步：');
  console.log('1. 重启应用程序以使用PostgreSQL');
  console.log('2. 访问应用程序验证功能正常');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { registerPostgreSQLAdapter, checkAdapterStatus };