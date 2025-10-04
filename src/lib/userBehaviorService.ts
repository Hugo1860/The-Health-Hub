/**
 * 用户行为分析服务
 * 提供用户行为追踪、分析、洞察等功能
 */

import db from './db';

export interface BehaviorEvent {
  id: number;
  userId?: string;
  sessionId: string;
  eventType: 'page_view' | 'audio_play' | 'audio_pause' | 'audio_seek' | 'search' | 'filter' | 'like' | 'share' | 'comment' | 'playlist_create' | 'follow';
  eventData: Record<string, any>;
  pageUrl?: string;
  referrer?: string;
  userAgent?: string;
  ipAddress?: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  createdAt: string;
}

export interface UserBehaviorAnalytics {
  userId: string;
  timeRange: {
    start: string;
    end: string;
  };
  summary: {
    totalEvents: number;
    uniqueSessions: number;
    totalTime: number;
    averageSessionTime: number;
  };
  engagement: {
    audioPlays: number;
    searches: number;
    likes: number;
    shares: number;
    comments: number;
  };
  preferences: {
    favoriteCategories: Array<{ category: string; interactions: number }>;
    preferredDevices: Array<{ device: string; usage: number }>;
    peakActivityHours: Array<{ hour: number; activity: number }>;
  };
  patterns: {
    sessionFrequency: 'daily' | 'weekly' | 'occasional';
    contentConsumption: 'binge' | 'regular' | 'casual';
    interactionLevel: 'high' | 'medium' | 'low';
  };
}

export interface ContentAnalytics {
  contentId: string;
  contentType: 'audio' | 'playlist' | 'category';
  metrics: {
    views: number;
    plays: number;
    likes: number;
    shares: number;
    comments: number;
    averageWatchTime: number;
    completionRate: number;
  };
  demographics: {
    deviceTypes: Record<string, number>;
    timeDistribution: Record<string, number>;
  };
  trends: Array<{
    date: string;
    views: number;
    engagement: number;
  }>;
}

