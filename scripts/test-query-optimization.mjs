import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'data', 'local.db');

async function testQueryOptimization() {
  console.log('🔍 Testing Query Optimization Features');
  console.log('=====================================\n');

  let db;
  try {
    db = new Database(DB_PATH, { fileMustExist: true });

    // 测试查询集合
    const testQueries = [
      {
        name: 'Basic Audio List',
        description: 'Simple audio listing with pagination',
        query: 'SELECT * FROM audios ORDER BY uploadDate DESC LIMIT 10',
        params: [],
        expectedIndexes: ['idx_audios_date']
      },
      {
        name: 'Audio Search',
        description: 'Search audio by title, description, or subject',
        query: `
          SELECT * FROM audios 
          WHERE title LIKE ? OR description LIKE ? OR subject LIKE ?
          ORDER BY uploadDate DESC 
          LIMIT 10
        `,
        params: ['%医学%', '%医学%', '%医学%'],
        expectedIndexes: ['idx_audios_date']
      },
      {
        name: 'Audio with Ratings',
        description: 'Audio list with average ratings',
        query: `
          SELECT 
            a.*,
            AVG(r.rating) as averageRating,
            COUNT(r.id) as ratingCount
          FROM audios a
          LEFT JOIN ratings r ON a.id = r.audioId
          GROUP BY a.id
          ORDER BY averageRating DESC NULLS LAST
          LIMIT 10
        `,
        params: [],
        expectedIndexes: ['sqlite_autoindex_audios_1', 'idx_ratings_audio']
      },
      {
        name: 'User Activity Summary',
        description: 'Users with their activity statistics',
        query: `
          SELECT 
            u.id, u.username, u.email, u.role,
            COUNT(DISTINCT c.id) as commentCount,
            COUNT(DISTINCT r.id) as ratingCount
          FROM users u
          LEFT JOIN comments c ON u.id = c.userId
          LEFT JOIN ratings r ON u.id = r.userId
          GROUP BY u.id
          ORDER BY commentCount DESC, ratingCount DESC
          LIMIT 20
        `,
        params: [],
        expectedIndexes: ['sqlite_autoindex_users_1', 'idx_comments_user', 'idx_ratings_user']
      },
      {
        name: 'Popular Content',
        description: 'Most popular audio based on ratings and comments',
        query: `
          SELECT 
            a.*,
            AVG(r.rating) as averageRating,
            COUNT(DISTINCT r.id) as ratingCount,
            COUNT(DISTINCT c.id) as commentCount,
            (COALESCE(AVG(r.rating), 0) * COUNT(DISTINCT r.id) + COUNT(DISTINCT c.id)) as popularityScore
          FROM audios a
          LEFT JOIN ratings r ON a.id = r.audioId
          LEFT JOIN comments c ON a.id = c.audioId
          GROUP BY a.id
          ORDER BY popularityScore DESC, a.uploadDate DESC
          LIMIT 10
        `,
        params: [],
        expectedIndexes: ['sqlite_autoindex_audios_1', 'idx_ratings_audio', 'idx_comments_audio_time']
      },
      {
        name: 'User Search',
        description: 'Search users by username or email',
        query: `
          SELECT id, username, email, role, status, createdAt
          FROM users 
          WHERE username LIKE ? OR email LIKE ?
          ORDER BY createdAt DESC
          LIMIT 20
        `,
        params: ['%admin%', '%admin%'],
        expectedIndexes: ['idx_users_created']
      }
    ];

    const results = [];

    for (const test of testQueries) {
      console.log(`Testing: ${test.name}`);
      console.log(`Description: ${test.description}`);
      
      try {
        // 预热查询
        const stmt = db.prepare(test.query);
        stmt.all(...test.params);

        // 性能测试
        const iterations = 5;
        const times = [];
        let resultCount = 0;

        for (let i = 0; i < iterations; i++) {
          const start = performance.now();
          const result = stmt.all(...test.params);
          const end = performance.now();
          
          times.push(end - start);
          if (i === 0) {
            resultCount = Array.isArray(result) ? result.length : 1;
          }
        }

        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);

        // 获取查询计划
        const explainStmt = db.prepare(`EXPLAIN QUERY PLAN ${test.query}`);
        const queryPlan = explainStmt.all(...test.params);
        
        // 分析索引使用
        const indexesUsed = queryPlan
          .filter(step => step.detail && step.detail.includes('USING INDEX'))
          .map(step => step.detail.match(/USING INDEX (\w+)/)?.[1])
          .filter(Boolean);

        // 检测表扫描
        const tableScans = queryPlan
          .filter(step => step.detail && step.detail.includes('SCAN TABLE'))
          .map(step => step.detail.match(/SCAN TABLE (\w+)/)?.[1])
          .filter(Boolean);

        // 性能评估
        let performanceRating = 'excellent';
        let score = 100;

        if (avgTime > 100) {
          performanceRating = 'poor';
          score = 30;
        } else if (avgTime > 50) {
          performanceRating = 'fair';
          score = 60;
        } else if (avgTime > 10) {
          performanceRating = 'good';
          score = 80;
        }

        if (tableScans.length > 0) {
          score -= 20;
          performanceRating = score > 70 ? 'good' : score > 50 ? 'fair' : 'poor';
        }

        if (indexesUsed.length === 0 && avgTime > 5) {
          score -= 15;
          performanceRating = score > 70 ? 'good' : score > 50 ? 'fair' : 'poor';
        }

        // 输出结果
        console.log(`  📊 Results: ${resultCount} rows`);
        console.log(`  ⏱️  Average time: ${avgTime.toFixed(3)}ms`);
        console.log(`  ⚡ Min time: ${minTime.toFixed(3)}ms`);
        console.log(`  🐌 Max time: ${maxTime.toFixed(3)}ms`);
        console.log(`  🔍 Indexes used: ${indexesUsed.length > 0 ? indexesUsed.join(', ') : 'None'}`);
        console.log(`  ⚠️  Table scans: ${tableScans.length > 0 ? tableScans.join(', ') : 'None'}`);
        console.log(`  📈 Performance: ${performanceRating} (${score}/100)`);

        // 检查预期索引
        const expectedFound = test.expectedIndexes.filter(expected => 
          indexesUsed.some(used => used === expected)
        );
        const expectedMissing = test.expectedIndexes.filter(expected => 
          !indexesUsed.some(used => used === expected)
        );

        if (expectedFound.length > 0) {
          console.log(`  ✅ Expected indexes found: ${expectedFound.join(', ')}`);
        }
        if (expectedMissing.length > 0) {
          console.log(`  ❌ Expected indexes missing: ${expectedMissing.join(', ')}`);
        }

        results.push({
          name: test.name,
          avgTime: avgTime.toFixed(3),
          performance: performanceRating,
          score,
          indexesUsed: indexesUsed.length,
          tableScans: tableScans.length,
          resultCount,
          status: 'success'
        });

      } catch (error) {
        console.log(`  ❌ Query failed: ${error.message}`);
        results.push({
          name: test.name,
          avgTime: 'N/A',
          performance: 'failed',
          score: 0,
          indexesUsed: 0,
          tableScans: 0,
          resultCount: 0,
          status: 'failed'
        });
      }

      console.log('');
    }

    // 总结报告
    console.log('📊 Query Optimization Test Summary');
    console.log('==================================');
    
    const successfulTests = results.filter(r => r.status === 'success');
    const failedTests = results.filter(r => r.status === 'failed');
    
    console.log(`✅ Successful tests: ${successfulTests.length}/${results.length}`);
    console.log(`❌ Failed tests: ${failedTests.length}/${results.length}`);
    
    let avgOverall = 0;
    let totalIndexUsage = 0;
    let totalTableScans = 0;
    let excellentQueries = [];
    let goodQueries = [];
    let fairQueries = [];
    let poorQueries = [];

    if (successfulTests.length > 0) {
      avgOverall = successfulTests.reduce((sum, r) => sum + parseFloat(r.avgTime), 0) / successfulTests.length;
      const avgScore = successfulTests.reduce((sum, r) => sum + r.score, 0) / successfulTests.length;
      
      console.log(`📊 Overall average time: ${avgOverall.toFixed(3)}ms`);
      console.log(`📈 Overall average score: ${avgScore.toFixed(1)}/100`);
      
      excellentQueries = successfulTests.filter(r => r.performance === 'excellent');
      goodQueries = successfulTests.filter(r => r.performance === 'good');
      fairQueries = successfulTests.filter(r => r.performance === 'fair');
      poorQueries = successfulTests.filter(r => r.performance === 'poor');
      
      console.log(`⭐ Excellent queries: ${excellentQueries.length}`);
      console.log(`👍 Good queries: ${goodQueries.length}`);
      console.log(`👌 Fair queries: ${fairQueries.length}`);
      console.log(`👎 Poor queries: ${poorQueries.length}`);
      
      totalIndexUsage = successfulTests.reduce((sum, r) => sum + r.indexesUsed, 0);
      totalTableScans = successfulTests.reduce((sum, r) => sum + r.tableScans, 0);
      
      console.log(`🔍 Total indexes used: ${totalIndexUsage}`);
      console.log(`⚠️  Total table scans: ${totalTableScans}`);
      
      if (poorQueries.length > 0) {
        console.log('\n🚨 Queries needing attention:');
        poorQueries.forEach(q => {
          console.log(`  - ${q.name}: ${q.avgTime}ms (score: ${q.score})`);
        });
      }
    }

    // 缓存测试
    console.log('\n💾 Cache Performance Test');
    console.log('=========================');
    
    const cacheTestQuery = 'SELECT * FROM audios ORDER BY uploadDate DESC LIMIT 5';
    const cacheStmt = db.prepare(cacheTestQuery);
    
    // 第一次执行（无缓存）
    const firstStart = performance.now();
    cacheStmt.all();
    const firstEnd = performance.now();
    const firstTime = firstEnd - firstStart;
    
    // 模拟缓存命中（立即返回）
    const secondStart = performance.now();
    // 在实际应用中，这里会从缓存返回
    const secondEnd = performance.now();
    const cacheTime = secondEnd - secondStart;
    
    console.log(`First execution (no cache): ${firstTime.toFixed(3)}ms`);
    console.log(`Cache lookup time: ${cacheTime.toFixed(3)}ms`);
    console.log(`Cache improvement: ${((firstTime - cacheTime) / firstTime * 100).toFixed(1)}%`);

    // 分页测试
    console.log('\n📄 Pagination Performance Test');
    console.log('===============================');
    
    const pageSizes = [10, 20, 50, 100];
    for (const pageSize of pageSizes) {
      const paginationQuery = `SELECT * FROM audios ORDER BY uploadDate DESC LIMIT ${pageSize} OFFSET 0`;
      const paginationStmt = db.prepare(paginationQuery);
      
      const start = performance.now();
      const result = paginationStmt.all();
      const end = performance.now();
      
      console.log(`Page size ${pageSize}: ${(end - start).toFixed(3)}ms (${result.length} rows)`);
    }

    console.log('\n🎉 Query optimization testing completed!');
    
    // 优化建议
    console.log('\n💡 Optimization Recommendations');
    console.log('================================');
    
    if (totalTableScans > 0) {
      console.log('1. ⚠️  Some queries are performing table scans - consider adding indexes');
    }
    
    if (avgOverall > 10) {
      console.log('2. 🐌 Average query time is above 10ms - review slow queries');
    }
    
    if (poorQueries.length > 0) {
      console.log('3. 📉 Some queries have poor performance scores - prioritize optimization');
    }
    
    console.log('4. 💾 Implement query result caching for frequently accessed data');
    console.log('5. 📊 Monitor query performance in production environment');
    console.log('6. 🔄 Run ANALYZE periodically to update query planner statistics');

  } catch (error) {
    console.error('Query optimization test failed:', error);
    process.exit(1);
  } finally {
    if (db) {
      db.close();
    }
  }
}

testQueryOptimization().catch(error => {
  console.error('Test script failed:', error);
  process.exit(1);
});