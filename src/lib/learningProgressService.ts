/**
 * 个人学习进度跟踪服务
 * 提供学习进度记录、统计分析、成就系统等功能
 */

import db from './db';
import { v4 as uuidv4 } from 'uuid';

export interface LearningProgress {
  id: string;
  userId: string;
  audioId: string;
  progressPercentage: number; // 0-100
  lastPosition: number; // 最后播放位置（秒）
  totalListenTime: number; // 总听取时间（秒）
  completionStatus: 'not_started' | 'in_progress' | 'completed' | 'bookmarked';
  firstPlayedAt?: string;
  lastPlayedAt?: string;
  completedAt?: string;
  notes?: string;
  rating?: number; // 1-5星
  createdAt: string;
  updatedAt: string;
  // 音频信息（JOIN时包含）
  audio?: {
    title: string;
    duration?: number;
    speaker?: string;
    categoryName?: string;
  };
}

export interface UserLearningStats {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  totalListenTime: number;
  audiosCompleted: number;
  audiosStarted: number;
  categoriesExplored: number;
  notesCreated: number;
  socialInteractions: number;
  createdAt: string;
  updatedAt: string;
}

export interface Achievement {
  id: string;
  userId: string;
  achievementType: 'listening_time' | 'content_completion' | 'social_engagement' | 'knowledge_mastery';
  achievementName: string;
  achievementDescription: string;
  progressCurrent: number;
  progressTarget: number;
  isCompleted: boolean;
  completedAt?: string;
  badgeIcon: string;
  badgeColor: string;
  createdAt: string;
}

export interface LearningInsights {
  weeklyStats: {
    totalTime: number;
    completedAudios: number;
    averageSessionTime: number;
    streakDays: number;
  };
  categoryPreferences: Array<{
    categoryName: string;
    timeSpent: number;
    completionRate: number;
  }>;
  learningPatterns: {
    preferredTimeOfDay: string;
    averageSessionLength: number;
    completionRate: number;
  };
  achievements: Achievement[];
  recommendations: string[];
}

