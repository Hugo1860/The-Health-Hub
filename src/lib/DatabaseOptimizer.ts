import Database from 'better-sqlite3';
import db from './db';

export interface OptimizedQuery {
  sql: string;
  params: any[];
  estimatedTime: number;
  useIndex: boolean;
  indexRecommendations: string[];
}

export interface QueryAnalysis {
  executionTime: number;
  rowsScanned: number;
  indexUsed: string[];
  recommendations: string[];
  queryPlan: any[];
}

export interface IndexInfo {
  name: string;
  table: string;
  columns: string[];
  unique: boolean;
  created: boolean;
}

export class DatabaseOptimizer {
  private db: Database.Database;
  private queryCache: Map<string, any> = new Map();
  private performanceLog: Array<{
    query: string;
    executionTime: number;
    timestamp: number;
  }> = [];

  constructor(database: Database.Database = db) {
    this.db = database;
    this.initializePerformanceMonitoring();
  }

  /**
   * 初始化性能监控
   */
  private initializePerformanceMonitoring(): void {
    // 创建性能监控表（如果不存在）
    try {
      this.db.exec(`
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
    } catch (error) {
      console.error('Failed to initialize performance monitoring:', error);
    }
  }

  /**
   * 创建推荐的索引
   */
  async createRecommendedIndexes(): Promise<IndexInfo[]> {
    const indexes: IndexInfo[] = [];
    
    try {
      // 音频搜索复合索引
      const audioSearchIndex = await this.createIndex(
        'idx_audios_search',
        'audios',
        ['title', 'subject', 'tags']
      );
      indexes.push(audioSearchIndex);

      // 音频按日期排序索引
      const audioDateIndex = await this.createIndex(
        'idx_audios_date',
        'audios',
        ['uploadDate DESC']
      );
      indexes.push(audioDateIndex);

      // 音频时长索引
      const audioDurationIndex = await this.createIndex(
        'idx_audios_duration',
        'audios',
        ['duration']
      );
      indexes.push(audioDurationIndex);

      // 用户邮箱索引
      const userEmailIndex = await this.createIndex(
        'idx_users_email',
        'users',
        ['email']
      );
      indexes.push(userEmailIndex);

      // 用户状态和角色索引
      const userStatusIndex = await this.createIndex(
        'idx_users_status',
        'users',
        ['status', 'role']
      );
      indexes.push(userStatusIndex);

      // 评论按音频和时间索引
      const commentsIndex = await this.createIndex(
        'idx_comments_audio_time',
        'comments',
        ['audioId', 'createdAt DESC']
      );
      indexes.push(commentsIndex);

      // 评分按音频索引
      const ratingsIndex = await this.createIndex(
        'idx_ratings_audio',
        'ratings',
        ['audioId', 'rating']
      );
      indexes.push(ratingsIndex);

      // 音频复合索引（主题、日期、时长）
      const audioCompositeIndex = await this.createIndex(
        'idx_audios_composite',
        'audios',
        ['subject', 'uploadDate DESC', 'duration']
      );
      indexes.push(audioCompositeIndex);

      console.log(`Successfully created ${indexes.filter(i => i.created).length} indexes`);
      return indexes;
    } catch (error) {
      console.error('Failed to create recommended indexes:', error);
      return indexes;
    }
  }

  /**
   * 创建单个索引
   */
  private async createIndex(
    indexName: string,
    tableName: string,
    columns: string[]
  ): Promise<IndexInfo> {
    const indexInfo: IndexInfo = {
      name: indexName,
      table: tableName,
      columns,
      unique: false,
      created: false
    };

    try {
      // 检查索引是否已存在
      const existingIndex = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type = 'index' AND name = ?
      `).get(indexName);

      if (existingIndex) {
        console.log(`Index ${indexName} already exists`);
        indexInfo.created = true;
        return indexInfo;
      }

      // 创建索引
      const columnList = columns.join(', ');
      const createIndexSQL = `CREATE INDEX ${indexName} ON ${tableName}(${columnList})`;
      
      this.db.exec(createIndexSQL);
      indexInfo.created = true;
      
      console.log(`Created index: ${indexName} on ${tableName}(${columnList})`);
      return indexInfo;
    } catch (error) {
      console.error(`Failed to create index ${indexName}:`, error);
      return indexInfo;
    }
  }

