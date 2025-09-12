#!/usr/bin/env node

/**
 * 简化的数据库结构修复脚本
 * 直接使用 pg 库连接数据库
 */

const { Pool } = require('pg');

async function fixDatabaseSchema() {
  console.log('🔧 开始修复数据库结构...\n');

  // 从环境变量获取数据库连接
  require('dotenv').config({ path: '.env.local' });
  
  const connectionString = process.env.DATABASE_URL;
  let pool;
  
  if (connectionString) {
    console.log('使用 DATABASE_URL 连接');
    pool = new Pool({
      connectionString: connectionString,
    });
  } else {
    // 使用分离的配置
    console.log('使用分离的数据库配置');
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_DATABASE || 'health_hub',
      user: process.env.DB_USERNAME || 'hugo',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    });
  }

  try {
    console.log('📡 连接数据库...');
    const client = await pool.connect();
    
    // 检查当前表结构
    console.log('📋 检查当前表结构...');
    const columnsResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'categories'
      ORDER BY ordinal_position
    `);
    
    const existingColumns = columnsResult.rows.map(row => row.column_name);
    console.log('现有字段:', existingColumns);
    
    // 需要添加的字段
    const fieldsToAdd = [
      { name: 'parent_id', sql: 'ALTER TABLE categories ADD COLUMN parent_id VARCHAR(255) DEFAULT NULL' },
      { name: 'level', sql: 'ALTER TABLE categories ADD COLUMN level INTEGER DEFAULT 1 NOT NULL' },
      { name: 'sort_order', sql: 'ALTER TABLE categories ADD COLUMN sort_order INTEGER DEFAULT 0 NOT NULL' },
      { name: 'is_active', sql: 'ALTER TABLE categories ADD COLUMN is_active BOOLEAN DEFAULT TRUE NOT NULL' },
      { name: 'color', sql: "ALTER TABLE categories ADD COLUMN color VARCHAR(7) DEFAULT '#6b7280'" },
      { name: 'icon', sql: "ALTER TABLE categories ADD COLUMN icon VARCHAR(10) DEFAULT '📂'" }
    ];
    
    console.log('\n🔨 添加缺失的字段...');
    for (const field of fieldsToAdd) {
      if (!existingColumns.includes(field.name)) {
        try {
          await client.query(field.sql);
          console.log(`  ✅ ${field.name} 添加成功`);
        } catch (error) {
          console.log(`  ⚠️  ${field.name} 添加失败: ${error.message}`);
        }
      } else {
        console.log(`  ✅ ${field.name} 已存在`);
      }
    }
    
    // 检查 audios 表
    console.log('\n📋 检查 audios 表...');
    const audioColumnsResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'audios'
      AND column_name IN ('category_id', 'subcategory_id')
    `);
    
    const existingAudioColumns = audioColumnsResult.rows.map(row => row.column_name);
    
    const audioFieldsToAdd = [
      { name: 'category_id', sql: 'ALTER TABLE audios ADD COLUMN category_id VARCHAR(255)' },
      { name: 'subcategory_id', sql: 'ALTER TABLE audios ADD COLUMN subcategory_id VARCHAR(255)' }
    ];
    
    for (const field of audioFieldsToAdd) {
      if (!existingAudioColumns.includes(field.name)) {
        try {
          await client.query(field.sql);
          console.log(`  ✅ audios.${field.name} 添加成功`);
        } catch (error) {
          console.log(`  ⚠️  audios.${field.name} 添加失败: ${error.message}`);
        }
      } else {
        console.log(`  ✅ audios.${field.name} 已存在`);
      }
    }
    
    // 添加索引
    console.log('\n🔗 添加索引...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id)',
      'CREATE INDEX IF NOT EXISTS idx_categories_level ON categories(level)',
      'CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_audios_category ON audios(category_id)',
      'CREATE INDEX IF NOT EXISTS idx_audios_subcategory ON audios(subcategory_id)'
    ];
    
    for (const indexSql of indexes) {
      try {
        await client.query(indexSql);
        console.log(`  ✅ 索引添加成功`);
      } catch (error) {
        console.log(`  ⚠️  索引添加失败: ${error.message}`);
      }
    }
    
    // 初始化数据
    console.log('\n📊 初始化数据...');
    
    // 更新现有分类
    const updateResult = await client.query(`
      UPDATE categories 
      SET level = 1, sort_order = 0, is_active = TRUE 
      WHERE level IS NULL OR level = 0
    `);
    console.log(`  更新了 ${updateResult.rowCount} 个分类`);
    
    // 检查是否需要创建默认分类
    const countResult = await client.query('SELECT COUNT(*) as count FROM categories');
    const categoryCount = parseInt(countResult.rows[0].count);
    
    if (categoryCount === 0) {
      console.log('\n🎯 创建默认分类...');
      
      const defaultCategories = [
        ['cat_cardiology', '心血管', '心血管疾病相关内容', '#ef4444', '❤️'],
        ['cat_neurology', '神经科', '神经系统疾病相关内容', '#8b5cf6', '🧠'],
        ['cat_internal', '内科学', '内科疾病相关内容', '#10b981', '🏥'],
        ['cat_surgery', '外科', '外科手术相关内容', '#f59e0b', '🔬'],
        ['cat_pediatrics', '儿科', '儿童疾病相关内容', '#3b82f6', '👶']
      ];
      
      for (let i = 0; i < defaultCategories.length; i++) {
        const [id, name, description, color, icon] = defaultCategories[i];
        
        try {
          await client.query(`
            INSERT INTO categories (
              id, name, description, color, icon, level, sort_order, is_active, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, 1, $6, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [id, name, description, color, icon, i]);
          
          console.log(`  ✅ 创建分类: ${name}`);
        } catch (error) {
          console.log(`  ⚠️  创建分类失败 ${name}: ${error.message}`);
        }
      }
    }
    
    // 最终验证
    console.log('\n✅ 数据库结构修复完成！');
    
    const finalCount = await client.query('SELECT COUNT(*) as count FROM categories');
    console.log(`📊 当前分类总数: ${finalCount.rows[0].count}`);
    
    const finalColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'categories'
      ORDER BY ordinal_position
    `);
    console.log('📋 最终字段列表:', finalColumns.rows.map(row => row.column_name));
    
    client.release();
    
  } catch (error) {
    console.error('❌ 数据库结构修复失败:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  fixDatabaseSchema();
}

module.exports = { fixDatabaseSchema };