export class LearningProgressService {
  /**
   * 更新学习进度
   */
  static async updateProgress(
    userId: string,
    audioId: string,
    data: {
      currentPosition: number;
      audioDuration?: number;
      sessionTime?: number; // 本次会话时长
    }
  ): Promise<LearningProgress> {
    const { currentPosition, audioDuration, sessionTime = 0 } = data;

    // 获取现有进度
    const existingQuery = `
      SELECT * FROM learning_progress 
      WHERE user_id = ? AND audio_id = ?
    `;
    const existing = await db.prepare(existingQuery).get(userId, audioId);

    const now = new Date().toISOString();
    let progressPercentage = 0;

    if (audioDuration && audioDuration > 0) {
      progressPercentage = Math.min(100, (currentPosition / audioDuration) * 100);
    }

    const completionStatus = progressPercentage >= 90 ? 'completed' : 
                           progressPercentage > 0 ? 'in_progress' : 'not_started';

    if (existing) {
      // 更新现有记录
      const updateQuery = `
        UPDATE learning_progress 
        SET 
          progress_percentage = ?,
          last_position = ?,
          total_listen_time = total_listen_time + ?,
          completion_status = ?,
          last_played_at = ?,
          completed_at = CASE WHEN ? = 'completed' AND completed_at IS NULL THEN ? ELSE completed_at END,
          updated_at = ?
        WHERE user_id = ? AND audio_id = ?
      `;

      await db.prepare(updateQuery).run(
        progressPercentage,
        currentPosition,
        sessionTime,
        completionStatus,
        now,
        completionStatus,
        completionStatus === 'completed' ? now : null,
        now,
        userId,
        audioId
      );
    } else {
      // 创建新记录
      const progressId = uuidv4();
      const insertQuery = `
        INSERT INTO learning_progress (
          id, user_id, audio_id, progress_percentage, last_position,
          total_listen_time, completion_status, first_played_at, last_played_at,
          completed_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await db.prepare(insertQuery).run(
        progressId,
        userId,
        audioId,
        progressPercentage,
        currentPosition,
        sessionTime,
        completionStatus,
        now,
        now,
        completionStatus === 'completed' ? now : null,
        now,
        now
      );
    }

    // 更新每日统计
    await this.updateDailyStats(userId, {
      listenTime: sessionTime,
      audioCompleted: completionStatus === 'completed' && !existing?.completion_status === 'completed' ? 1 : 0,
      audioStarted: !existing ? 1 : 0
    });

    return this.getProgress(userId, audioId);
  }

  /**
   * 获取用户学习进度
   */
  static async getProgress(userId: string, audioId: string): Promise<LearningProgress | null> {
    const query = `
      SELECT 
        lp.*,
        a.title as audio_title,
        a.duration as audio_duration,
        a.speaker as audio_speaker,
        c.name as category_name
      FROM learning_progress lp
      LEFT JOIN audios a ON lp.audio_id = a.id
      LEFT JOIN categories c ON a.category_id = c.id
      WHERE lp.user_id = ? AND lp.audio_id = ?
    `;

    const row = await db.prepare(query).get(userId, audioId);
    return row ? this.mapRowToProgress(row) : null;
  }

  /**
   * 获取用户所有学习进度
   */
  static async getUserProgress(
    userId: string,
    options: {
      status?: LearningProgress['completionStatus'];
      limit?: number;
      offset?: number;
      sortBy?: 'last_played' | 'progress' | 'created';
    } = {}
  ): Promise<{ progress: LearningProgress[]; total: number }> {
    const { status, limit = 20, offset = 0, sortBy = 'last_played' } = options;

    let whereClause = 'WHERE lp.user_id = ?';
    const params = [userId];

    if (status) {
      whereClause += ' AND lp.completion_status = ?';
      params.push(status);
    }

    const orderBy = sortBy === 'last_played' ? 'lp.last_played_at DESC' :
                   sortBy === 'progress' ? 'lp.progress_percentage DESC' :
                   'lp.created_at DESC';

    const progressQuery = `
      SELECT 
        lp.*,
        a.title as audio_title,
        a.duration as audio_duration,
        a.speaker as audio_speaker,
        c.name as category_name
      FROM learning_progress lp
      LEFT JOIN audios a ON lp.audio_id = a.id
      LEFT JOIN categories c ON a.category_id = c.id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as total 
      FROM learning_progress lp
      ${whereClause}
    `;

    const [progressRows, countResult] = await Promise.all([
      db.prepare(progressQuery).all(...params, limit, offset),
      db.prepare(countQuery).get(...params)
    ]);

    return {
      progress: progressRows.map(this.mapRowToProgress),
      total: countResult?.total || 0
    };
  }

  /**
   * 添加学习笔记
   */
  static async addLearningNote(
    userId: string,
    audioId: string,
    notes: string
  ): Promise<void> {
    const updateQuery = `
      UPDATE learning_progress 
      SET notes = ?, updated_at = ?
      WHERE user_id = ? AND audio_id = ?
    `;

    const result = await db.prepare(updateQuery).run(
      notes,
      new Date().toISOString(),
      userId,
      audioId
    );

    if (result.changes === 0) {
      // 如果进度记录不存在，创建一个
      await this.updateProgress(userId, audioId, { currentPosition: 0 });
      await this.addLearningNote(userId, audioId, notes);
    }

    // 更新每日统计
    await this.updateDailyStats(userId, { notesCreated: 1 });
  }

  /**
   * 音频评分
   */
  static async rateAudio(
    userId: string,
    audioId: string,
    rating: number
  ): Promise<void> {
    if (rating < 1 || rating > 5) {
      throw new Error('评分必须在1-5之间');
    }

    const updateQuery = `
      UPDATE learning_progress 
      SET rating = ?, updated_at = ?
      WHERE user_id = ? AND audio_id = ?
    `;

    const result = await db.prepare(updateQuery).run(
      rating,
      new Date().toISOString(),
      userId,
      audioId
    );

    if (result.changes === 0) {
      // 如果进度记录不存在，创建一个
      await this.updateProgress(userId, audioId, { currentPosition: 0 });
      await this.rateAudio(userId, audioId, rating);
    }
  }

  /**
   * 获取学习洞察
   */
  static async getLearningInsights(userId: string): Promise<LearningInsights> {
    // 获取本周统计
    const weeklyStats = await this.getWeeklyStats(userId);
    
    // 获取分类偏好
    const categoryPreferences = await this.getCategoryPreferences(userId);
    
    // 获取学习模式
    const learningPatterns = await this.getLearningPatterns(userId);
    
    // 获取成就
    const achievements = await this.getUserAchievements(userId);
    
    // 生成推荐
    const recommendations = await this.generateLearningRecommendations(userId);

    return {
      weeklyStats,
      categoryPreferences,
      learningPatterns,
      achievements,
      recommendations
    };
  }

  /**
   * 更新每日学习统计
   */
  private static async updateDailyStats(
    userId: string,
    increments: {
      listenTime?: number;
      audioCompleted?: number;
      audioStarted?: number;
      categoriesExplored?: number;
      notesCreated?: number;
      socialInteractions?: number;
    }
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    // 检查今日记录是否存在
    const existingQuery = `
      SELECT id FROM user_learning_stats 
      WHERE user_id = ? AND date = ?
    `;
    const existing = await db.prepare(existingQuery).get(userId, today);

    if (existing) {
      // 更新现有记录
      const updateFields: string[] = [];
      const params: any[] = [];

      if (increments.listenTime) {
        updateFields.push('total_listen_time = total_listen_time + ?');
        params.push(increments.listenTime);
      }
      if (increments.audioCompleted) {
        updateFields.push('audios_completed = audios_completed + ?');
        params.push(increments.audioCompleted);
      }
      if (increments.audioStarted) {
        updateFields.push('audios_started = audios_started + ?');
        params.push(increments.audioStarted);
      }
      if (increments.categoriesExplored) {
        updateFields.push('categories_explored = categories_explored + ?');
        params.push(increments.categoriesExplored);
      }
      if (increments.notesCreated) {
        updateFields.push('notes_created = notes_created + ?');
        params.push(increments.notesCreated);
      }
      if (increments.socialInteractions) {
        updateFields.push('social_interactions = social_interactions + ?');
        params.push(increments.socialInteractions);
      }

      if (updateFields.length > 0) {
        updateFields.push('updated_at = ?');
        params.push(new Date().toISOString());
        params.push(userId);
        params.push(today);

        const updateQuery = `
          UPDATE user_learning_stats 
          SET ${updateFields.join(', ')}
          WHERE user_id = ? AND date = ?
        `;

        await db.prepare(updateQuery).run(...params);
      }
    } else {
      // 创建新记录
      const statsId = uuidv4();
      const now = new Date().toISOString();

      const insertQuery = `
        INSERT INTO user_learning_stats (
          id, user_id, date, total_listen_time, audios_completed, audios_started,
          categories_explored, notes_created, social_interactions, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await db.prepare(insertQuery).run(
        statsId,
        userId,
        today,
        increments.listenTime || 0,
        increments.audioCompleted || 0,
        increments.audioStarted || 0,
        increments.categoriesExplored || 0,
        increments.notesCreated || 0,
        increments.socialInteractions || 0,
        now,
        now
      );
    }
  }

  /**
   * 获取本周学习统计
   */
  private static async getWeeklyStats(userId: string): Promise<LearningInsights['weeklyStats']> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weekAgoStr = oneWeekAgo.toISOString().split('T')[0];

    const statsQuery = `
      SELECT 
        SUM(total_listen_time) as total_time,
        SUM(audios_completed) as completed_audios,
        AVG(total_listen_time) as avg_session_time,
        COUNT(DISTINCT date) as active_days
      FROM user_learning_stats 
      WHERE user_id = ? AND date >= ?
    `;

    const result = await db.prepare(statsQuery).get(userId, weekAgoStr);

    return {
      totalTime: result?.total_time || 0,
      completedAudios: result?.completed_audios || 0,
      averageSessionTime: result?.avg_session_time || 0,
      streakDays: result?.active_days || 0
    };
  }

