#!/usr/bin/env node

/**
 * 分类层级功能数据验证脚本
 * 验证迁移后的数据完整性和一致性
 */

const { Pool } = require('pg');

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_DATABASE || 'health_hub',
  user: process.env.DB_USERNAME || 'hugo',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

async function validateMigration() {
  const pool = new Pool(dbConfig);
  let client;
  let hasErrors = false;

  try {
    console.log('🔍 开始验证分类层级功能数据迁移...');
    
    client = await pool.connect();
    
    // 1. 检查表结构
    console.log('\n📋 检查表结构...');
    
    const requiredColumns = [
      { table: 'categories', column: 'parent_id' },
      { table: 'categories', column: 'level' },
      { table: 'categories', column: 'sort_order' },
      { table: 'categories', column: 'is_active' },
      { table: 'audios', column: 'category_id' },
      { table: 'audios', column: 'subcategory_id' }
    ];
    
    for (const { table, column } of requiredColumns) {
      const result = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2
      `, [table, column]);
      
      if (result.rows.length === 0) {
        console.error(`❌ 缺少列: ${table}.${column}`);
        hasErrors = true;
      } else {
        console.log(`✅ 列存在: ${table}.${column}`);
      }
    }
    
    // 2. 检查索引
    console.log('\n📊 检查索引...');
    
    const requiredIndexes = [
      'idx_categories_parent',
      'idx_categories_level',
      'idx_categories_active',
      'idx_categories_sort',
      'idx_audios_category',
      'idx_audios_subcategory'
    ];
    
    for (const indexName of requiredIndexes) {
      const result = await client.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE indexname = $1
      `, [indexName]);
      
      if (result.rows.length === 0) {
        console.error(`❌ 缺少索引: ${indexName}`);
        hasErrors = true;
      } else {
        console.log(`✅ 索引存在: ${indexName}`);
      }
    }
    
    // 3. 检查数据一致性
    console.log('\n🔍 检查数据一致性...');
    
    // 检查层级一致性
    const levelInconsistency = await client.query(`
      SELECT COUNT(*) as count
      FROM categories 
      WHERE (level = 1 AND parent_id IS NOT NULL) 
         OR (level = 2 AND parent_id IS NULL)
    `);
    
    if (parseInt(levelInconsistency.rows[0].count) > 0) {
      console.error(`❌ 发现 ${levelInconsistency.rows[0].count} 个层级不一致的分类`);
      hasErrors = true;
    } else {
      console.log('✅ 分类层级一致性检查通过');
    }
    
    // 检查父分类引用
    const orphanCategories = await client.query(`
      SELECT COUNT(*) as count
      FROM categories c1
      WHERE c1.parent_id IS NOT NULL 
        AND NOT EXISTS (
          SELECT 1 FROM categories c2 
          WHERE c2.id = c1.parent_id AND c2.level = 1
        )
    `);
    
    if (parseInt(orphanCategories.rows[0].count) > 0) {
      console.error(`❌ 发现 ${orphanCategories.rows[0].count} 个孤儿分类（父分类不存在）`);
      hasErrors = true;
    } else {
      console.log('✅ 分类父子关系检查通过');
    }
    
    // 检查音频分类关联
    const invalidAudioCategories = await client.query(`
      SELECT COUNT(*) as count
      FROM audios a
      WHERE (a.category_id IS NOT NULL AND NOT EXISTS (
               SELECT 1 FROM categories c WHERE c.id = a.category_id
             ))
         OR (a.subcategory_id IS NOT NULL AND NOT EXISTS (
               SELECT 1 FROM categories c WHERE c.id = a.subcategory_id AND c.level = 2
             ))
    `);
    
    if (parseInt(invalidAudioCategories.rows[0].count) > 0) {
      console.error(`❌ 发现 ${invalidAudioCategories.rows[0].count} 个音频的分类关联无效`);
      hasErrors = true;
    } else {
      console.log('✅ 音频分类关联检查通过');
    }
    
    // 检查子分类与父分类的一致性
    const subcategoryInconsistency = await client.query(`
      SELECT COUNT(*) as count
      FROM audios a
      JOIN categories sub ON a.subcategory_id = sub.id
      WHERE a.category_id != sub.parent_id
    `);
    
    if (parseInt(subcategoryInconsistency.rows[0].count) > 0) {
      console.error(`❌ 发现 ${subcategoryInconsistency.rows[0].count} 个音频的子分类与父分类不一致`);
      hasErrors = true;
    } else {
      console.log('✅ 音频子分类一致性检查通过');
    }
    
    // 4. 统计信息
    console.log('\n📊 数据统计...');
    
    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM categories WHERE level = 1) as level1_categories,
        (SELECT COUNT(*) FROM categories WHERE level = 2) as level2_categories,
        (SELECT COUNT(*) FROM audios WHERE category_id IS NOT NULL) as audios_with_category,
        (SELECT COUNT(*) FROM audios WHERE subcategory_id IS NOT NULL) as audios_with_subcategory,
        (SELECT COUNT(*) FROM audios) as total_audios
    `);
    
    const stat = stats.rows[0];
    console.log(`   一级分类数量: ${stat.level1_categories}`);
    console.log(`   二级分类数量: ${stat.level2_categories}`);
    console.log(`   有分类的音频: ${stat.audios_with_category}/${stat.total_audios}`);
    console.log(`   有子分类的音频: ${stat.audios_with_subcategory}/${stat.total_audios}`);
    
    // 5. 性能测试
    console.log('\n⚡ 性能测试...');
    
    const performanceTests = [
      {
        name: '分类树查询',
        query: `
          SELECT c1.*, c2.id as child_id, c2.name as child_name
          FROM categories c1
          LEFT JOIN categories c2 ON c1.id = c2.parent_id
          WHERE c1.level = 1 AND c1.is_active = true
          ORDER BY c1.sort_order, c2.sort_order
        `
      },
      {
        name: '音频分类筛选',
        query: `
          SELECT a.id, a.title, c1.name as category, c2.name as subcategory
          FROM audios a
          LEFT JOIN categories c1 ON a.category_id = c1.id
          LEFT JOIN categories c2 ON a.subcategory_id = c2.id
          WHERE a.status = 'published'
          LIMIT 100
        `
      }
    ];
    
    for (const test of performanceTests) {
      const startTime = Date.now();
      await client.query(test.query);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`   ${test.name}: ${duration}ms`);
      
      if (duration > 1000) {
        console.warn(`⚠️  ${test.name} 查询较慢 (${duration}ms)`);
      }
    }
    
    // 总结
    console.log('\n' + '='.repeat(50));
    if (hasErrors) {
      console.error('❌ 验证失败！发现数据问题，请检查并修复。');
      process.exit(1);
    } else {
      console.log('✅ 验证通过！分类层级功能数据迁移成功。');
    }
    
  } catch (error) {
    console.error('❌ 验证过程中发生错误:', error);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// 执行验证
if (require.main === module) {
  validateMigration().catch(console.error);
}

module.exports = { validateMigration };