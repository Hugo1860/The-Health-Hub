/**
 * 搜索功能优化器
 * 提供高效的全文搜索、过滤和排序功能
 */

import db from './db';

export interface SearchOptions {
  query?: string;
  category?: string;
  speaker?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'relevance' | 'date' | 'title' | 'duration' | 'plays';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  facets?: {
    categories: Array<{ name: string; count: number }>;
    speakers: Array<{ name: string; count: number }>;
    years: Array<{ year: number; count: number }>;
  };
  searchTime: number;
}

export class SearchOptimizer {
  /**
   * 搜索音频内容
   */
  async searchAudios(options: SearchOptions): Promise<SearchResult<any>> {
    const startTime = Date.now();
    const {
      query = '',
      category,
      speaker,
      status = 'published',
      dateFrom,
      dateTo,
      sortBy = 'relevance',
      sortOrder = 'desc',
      limit = 20,
      offset = 0
    } = options;

    try {
      // 构建基础查询
      let baseQuery = `
        FROM audios a 
        LEFT JOIN categories c ON a.subject = c.name
        WHERE a.status = ?
      `;
      const params: any[] = [status];

      // 添加全文搜索条件
      if (query.trim()) {
        baseQuery += ` AND (
          a.title ILIKE ? OR 
          a.description ILIKE ? OR 
          a.speaker ILIKE ? OR
          a.subject ILIKE ?
        )`;
        const searchTerm = `%${query.trim()}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      // 添加分类过滤
      if (category) {
        baseQuery += ` AND a.subject = ?`;
        params.push(category);
      }

      // 添加讲者过滤
      if (speaker) {
        baseQuery += ` AND a.speaker ILIKE ?`;
        params.push(`%${speaker}%`);
      }

      // 添加日期范围过滤
      if (dateFrom) {
        baseQuery += ` AND a."uploadDate" >= ?`;
        params.push(dateFrom);
      }
      if (dateTo) {
        baseQuery += ` AND a."uploadDate" <= ?`;
        params.push(dateTo);
      }

      // 构建排序条件
      let orderBy = '';
      switch (sortBy) {
        case 'date':
          orderBy = `ORDER BY a."uploadDate" ${sortOrder.toUpperCase()}`;
          break;
        case 'title':
          orderBy = `ORDER BY a.title ${sortOrder.toUpperCase()}`;
          break;
        case 'duration':
          orderBy = `ORDER BY a.duration ${sortOrder.toUpperCase()}`;
          break;
        case 'relevance':
        default:
          if (query.trim()) {
            // 简单的相关性评分：标题匹配权重更高
            orderBy = `ORDER BY 
              CASE 
                WHEN a.title ILIKE ? THEN 3
                WHEN a.description ILIKE ? THEN 2
                WHEN a.speaker ILIKE ? THEN 1
                ELSE 0
              END DESC, a."uploadDate" DESC`;
            const searchTerm = `%${query.trim()}%`;
            params.push(searchTerm, searchTerm, searchTerm);
          } else {
            orderBy = `ORDER BY a."uploadDate" DESC`;
          }
          break;
      }

      // 获取总数
      const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
      const countStmt = db.prepare(countQuery);
      const countResult = await countStmt.get(...params.slice(0, params.length - (sortBy === 'relevance' && query.trim() ? 3 : 0)));
      const total = countResult?.total || 0;

      // 获取结果
      const selectQuery = `
        SELECT 
          a.id,
          a.title,
          a.description,
          a.filename,
          a.url,
          a."coverImage",
          a."uploadDate",
          a.subject,
          a.tags,
          a.size,
          a.duration,
          a.speaker,
          a."recordingDate",
          a.status,
          c.color as category_color,
          c.icon as category_icon
        ${baseQuery}
        ${orderBy}
        LIMIT ? OFFSET ?
      `;

      const selectStmt = db.prepare(selectQuery);
      const results = await selectStmt.all(...params, limit, offset);

      // 处理结果
      const items = results.map((item: any) => ({
        ...item,
        tags: typeof item.tags === 'string' ? JSON.parse(item.tags || '[]') : (item.tags || []), coverImage: item.coverImage, uploadDate: item.uploadDate, recordingDate: item.recordingDate,
        categoryColor: item.category_color,
        categoryIcon: item.category_icon
      }));

      // 获取搜索面板数据（如果需要）
      const facets = await this.getFacets(baseQuery, params.slice(0, params.length - (sortBy === 'relevance' && query.trim() ? 3 : 0)));

      const searchTime = Date.now() - startTime;

      return {
        items,
        total,
        hasMore: offset + limit < total,
        facets,
        searchTime
      };

    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }

  /**
   * 获取搜索面板数据
   */
  private async getFacets(baseQuery: string, params: any[]): Promise<SearchResult<any>['facets']> {
    try {
      // 获取分类统计
      const categoriesQuery = `
        SELECT a.subject as name, COUNT(*) as count
        ${baseQuery}
        GROUP BY a.subject
        ORDER BY count DESC
        LIMIT 10
      `;
      const categoriesStmt = db.prepare(categoriesQuery);
      const categories = await categoriesStmt.all(...params);

      // 获取讲者统计
      const speakersQuery = `
        SELECT a.speaker as name, COUNT(*) as count
        ${baseQuery}
        AND a.speaker IS NOT NULL AND a.speaker != ''
        GROUP BY a.speaker
        ORDER BY count DESC
        LIMIT 10
      `;
      const speakersStmt = db.prepare(speakersQuery);
      const speakers = await speakersStmt.all(...params);

      // 获取年份统计
      const yearsQuery = `
        SELECT EXTRACT(YEAR FROM a."uploadDate") as year, COUNT(*) as count
        ${baseQuery}
        GROUP BY EXTRACT(YEAR FROM a."uploadDate")
        ORDER BY year DESC
        LIMIT 10
      `;
      const yearsStmt = db.prepare(yearsQuery);
      const years = await yearsStmt.all(...params);

      return {
        categories: categories || [],
        speakers: speakers || [],
        years: years || []
      };
    } catch (error) {
      console.error('Facets error:', error);
      return {
        categories: [],
        speakers: [],
        years: []
      };
    }
  }

  /**
   * 搜索建议/自动完成
   */
  async getSearchSuggestions(query: string, limit: number = 5): Promise<{
    titles: string[];
    speakers: string[];
    categories: string[];
  }> {
    if (!query.trim() || query.length < 2) {
      return { titles: [], speakers: [], categories: [] };
    }

    try {
      const searchTerm = `%${query.trim()}%`;

      // 标题建议
      const titlesStmt = db.prepare(`
        SELECT DISTINCT title
        FROM audios
        WHERE status = 'published' AND title ILIKE ?
        ORDER BY title
        LIMIT ?
      `);
      const titles = await titlesStmt.all(searchTerm, limit);

      // 讲者建议
      const speakersStmt = db.prepare(`
        SELECT DISTINCT speaker
        FROM audios
        WHERE status = 'published' AND speaker IS NOT NULL AND speaker != '' AND speaker ILIKE ?
        ORDER BY speaker
        LIMIT ?
      `);
      const speakers = await speakersStmt.all(searchTerm, limit);

      // 分类建议
      const categoriesStmt = db.prepare(`
        SELECT DISTINCT name
        FROM categories
        WHERE name ILIKE ?
        ORDER BY name
        LIMIT ?
      `);
      const categories = await categoriesStmt.all(searchTerm, limit);

      return {
        titles: titles.map((t: any) => t.title),
        speakers: speakers.map((s: any) => s.speaker),
        categories: categories.map((c: any) => c.name)
      };
    } catch (error) {
      console.error('Suggestions error:', error);
      return { titles: [], speakers: [], categories: [] };
    }
  }

  /**
   * 热门搜索词
   */
  async getPopularSearchTerms(limit: number = 10): Promise<Array<{ term: string; count: number }>> {
    // 这里可以从搜索日志中获取热门搜索词
    // 目前返回基于内容的热门词汇
    try {
      const stmt = db.prepare(`
        SELECT subject as term, COUNT(*) as count
        FROM audios
        WHERE status = 'published'
        GROUP BY subject
        ORDER BY count DESC
        LIMIT ?
      `);
      const results = await stmt.all(limit);
      return results || [];
    } catch (error) {
      console.error('Popular terms error:', error);
      return [];
    }
  }

  /**
   * 相关内容推荐
   */
  async getRelatedContent(audioId: string, limit: number = 5): Promise<any[]> {
    try {
      // 获取当前音频信息
      const currentStmt = db.prepare('SELECT subject, speaker, tags FROM audios WHERE id = ?');
      const current = await currentStmt.get(audioId);
      
      if (!current) return [];

      // 基于分类和讲者推荐相关内容
      const relatedStmt = db.prepare(`
        SELECT id, title, subject, speaker, "uploadDate", duration, "coverImage"
        FROM audios
        WHERE status = 'published' 
          AND id != ?
          AND (subject = ? OR speaker = ?)
        ORDER BY "uploadDate" DESC
        LIMIT ?
      `);
      
      const related = await relatedStmt.all(audioId, current.subject, current.speaker, limit);
      
      return related.map((item: any) => ({
        ...item, coverImage: item.coverImage, uploadDate: item.uploadDate
      }));
    } catch (error) {
      console.error('Related content error:', error);
      return [];
    }
  }
}

export default SearchOptimizer;