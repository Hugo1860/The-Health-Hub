import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'data', 'local.db');

console.log('🔍 Testing Database Connection');
console.log('==============================\n');

try {
  console.log('Database path:', DB_PATH);
  
  // 尝试连接数据库
  const db = new Database(DB_PATH, { fileMustExist: true });
  console.log('✅ Database connection successful');
  
  // 检查表结构
  console.log('\n📋 Checking table structure...');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tables found:', tables.map(t => t.name));
  
  // 检查audios表
  if (tables.some(t => t.name === 'audios')) {
    console.log('\n🎵 Checking audios table...');
    
    // 获取表结构
    const schema = db.prepare("PRAGMA table_info(audios)").all();
    console.log('Audios table schema:');
    schema.forEach(col => {
      console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
    
    // 检查数据
    const count = db.prepare("SELECT COUNT(*) as count FROM audios").get();
    console.log(`\nTotal audios: ${count.count}`);
    
    if (count.count > 0) {
      console.log('\n📄 Sample audio records:');
      const samples = db.prepare("SELECT id, title, subject, uploadDate FROM audios LIMIT 3").all();
      samples.forEach(audio => {
        console.log(`  - ID: ${audio.id}, Title: ${audio.title}, Subject: ${audio.subject}`);
      });
    } else {
      console.log('⚠️  No audio records found in database');
    }
  } else {
    console.log('❌ Audios table not found');
  }
  
  // 检查用户表
  if (tables.some(t => t.name === 'users')) {
    console.log('\n👥 Checking users table...');
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
    console.log(`Total users: ${userCount.count}`);
    
    if (userCount.count > 0) {
      const adminUsers = db.prepare("SELECT id, email, role FROM users WHERE role IN ('admin', 'moderator', 'editor') LIMIT 3").all();
      console.log('Admin users:');
      adminUsers.forEach(user => {
        console.log(`  - Email: ${user.email}, Role: ${user.role}`);
      });
    }
  }
  
  // 测试查询
  console.log('\n🧪 Testing audio query...');
  try {
    const testQuery = db.prepare('SELECT * FROM audios ORDER BY uploadDate DESC LIMIT 1');
    const result = testQuery.all();
    console.log('Test query successful, returned', result.length, 'records');
    
    if (result.length > 0) {
      const audio = result[0];
      console.log('Sample audio data:');
      console.log('  - ID:', audio.id);
      console.log('  - Title:', audio.title);
      console.log('  - Subject:', audio.subject);
      console.log('  - Tags:', audio.tags);
      console.log('  - Upload Date:', audio.uploadDate);
    }
  } catch (queryError) {
    console.error('❌ Test query failed:', queryError.message);
  }
  
  db.close();
  console.log('\n✅ Database test completed successfully');
  
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
  
  if (error.code === 'SQLITE_CANTOPEN') {
    console.log('\n💡 Suggestions:');
    console.log('1. Make sure the database file exists at:', DB_PATH);
    console.log('2. Run the migration script to create the database');
    console.log('3. Check file permissions');
  }
  
  process.exit(1);
}