  /**
   * 分析查询性能
   */
  analyzeQueryPerformance(query: string, params: any[] = []): QueryAnalysis {
    const startTime = performance.now();
    
    try {
      // 获取查询计划
      const queryPlan = this.db.prepare(`EXPLAIN QUERY PLAN ${query}`).all(...params);
      
      // 执行查询以获取实际性能数据
      const stmt = this.db.prepare(query);
      const result = stmt.all(...params);
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // 分析查询计划
      const indexUsed = queryPlan
        .filter((step: any) => step.detail && step.detail.includes('USING INDEX'))
        .map((step: any) => step.detail.match(/USING INDEX (\w+)/)?.[1])
        .filter(Boolean);

      const rowsScanned = queryPlan.reduce((total: number, step: any) => {
        const match = step.detail?.match(/SCAN.*?(\d+)/);
        return total + (match ? parseInt(match[1]) : 0);
      }, 0);

      // 生成优化建议
      const recommendations = this.generateOptimizationRecommendations(
        query,
        queryPlan,
        executionTime
      );

      // 记录性能数据
      this.logQueryPerformance(query, executionTime, result.length);

      return {
        executionTime,
        rowsScanned,
        indexUsed,
        recommendations,
        queryPlan
      };
    } catch (error) {
      console.error('Query analysis failed:', error);
      return {
        executionTime: 0,
        rowsScanned: 0,
        indexUsed: [],
        recommendations: ['Query analysis failed'],
        queryPlan: []
      };
    }
  }

  /**
   * 优化查询
   */
  optimizeQuery(query: string, params: any[] = []): OptimizedQuery {
    const analysis = this.analyzeQueryPerformance(query, params);
    
    // 基于分析结果优化查询
    let optimizedSQL = query;
    const indexRecommendations: string[] = [];

    // 检查是否需要添加 LIMIT
    if (!query.toLowerCase().includes('limit') && query.toLowerCase().includes('select')) {
      // 对于可能返回大量结果的查询，建议添加 LIMIT
      if (analysis.rowsScanned > 1000) {
        indexRecommendations.push('Consider adding LIMIT clause to reduce result set');
      }
    }

    // 检查是否使用了索引
    const useIndex = analysis.indexUsed.length > 0;
    if (!useIndex && analysis.executionTime > 100) {
      indexRecommendations.push('Query is not using indexes, consider creating appropriate indexes');
    }

    // 检查是否有全表扫描
    const hasTableScan = analysis.queryPlan.some((step: any) => 
      step.detail && step.detail.includes('SCAN TABLE')
    );
    
    if (hasTableScan) {
      indexRecommendations.push('Query performs table scan, consider adding indexes on WHERE clause columns');
    }

    return {
      sql: optimizedSQL,
      params,
      estimatedTime: analysis.executionTime,
      useIndex,
      indexRecommendations
    };
  }

  /**
   * 生成优化建议
   */
  private generateOptimizationRecommendations(
    query: string,
    queryPlan: any[],
    executionTime: number
  ): string[] {
    const recommendations: string[] = [];

    // 执行时间过长
    if (executionTime > 500) {
      recommendations.push('Query execution time is high (>500ms), consider optimization');
    }

    // 检查全表扫描
    const hasTableScan = queryPlan.some(step => 
      step.detail && step.detail.includes('SCAN TABLE')
    );
    if (hasTableScan) {
      recommendations.push('Avoid full table scans by adding appropriate indexes');
    }

    // 检查是否使用了索引
    const usesIndex = queryPlan.some(step => 
      step.detail && step.detail.includes('USING INDEX')
    );
    if (!usesIndex && executionTime > 100) {
      recommendations.push('Query is not using indexes, performance may be improved with proper indexing');
    }

    // 检查排序操作
    const hasSort = queryPlan.some(step => 
      step.detail && step.detail.includes('USE TEMP B-TREE FOR ORDER BY')
    );
    if (hasSort) {
      recommendations.push('Query uses temporary sorting, consider creating index on ORDER BY columns');
    }

    // 检查 LIKE 操作
    if (query.toLowerCase().includes('like')) {
      recommendations.push('LIKE operations can be slow, consider full-text search for better performance');
    }

    return recommendations;
  }

