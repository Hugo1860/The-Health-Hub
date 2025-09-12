#!/usr/bin/env node

/**
 * 运行数据库迁移脚本
 */

const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🚀 开始运行数据库迁移...\n');

  try {
    // 动态导入数据库模块
    const dbPath = path.join(process.cwd(), 'src/lib/db.ts');
    
    // 创建一个临时的 JS 文件来运行迁移
    const migrationScript = `
      const db = require('./src/lib/db.ts').default;
      const fs = require('fs');
      const path = require('path');

      (async () => {
        try {
          console.log('📡 连接数据库...');
          
          // 检查连接
          const isConnected = db.isConnected();
          if (!isConnected) {
            console.log('❌ 数据库未连接，尝试重新连接...');
            await db.reconnect();
          }
          
          console.log('✅ 数据库连接成功');
          
          // 读取迁移脚本
          const migrationPath = path.join(process.cwd(), 'database/migrations/001_add_category_hierarchy.sql');
          
          if (!fs.existsSync(migrationPath)) {
            throw new Error('迁移文件不存在: ' + migrationPath);
          }
          
          const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
          console.log('📄 读取迁移脚本成功');
          
          // 分割 SQL 语句（简单处理）
          const statements = migrationSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
          
          console.log(\`📝 准备执行 \${statements.length} 个 SQL 语句...\`);
          
          // 逐个执行 SQL 语句
          for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            
            if (statement.toLowerCase().includes('begin') || 
                statement.toLowerCase().includes('commit') ||
                statement.toLowerCase().includes('do $')) {
              // 跳过事务控制语句，因为我们逐个执行
              continue;
            }
            
            try {
              console.log(\`  执行语句 \${i + 1}/\${statements.length}...\`);
              await db.query(statement);
            } catch (error) {
              // 某些语句可能因为已存在而失败，这是正常的
              if (error.message.includes('already exists') || 
                  error.message.includes('duplicate') ||
                  error.message.includes('relation') && error.message.includes('does not exist')) {
                console.log(\`  ⚠️  语句 \${i + 1} 跳过 (可能已存在): \${error.message.split('\\n')[0]}\`);
              } else {
                console.log(\`  ❌ 语句 \${i + 1} 失败: \${error.message.split('\\n')[0]}\`);
              }
            }
          }
          
          console.log('\\n🔍 验证迁移结果...');
          
          // 检查表结构
          const categoriesColumns = await db.query(\`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'categories' 
            AND column_name IN ('parent_id', 'level', 'sort_order', 'is_active')
          \`);
          
          const audiosColumns = await db.query(\`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'audios' 
            AND column_name IN ('category_id', 'subcategory_id')
          \`);
          
          console.log('📊 迁移结果:');
          console.log(\`  Categories 表新字段: \${categoriesColumns.rows.length}/4\`);
          console.log(\`  Audios 表新字段: \${audiosColumns.rows.length}/2\`);
          
          if (categoriesColumns.rows.length >= 4 && audiosColumns.rows.length >= 2) {
            console.log('\\n✅ 数据库迁移完成！');
          } else {
            console.log('\\n⚠️  迁移可能不完整，请检查错误信息');
          }
          
          // 检查数据
          const categoryCount = await db.query('SELECT COUNT(*) as count FROM categories');
          console.log(\`\\n📈 当前分类数量: \${categoryCount.rows[0].count}\`);
          
        } catch (error) {
          console.error('❌ 迁移失败:', error.message);
          process.exit(1);
        }
      })();
    `;

    // 写入临时文件
    const tempFile = path.join(__dirname, 'temp-migration.js');
    fs.writeFileSync(tempFile, migrationScript);

    try {
      // 执行迁移
      const { execSync } = require('child_process');
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
    console.error('❌ 迁移运行失败:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };