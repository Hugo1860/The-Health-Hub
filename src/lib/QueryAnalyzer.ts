import Database from 'better-sqlite3';
import db from './db';

export interface QueryPlan {
  id: number;
  parent: number;
  notused: number;
  detail: string;
}

export interface QueryAnalysisResult {
  query: string;
  params: any[];
  executionTime: number;
  rowsReturned: number;
  queryPlan: QueryPlan[];
  indexesUsed: string[];
  tableScans: string[];
  recommendations: string[];
  performance: 'excellent' | 'good' | 'fair' | 'poor';
  score: number;
}

export interface QueryOptimizationSuggestion {
  type: 'index' | 'query_rewrite' | 'schema_change' | 'caching';
  priority: 'high' | 'medium' | 'low';
  description: string;
  sqlSuggestion?: string;
  estimatedImprovement: string;
}

export class QueryAnalyzer {
  private database: Database.Database;
  private analysisCache: Map<string, QueryAnalysisResult> = new Map();

  constructor(database: Database.Database = db) {
    this.database = database;
  }

  /**
   * 分析查询性能
   */
  async analyzeQuery(
    query: string,
    params: any[] = [],
    options: { useCache?: boolean; iterations?: number } = {}
  ): Promise<QueryAnalysisResult> {
    const { useCache = true, iterations = 3 } = options;
    
    // 生成缓存键
    const cacheKey = this.generateCacheKey(query, params);
    
    // 检查缓存
    if (useCache && this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey)!;
    }

