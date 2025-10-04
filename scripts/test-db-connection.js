#!/usr/bin/env node

/**
 * 数据库连接测试脚本
 * 用于验证 MySQL 连接池是否正常工作
 */

require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function testDatabaseConnection() {
  console.log('🔍 开始测试 MySQL 数据库连接...\n');

  let pool;

  try {
    console.log('1️⃣ 创建连接池...');
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'health_hub',
      connectionLimit: 50,
      waitForConnections: true,
      queueLimit: 0,
    });
    
    console.log('✅ 连接池创建成功');
    console.log('📋 连接配置:', {
      '主机': process.env.DB_HOST,
      '端口': process.env.DB_PORT,
      '数据库': process.env.DB_DATABASE,
      '用户': process.env.DB_USERNAME,
      '连接上限': 50,
    });
    
    // 测试简单查询
    console.log('\n2️⃣ 执行测试查询...');
    const [rows1] = await pool.query('SELECT 1 as test');
    
    if (rows1 && rows1[0].test === 1) {
      console.log('✅ 数据库查询成功！');
    } else {
      console.error('❌ 查询结果异常:', rows1);
      process.exit(1);
    }

    // 测试表查询
    console.log('\n3️⃣ 检查数据库表...');
    const [tables] = await pool.query('SHOW TABLES');
    console.log(`✅ 发现 ${tables.length} 个表:`, tables.slice(0, 10).map(t => Object.values(t)[0]).join(', '));

    // 测试数据查询
    console.log('\n4️⃣ 检查关键表数据...');
    const [audioCount] = await pool.query('SELECT COUNT(*) as count FROM audios');
    const [categoryCount] = await pool.query('SELECT COUNT(*) as count FROM categories');
    const [userCount] = await pool.query('SELECT COUNT(*) as count FROM users');
    
    console.log('📊 数据统计:', {
      '音频数量': audioCount[0].count,
      '分类数量': categoryCount[0].count,
      '用户数量': userCount[0].count,
    });

    // 测试并发查询
    console.log('\n5️⃣ 测试并发查询 (20 个并发请求)...');
    const startTime = Date.now();
    const promises = Array.from({ length: 20 }, (_, i) => 
      pool.query('SELECT ? as id, SLEEP(0.05) as delay', [i])
    );
    
    await Promise.all(promises);
    const duration = Date.now() - startTime;
    console.log(`✅ 并发查询完成，耗时: ${duration}ms`);

    // 检查连接池状态（通过内部 API）
    console.log('\n6️⃣ 检查连接池状态...');
    const poolStats = {
      '配置上限': pool.pool.config.connectionLimit || 50,
      '总连接数': pool.pool._allConnections?.length || 0,
      '空闲连接': pool.pool._freeConnections?.length || 0,
      '活跃连接': (pool.pool._allConnections?.length || 0) - (pool.pool._freeConnections?.length || 0),
    };
    console.log('📊 连接池统计:', poolStats);

    if (poolStats['配置上限'] >= 50) {
      console.log('✅ 连接池配置正确（上限 >= 50）');
    } else {
      console.warn('⚠️  连接池上限较小:', poolStats['配置上限']);
    }

    console.log('\n🎉 所有测试通过！数据库连接正常工作。\n');
    
    // 关闭连接池
    await pool.end();
    console.log('✅ 连接池已关闭');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    console.error('\n错误详情:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
    });
    process.exit(1);
  }
}

// 运行测试
testDatabaseConnection()
  .then(() => {
    console.log('✅ 测试脚本执行完毕');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 测试脚本执行失败:', error);
    process.exit(1);
  });

