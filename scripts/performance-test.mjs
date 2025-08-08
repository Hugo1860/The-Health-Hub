import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'data', 'local.db');

async function runPerformanceTests() {
  console.log('🚀 Starting Database Performance Tests');
  console.log('=====================================\n');

  let db;
  try {
    db = new Database(DB_PATH, { fileMustExist: true });

    const tests = [
      {
        name: 'Audio Search Query (with index)',
        query: `
          SELECT * FROM audios 
          WHERE title LIKE ? OR subject LIKE ? OR tags LIKE ?
          ORDER BY uploadDate DESC
          LIMIT 10
        `,
        params: ['%医学%', '%医学%', '%医学%']
      },
      {
        name: 'Audio List with Ratings (optimized)',
        query: `
          SELECT 
            a.*,
            AVG(r.rating) as averageRating,
            COUNT(r.id) as ratingCount
          FROM audios a
          LEFT JOIN ratings r ON a.id = r.audioId
          GROUP BY a.id
          ORDER BY a.uploadDate DESC
          LIMIT 10
        `,
        params: []
      },
      {
        name: 'User List Query (with index)',
        query: `
          SELECT id, username, email, role, status, createdAt
          FROM users
          ORDER BY createdAt DESC
          LIMIT 20
        `,
        params: []
      },
      {
        name: 'Popular Audios Query (complex)',
        query: `
          SELECT 
            a.*,
            AVG(r.rating) as averageRating,
            COUNT(r.id) as ratingCount,
            COUNT(c.id) as commentCount
          FROM audios a
          LEFT JOIN ratings r ON a.id = r.audioId
          LEFT JOIN comments c ON a.id = c.audioId
          GROUP BY a.id
          ORDER BY 
            (AVG(r.rating) * COUNT(r.id) + COUNT(c.id)) DESC,
            a.uploadDate DESC
          LIMIT 5
        `,
        params: []
      },
      {
        name: 'User with Activity Stats',
        query: `
          SELECT 
            u.*,
            (SELECT COUNT(*) FROM comments WHERE userId = u.id) as commentCount,
            (SELECT COUNT(*) FROM ratings WHERE userId = u.id) as ratingCount
          FROM users u
          ORDER BY u.createdAt DESC
          LIMIT 10
        `,
        params: []
      }
    ];

    const results = [];

    for (const test of tests) {
      console.log(`Testing: ${test.name}`);
      
      // 预热查询
      try {
        const stmt = db.prepare(test.query);
        stmt.all(...test.params);
      } catch (error) {
        console.log(`  ⚠️  Warmup failed: ${error.message}`);
      }

      // 执行多次测试取平均值
      const iterations = 10;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        try {
          const stmt = db.prepare(test.query);
          const result = stmt.all(...test.params);
          const end = performance.now();
          times.push(end - start);
          
          if (i === 0) {
            console.log(`  📊 Result count: ${result.length}`);
          }
        } catch (error) {
          console.log(`  ❌ Query failed: ${error.message}`);
          times.push(999999); // 标记失败
        }
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);

      console.log(`  ⏱️  Average: ${avgTime.toFixed(2)}ms`);
      console.log(`  ⚡ Min: ${minTime.toFixed(2)}ms`);
      console.log(`  🐌 Max: ${maxTime.toFixed(2)}ms`);

      // 获取查询计划
      try {
        const planStmt = db.prepare(`EXPLAIN QUERY PLAN ${test.query}`);
        const plan = planStmt.all(...test.params);
        const usesIndex = plan.some(step => step.detail && step.detail.includes('USING INDEX'));
        console.log(`  🔍 Uses Index: ${usesIndex ? '✅' : '❌'}`);
        
        if (usesIndex) {
          const indexes = plan
            .filter(step => step.detail && step.detail.includes('USING INDEX'))
            .map(step => step.detail.match(/USING INDEX (\w+)/)?.[1])
            .filter(Boolean);
          console.log(`  📋 Indexes: ${indexes.join(', ')}`);
        }
      } catch (error) {
        console.log(`  ⚠️  Query plan analysis failed: ${error.message}`);
      }

      results.push({
        name: test.name,
        avgTime: avgTime.toFixed(2),
        minTime: minTime.toFixed(2),
        maxTime: maxTime.toFixed(2),
        status: avgTime < 999999 ? 'success' : 'failed'
      });

      console.log('');
    }

    // 总结报告
    console.log('📈 Performance Test Summary');
    console.log('===========================');
    
    const successfulTests = results.filter(r => r.status === 'success');
    const failedTests = results.filter(r => r.status === 'failed');
    
    console.log(`✅ Successful tests: ${successfulTests.length}/${results.length}`);
    console.log(`❌ Failed tests: ${failedTests.length}/${results.length}`);
    
    if (successfulTests.length > 0) {
      const avgOverall = successfulTests.reduce((sum, r) => sum + parseFloat(r.avgTime), 0) / successfulTests.length;
      console.log(`📊 Overall average: ${avgOverall.toFixed(2)}ms`);
      
      const fastQueries = successfulTests.filter(r => parseFloat(r.avgTime) < 10);
      const slowQueries = successfulTests.filter(r => parseFloat(r.avgTime) > 100);
      
      console.log(`⚡ Fast queries (<10ms): ${fastQueries.length}`);
      console.log(`🐌 Slow queries (>100ms): ${slowQueries.length}`);
      
      if (slowQueries.length > 0) {
        console.log('\n🔍 Slow Queries Need Attention:');
        slowQueries.forEach(q => {
          console.log(`  - ${q.name}: ${q.avgTime}ms`);
        });
      }
    }

    // 数据库统计信息
    console.log('\n📊 Database Statistics');
    console.log('======================');
    
    const tables = ['users', 'audios', 'comments', 'ratings', 'questions', 'answers'];
    for (const table of tables) {
      try {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
        console.log(`${table}: ${count.count} records`);
      } catch (error) {
        console.log(`${table}: Error getting count`);
      }
    }

    // 索引信息
    console.log('\n🔍 Index Information');
    console.log('====================');
    
    const indexes = db.prepare(`
      SELECT name, tbl_name 
      FROM sqlite_master 
      WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
      ORDER BY tbl_name, name
    `).all();

    const indexByTable = {};
    indexes.forEach(idx => {
      if (!indexByTable[idx.tbl_name]) {
        indexByTable[idx.tbl_name] = [];
      }
      indexByTable[idx.tbl_name].push(idx.name);
    });

    Object.entries(indexByTable).forEach(([table, tableIndexes]) => {
      console.log(`${table}: ${tableIndexes.length} indexes`);
      tableIndexes.forEach(idx => console.log(`  - ${idx}`));
    });

    console.log('\n🎉 Performance testing completed!');
    
    // 性能建议
    console.log('\n💡 Performance Recommendations');
    console.log('===============================');
    
    const slowQueries = successfulTests.filter(r => parseFloat(r.avgTime) > 100);
    
    if (slowQueries.length > 0) {
      console.log('1. Review slow queries and consider additional indexes');
    }
    
    if (successfulTests.some(r => parseFloat(r.avgTime) > 50)) {
      console.log('2. Consider query optimization for queries >50ms');
    }
    
    console.log('3. Monitor query performance in production');
    console.log('4. Run ANALYZE periodically to update statistics');
    console.log('5. Consider connection pooling for high-concurrency scenarios');

  } catch (error) {
    console.error('Performance test failed:', error);
    process.exit(1);
  } finally {
    if (db) {
      db.close();
    }
  }
}

runPerformanceTests().catch(error => {
  console.error('Test script failed:', error);
  process.exit(1);
});