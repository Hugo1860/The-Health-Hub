import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'data', 'local.db');

async function createResumeTable() {
  console.log('Creating audio resume states table...');
  
  let db;
  try {
    db = new Database(DB_PATH, {
      fileMustExist: true
    });

    console.log('Connected to database successfully');

    // 创建断点续传状态表
    db.exec(`
      CREATE TABLE IF NOT EXISTS audio_resume_states (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        audio_id TEXT NOT NULL,
        position REAL NOT NULL DEFAULT 0,
        session_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, audio_id),
        FOREIGN KEY (audio_id) REFERENCES audios(id) ON DELETE CASCADE
      );
    `);

    // 创建索引
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_resume_user_audio 
      ON audio_resume_states(user_id, audio_id);
      
      CREATE INDEX IF NOT EXISTS idx_resume_updated 
      ON audio_resume_states(updated_at DESC);
      
      CREATE INDEX IF NOT EXISTS idx_resume_session 
      ON audio_resume_states(session_id);
    `);

    // 创建触发器来自动更新 updated_at
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_resume_timestamp 
      AFTER UPDATE ON audio_resume_states
      BEGIN
        UPDATE audio_resume_states 
        SET updated_at = CURRENT_TIMESTAMP 
        WHERE id = NEW.id;
      END;
    `);

    console.log('✅ Audio resume states table created successfully');
    console.log('✅ Indexes created successfully');
    console.log('✅ Triggers created successfully');

    // 验证表结构
    const tableInfo = db.prepare(`PRAGMA table_info(audio_resume_states)`).all();
    console.log('\n📋 Table Structure:');
    tableInfo.forEach(column => {
      console.log(`  - ${column.name}: ${column.type} ${column.notnull ? 'NOT NULL' : ''} ${column.dflt_value ? `DEFAULT ${column.dflt_value}` : ''}`);
    });

    // 检查索引
    const indexes = db.prepare(`
      SELECT name, sql 
      FROM sqlite_master 
      WHERE type = 'index' 
      AND tbl_name = 'audio_resume_states'
      AND name NOT LIKE 'sqlite_%'
    `).all();

    console.log('\n🔍 Created Indexes:');
    indexes.forEach(index => {
      console.log(`  - ${index.name}`);
    });

    // 检查触发器
    const triggers = db.prepare(`
      SELECT name, sql 
      FROM sqlite_master 
      WHERE type = 'trigger' 
      AND tbl_name = 'audio_resume_states'
    `).all();

    console.log('\n⚡ Created Triggers:');
    triggers.forEach(trigger => {
      console.log(`  - ${trigger.name}`);
    });

    console.log('\n🎉 Resume functionality database setup completed!');
    console.log('\n💡 Usage Examples:');
    console.log('  - Save position: POST /api/audio/resume/{audioId}');
    console.log('  - Resume playback: GET /api/audio/resume/{audioId}?user_id=xxx&session_id=xxx');
    console.log('  - Delete state: DELETE /api/audio/resume/{audioId}?user_id=xxx');
    console.log('  - Get all states: PUT /api/audio/resume/{audioId} with user_id in body');

  } catch (error) {
    console.error('❌ Failed to create resume table:', error);
    process.exit(1);
  } finally {
    if (db) {
      db.close();
      console.log('Database connection closed');
    }
  }
}

// 运行脚本
createResumeTable().catch(error => {
  console.error('Script execution failed:', error);
  process.exit(1);
});