#!/usr/bin/env node

/**
 * 手动数据库修复脚本
 * 不依赖任何外部包，直接使用 pg
 */

const { Pool } = require('pg');

async function manualDbFix() {
  console.log('🔧 手动修复数据库结构...\n');

  // 直接使用硬编码的数据库配置
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'health_hub',
    user: 'hugo',
    password: '', // 空密码
    ssl: false
  });

  try {
    console.log('📡 连接数据库...');
    const client = await pool.connect();
    
    // 测试连接
    const testResult = await client.query('SELECT version()');
    console.log('✅ 数据库连接成功');
    
    // 检查 categories 表是否存在
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'categories'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ categories 表不存在，需要先创建基础表结构');
      console.log('请先运行: psql -d health_hub -f database/postgresql-schema.sql');
      process.exit(1);
    }
    
    console.log('✅ categories 表存在');
    
    // 检查现有字段
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'categories'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 当前 categories 表字段:');
    columnsResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
    const existingColumns = columnsResult.rows.map(row => row.column_name);
    
    // 逐个添加缺失字段
    const requiredFields = [
      {
        name: 'parent_id',
        sql: 'ALTER TABLE categories ADD COLUMN parent_id VARCHAR(255)',
        check: () => !existingColumns.includes('parent_id')
      },
      {
        name: 'level',
        sql: 'ALTER TABLE categories ADD COLUMN level INTEGER DEFAULT 1 NOT NULL',
        check: () => !existingColumns.includes('level')
      },
      {
        name: 'sort_order',
        sql: 'ALTER TABLE categories ADD COLUMN sort_order INTEGER DEFAULT 0 NOT NULL',
        check: () => !existingColumns.includes('sort_order')
      },
      {
        name: 'is_active',
        sql: 'ALTER TABLE categories ADD COLUMN is_active BOOLEAN DEFAULT TRUE NOT NULL',
        check: () => !existingColumns.includes('is_active')
      },
      {
        name: 'color',
        sql: "ALTER TABLE categories ADD COLUMN color VARCHAR(7) DEFAULT '#6b7280'",
        check: () => !existingColumns.includes('color')
      },
      {
        name: 'icon',
        sql: "ALTER TABLE categories ADD COLUMN icon VARCHAR(10) DEFAULT '📂'",
        check: () => !existingColumns.includes('icon')
      }
    ];
    
    console.log('\n🔨 添加缺失字段...');
    for (const field of requiredFields) {
      if (field.check()) {
        try {
          await client.query(field.sql);
          console.log(`  ✅ ${field.name} 添加成功`);
        } catch (error) {
          console.log(`  ❌ ${field.name} 添加失败: ${error.message}`);
        }
      } else {
        console.log(`  ✅ ${field.name} 已存在`);
      }
    }
    
    // 检查 audios 表
    const audioTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'audios'
      )
    `);
    
    if (audioTableCheck.rows[0].exists) {
      console.log('\n📋 检查 audios 表字段...');
      const audioColumnsResult = await client.query(`
        SELECT column_name
        FROM information_schema.columns 
        WHERE table_name = 'audios'
        AND column_name IN ('category_id', 'subcategory_id')
      `);
      
      const existingAudioColumns = audioColumnsResult.rows.map(row => row.column_name);
      
      if (!existingAudioColumns.includes('category_id')) {
        try {
          await client.query('ALTER TABLE audios ADD COLUMN category_id VARCHAR(255)');
          console.log('  ✅ audios.category_id 添加成功');
        } catch (error) {
          console.log(`  ❌ audios.category_id 添加失败: ${error.message}`);
        }
      } else {
        console.log('  ✅ audios.category_id 已存在');
      }
      
      if (!existingAudioColumns.includes('subcategory_id')) {
        try {
          await client.query('ALTER TABLE audios ADD COLUMN subcategory_id VARCHAR(255)');
          console.log('  ✅ audios.subcategory_id 添加成功');
        } catch (error) {
          console.log(`  ❌ audios.subcategory_id 添加失败: ${error.message}`);
        }
      } else {
        console.log('  ✅ audios.subcategory_id 已存在');
      }
    }
    
    // 初始化数据
    console.log('\n📊 初始化数据...');
    
    // 更新现有分类的层级信息
    const updateResult = await client.query(`
      UPDATE categories 
      SET level = 1, sort_order = 0, is_active = TRUE 
      WHERE level IS NULL OR level = 0
    `);
    console.log(`  更新了 ${updateResult.rowCount} 个分类的层级信息`);
    
    // 检查分类数量
    const countResult = await client.query('SELECT COUNT(*) as count FROM categories');
    const categoryCount = parseInt(countResult.rows[0].count);
    console.log(`  当前分类数量: ${categoryCount}`);
    
    // 如果没有分类，创建一些默认分类
    if (categoryCount === 0) {
      console.log('\n🎯 创建默认分类...');
      
      const defaultCategories = [
        { id: 'cat_cardiology', name: '心血管', desc: '心血管疾病相关内容', color: '#ef4444', icon: '❤️' },
        { id: 'cat_neurology', name: '神经科', desc: '神经系统疾病相关内容', color: '#8b5cf6', icon: '🧠' },
        { id: 'cat_internal', name: '内科学', desc: '内科疾病相关内容', color: '#10b981', icon: '🏥' },
        { id: 'cat_surgery', name: '外科', desc: '外科手术相关内容', color: '#f59e0b', icon: '🔬' },
        { id: 'cat_pediatrics', name: '儿科', desc: '儿童疾病相关内容', color: '#3b82f6', icon: '👶' }
      ];
      
      for (let i = 0; i < defaultCategories.length; i++) {
        const cat = defaultCategories[i];
        
        try {
          await client.query(`
            INSERT INTO categories (
              id, name, description, color, icon, level, sort_order, is_active, "createdAt", "updatedAt"
            ) VALUES ($1, $2, $3, $4, $5, 1, $6, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [cat.id, cat.name, cat.desc, cat.color, cat.icon, i]);
          
          console.log(`  ✅ 创建分类: ${cat.name}`);
        } catch (error) {
          console.log(`  ❌ 创建分类失败 ${cat.name}: ${error.message}`);
        }
      }
    }
    
    // 最终验证
    console.log('\n🎉 修复完成！');
    
    const finalCount = await client.query('SELECT COUNT(*) as count FROM categories');
    console.log(`📊 最终分类数量: ${finalCount.rows[0].count}`);
    
    // 测试查询
    console.log('\n🧪 测试查询...');
    const testQuery = await client.query(`
      SELECT id, name, color, icon, level, sort_order, is_active 
      FROM categories 
      ORDER BY sort_order 
      LIMIT 3
    `);
    
    console.log('📋 示例分类数据:');
    testQuery.rows.forEach(row => {
      console.log(`  - ${row.name} (${row.id}) - Level: ${row.level}, Active: ${row.is_active}`);
    });
    
    client.release();
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
    console.error('错误详情:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  manualDbFix();
}

module.exports = { manualDbFix };