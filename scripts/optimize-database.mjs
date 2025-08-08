import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'data', 'local.db');

async function optimizeDatabase() {
  console.log('Starting database optimization...');
  
  let db;
  try {
    db = new Database(DB_PATH, {
      fileMustExist: true
    });

    console.log('Connected to database successfully');

    // 设置数据库优化参数
    console.log('Setting database optimization parameters...');
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA cache_size = 2000;
      PRAGMA temp_store = MEMORY;
      PRAGMA mmap_size = 268435456;
      PRAGMA optimize;
    `);

    // 创建性能监控表
    console.log('Creating performance monitoring tables...');
    db.exec(`
      CREATE TABLE IF NOT EXISTS query_performance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query_hash TEXT NOT NULL,
        query_sql TEXT NOT NULL,
        execution_time REAL NOT NULL,
        rows_affected INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_query_performance_hash 
      ON query_performance(query_hash);
      
      CREATE INDEX IF NOT EXISTS idx_query_performance_time 
      ON query_performance(timestamp DESC);
    `);

    // 创建推荐的索引
    console.log('Creating recommended indexes...');
    
    const indexes = [
      // 音频搜索复合索引
      {
        name: 'idx_audios_search',
        sql: 'CREATE INDEX IF NOT EXISTS idx_audios_search ON audios(title, subject, tags)'
      },
      // 音频按日期排序索引
      {
        name: 'idx_audios_date',
        sql: 'CREATE INDEX IF NOT EXISTS idx_audios_date ON audios(uploadDate DESC)'
      },
      // 音频时长索引
      {
        name: 'idx_audios_duration',
        sql: 'CREATE INDEX IF NOT EXISTS idx_audios_duration ON audios(duration)'
      },
      // 音频主题索引
      {
        name: 'idx_audios_subject',
        sql: 'CREATE INDEX IF NOT EXISTS idx_audios_subject ON audios(subject)'
      },
      // 用户邮箱索引
      {
        name: 'idx_users_email',
        sql: 'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)'
      },
      // 用户状态和角色索引
      {
        name: 'idx_users_status',
        sql: 'CREATE INDEX IF NOT EXISTS idx_users_status ON users(status, role)'
      },
      // 用户创建时间索引
      {
        name: 'idx_users_created',
        sql: 'CREATE INDEX IF NOT EXISTS idx_users_created ON users(createdAt DESC)'
      },
      // 评论按音频和时间索引
      {
        name: 'idx_comments_audio_time',
        sql: 'CREATE INDEX IF NOT EXISTS idx_comments_audio_time ON comments(audioId, createdAt DESC)'
      },
      // 评论按用户索引
      {
        name: 'idx_comments_user',
        sql: 'CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(userId)'
      },
      // 评分按音频索引
      {
        name: 'idx_ratings_audio',
        sql: 'CREATE INDEX IF NOT EXISTS idx_ratings_audio ON ratings(audioId, rating)'
      },
      // 评分按用户索引
      {
        name: 'idx_ratings_user',
        sql: 'CREATE INDEX IF NOT EXISTS idx_ratings_user ON ratings(userId)'
      },
      // 问题按音频索引
      {
        name: 'idx_questions_audio',
        sql: 'CREATE INDEX IF NOT EXISTS idx_questions_audio ON questions(audioId, createdAt DESC)'
      },
      // 答案按问题索引
      {
        name: 'idx_answers_question',
        sql: 'CREATE INDEX IF NOT EXISTS idx_answers_question ON answers(questionId, createdAt DESC)'
      },
      // 章节按音频索引
      {
        name: 'idx_chapters_audio',
        sql: 'CREATE INDEX IF NOT EXISTS idx_chapters_audio ON chapters(audioId, "order")'
      },
      // 标记按音频索引
      {
        name: 'idx_markers_audio',
        sql: 'CREATE INDEX IF NOT EXISTS idx_markers_audio ON markers(audioId, time)'
      },
      // 通知按用户索引
      {
        name: 'idx_notifications_user',
        sql: 'CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(userId, createdAt DESC)'
      },
      // 订阅按用户索引
      {
        name: 'idx_subscriptions_user',
        sql: 'CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(userId, isActive)'
      },
      // 转录按音频索引
      {
        name: 'idx_transcriptions_audio',
        sql: 'CREATE INDEX IF NOT EXISTS idx_transcriptions_audio ON transcriptions(audioId, language)'
      },
      // 音频复合索引（主题、日期、时长）
      {
        name: 'idx_audios_composite',
        sql: 'CREATE INDEX IF NOT EXISTS idx_audios_composite ON audios(subject, uploadDate DESC, duration)'
      }
    ];

    let createdCount = 0;
    for (const index of indexes) {
      try {
        db.exec(index.sql);
        console.log(`✓ Created index: ${index.name}`);
        createdCount++;
      } catch (error) {
        console.error(`✗ Failed to create index ${index.name}:`, error.message);
      }
    }

    console.log(`Successfully created ${createdCount} indexes`);

    // 分析表统计信息
    console.log('Analyzing table statistics...');
    const tables = ['users', 'audios', 'comments', 'ratings', 'questions', 'answers'];
    
    for (const table of tables) {
      try {
        db.exec(`ANALYZE ${table}`);
        console.log(`✓ Analyzed table: ${table}`);
      } catch (error) {
        console.error(`✗ Failed to analyze table ${table}:`, error.message);
      }
    }

    // 获取数据库统计信息
    console.log('\nDatabase Statistics:');
    console.log('==================');
    
    for (const table of tables) {
      try {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
        console.log(`${table}: ${count.count} records`);
      } catch (error) {
        console.error(`Failed to get count for ${table}:`, error.message);
      }
    }

    // 检查索引使用情况
    console.log('\nCreated Indexes:');
    console.log('===============');
    
    const indexList = db.prepare(`
      SELECT name, tbl_name, sql 
      FROM sqlite_master 
      WHERE type = 'index' 
      AND name NOT LIKE 'sqlite_%'
      ORDER BY tbl_name, name
    `).all();

    for (const index of indexList) {
      console.log(`${index.tbl_name}.${index.name}`);
    }

    // 运行 VACUUM 优化数据库文件
    console.log('\nOptimizing database file...');
    db.exec('VACUUM');
    console.log('✓ Database file optimized');

    // 最终优化
    console.log('Running final optimization...');
    db.exec('PRAGMA optimize');
    console.log('✓ Final optimization completed');

    console.log('\n🎉 Database optimization completed successfully!');
    
    // 提供性能测试建议
    console.log('\nPerformance Testing Recommendations:');
    console.log('===================================');
    console.log('1. Test audio search queries with EXPLAIN QUERY PLAN');
    console.log('2. Monitor query execution times in production');
    console.log('3. Review slow query logs regularly');
    console.log('4. Consider additional indexes based on actual usage patterns');
    console.log('5. Run ANALYZE periodically to update statistics');

  } catch (error) {
    console.error('Database optimization failed:', error);
    process.exit(1);
  } finally {
    if (db) {
      db.close();
      console.log('Database connection closed');
    }
  }
}

// 运行优化
optimizeDatabase().catch(error => {
  console.error('Optimization script failed:', error);
  process.exit(1);
});