  /**
   * 获取分类偏好
   */
  private static async getCategoryPreferences(userId: string): Promise<LearningInsights['categoryPreferences']> {
    const query = `
      SELECT 
        c.name as category_name,
        SUM(lp.total_listen_time) as time_spent,
        AVG(lp.progress_percentage) as completion_rate
      FROM learning_progress lp
      LEFT JOIN audios a ON lp.audio_id = a.id
      LEFT JOIN categories c ON a.category_id = c.id
      WHERE lp.user_id = ? AND c.name IS NOT NULL
      GROUP BY c.id, c.name
      ORDER BY time_spent DESC
      LIMIT 10
    `;

    const rows = await db.prepare(query).all(userId);
    return rows.map(row => ({
      categoryName: row.category_name,
      timeSpent: row.time_spent || 0,
      completionRate: row.completion_rate || 0
    }));
  }

  /**
   * 获取学习模式
   */
  private static async getLearningPatterns(userId: string): Promise<LearningInsights['learningPatterns']> {
    // 获取偏好时间段（简化实现）
    const timeQuery = `
      SELECT 
        HOUR(last_played_at) as hour,
        COUNT(*) as count
      FROM learning_progress 
      WHERE user_id = ? AND last_played_at IS NOT NULL
      GROUP BY HOUR(last_played_at)
      ORDER BY count DESC
      LIMIT 1
    `;

    const timeResult = await db.prepare(timeQuery).get(userId);
    const preferredHour = timeResult?.hour || 14; // 默认下午2点

    // 获取平均会话时长和完成率
    const patternsQuery = `
      SELECT 
        AVG(total_listen_time) as avg_session_length,
        AVG(progress_percentage) as completion_rate
      FROM learning_progress 
      WHERE user_id = ?
    `;

    const patternsResult = await db.prepare(patternsQuery).get(userId);

    return {
      preferredTimeOfDay: `${preferredHour}:00`,
      averageSessionLength: patternsResult?.avg_session_length || 0,
      completionRate: patternsResult?.completion_rate || 0
    };
  }

