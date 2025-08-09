import { optimizedDb } from './OptimizedDatabase';

export interface UserBehavior {
  userId: string;
  sessionId: string;
  timestamp: number;
  action: 'play' | 'pause' | 'skip' | 'seek' | 'complete' | 'like' | 'share';
  audioId: string;
  position?: number; // 播放位置（秒）
  duration?: number; // 音频总时长
  context?: {
    source: 'playlist' | 'search' | 'recommendation' | 'direct';
    previousAudioId?: string;
    playlistId?: string;
    searchQuery?: string;
  };
}

export interface ListeningPattern {
  userId: string;
  preferredGenres: string[];
  preferredDuration: { min: number; max: number };
  preferredTimeSlots: Array<{ start: number; end: number }>; // 24小时制
  skipRate: number; // 跳过率
  completionRate: number; // 完成率
  averageSessionLength: number; // 平均会话时长（分钟）
  favoriteArtists: string[];
  listeningStreak: number; // 连续收听天数
  lastActive: number;
}

export interface PredictionModel {
  nextAudioProbability: Map<string, number>; // audioId -> probability
  genreTransition: Map<string, Map<string, number>>; // genre -> genre -> probability
  timeBasedPreferences: Map<number, string[]>; // hour -> preferred genres
  sessionContinuationProbability: number;
}

export class UserBehaviorAnalyzer {
  private static instance: UserBehaviorAnalyzer;
  private behaviorHistory: Map<string, UserBehavior[]> = new Map();
  private listeningPatterns: Map<string, ListeningPattern> = new Map();
  private predictionModels: Map<string, PredictionModel> = new Map();

  static getInstance(): UserBehaviorAnalyzer {
    if (!UserBehaviorAnalyzer.instance) {
      UserBehaviorAnalyzer.instance = new UserBehaviorAnalyzer();
    }
    return UserBehaviorAnalyzer.instance;
  }

  /**
   * 记录用户行为
   */
  recordBehavior(behavior: UserBehavior): void {
    const userId = behavior.userId;
    
    if (!this.behaviorHistory.has(userId)) {
      this.behaviorHistory.set(userId, []);
    }
    
    const userHistory = this.behaviorHistory.get(userId)!;
    userHistory.push(behavior);
    
    // 保持历史记录在合理大小内（最近1000条）
    if (userHistory.length > 1000) {
      userHistory.splice(0, userHistory.length - 1000);
    }
    
    // 异步更新用户模式和预测模型
    this.updateUserPatternAsync(userId);
  }

  /**
   * 异步更新用户模式
   */
  private async updateUserPatternAsync(userId: string): Promise<void> {
    try {
      await this.analyzeListeningPattern(userId);
      await this.buildPredictionModel(userId);
    } catch (error) {
      console.error('Failed to update user pattern:', error);
    }
  }