export class UserBehaviorService {
  /**
   * 记录用户行为事件
   */
  static async trackEvent(
    eventType: BehaviorEvent['eventType'],
    eventData: Record<string, any>,
    context: {
      userId?: string;
      sessionId: string;
      pageUrl?: string;
      referrer?: string;
      userAgent?: string;
      ipAddress?: string;
      deviceType?: BehaviorEvent['deviceType'];
    }
  ): Promise<void> {
    try {
      const insertQuery = `
        INSERT INTO user_behavior_events (
          user_id, session_id, event_type, event_data, page_url,
          referrer, user_agent, ip_address, device_type, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await db.prepare(insertQuery).run(
        context.userId || null,
        context.sessionId,
        eventType,
        JSON.stringify(eventData),
        context.pageUrl || null,
        context.referrer || null,
        context.userAgent || null,
        context.ipAddress || null,
        context.deviceType || 'desktop',
        new Date().toISOString()
      );

      // 异步更新学习统计（如果是学习相关事件）
      if (context.userId && this.isLearningEvent(eventType)) {
        this.updateLearningStats(context.userId, eventType, eventData).catch(console.error);
      }
    } catch (error) {
      console.error('记录用户行为事件失败:', error);
      // 不抛出错误，避免影响主流程
    }
  }

  /**
   * 获取用户行为分析
   */
  static async getUserBehaviorAnalytics(
    userId: string,
    timeRange: { start: string; end: string }
  ): Promise<UserBehaviorAnalytics> {
    const { start, end } = timeRange;

    // 基础统计
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_events,
        COUNT(DISTINCT session_id) as unique_sessions,
        COUNT(DISTINCT DATE(created_at)) as active_days
      FROM user_behavior_events 
      WHERE user_id = ? AND created_at BETWEEN ? AND ?
    `;

    const summaryResult = await db.prepare(summaryQuery).get(userId, start, end);

    // 参与度统计
    const engagementQuery = `
      SELECT 
        event_type,
        COUNT(*) as count
      FROM user_behavior_events 
      WHERE user_id = ? AND created_at BETWEEN ? AND ?
      GROUP BY event_type
    `;

    const engagementResults = await db.prepare(engagementQuery).all(userId, start, end);
    const engagement = {
      audioPlays: 0,
      searches: 0,
      likes: 0,
      shares: 0,
      comments: 0
    };

    engagementResults.forEach(row => {
      switch (row.event_type) {
        case 'audio_play':
          engagement.audioPlays = row.count;
          break;
        case 'search':
          engagement.searches = row.count;
          break;
        case 'like':
          engagement.likes = row.count;
          break;
        case 'share':
          engagement.shares = row.count;
          break;
        case 'comment':
          engagement.comments = row.count;
          break;
      }
    });

    // 偏好分析
    const preferences = await this.analyzeBehaviorPreferences(userId, start, end);

    // 模式分析
    const patterns = await this.analyzeBehaviorPatterns(userId, start, end);

    return {
      userId,
      timeRange,
      summary: {
        totalEvents: summaryResult?.total_events || 0,
        uniqueSessions: summaryResult?.unique_sessions || 0,
        totalTime: 0, // 需要从其他表计算
        averageSessionTime: 0 // 需要计算
      },
      engagement,
      preferences,
      patterns
    };
  }

  /**
   * 获取内容分析
   */
  static async getContentAnalytics(
    contentId: string,
    contentType: ContentAnalytics['contentType'],
    timeRange: { start: string; end: string }
  ): Promise<ContentAnalytics> {
    const { start, end } = timeRange;

    // 基础指标查询
    const metricsQuery = `
      SELECT 
        event_type,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT session_id) as unique_sessions
      FROM user_behavior_events 
      WHERE JSON_EXTRACT(event_data, '$.${contentType}Id') = ? 
        AND created_at BETWEEN ? AND ?
      GROUP BY event_type
    `;

    const metricsResults = await db.prepare(metricsQuery).all(contentId, start, end);

    const metrics = {
      views: 0,
      plays: 0,
      likes: 0,
      shares: 0,
      comments: 0,
      averageWatchTime: 0,
      completionRate: 0
    };

    metricsResults.forEach(row => {
      switch (row.event_type) {
        case 'page_view':
          metrics.views = row.count;
          break;
        case 'audio_play':
          metrics.plays = row.count;
          break;
        case 'like':
          metrics.likes = row.count;
          break;
        case 'share':
          metrics.shares = row.count;
          break;
        case 'comment':
          metrics.comments = row.count;
          break;
      }
    });

    // 设备分布
    const deviceQuery = `
      SELECT 
        device_type,
        COUNT(*) as count
      FROM user_behavior_events 
      WHERE JSON_EXTRACT(event_data, '$.${contentType}Id') = ? 
        AND created_at BETWEEN ? AND ?
      GROUP BY device_type
    `;

    const deviceResults = await db.prepare(deviceQuery).all(contentId, start, end);
    const deviceTypes: Record<string, number> = {};
    deviceResults.forEach(row => {
      deviceTypes[row.device_type] = row.count;
    });

    // 时间分布
    const timeQuery = `
      SELECT 
        HOUR(created_at) as hour,
        COUNT(*) as count
      FROM user_behavior_events 
      WHERE JSON_EXTRACT(event_data, '$.${contentType}Id') = ? 
        AND created_at BETWEEN ? AND ?
      GROUP BY HOUR(created_at)
    `;

    const timeResults = await db.prepare(timeQuery).all(contentId, start, end);
    const timeDistribution: Record<string, number> = {};
    timeResults.forEach(row => {
      timeDistribution[row.hour.toString()] = row.count;
    });

    return {
      contentId,
      contentType,
      metrics,
      demographics: {
        deviceTypes,
        timeDistribution
      },
      trends: [] // 需要按日期聚合计算
    };
  }

  /**
   * 生成用户行为报告
   */
  static async generateUserBehaviorReport(
    userId: string,
    days: number = 30
  ): Promise<{
    summary: UserBehaviorAnalytics;
    insights: string[];
    recommendations: string[];
  }> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analytics = await this.getUserBehaviorAnalytics(userId, {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    });

    // 生成洞察
    const insights: string[] = [];
    const recommendations: string[] = [];

    if (analytics.engagement.audioPlays > 50) {
      insights.push('您是一位活跃的学习者，播放了大量音频内容');
    }

    if (analytics.preferences.favoriteCategories.length > 0) {
      const topCategory = analytics.preferences.favoriteCategories[0];
      insights.push(`您最感兴趣的领域是${topCategory.category}`);
      recommendations.push(`基于您对${topCategory.category}的兴趣，推荐相关的高级内容`);
    }

    return {
      summary: analytics,
      insights,
      recommendations
    };
  }