    try {
      // 获取查询计划
      const queryPlan = this.getQueryPlan(query, params);
      
      // 执行性能测试
      const performanceResults = await this.measureQueryPerformance(query, params, iterations);
      
      // 分析索引使用情况
      const indexesUsed = this.extractIndexesUsed(queryPlan);
      
      // 检测表扫描
      const tableScans = this.detectTableScans(queryPlan);
      
      // 生成优化建议
      const recommendations = this.generateRecommendations(query, queryPlan, performanceResults);
      
      // 计算性能评分
      const { performance, score } = this.calculatePerformanceScore(
        performanceResults.averageTime,
        indexesUsed.length,
        tableScans.length,
        performanceResults.rowsReturned
      );

      const result: QueryAnalysisResult = {
        query,
        params,
        executionTime: performanceResults.averageTime,
        rowsReturned: performanceResults.rowsReturned,
        queryPlan,
        indexesUsed,
        tableScans,
        recommendations,
        performance,
        score
      };

      // 缓存结果
      if (useCache) {
        this.analysisCache.set(cacheKey, result);
        
        // 限制缓存大小
        if (this.analysisCache.size > 100) {
          const firstKey = this.analysisCache.keys().next().value;
          this.analysisCache.delete(firstKey);
        }
      }

      return result;

    } catch (error) {
      console.error('Query analysis failed:', error);
      throw new Error(`Failed to analyze query: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 获取查询计划
   */
  private getQueryPlan(query: string, params: any[]): QueryPlan[] {
    try {
      const explainQuery = `EXPLAIN QUERY PLAN ${query}`;
      const stmt = this.database.prepare(explainQuery);
      return stmt.all(...params) as QueryPlan[];
    } catch (error) {
      console.error('Failed to get query plan:', error);
      return [];
    }
  }

  /**
   * 测量查询性能
   */
  private async measureQueryPerformance(
    query: string,
    params: any[],
    iterations: number
  ): Promise<{
    averageTime: number;
    minTime: number;
    maxTime: number;
    rowsReturned: number;
  }> {
    const times: number[] = [];
    let rowsReturned = 0;

    try {
      const stmt = this.database.prepare(query);
      
      // 预热查询
      stmt.all(...params);

      // 执行多次测试
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        const result = stmt.all(...params);
        const endTime = performance.now();
        
        times.push(endTime - startTime);
        if (i === 0) {
          rowsReturned = Array.isArray(result) ? result.length : 1;
        }
      }

      return {
        averageTime: times.reduce((a, b) => a + b, 0) / times.length,
        minTime: Math.min(...times),
        maxTime: Math.max(...times),
        rowsReturned
      };

    } catch (error) {
      console.error('Performance measurement failed:', error);
      return {
        averageTime: 0,
        minTime: 0,
        maxTime: 0,
        rowsReturned: 0
      };
    }
  }

  /**
   * 提取使用的索引
   */
  private extractIndexesUsed(queryPlan: QueryPlan[]): string[] {
    const indexes: string[] = [];
    
    for (const step of queryPlan) {
      if (step.detail && step.detail.includes('USING INDEX')) {
        const match = step.detail.match(/USING INDEX (\w+)/);
        if (match && match[1]) {
          indexes.push(match[1]);
        }
      }
    }
    
    return [...new Set(indexes)]; // 去重
  }

  /**
   * 检测表扫描
   */
  private detectTableScans(queryPlan: QueryPlan[]): string[] {
    const tableScans: string[] = [];
    
    for (const step of queryPlan) {
      if (step.detail && step.detail.includes('SCAN TABLE')) {
        const match = step.detail.match(/SCAN TABLE (\w+)/);
        if (match && match[1]) {
          tableScans.push(match[1]);
        }
      }
    }
    
    return [...new Set(tableScans)]; // 去重
  }

  /**
   * 生成优化建议
   */
  private generateRecommendations(
    query: string,
    queryPlan: QueryPlan[],
    performanceResults: any
  ): string[] {
    const recommendations: string[] = [];
    const lowerQuery = query.toLowerCase();

    // 检查执行时间
    if (performanceResults.averageTime > 100) {
      recommendations.push('Query execution time is high (>100ms). Consider optimization.');
    }

    // 检查表扫描
    const tableScans = this.detectTableScans(queryPlan);
    if (tableScans.length > 0) {
      recommendations.push(`Avoid full table scans on: ${tableScans.join(', ')}. Consider adding indexes.`);
    }

    // 检查索引使用
    const indexesUsed = this.extractIndexesUsed(queryPlan);
    if (indexesUsed.length === 0 && performanceResults.averageTime > 10) {
      recommendations.push('Query is not using any indexes. Consider creating appropriate indexes.');
    }

    // 检查 LIKE 操作
    if (lowerQuery.includes('like') && lowerQuery.includes('%')) {
      if (lowerQuery.match(/like\s+['"]%/)) {
        recommendations.push('Leading wildcard in LIKE clause prevents index usage. Consider full-text search.');
      }
    }

    // 检查 ORDER BY
    if (lowerQuery.includes('order by')) {
      const hasOrderByIndex = queryPlan.some(step => 
        step.detail && step.detail.includes('ORDER BY')
      );
      if (!hasOrderByIndex && performanceResults.averageTime > 50) {
        recommendations.push('ORDER BY clause may benefit from an index on the sorted columns.');
      }
    }

    // 检查 GROUP BY
    if (lowerQuery.includes('group by')) {
      recommendations.push('GROUP BY operations can be optimized with appropriate indexes.');
    }

    // 检查 JOIN 操作
    if (lowerQuery.includes('join')) {
      recommendations.push('Ensure JOIN conditions use indexed columns for better performance.');
    }

    // 检查 DISTINCT
    if (lowerQuery.includes('distinct')) {
      recommendations.push('DISTINCT operations can be expensive. Consider if it\'s necessary.');
    }

    // 检查子查询
    if (lowerQuery.includes('select') && lowerQuery.match(/select.*select/)) {
      recommendations.push('Consider rewriting subqueries as JOINs for better performance.');
    }

    return recommendations;
  }

  /**
   * 计算性能评分
   */
  private calculatePerformanceScore(
    executionTime: number,
    indexCount: number,
    tableScanCount: number,
    rowsReturned: number
  ): { performance: 'excellent' | 'good' | 'fair' | 'poor'; score: number } {
    let score = 100;

    // 执行时间评分
    if (executionTime > 1000) {
      score -= 50;
    } else if (executionTime > 500) {
      score -= 30;
    } else if (executionTime > 100) {
      score -= 20;
    } else if (executionTime > 50) {
      score -= 10;
    }

    // 索引使用评分
    if (indexCount === 0) {
      score -= 20;
    } else if (indexCount > 0) {
      score += 10;
    }

    // 表扫描惩罚
    score -= tableScanCount * 15;

    // 结果集大小影响
    if (rowsReturned > 10000) {
      score -= 10;
    } else if (rowsReturned > 1000) {
      score -= 5;
    }

    // 确保评分在0-100范围内
    score = Math.max(0, Math.min(100, score));

    let performance: 'excellent' | 'good' | 'fair' | 'poor';
    if (score >= 90) {
      performance = 'excellent';
    } else if (score >= 70) {
      performance = 'good';
    } else if (score >= 50) {
      performance = 'fair';
    } else {
      performance = 'poor';
    }

    return { performance, score };
  }

  /**
   * 生成优化建议
   */
  generateOptimizationSuggestions(analysis: QueryAnalysisResult): QueryOptimizationSuggestion[] {
    const suggestions: QueryOptimizationSuggestion[] = [];

    // 基于表扫描的索引建议
    if (analysis.tableScans.length > 0) {
      for (const table of analysis.tableScans) {
        suggestions.push({
          type: 'index',
          priority: 'high',
          description: `Create index on ${table} to avoid full table scan`,
          sqlSuggestion: `-- Analyze WHERE clause and create appropriate index\n-- Example: CREATE INDEX idx_${table}_column ON ${table}(column);`,
          estimatedImprovement: '50-90% faster query execution'
        });
      }
    }

    // 基于执行时间的缓存建议
    if (analysis.executionTime > 100) {
      suggestions.push({
        type: 'caching',
        priority: 'medium',
        description: 'Consider caching this query result due to high execution time',
        estimatedImprovement: 'Near-instant response for cached results'
      });
    }

    // 基于查询模式的重写建议
    const lowerQuery = analysis.query.toLowerCase();
    if (lowerQuery.includes('like') && lowerQuery.includes('%')) {
      suggestions.push({
        type: 'query_rewrite',
        priority: 'medium',
        description: 'Consider using full-text search instead of LIKE with wildcards',
        sqlSuggestion: '-- Consider implementing FTS (Full-Text Search) for better performance',
        estimatedImprovement: '10-50% faster text search'
      });
    }

    return suggestions;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(query: string, params: any[]): string {
    const normalizedQuery = query.toLowerCase().replace(/\s+/g, ' ').trim();
    const paramsStr = JSON.stringify(params);
    return `${normalizedQuery}_${paramsStr}`;
  }

  /**
   * 清理分析缓存
   */
  clearCache(): void {
    this.analysisCache.clear();
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.analysisCache.size,
      maxSize: 100
    };
  }
}

// 创建全局查询分析器实例
export const queryAnalyzer = new QueryAnalyzer();