  /**
   * 分析用户收听模式
   */
  private async analyzeListeningPattern(userId: string): Promise<void> {
    const history = this.behaviorHistory.get(userId);
    if (!history || history.length < 10) {
      return; // 需要足够的数据才能分析
    }

    try {
      // 获取用户的音频信息
      const audioIds = Array.from(new Set(history.map(b => b.audioId)));
      const audios = await Promise.all(
        audioIds.map(id => optimizedDb.getAudioById(id))
      );
      const audioMap = new Map(audios.filter(Boolean).map(audio => [audio.id, audio]));

      // 分析偏好类型
      const genreCounts = new Map<string, number>();
      const durationData: number[] = [];
      const timeSlotCounts = new Map<number, number>();
      const artistCounts = new Map<string, number>();

      let totalPlays = 0;
      let completedPlays = 0;
      let skippedPlays = 0;
      let totalSessionTime = 0;
      let sessionCount = 0;

      // 按会话分组
      const sessions = this.groupBehaviorsBySessions(history);

      for (const session of sessions) {
        sessionCount++;
        let sessionDuration = 0;

        for (const behavior of session) {
          const audio = audioMap.get(behavior.audioId);
          if (!audio) continue;

          // 统计类型偏好
          if (audio.subject) {
            genreCounts.set(audio.subject, (genreCounts.get(audio.subject) || 0) + 1);
          }

          // 统计时长偏好
          if (audio.duration) {
            durationData.push(audio.duration);
          }

          // 统计时间段偏好
          const hour = new Date(behavior.timestamp).getHours();
          timeSlotCounts.set(hour, (timeSlotCounts.get(hour) || 0) + 1);

          // 统计艺术家偏好
          if (audio.speaker) {
            artistCounts.set(audio.speaker, (artistCounts.get(audio.speaker) || 0) + 1);
          }

          // 统计播放完成情况
          if (behavior.action === 'play') {
            totalPlays++;
          } else if (behavior.action === 'complete') {
            completedPlays++;
          } else if (behavior.action === 'skip') {
            skippedPlays++;
          }

          sessionDuration += behavior.duration || 0;
        }

        totalSessionTime += sessionDuration;
      }

      // 计算偏好类型（按频率排序）
      const preferredGenres = Array.from(genreCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([genre]) => genre);

      // 计算偏好时长范围
      durationData.sort((a, b) => a - b);
      const preferredDuration = {
        min: durationData[Math.floor(durationData.length * 0.25)] || 0,
        max: durationData[Math.floor(durationData.length * 0.75)] || 3600
      };

      // 计算偏好时间段
      const preferredTimeSlots = Array.from(timeSlotCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([hour, count]) => ({
          start: hour,
          end: (hour + 1) % 24
        }));

      // 计算收听指标
      const skipRate = totalPlays > 0 ? skippedPlays / totalPlays : 0;
      const completionRate = totalPlays > 0 ? completedPlays / totalPlays : 0;
      const averageSessionLength = sessionCount > 0 ? totalSessionTime / sessionCount / 60 : 0;

      // 获取最喜欢的艺术家
      const favoriteArtists = Array.from(artistCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([artist]) => artist);

      // 计算收听连续性
      const listeningStreak = this.calculateListeningStreak(history);

      const pattern: ListeningPattern = {
        userId,
        preferredGenres,
        preferredDuration,
        preferredTimeSlots,
        skipRate,
        completionRate,
        averageSessionLength,
        favoriteArtists,
        listeningStreak,
        lastActive: Math.max(...history.map(b => b.timestamp))
      };

      this.listeningPatterns.set(userId, pattern);

    } catch (error) {
      console.error('Failed to analyze listening pattern:', error);
    }
  }

  /**
   * 按会话分组行为
   */
  private groupBehaviorsBySessions(history: UserBehavior[]): UserBehavior[][] {
    const sessions: UserBehavior[][] = [];
    let currentSession: UserBehavior[] = [];
    const sessionTimeout = 30 * 60 * 1000; // 30分钟无活动则认为是新会话

    for (let i = 0; i < history.length; i++) {
      const behavior = history[i];
      
      if (currentSession.length === 0) {
        currentSession.push(behavior);
      } else {
        const lastBehavior = currentSession[currentSession.length - 1];
        const timeDiff = behavior.timestamp - lastBehavior.timestamp;
        
        if (timeDiff > sessionTimeout) {
          // 开始新会话
          sessions.push(currentSession);
          currentSession = [behavior];
        } else {
          currentSession.push(behavior);
        }
      }
    }

    if (currentSession.length > 0) {
      sessions.push(currentSession);
    }

    return sessions;
  }