  /**
   * 分析行为偏好
   */
  private static async analyzeBehaviorPreferences(
    userId: string,
    start: string,
    end: string
  ): Promise<UserBehaviorAnalytics['preferences']> {
    // 分类偏好
    const categoryQuery = `
      SELECT 
        JSON_EXTRACT(event_data, '$.category') as category,
        COUNT(*) as interactions
      FROM user_behavior_events 
      WHERE user_id = ? AND created_at BETWEEN ? AND ?
        AND JSON_EXTRACT(event_data, '$.category') IS NOT NULL
      GROUP BY JSON_EXTRACT(event_data, '$.category')
      ORDER BY interactions DESC
      LIMIT 10
    `;

    const categoryResults = await db.prepare(categoryQuery).all(userId, start, end);

    // 设备偏好
    const deviceQuery = `
      SELECT 
        device_type,
        COUNT(*) as usage
      FROM user_behavior_events 
      WHERE user_id = ? AND created_at BETWEEN ? AND ?
      GROUP BY device_type
      ORDER BY usage DESC
    `;

    const deviceResults = await db.prepare(deviceQuery).all(userId, start, end);

    // 活跃时间
    const hourQuery = `
      SELECT 
        HOUR(created_at) as hour,
        COUNT(*) as activity
      FROM user_behavior_events 
      WHERE user_id = ? AND created_at BETWEEN ? AND ?
      GROUP BY HOUR(created_at)
      ORDER BY activity DESC
      LIMIT 5
    `;

    const hourResults = await db.prepare(hourQuery).all(userId, start, end);

    return {
      favoriteCategories: categoryResults.map(row => ({
        category: row.category,
        interactions: row.interactions
      })),
      preferredDevices: deviceResults.map(row => ({
        device: row.device_type,
        usage: row.usage
      })),
      peakActivityHours: hourResults.map(row => ({
        hour: row.hour,
        activity: row.activity
      }))
    };
  }

  /**
   * 分析行为模式
   */
  private static async analyzeBehaviorPatterns(
    userId: string,
    start: string,
    end: string
  ): Promise<UserBehaviorAnalytics['patterns']> {
    // 会话频率分析
    const sessionQuery = `
      SELECT 
        COUNT(DISTINCT DATE(created_at)) as active_days,
        COUNT(DISTINCT session_id) as total_sessions
      FROM user_behavior_events 
      WHERE user_id = ? AND created_at BETWEEN ? AND ?
    `;

    const sessionResult = await db.prepare(sessionQuery).get(userId, start, end);
    const activeDays = sessionResult?.active_days || 0;
    const totalSessions = sessionResult?.total_sessions || 0;

    const sessionFrequency = activeDays > 20 ? 'daily' : 
                           activeDays > 5 ? 'weekly' : 'occasional';

    // 内容消费模式
    const consumptionQuery = `
      SELECT 
        COUNT(*) as audio_plays,
        AVG(JSON_EXTRACT(event_data, '$.duration')) as avg_duration
      FROM user_behavior_events 
      WHERE user_id = ? AND event_type = 'audio_play' AND created_at BETWEEN ? AND ?
    `;

    const consumptionResult = await db.prepare(consumptionQuery).get(userId, start, end);
    const audioPlays = consumptionResult?.audio_plays || 0;
    const avgDuration = consumptionResult?.avg_duration || 0;

    const contentConsumption = audioPlays > 50 ? 'binge' :
                              audioPlays > 10 ? 'regular' : 'casual';

    // 互动水平
    const interactionQuery = `
      SELECT COUNT(*) as interactions
      FROM user_behavior_events 
      WHERE user_id = ? AND event_type IN ('like', 'share', 'comment', 'follow') 
        AND created_at BETWEEN ? AND ?
    `;

    const interactionResult = await db.prepare(interactionQuery).get(userId, start, end);
    const interactions = interactionResult?.interactions || 0;

    const interactionLevel = interactions > 20 ? 'high' :
                           interactions > 5 ? 'medium' : 'low';

    return {
      sessionFrequency,
      contentConsumption,
      interactionLevel
    };
  }

  /**
   * 获取热门内容
   */
  static async getTrendingContent(
    timeRange: { start: string; end: string },
    contentType: 'audio' | 'playlist' | 'category' = 'audio',
    limit: number = 10
  ): Promise<Array<{ contentId: string; score: number; metrics: any }>> {
    const { start, end } = timeRange;

    const query = `
      SELECT 
        JSON_EXTRACT(event_data, '$.${contentType}Id') as content_id,
        COUNT(*) as total_events,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT session_id) as unique_sessions,
        SUM(CASE WHEN event_type = 'audio_play' THEN 1 ELSE 0 END) as plays,
        SUM(CASE WHEN event_type = 'like' THEN 1 ELSE 0 END) as likes,
        SUM(CASE WHEN event_type = 'share' THEN 1 ELSE 0 END) as shares
      FROM user_behavior_events 
      WHERE JSON_EXTRACT(event_data, '$.${contentType}Id') IS NOT NULL
        AND created_at BETWEEN ? AND ?
      GROUP BY JSON_EXTRACT(event_data, '$.${contentType}Id')
      ORDER BY (plays * 2 + likes * 3 + shares * 5 + unique_users) DESC
      LIMIT ?
    `;

    const results = await db.prepare(query).all(start, end, limit);

    return results.map(row => ({
      contentId: row.content_id,
      score: (row.plays * 2) + (row.likes * 3) + (row.shares * 5) + row.unique_users,
      metrics: {
        totalEvents: row.total_events,
        uniqueUsers: row.unique_users,
        uniqueSessions: row.unique_sessions,
        plays: row.plays,
        likes: row.likes,
        shares: row.shares
      }
    }));
  }

