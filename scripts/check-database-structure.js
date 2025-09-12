#!/usr/bin/env node

/**
 * 检查数据库结构和连接
 */

const { execSync } = require('child_process');
const path = require('path');

async function checkDatabaseStructure() {
  console.log('🔍 检查数据库结构...\n');

  try {
    // 使用 Next.js API 路由来检查数据库
    const testScript = `
      const db = require('./src/lib/db.ts').default;
      
      (async () => {
        try {
          console.log('📡 测试数据库连接...');
          
          // 检查连接
          const isConnected = db.isConnected();
          console.log('连接状态:', isConnected ? '✅ 已连接' : '❌ 未连接');
          
          // 检查 categories 表结构
          console.log('\\n📋 检查 categories 表结构...');
          const categoriesColumns = await db.query(\`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'categories'
            ORDER BY ordinal_position
          \`);
          
          console.log('Categories 表字段:');
          categoriesColumns.rows.forEach(col => {
            console.log(\`  - \${col.column_name}: \${col.data_type} \${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}\`);
          });
          
          // 检查 audios 表结构
          console.log('\\n📋 检查 audios 表结构...');
          const audiosColumns = await db.query(\`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'audios' 
            AND column_name IN ('category_id', 'subcategory_id', 'subject')
            ORDER BY ordinal_position
          \`);
          
          console.log('Audios 表分类相关字段:');
          audiosColumns.rows.forEach(col => {
            console.log(\`  - \${col.column_name}: \${col.data_type} \${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}\`);
          });
          
          // 检查数据
          console.log('\\n📊 检查数据统计...');
          const categoryCount = await db.query('SELECT COUNT(*) as count FROM categories');
          console.log(\`分类总数: \${categoryCount.rows[0].count}\`);
          
          const audioCount = await db.query('SELECT COUNT(*) as count FROM audios');
          console.log(\`音频总数: \${audioCount.rows[0].count}\`);
          
          // 检查层级字段
          const hierarchyCheck = await db.query(\`
            SELECT 
              COUNT(*) as total,
              COUNT(parent_id) as with_parent,
              COUNT(level) as with_level,
              COUNT(sort_order) as with_sort,
              COUNT(is_active) as with_active
            FROM categories
          \`);
          
          const stats = hierarchyCheck.rows[0];
          console.log('\\n🏗️ 层级字段统计:');
          console.log(\`  总分类数: \${stats.total}\`);
          console.log(\`  有父分类: \${stats.with_parent}\`);
          console.log(\`  有层级字段: \${stats.with_level}\`);
          console.log(\`  有排序字段: \${stats.with_sort}\`);
          console.log(\`  有激活字段: \${stats.with_active}\`);
          
          if (stats.with_level < stats.total) {
            console.log('\\n⚠️  发现未迁移的分类数据，需要运行迁移脚本');
          } else {
            console.log('\\n✅ 数据库结构检查完成，层级字段已存在');
          }
          
        } catch (error) {
          console.error('❌ 数据库检查失败:', error.message);
          process.exit(1);
        }
      })();
    `;

    // 写入临时文件
    const fs = require('fs');
    const tempFile = path.join(__dirname, 'temp-db-check.js');
    fs.writeFileSync(tempFile, testScript);

    try {
      // 执行检查
      execSync(`node ${tempFile}`, { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
    } finally {
      // 清理临时文件
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  checkDatabaseStructure();
}

module.exports = { checkDatabaseStructure };