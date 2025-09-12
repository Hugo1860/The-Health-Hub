/**
 * 初始化管理员日志表
 */

import db from '@/lib/db';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function initAdminLogsTable(): Promise<void> {
  try {
    console.log('=== 初始化管理员日志表 ===');
    
    // 读取SQL文件
    const sqlPath = join(process.cwd(), 'src/lib/migrations/create-admin-logs-table.sql');
    const sql = readFileSync(sqlPath, 'utf-8');
    
    // 分割SQL语句并执行
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    for (const statement of statements) {
      try {
        await db.exec(statement);
        console.log('✅ 执行SQL语句成功');
      } catch (error) {
        console.error('❌ 执行SQL语句失败:', statement.substring(0, 100) + '...');
        console.error('错误:', error);
      }
    }
    
    // 验证表是否创建成功
    const tableCheck = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='admin_logs'
    `);
    
    const table = await tableCheck.get();
    if (table) {
      console.log('✅ admin_logs 表创建成功');
      
      // 检查记录数量
      const countStmt = db.prepare('SELECT COUNT(*) as count FROM admin_logs');
      const result = await countStmt.get();
      console.log(`📊 当前日志记录数量: ${result?.count || 0}`);
    } else {
      console.log('❌ admin_logs 表创建失败');
    }
    
  } catch (error) {
    console.error('=== 初始化管理员日志表失败 ===', error);
    throw error;
  }
}

// 如果直接运行此文件，则执行初始化
if (require.main === module) {
  initAdminLogsTable()
    .then(() => {
      console.log('✅ 管理员日志表初始化完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 管理员日志表初始化失败:', error);
      process.exit(1);
    });
}