  /**
   * 生成个性化推荐
   */
  static async generatePersonalizedRecommendations(
    userId: string,
    limit: number = 10
  ): Promise<Array<{ audioId: string; reason: string; score: number }>> {
    // 基于用户行为历史推荐
    const behaviorQuery = `
      SELECT 
        JSON_EXTRACT(event_data, '$.category') as category,
        JSON_EXTRACT(event_data, '$.speaker') as speaker,
        COUNT(*) as interaction_count
      FROM user_behavior_events 
      WHERE user_id = ? AND event_type IN ('audio_play', 'like', 'share')
        AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY category, speaker
      ORDER BY interaction_count DESC
      LIMIT 5
    `;

    const behaviorResults = await db.prepare(behaviorQuery).all(userId);

    const recommendations: Array<{ audioId: string; reason: string; score: number }> = [];

    // 基于分类偏好推荐
    for (const behavior of behaviorResults) {
      if (behavior.category) {
        const categoryAudiosQuery = `
          SELECT a.id, a.title
          FROM audios a
          LEFT JOIN categories c ON a.category_id = c.id
          WHERE c.name = ? AND a.status = 'published'
            AND a.id NOT IN (
              SELECT DISTINCT JSON_EXTRACT(event_data, '$.audioId')
              FROM user_behavior_events 
              WHERE user_id = ? AND event_type = 'audio_play'
            )
          ORDER BY a.uploadDate DESC
          LIMIT 3
        `;

        const categoryAudios = await db.prepare(categoryAudiosQuery).all(behavior.category, userId);
        
        categoryAudios.forEach(audio => {
          recommendations.push({
            audioId: audio.id,
            reason: `基于您对${behavior.category}的兴趣`,
            score: behavior.interaction_count * 10
          });
        });
      }
    }

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * 清理旧的行为数据
   */
  static async cleanupOldBehaviorData(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const deleteQuery = `
      DELETE FROM user_behavior_events 
      WHERE created_at < ?
    `;

    const result = await db.prepare(deleteQuery).run(cutoffDate.toISOString());
    return result.changes;
  }

  /**
   * 判断是否是学习相关事件
   */
  private static isLearningEvent(eventType: BehaviorEvent['eventType']): boolean {
    return ['audio_play', 'audio_pause', 'like', 'comment'].includes(eventType);
  }

  /**
   * 更新学习统计
   */
  private static async updateLearningStats(
    userId: string,
    eventType: BehaviorEvent['eventType'],
    eventData: Record<string, any>
  ): Promise<void> {
    try {
      const LearningProgressService = (await import('./learningProgressService')).default;
      
      switch (eventType) {
        case 'audio_play':
          if (eventData.audioId && eventData.currentPosition) {
            await LearningProgressService.updateProgress(userId, eventData.audioId, {
              currentPosition: eventData.currentPosition,
              audioDuration: eventData.duration,
              sessionTime: eventData.sessionTime || 0
            });
          }
          break;
        case 'comment':
          // 更新社交互动统计
          await this.updateDailyStats(userId, { socialInteractions: 1 });
          break;
      }
    } catch (error) {
      console.error('更新学习统计失败:', error);
    }
  }

  /**
   * 更新每日统计
   */
  private static async updateDailyStats(
    userId: string,
    increments: { socialInteractions?: number }
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    const updateQuery = `
      INSERT INTO user_learning_stats (
        id, user_id, date, social_interactions, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        social_interactions = social_interactions + VALUES(social_interactions),
        updated_at = VALUES(updated_at)
    `;

    await db.prepare(updateQuery).run(
      uuidv4(),
      userId,
      today,
      increments.socialInteractions || 0,
      new Date().toISOString(),
      new Date().toISOString()
    );
  }
}

export default UserBehaviorService;