  /**
   * 获取用户成就
   */
  private static async getUserAchievements(userId: string): Promise<Achievement[]> {
    const query = `
      SELECT * FROM user_achievements 
      WHERE user_id = ? 
      ORDER BY is_completed ASC, created_at DESC
    `;

    const rows = await db.prepare(query).all(userId);
    return rows.map(this.mapRowToAchievement);
  }

  /**
   * 生成学习推荐
   */
  private static async generateLearningRecommendations(userId: string): Promise<string[]> {
    const recommendations: string[] = [];

    // 基于学习进度生成推荐
    const incompleteQuery = `
      SELECT COUNT(*) as count 
      FROM learning_progress 
      WHERE user_id = ? AND completion_status = 'in_progress'
    `;
    const incompleteResult = await db.prepare(incompleteQuery).get(userId);
    const incompleteCount = incompleteResult?.count || 0;

    if (incompleteCount > 5) {
      recommendations.push('您有多个未完成的音频，建议先完成已开始的内容');
    }

    // 基于分类偏好推荐
    const categoryPrefs = await this.getCategoryPreferences(userId);
    if (categoryPrefs.length > 0) {
      recommendations.push(`基于您对${categoryPrefs[0].categoryName}的兴趣，为您推荐相关内容`);
    }

    // 基于学习时间推荐
    const weeklyStats = await this.getWeeklyStats(userId);
    if (weeklyStats.totalTime < 1800) { // 少于30分钟
      recommendations.push('建议每天至少学习30分钟以获得更好的学习效果');
    }

    return recommendations;
  }

