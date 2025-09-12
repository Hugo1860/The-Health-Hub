#!/usr/bin/env node

/**
 * 修复数据库结构脚本
 * 添加分类层级功能所需的字段
 */

async function fixDatabaseSchema() {
  console.log('🔧 开始修复数据库结构...\n');

  try {
    // 动态导入数据库模块
    const path = require('path');
    const dbPath = path.resolve(__dirname, '../src/lib/db.ts');
    
    // 使用 require 而不是 import
    const db = require('../src/lib/db.ts').default;
    
    console.log('📡 检查数据库连接...');
    const isConnected = db.isConnected();
    console.log(`数据库连接状态: ${isConnected ? '✅ 已连接' : '❌ 未连接'}`);
    
    if (!isConnected) {
      console.log('尝试重新连接...');
      await db.reconnect();
    }

    // 检查当前表结构
    console.log('\n📋 检查当前表结构...');
    const columnsResult = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'categories'
      ORDER BY ordinal_position
    `);
    
    const existingColumns = columnsResult.rows.map(row => row.column_name);
    console.log('现有字段:', existingColumns);
    
    // 需要添加的字段
    const requiredFields = [
      { name: 'parent_id', type: 'VARCHAR(255)', nullable: true, default: 'NULL' },
      { name: 'level', type: 'INTEGER', nullable: false, default: '1' },
      { name: 'sort_order', type: 'INTEGER', nullable: false, default: '0' },
      { name: 'is_active', type: 'BOOLEAN', nullable: false, default: 'TRUE' },
      { name: 'color', type: 'VARCHAR(7)', nullable: true, default: "'#6b7280'" },
      { name: 'icon', type: 'VARCHAR(10)', nullable: true, default: "'📂'" }
    ];
    
    // 检查并添加缺失的字段
    console.log('\n🔨 添加缺失的字段...');
    for (const field of requiredFields) {
      if (!existingColumns.includes(field.name)) {
        console.log(`  添加字段: ${field.name}`);
        
        const alterQuery = `
          ALTER TABLE categories 
          ADD COLUMN ${field.name} ${field.type} 
          ${field.nullable ? '' : 'NOT NULL'} 
          DEFAULT ${field.default}
        `;
        
        try {
          await db.query(alterQuery);
          console.log(`  ✅ ${field.name} 添加成功`);
        } catch (error) {
          console.log(`  ⚠️  ${field.name} 添加失败: ${error.message}`);
        }
      } else {
        console.log(`  ✅ ${field.name} 已存在`);
      }
    }
    
    // 检查 audios 表的分类字段
    console.log('\n📋 检查 audios 表结构...');
    const audioColumnsResult = await db.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'audios'
      AND column_name IN ('category_id', 'subcategory_id')
    `);
    
    const existingAudioColumns = audioColumnsResult.rows.map(row => row.column_name);
    console.log('audios 表现有分类字段:', existingAudioColumns);
    
    // 添加 audios 表的分类字段
    const audioFields = [
      { name: 'category_id', type: 'VARCHAR(255)' },
      { name: 'subcategory_id', type: 'VARCHAR(255)' }
    ];
    
    for (const field of audioFields) {
      if (!existingAudioColumns.includes(field.name)) {
        console.log(`  添加 audios 字段: ${field.name}`);
        
        try {
          await db.query(`ALTER TABLE audios ADD COLUMN ${field.name} ${field.type}`);
          console.log(`  ✅ ${field.name} 添加成功`);
        } catch (error) {
          console.log(`  ⚠️  ${field.name} 添加失败: ${error.message}`);
        }
      } else {
        console.log(`  ✅ ${field.name} 已存在`);
      }
    }
    
    // 添加约束和索引
    console.log('\n🔗 添加约束和索引...');
    
    const constraints = [
      {
        name: 'chk_category_level',
        sql: 'ALTER TABLE categories ADD CONSTRAINT chk_category_level CHECK (level IN (1, 2))'
      },
      {
        name: 'idx_categories_parent',
        sql: 'CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id)'
      },
      {
        name: 'idx_categories_level',
        sql: 'CREATE INDEX IF NOT EXISTS idx_categories_level ON categories(level)'
      },
      {
        name: 'idx_categories_active',
        sql: 'CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active)'
      }
    ];
    
    for (const constraint of constraints) {
      try {
        await db.query(constraint.sql);
        console.log(`  ✅ ${constraint.name} 添加成功`);
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log(`  ✅ ${constraint.name} 已存在`);
        } else {
          console.log(`  ⚠️  ${constraint.name} 添加失败: ${error.message}`);
        }
      }
    }
    
    // 初始化现有数据
    console.log('\n📊 初始化现有数据...');
    
    // 设置现有分类为一级分类
    const updateResult = await db.query(`
      UPDATE categories 
      SET level = 1, sort_order = 0, is_active = TRUE 
      WHERE level IS NULL OR level = 0
    `);
    console.log(`  更新了 ${updateResult.rowCount} 个分类的层级信息`);
    
    // 创建一些默认分类（如果表为空）
    const countResult = await db.query('SELECT COUNT(*) as count FROM categories');
    const categoryCount = parseInt(countResult.rows[0].count);
    
    if (categoryCount === 0) {
      console.log('\n🎯 创建默认分类...');
      
      const defaultCategories = [
        { name: '心血管', description: '心血管疾病相关内容', color: '#ef4444', icon: '❤️' },
        { name: '神经科', description: '神经系统疾病相关内容', color: '#8b5cf6', icon: '🧠' },
        { name: '内科学', description: '内科疾病相关内容', color: '#10b981', icon: '🏥' },
        { name: '外科', description: '外科手术相关内容', color: '#f59e0b', icon: '🔬' },
        { name: '儿科', description: '儿童疾病相关内容', color: '#3b82f6', icon: '👶' }
      ];
      
      for (const category of defaultCategories) {
        const categoryId = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        try {
          await db.query(`
            INSERT INTO categories (
              id, name, description, color, icon, level, sort_order, is_active, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, 1, 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [categoryId, category.name, category.description, category.color, category.icon]);
          
          console.log(`  ✅ 创建分类: ${category.name}`);
        } catch (error) {
          console.log(`  ⚠️  创建分类失败 ${category.name}: ${error.message}`);
        }
      }
    }
    
    // 最终验证
    console.log('\n✅ 数据库结构修复完成！');
    
    const finalCount = await db.query('SELECT COUNT(*) as count FROM categories');
    console.log(`📊 当前分类总数: ${finalCount.rows[0].count}`);
    
    const finalColumns = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'categories'
      ORDER BY ordinal_position
    `);
    console.log('📋 最终字段列表:', finalColumns.rows.map(row => row.column_name));
    
  } catch (error) {
    console.error('❌ 数据库结构修复失败:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  fixDatabaseSchema();
}

module.exports = { fixDatabaseSchema };