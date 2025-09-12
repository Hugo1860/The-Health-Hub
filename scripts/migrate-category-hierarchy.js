#!/usr/bin/env node

/**
 * 分类层级功能数据迁移脚本
 * 执行数据库结构更新和数据迁移
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_DATABASE || 'health_hub',
  user: process.env.DB_USERNAME || 'hugo',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

async function executeMigration() {
  const pool = new Pool(dbConfig);
  let client;

  try {
    console.log('🚀 开始执行分类层级功能数据迁移...');
    
    client = await pool.connect();
    
    // 检查是否已经迁移过
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'categories' AND column_name = 'parent_id'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('⚠️  检测到已经执行过迁移，跳过结构更新');
    } else {
      // 读取并执行迁移脚本
      const migrationPath = path.join(__dirname, '../database/migrations/001_add_category_hierarchy.sql');
      const migrationSQL = await fs.readFile(migrationPath, 'utf8');
      
      console.log('📝 执行数据库结构迁移...');
      await client.query(migrationSQL);
      console.log('✅ 数据库结构迁移完成');
    }
    
    // 验证迁移结果
    console.log('🔍 验证迁移结果...');
    
    const categoryStats = await client.query(`
      SELECT 
        COUNT(*) as total_categories,
        COUNT(CASE WHEN level = 1 THEN 1 END) as level1_count,
        COUNT(CASE WHEN level = 2 THEN 1 END) as level2_count
      FROM categories
    `);
    
    const audioStats = await client.query(`
      SELECT 
        COUNT(*) as total_audios,
        COUNT(CASE WHEN category_id IS NOT NULL THEN 1 END) as migrated_audios,
        COUNT(CASE WHEN subject IS NOT NULL AND category_id IS NULL THEN 1 END) as unmigrated_audios
      FROM audios
    `);
    
    console.log('📊 迁移统计:');
    console.log(`   总分类数: ${categoryStats.rows[0].total_categories}`);
    console.log(`   一级分类: ${categoryStats.rows[0].level1_count}`);
    console.log(`   二级分类: ${categoryStats.rows[0].level2_count}`);
    console.log(`   总音频数: ${audioStats.rows[0].total_audios}`);
    console.log(`   已迁移音频: ${audioStats.rows[0].migrated_audios}`);
    console.log(`   未迁移音频: ${audioStats.rows[0].unmigrated_audios}`);
    
    // 处理未迁移的音频
    if (parseInt(audioStats.rows[0].unmigrated_audios) > 0) {
      console.log('🔧 处理未迁移的音频...');
      
      const unmigrated = await client.query(`
        SELECT DISTINCT subject 
        FROM audios 
        WHERE subject IS NOT NULL AND category_id IS NULL
      `);
      
      for (const row of unmigrated.rows) {
        console.log(`   处理分类: ${row.subject}`);
        
        // 查找或创建对应的分类
        let category = await client.query(`
          SELECT id FROM categories WHERE name = $1 AND level = 1
        `, [row.subject]);
        
        if (category.rows.length === 0) {
          // 创建新的一级分类
          const newCategoryId = `category-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          await client.query(`
            INSERT INTO categories (id, name, description, level, sort_order, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, 1, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [newCategoryId, row.subject, `${row.subject}相关内容`]);
          
          category = { rows: [{ id: newCategoryId }] };
          console.log(`     创建新分类: ${newCategoryId}`);
        }
        
        // 更新音频的分类关联
        const updateResult = await client.query(`
          UPDATE audios 
          SET category_id = $1 
          WHERE subject = $2 AND category_id IS NULL
        `, [category.rows[0].id, row.subject]);
        
        console.log(`     更新了 ${updateResult.rowCount} 个音频`);
      }
    }
    
    // 最终验证
    const finalStats = await client.query(`
      SELECT 
        COUNT(*) as total_audios,
        COUNT(CASE WHEN category_id IS NOT NULL THEN 1 END) as migrated_audios
      FROM audios
    `);
    
    console.log('✅ 迁移完成！');
    console.log(`   最终统计: ${finalStats.rows[0].migrated_audios}/${finalStats.rows[0].total_audios} 音频已关联分类`);
    
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    
    if (error.code) {
      console.error(`   错误代码: ${error.code}`);
    }
    
    console.log('🔄 尝试回滚...');
    try {
      const rollbackPath = path.join(__dirname, '../database/migrations/001_add_category_hierarchy_rollback.sql');
      const rollbackSQL = await fs.readFile(rollbackPath, 'utf8');
      await client.query(rollbackSQL);
      console.log('✅ 回滚成功');
    } catch (rollbackError) {
      console.error('❌ 回滚失败:', rollbackError);
    }
    
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// 执行迁移
if (require.main === module) {
  executeMigration().catch(console.error);
}

module.exports = { executeMigration };