  /**
   * 检查并更新成就
   */
  static async checkAndUpdateAchievements(userId: string): Promise<Achievement[]> {
    const newAchievements: Achievement[] = [];

    // 听取时长成就
    const totalTimeQuery = `
      SELECT SUM(total_listen_time) as total_time 
      FROM learning_progress 
      WHERE user_id = ?
    `;
    const totalTimeResult = await db.prepare(totalTimeQuery).get(userId);
    const totalTime = totalTimeResult?.total_time || 0;

    const timeAchievements = [
      { target: 3600, name: '初学者', description: '累计学习1小时' },
      { target: 36000, name: '学习达人', description: '累计学习10小时' },
      { target: 180000, name: '学习专家', description: '累计学习50小时' }
    ];

    for (const achievement of timeAchievements) {
      if (totalTime >= achievement.target) {
        const newAchievement = await this.createAchievement(
          userId,
          'listening_time',
          achievement.name,
          achievement.description,
          achievement.target,
          achievement.target,
          '🎓',
          '#1890ff'
        );
        if (newAchievement) newAchievements.push(newAchievement);
      }
    }

    return newAchievements;
  }

  /**
   * 创建成就
   */
  private static async createAchievement(
    userId: string,
    type: Achievement['achievementType'],
    name: string,
    description: string,
    current: number,
    target: number,
    icon: string,
    color: string
  ): Promise<Achievement | null> {
    // 检查是否已存在
    const existingQuery = `
      SELECT id FROM user_achievements 
      WHERE user_id = ? AND achievement_name = ?
    `;
    const existing = await db.prepare(existingQuery).get(userId, name);
    
    if (existing) {
      return null; // 已存在
    }

    const achievementId = uuidv4();
    const now = new Date().toISOString();
    const isCompleted = current >= target;

    const insertQuery = `
      INSERT INTO user_achievements (
        id, user_id, achievement_type, achievement_name, achievement_description,
        progress_current, progress_target, is_completed, completed_at,
        badge_icon, badge_color, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.prepare(insertQuery).run(
      achievementId,
      userId,
      type,
      name,
      description,
      current,
      target,
      isCompleted,
      isCompleted ? now : null,
      icon,
      color,
      now
    );

    const query = 'SELECT * FROM user_achievements WHERE id = ?';
    const row = await db.prepare(query).get(achievementId);
    return this.mapRowToAchievement(row);
  }

  /**
   * 映射数据库行到进度对象
   */
  private static mapRowToProgress(row: any): LearningProgress {
    const progress: LearningProgress = {
      id: row.id,
      userId: row.user_id,
      audioId: row.audio_id,
      progressPercentage: parseFloat(row.progress_percentage) || 0,
      lastPosition: row.last_position || 0,
      totalListenTime: row.total_listen_time || 0,
      completionStatus: row.completion_status,
      firstPlayedAt: row.first_played_at,
      lastPlayedAt: row.last_played_at,
      completedAt: row.completed_at,
      notes: row.notes,
      rating: row.rating,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    if (row.audio_title) {
      progress.audio = {
        title: row.audio_title,
        duration: row.audio_duration,
        speaker: row.audio_speaker,
        categoryName: row.category_name
      };
    }

    return progress;
  }

  /**
   * 映射数据库行到成就对象
   */
  private static mapRowToAchievement(row: any): Achievement {
    return {
      id: row.id,
      userId: row.user_id,
      achievementType: row.achievement_type,
      achievementName: row.achievement_name,
      achievementDescription: row.achievement_description,
      progressCurrent: row.progress_current,
      progressTarget: row.progress_target,
      isCompleted: !!row.is_completed,
      completedAt: row.completed_at,
      badgeIcon: row.badge_icon,
      badgeColor: row.badge_color,
      createdAt: row.created_at
    };
  }
}

export default LearningProgressService;