  /**
   * 记录查询性能
   */
  private logQueryPerformance(query: string, executionTime: number, rowsAffected: number): void {
    try {
      const queryHash = this.hashQuery(query);
      
      // 记录到内存日志
      this.performanceLog.push({
        query,
        executionTime,
        timestamp: Date.now()
      });

      // 保持日志大小在合理范围内
      if (this.performanceLog.length > 1000) {
        this.performanceLog = this.performanceLog.slice(-500);
      }

      // 记录到数据库
      const stmt = this.db.prepare(`
        INSERT INTO query_performance (query_hash, query_sql, execution_time, rows_affected)
        VALUES (?, ?, ?, ?)
      `);
      
      stmt.run(queryHash, query, executionTime, rowsAffected);
    } catch (error) {
      console.error('Failed to log query performance:', error);
    }
  }

  /**
   * 生成查询哈希
   */
  private hashQuery(query: string): string {
    // 简单的哈希函数，用于标识相似的查询
    const normalized = query
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/\d+/g, '?') // 替换数字为占位符
      .replace(/'[^']*'/g, '?'); // 替换字符串为占位符
    
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash.toString();
  }

  /**
   * 获取慢查询报告
   */
  getSlowQueryReport(thresholdMs: number = 500): Array<{
    query: string;
    avgExecutionTime: number;
    count: number;
    lastSeen: string;
  }> {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          query_sql,
          AVG(execution_time) as avg_execution_time,
          COUNT(*) as count,
          MAX(timestamp) as last_seen
        FROM query_performance 
        WHERE execution_time > ?
        GROUP BY query_hash
        ORDER BY avg_execution_time DESC
        LIMIT 20
      `);

      const results = stmt.all(thresholdMs);
      
      return results.map((row: any) => ({
        query: row.query_sql,
        avgExecutionTime: row.avg_execution_time,
        count: row.count,
        lastSeen: new Date(row.last_seen).toISOString()
      }));
    } catch (error) {
      console.error('Failed to get slow query report:', error);
      return [];
    }
  }

  /**
   * 获取索引使用统计
   */
  getIndexUsageStats(): Array<{
    indexName: string;
    tableName: string;
    usageCount: number;
  }> {
    try {
      // 这是一个简化的实现，实际的索引使用统计需要更复杂的监控
      const indexes = this.db.prepare(`
        SELECT name, tbl_name 
        FROM sqlite_master 
        WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
      `).all();

      return indexes.map((index: any) => ({
        indexName: index.name,
        tableName: index.tbl_name,
        usageCount: 0 // 实际实现中需要跟踪索引使用情况
      }));
    } catch (error) {
      console.error('Failed to get index usage stats:', error);
      return [];
    }
  }

  /**
   * 清理性能日志
   */
  cleanupPerformanceLogs(daysToKeep: number = 7): void {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const stmt = this.db.prepare(`
        DELETE FROM query_performance 
        WHERE timestamp < ?
      `);
      
      const result = stmt.run(cutoffDate.toISOString());
      console.log(`Cleaned up ${result.changes} old performance log entries`);
    } catch (error) {
      console.error('Failed to cleanup performance logs:', error);
    }
  }
}

// 创建全局实例
export const databaseOptimizer = new DatabaseOptimizer();