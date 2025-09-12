#!/usr/bin/env node

const { Pool } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// PostgreSQL连接配置
const pgConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_DATABASE || 'health_hub',
  user: process.env.DB_USERNAME || process.env.USER,
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true'
};

// SQLite数据库路径
const sqlitePath = path.join(process.cwd(), 'data', 'local.db');

console.log('🚀 开始数据库迁移：SQLite → PostgreSQL');
console.log(`SQLite: ${sqlitePath}`);
console.log(`PostgreSQL: ${pgConfig.user}@${pgConfig.host}:${pgConfig.port}/${pgConfig.database}`);

async function createTables(pool) {
  console.log('\n📋 创建PostgreSQL表结构...');
  
  const createTablesSQL = `
    -- 用户表
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user',
      status VARCHAR(50) DEFAULT 'active',
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "lastLogin" TIMESTAMP,
      preferences JSONB DEFAULT '{
        "theme": "light",
        "autoplay": false,
        "defaultPlaybackRate": 1,
        "defaultVolume": 1
      }'::jsonb
    );

    -- 音频表
    CREATE TABLE IF NOT EXISTS audios (
      id VARCHAR(255) PRIMARY KEY,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      filename VARCHAR(500),
      url VARCHAR(500),
      "coverImage" VARCHAR(500),
      "uploadDate" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      subject VARCHAR(255),
      tags JSONB DEFAULT '[]'::jsonb,
      size INTEGER DEFAULT 0,
      duration REAL DEFAULT 0,
      speaker VARCHAR(255),
      "recordingDate" TIMESTAMP,
      "averageRating" REAL DEFAULT 0,
      "ratingCount" INTEGER DEFAULT 0,
      "commentCount" INTEGER DEFAULT 0
    );

    -- 分类表
    CREATE TABLE IF NOT EXISTS categories (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      "parentId" VARCHAR(255),
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 评论表
    CREATE TABLE IF NOT EXISTS comments (
      id VARCHAR(255) PRIMARY KEY,
      "audioId" VARCHAR(255) NOT NULL,
      "userId" VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      "parentId" VARCHAR(255),
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("audioId") REFERENCES audios(id) ON DELETE CASCADE,
      FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
    );

    -- 评分表
    CREATE TABLE IF NOT EXISTS ratings (
      id VARCHAR(255) PRIMARY KEY,
      "audioId" VARCHAR(255) NOT NULL,
      "userId" VARCHAR(255) NOT NULL,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("audioId", "userId"),
      FOREIGN KEY ("audioId") REFERENCES audios(id) ON DELETE CASCADE,
      FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
    );

    -- 收藏表
    CREATE TABLE IF NOT EXISTS favorites (
      id VARCHAR(255) PRIMARY KEY,
      "userId" VARCHAR(255) NOT NULL,
      "audioId" VARCHAR(255) NOT NULL,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("userId", "audioId"),
      FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY ("audioId") REFERENCES audios(id) ON DELETE CASCADE
    );

    -- 播放列表表
    CREATE TABLE IF NOT EXISTS playlists (
      id VARCHAR(255) PRIMARY KEY,
      "userId" VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      "isPublic" BOOLEAN DEFAULT false,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
    );

    -- 播放列表项目表
    CREATE TABLE IF NOT EXISTS playlist_items (
      id VARCHAR(255) PRIMARY KEY,
      "playlistId" VARCHAR(255) NOT NULL,
      "audioId" VARCHAR(255) NOT NULL,
      "order" INTEGER NOT NULL,
      "addedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("playlistId", "audioId"),
      FOREIGN KEY ("playlistId") REFERENCES playlists(id) ON DELETE CASCADE,
      FOREIGN KEY ("audioId") REFERENCES audios(id) ON DELETE CASCADE
    );

    -- 通知表
    CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(255) PRIMARY KEY,
      "userId" VARCHAR(255) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(100) DEFAULT 'info',
      "isRead" BOOLEAN DEFAULT false,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
    );

    -- 订阅表
    CREATE TABLE IF NOT EXISTS subscriptions (
      id VARCHAR(255) PRIMARY KEY,
      "userId" VARCHAR(255) NOT NULL,
      "targetId" VARCHAR(255) NOT NULL,
      "targetType" VARCHAR(100) NOT NULL,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("userId", "targetId", "targetType"),
      FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
    );

    -- 相关资源表
    CREATE TABLE IF NOT EXISTS related_resources (
      id VARCHAR(255) PRIMARY KEY,
      "audioId" VARCHAR(255) NOT NULL,
      title VARCHAR(255) NOT NULL,
      url VARCHAR(500) NOT NULL,
      type VARCHAR(100) DEFAULT 'link',
      description TEXT,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("audioId") REFERENCES audios(id) ON DELETE CASCADE
    );

    -- 问题表
    CREATE TABLE IF NOT EXISTS questions (
      id VARCHAR(255) PRIMARY KEY,
      "audioId" VARCHAR(255) NOT NULL,
      question TEXT NOT NULL,
      "correctAnswer" VARCHAR(255) NOT NULL,
      options JSONB DEFAULT '[]'::jsonb,
      explanation TEXT,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("audioId") REFERENCES audios(id) ON DELETE CASCADE
    );

    -- 答案表
    CREATE TABLE IF NOT EXISTS answers (
      id VARCHAR(255) PRIMARY KEY,
      "questionId" VARCHAR(255) NOT NULL,
      "userId" VARCHAR(255) NOT NULL,
      answer VARCHAR(255) NOT NULL,
      "isCorrect" BOOLEAN NOT NULL,
      "answeredAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("questionId") REFERENCES questions(id) ON DELETE CASCADE,
      FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
    );

    -- 标记表
    CREATE TABLE IF NOT EXISTS markers (
      id VARCHAR(255) PRIMARY KEY,
      "audioId" VARCHAR(255) NOT NULL,
      "userId" VARCHAR(255) NOT NULL,
      "timestamp" REAL NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("audioId") REFERENCES audios(id) ON DELETE CASCADE,
      FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
    );

    -- 创建索引
    CREATE INDEX IF NOT EXISTS idx_audios_subject ON audios(subject);
    CREATE INDEX IF NOT EXISTS idx_audios_upload_date ON audios("uploadDate");
    CREATE INDEX IF NOT EXISTS idx_comments_audio_id ON comments("audioId");
    CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments("userId");
    CREATE INDEX IF NOT EXISTS idx_ratings_audio_id ON ratings("audioId");
    CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites("userId");
    CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists("userId");
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications("userId");
  `;

  await pool.query(createTablesSQL);
  console.log('✅ PostgreSQL表结构创建完成');
}