  /**
   * 计算收听连续天数
   */
  private calculateListeningStreak(history: UserBehavior[]): number {
    if (history.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dailyActivity = new Map<string, boolean>();
    
    for (const behavior of history) {
      const date = new Date(behavior.timestamp);
      date.setHours(0, 0, 0, 0);
      const dateKey = date.toISOString().split('T')[0];
      dailyActivity.set(dateKey, true);
    }

    let streak = 0;
    let currentDate = new Date(today);

    while (true) {
      const dateKey = currentDate.toISOString().split('T')[0];
      if (dailyActivity.has(dateKey)) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * 构建预测模型
   */
  private async buildPredictionModel(userId: string): Promise<void> {
    const history = this.behaviorHistory.get(userId);
    if (!history || history.length < 20) {
      return;
    }

    try {
      // 构建下一首音频概率模型
      const nextAudioProbability = new Map<string, number>();
      const audioTransitions = new Map<string, Map<string, number>>();

      for (let i = 0; i < history.length - 1; i++) {
        const current = history[i];
        const next = history[i + 1];

        if (current.action === 'play' && next.action === 'play') {
          // 记录音频转换
          if (!audioTransitions.has(current.audioId)) {
            audioTransitions.set(current.audioId, new Map());
          }
          const transitions = audioTransitions.get(current.audioId)!;
          transitions.set(next.audioId, (transitions.get(next.audioId) || 0) + 1);
        }
      }

      // 计算概率
      for (const [fromAudio, transitions] of audioTransitions.entries()) {
        const totalTransitions = Array.from(transitions.values()).reduce((sum, count) => sum + count, 0);
        
        for (const [toAudio, count] of transitions.entries()) {
          const probability = count / totalTransitions;
          nextAudioProbability.set(`${fromAudio}->${toAudio}`, probability);
        }
      }

      // 构建类型转换模型
      const genreTransition = new Map<string, Map<string, number>>();
      const audios = await this.getAudiosForHistory(history);
      const audioGenreMap = new Map(audios.map(audio => [audio.id, audio.subject || 'unknown']));

      for (let i = 0; i < history.length - 1; i++) {
        const currentGenre = audioGenreMap.get(history[i].audioId) || 'unknown';
        const nextGenre = audioGenreMap.get(history[i + 1].audioId) || 'unknown';

        if (!genreTransition.has(currentGenre)) {
          genreTransition.set(currentGenre, new Map());
        }
        const transitions = genreTransition.get(currentGenre)!;
        transitions.set(nextGenre, (transitions.get(nextGenre) || 0) + 1);
      }

      // 构建时间偏好模型
      const timeBasedPreferences = new Map<number, string[]>();
      const hourGenreMap = new Map<number, Map<string, number>>();

      for (const behavior of history) {
        if (behavior.action === 'play') {
          const hour = new Date(behavior.timestamp).getHours();
          const genre = audioGenreMap.get(behavior.audioId) || 'unknown';

          if (!hourGenreMap.has(hour)) {
            hourGenreMap.set(hour, new Map());
          }
          const genreCount = hourGenreMap.get(hour)!;
          genreCount.set(genre, (genreCount.get(genre) || 0) + 1);
        }
      }

      // 为每个小时生成偏好类型列表
      for (const [hour, genreCount] of hourGenreMap.entries()) {
        const sortedGenres = Array.from(genreCount.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([genre]) => genre);
        timeBasedPreferences.set(hour, sortedGenres);
      }

      // 计算会话继续概率
      const sessions = this.groupBehaviorsBySessions(history);
      const sessionLengths = sessions.map(session => session.length);
      const averageSessionLength = sessionLengths.reduce((sum, len) => sum + len, 0) / sessionLengths.length;
      const sessionContinuationProbability = Math.min(0.9, averageSessionLength / 10);

      const model: PredictionModel = {
        nextAudioProbability,
        genreTransition,
        timeBasedPreferences,
        sessionContinuationProbability
      };

      this.predictionModels.set(userId, model);

    } catch (error) {
      console.error('Failed to build prediction model:', error);
    }
  }

  /**
   * 获取历史记录中的音频信息
   */
  private async getAudiosForHistory(history: UserBehavior[]): Promise<any[]> {
    const audioIds = Array.from(new Set(history.map(b => b.audioId)));
    const audios = await Promise.all(
      audioIds.map(id => optimizedDb.getAudioById(id))
    );
    return audios.filter(Boolean);
  }

  /**
   * 预测下一首音频
   */
  async predictNextAudios(userId: string, currentAudioId: string, count: number = 5): Promise<string[]> {
    const model = this.predictionModels.get(userId);
    const pattern = this.listeningPatterns.get(userId);
    
    if (!model || !pattern) {
      return this.getFallbackRecommendations(currentAudioId, count);
    }

    try {
      const predictions: Array<{ audioId: string; score: number }> = [];
      
      // 基于音频转换概率的预测
      for (const [transition, probability] of model.nextAudioProbability.entries()) {
        if (transition.startsWith(`${currentAudioId}->`)) {
          const nextAudioId = transition.split('->')[1];
          predictions.push({ audioId: nextAudioId, score: probability * 0.4 });
        }
      }

      // 基于时间的预测
      const currentHour = new Date().getHours();
      const timePreferences = model.timeBasedPreferences.get(currentHour) || [];
      
      if (timePreferences.length > 0) {
        const timeBasedAudios = await optimizedDb.query(
          `SELECT id FROM audios WHERE subject IN (${timePreferences.map(() => '?').join(',')}) 
           AND id != ? ORDER BY RANDOM() LIMIT ?`,
          [...timePreferences, currentAudioId, count],
          { useCache: true, cacheTTL: 300000 }
        );

        for (const audio of timeBasedAudios as any[]) {
          predictions.push({ audioId: audio.id, score: 0.3 });
        }
      }

      // 基于用户偏好的预测
      if (pattern.preferredGenres.length > 0) {
        const genreBasedAudios = await optimizedDb.query(
          `SELECT id FROM audios WHERE subject IN (${pattern.preferredGenres.map(() => '?').join(',')}) 
           AND id != ? ORDER BY RANDOM() LIMIT ?`,
          [...pattern.preferredGenres, currentAudioId, count],
          { useCache: true, cacheTTL: 300000 }
        );

        for (const audio of genreBasedAudios as any[]) {
          predictions.push({ audioId: audio.id, score: 0.2 });
        }
      }

      // 合并和排序预测结果
      const scoreMap = new Map<string, number>();
      for (const prediction of predictions) {
        const currentScore = scoreMap.get(prediction.audioId) || 0;
        scoreMap.set(prediction.audioId, currentScore + prediction.score);
      }

      const sortedPredictions = Array.from(scoreMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, count)
        .map(([audioId]) => audioId);

      return sortedPredictions;

    } catch (error) {
      console.error('Failed to predict next audios:', error);
      return this.getFallbackRecommendations(currentAudioId, count);
    }
  }

  /**
   * 获取备用推荐
   */
  private async getFallbackRecommendations(currentAudioId: string, count: number): Promise<string[]> {
    try {
      const popularAudios = await optimizedDb.getPopularAudios(count + 1);
      return popularAudios
        .filter(audio => audio.id !== currentAudioId)
        .slice(0, count)
        .map(audio => audio.id);
    } catch (error) {
      console.error('Failed to get fallback recommendations:', error);
      return [];
    }
  }

  /**
   * 获取用户收听模式
   */
  getListeningPattern(userId: string): ListeningPattern | null {
    return this.listeningPatterns.get(userId) || null;
  }

  /**
   * 获取用户行为历史
   */
  getBehaviorHistory(userId: string, limit?: number): UserBehavior[] {
    const history = this.behaviorHistory.get(userId) || [];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * 清理过期数据
   */
  cleanupExpiredData(): void {
    const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    for (const [userId, history] of this.behaviorHistory.entries()) {
      const filteredHistory = history.filter(behavior => behavior.timestamp > oneMonthAgo);
      
      if (filteredHistory.length === 0) {
        this.behaviorHistory.delete(userId);
        this.listeningPatterns.delete(userId);
        this.predictionModels.delete(userId);
      } else {
        this.behaviorHistory.set(userId, filteredHistory);
      }
    }
  }

  /**
   * 获取分析统计
   */
  getAnalyticsStats(): {
    totalUsers: number;
    totalBehaviors: number;
    averageBehaviorsPerUser: number;
    mostActiveUsers: Array<{ userId: string; behaviorCount: number }>;
  } {
    const totalUsers = this.behaviorHistory.size;
    let totalBehaviors = 0;

    const userBehaviorCounts: Array<{ userId: string; behaviorCount: number }> = [];

    for (const [userId, history] of this.behaviorHistory.entries()) {
      totalBehaviors += history.length;
      userBehaviorCounts.push({ userId, behaviorCount: history.length });
    }

    userBehaviorCounts.sort((a, b) => b.behaviorCount - a.behaviorCount);

    return {
      totalUsers,
      totalBehaviors,
      averageBehaviorsPerUser: totalUsers > 0 ? totalBehaviors / totalUsers : 0,
      mostActiveUsers: userBehaviorCounts.slice(0, 10)
    };
  }
}

// 创建全局实例
export const userBehaviorAnalyzer = UserBehaviorAnalyzer.getInstance();