async function migrateData(pool) {
  console.log('\n📦 开始数据迁移...');
  
  if (!fs.existsSync(sqlitePath)) {
    console.log('⚠️  SQLite数据库文件不存在，跳过数据迁移');
    return;
  }

  const sqlite = new Database(sqlitePath, { readonly: true });
  
  try {
    // 获取所有表
    const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
    
    for (const table of tables) {
      const tableName = table.name;
      console.log(`\n📋 迁移表: ${tableName}`);
      
      try {
        // 获取SQLite表数据
        const rows = sqlite.prepare(`SELECT * FROM ${tableName}`).all();
        
        if (rows.length === 0) {
          console.log(`   ⚠️  表 ${tableName} 为空，跳过`);
          continue;
        }

        console.log(`   📊 找到 ${rows.length} 条记录`);
        
        // 获取列信息
        const columns = Object.keys(rows[0]);
        const quotedColumns = columns.map(col => `"${col}"`).join(', ');
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        
        // 准备插入语句
        const insertSQL = `INSERT INTO ${tableName} (${quotedColumns}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
        
        // 批量插入数据
        let insertedCount = 0;
        for (const row of rows) {
          try {
            const values = columns.map(col => {
              let value = row[col];
              
              // 处理JSON字段
              if (typeof value === 'string' && (col === 'tags' || col === 'preferences' || col === 'options')) {
                try {
                  JSON.parse(value);
                  return value;
                } catch {
                  return col === 'tags' ? '[]' : col === 'preferences' ? '{}' : value;
                }
              }
              
              return value;
            });
            
            await pool.query(insertSQL, values);
            insertedCount++;
          } catch (error) {
            console.log(`   ⚠️  插入记录失败: ${error.message}`);
          }
        }
        
        console.log(`   ✅ 成功迁移 ${insertedCount}/${rows.length} 条记录`);
        
      } catch (error) {
        console.log(`   ❌ 迁移表 ${tableName} 失败: ${error.message}`);
      }
    }
    
  } finally {
    sqlite.close();
  }
}

async function verifyMigration(pool) {
  console.log('\n🔍 验证迁移结果...');
  
  const tables = [
    'users', 'audios', 'categories', 'comments', 'ratings', 
    'favorites', 'playlists', 'notifications', 'subscriptions',
    'related_resources', 'questions', 'answers', 'markers'
  ];
  
  for (const table of tables) {
    try {
      const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
      const count = parseInt(result.rows[0].count);
      console.log(`   📊 ${table}: ${count} 条记录`);
    } catch (error) {
      console.log(`   ❌ 检查表 ${table} 失败: ${error.message}`);
    }
  }
}

async function main() {
  const pool = new Pool(pgConfig);
  
  try {
    // 测试连接
    console.log('\n🔌 测试PostgreSQL连接...');
    const client = await pool.connect();
    const result = await client.query('SELECT version()');
    console.log(`✅ 连接成功: ${result.rows[0].version}`);
    client.release();
    
    // 创建表结构
    await createTables(pool);
    
    // 迁移数据
    await migrateData(pool);
    
    // 验证迁移
    await verifyMigration(pool);
    
    console.log('\n🎉 数据库迁移完成！');
    console.log('\n📝 下一步：');
    console.log('1. 重启应用程序');
    console.log('2. 访问 /test-db-config 测试数据库配置');
    console.log('3. 注册PostgreSQL适配器');
    
  } catch (error) {
    console.error('\n❌ 迁移失败:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 运行迁移
main().catch(console.error);