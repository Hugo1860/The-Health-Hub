/**
 * 社交功能服务
 * 提供用户关注、分享、社交互动等功能
 */

import db from './db';
import { v4 as uuidv4 } from 'uuid';

export interface UserFollow {
  id: string;
  followerId: string;
  followingId: string;
  followType: 'user' | 'speaker' | 'category';
  createdAt: string;
  // 关联信息（JOIN时包含）
  following?: {
    username?: string;
    email?: string;
    name?: string; // 对于speaker或category
  };
}

export interface UserActivity {
  id: string;
  userId: string;
  activityType: 'played_audio' | 'created_playlist' | 'liked_audio' | 'commented' | 'followed_user' | 'shared_content';
  targetType: 'audio' | 'playlist' | 'user' | 'comment';
  targetId: string;
  activityData: Record<string, any>;
  isPublic: boolean;
  createdAt: string;
  // 关联信息（JOIN时包含）
  user?: {
    username: string;
    email: string;
  };
  target?: {
    title?: string;
    name?: string;
  };
}

export interface ContentShare {
  id: string;
  userId: string;
  contentType: 'audio' | 'playlist' | 'category';
  contentId: string;
  shareMethod: 'link' | 'social' | 'email' | 'qr_code';
  sharePlatform?: string;
  shareData: Record<string, any>;
  clicks: number;
  createdAt: string;
}

export interface SocialStats {
  followers: number;
  following: number;
  totalLikes: number;
  totalShares: number;
  totalComments: number;
  publicPlaylists: number;
  recentActivities: UserActivity[];
}

export class SocialService {
  /**
   * 关注用户/讲者/分类
   */
  static async follow(
    followerId: string,
    followingId: string,
    followType: UserFollow['followType'] = 'user'
  ): Promise<UserFollow> {
    // 检查是否已关注
    const existingQuery = `
      SELECT id FROM user_follows 
      WHERE follower_id = ? AND following_id = ? AND follow_type = ?
    `;
    const existing = await db.prepare(existingQuery).get(followerId, followingId, followType);
    
    if (existing) {
      throw new Error('已经关注了');
    }

    // 防止自己关注自己
    if (followType === 'user' && followerId === followingId) {
      throw new Error('不能关注自己');
    }

    const followId = uuidv4();
    const now = new Date().toISOString();

    const insertQuery = `
      INSERT INTO user_follows (
        id, follower_id, following_id, follow_type, created_at
      ) VALUES (?, ?, ?, ?, ?)
    `;

    await db.prepare(insertQuery).run(
      followId,
      followerId,
      followingId,
      followType,
      now
    );

    // 记录活动
    await this.recordActivity(
      followerId,
      'followed_user',
      followType,
      followingId,
      { followType },
      true
    );

    // 发送通知（如果是关注用户）
    if (followType === 'user') {
      const SubscriptionService = (await import('./subscriptionService')).default;
      const followerInfo = await this.getUserInfo(followerId);
      
      await SubscriptionService.sendNotification(
        followingId,
        'new_follower',
        '新的关注者',
        `${followerInfo.username || followerInfo.email} 关注了您`,
        { followerId, followerInfo }
      );
    }

    return this.getFollowById(followId);
  }

  /**
   * 取消关注
   */
  static async unfollow(
    followerId: string,
    followingId: string,
    followType: UserFollow['followType'] = 'user'
  ): Promise<boolean> {
    const deleteQuery = `
      DELETE FROM user_follows 
      WHERE follower_id = ? AND following_id = ? AND follow_type = ?
    `;

    const result = await db.prepare(deleteQuery).run(followerId, followingId, followType);
    return result.changes > 0;
  }

  /**
   * 检查是否已关注
   */
  static async isFollowing(
    followerId: string,
    followingId: string,
    followType: UserFollow['followType'] = 'user'
  ): Promise<boolean> {
    const query = `
      SELECT id FROM user_follows 
      WHERE follower_id = ? AND following_id = ? AND follow_type = ?
    `;

    const result = await db.prepare(query).get(followerId, followingId, followType);
    return !!result;
  }

  /**
   * 获取关注列表
   */
  static async getFollowing(
    userId: string,
    followType?: UserFollow['followType'],
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ following: UserFollow[]; total: number }> {
    const { limit = 20, offset = 0 } = options;

    let whereClause = 'WHERE uf.follower_id = ?';
    const params = [userId];

    if (followType) {
      whereClause += ' AND uf.follow_type = ?';
      params.push(followType);
    }

    const followingQuery = `
      SELECT 
        uf.*,
        CASE 
          WHEN uf.follow_type = 'user' THEN u.username
          WHEN uf.follow_type = 'speaker' THEN uf.following_id
          WHEN uf.follow_type = 'category' THEN c.name
        END as following_name,
        CASE 
          WHEN uf.follow_type = 'user' THEN u.email
          ELSE NULL
        END as following_email
      FROM user_follows uf
      LEFT JOIN users u ON uf.follow_type = 'user' AND uf.following_id = u.id
      LEFT JOIN categories c ON uf.follow_type = 'category' AND uf.following_id = c.id
      ${whereClause}
      ORDER BY uf.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as total 
      FROM user_follows uf
      ${whereClause}
    `;

    const [followingRows, countResult] = await Promise.all([
      db.prepare(followingQuery).all(...params, limit, offset),
      db.prepare(countQuery).get(...params)
    ]);

    return {
      following: followingRows.map(this.mapRowToFollow),
      total: countResult?.total || 0
    };
  }

  /**
   * 获取粉丝列表
   */
  static async getFollowers(
    userId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ followers: UserFollow[]; total: number }> {
    const { limit = 20, offset = 0 } = options;

    const followersQuery = `
      SELECT 
        uf.*,
        u.username as follower_username,
        u.email as follower_email
      FROM user_follows uf
      LEFT JOIN users u ON uf.follower_id = u.id
      WHERE uf.following_id = ? AND uf.follow_type = 'user'
      ORDER BY uf.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as total 
      FROM user_follows 
      WHERE following_id = ? AND follow_type = 'user'
    `;

    const [followersRows, countResult] = await Promise.all([
      db.prepare(followersQuery).all(userId, limit, offset),
      db.prepare(countQuery).get(userId)
    ]);

    return {
      followers: followersRows.map(row => ({
        ...this.mapRowToFollow(row),
        following: {
          username: row.follower_username,
          email: row.follower_email
        }
      })),
      total: countResult?.total || 0
    };
  }

  /**
   * 点赞音频
   */
  static async likeAudio(userId: string, audioId: string): Promise<boolean> {
    // 检查是否已点赞
    const existingQuery = `
      SELECT id FROM audio_likes 
      WHERE user_id = ? AND audio_id = ?
    `;
    const existing = await db.prepare(existingQuery).get(userId, audioId);
    
    if (existing) {
      // 取消点赞
      const deleteQuery = `DELETE FROM audio_likes WHERE user_id = ? AND audio_id = ?`;
      await db.prepare(deleteQuery).run(userId, audioId);
      
      // 记录活动
      await this.recordActivity(userId, 'liked_audio', 'audio', audioId, { action: 'unlike' }, true);
      
      return false;
    } else {
      // 添加点赞
      const likeId = uuidv4();
      const insertQuery = `
        INSERT INTO audio_likes (id, user_id, audio_id, created_at)
        VALUES (?, ?, ?, ?)
      `;
      await db.prepare(insertQuery).run(likeId, userId, audioId, new Date().toISOString());
      
      // 记录活动
      await this.recordActivity(userId, 'liked_audio', 'audio', audioId, { action: 'like' }, true);
      
      // 行为追踪
      const UserBehaviorService = (await import('./userBehaviorService')).default;
      await UserBehaviorService.trackEvent('like', { audioId }, {
        userId,
        sessionId: `session_${Date.now()}`,
        deviceType: 'desktop'
      });
      
      return true;
    }
  }

  /**
   * 分享内容
   */
  static async shareContent(
    userId: string,
    contentType: ContentShare['contentType'],
    contentId: string,
    shareMethod: ContentShare['shareMethod'],
    sharePlatform?: string,
    shareData: Record<string, any> = {}
  ): Promise<ContentShare> {
    const shareId = uuidv4();
    const now = new Date().toISOString();

    const insertQuery = `
      INSERT INTO content_shares (
        id, user_id, content_type, content_id, share_method,
        share_platform, share_data, clicks, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
    `;

    await db.prepare(insertQuery).run(
      shareId,
      userId,
      contentType,
      contentId,
      shareMethod,
      sharePlatform || null,
      JSON.stringify(shareData),
      now
    );

    // 记录活动
    await this.recordActivity(
      userId,
      'shared_content',
      contentType,
      contentId,
      { shareMethod, sharePlatform },
      true
    );

    // 行为追踪
    const UserBehaviorService = (await import('./userBehaviorService')).default;
    await UserBehaviorService.trackEvent('share', { 
      contentType, 
      contentId, 
      shareMethod, 
      sharePlatform 
    }, {
      userId,
      sessionId: `session_${Date.now()}`,
      deviceType: 'desktop'
    });

    return this.getShareById(shareId);
  }

  /**
   * 记录用户活动
   */
  static async recordActivity(
    userId: string,
    activityType: UserActivity['activityType'],
    targetType: UserActivity['targetType'],
    targetId: string,
    activityData: Record<string, any> = {},
    isPublic: boolean = true
  ): Promise<UserActivity> {
    const activityId = uuidv4();
    const now = new Date().toISOString();

    const insertQuery = `
      INSERT INTO user_activities (
        id, user_id, activity_type, target_type, target_id,
        activity_data, is_public, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.prepare(insertQuery).run(
      activityId,
      userId,
      activityType,
      targetType,
      targetId,
      JSON.stringify(activityData),
      isPublic,
      now
    );

    return this.getActivityById(activityId);
  }

  /**
   * 获取用户社交统计
   */
  static async getUserSocialStats(userId: string): Promise<SocialStats> {
    // 关注者数量
    const followersQuery = `
      SELECT COUNT(*) as count 
      FROM user_follows 
      WHERE following_id = ? AND follow_type = 'user'
    `;
    const followersResult = await db.prepare(followersQuery).get(userId);

    // 关注数量
    const followingQuery = `
      SELECT COUNT(*) as count 
      FROM user_follows 
      WHERE follower_id = ?
    `;
    const followingResult = await db.prepare(followingQuery).get(userId);

    // 点赞数量
    const likesQuery = `
      SELECT COUNT(*) as count 
      FROM audio_likes 
      WHERE user_id = ?
    `;
    const likesResult = await db.prepare(likesQuery).get(userId);

    // 分享数量
    const sharesQuery = `
      SELECT COUNT(*) as count 
      FROM content_shares 
      WHERE user_id = ?
    `;
    const sharesResult = await db.prepare(sharesQuery).get(userId);

    // 评论数量
    const commentsQuery = `
      SELECT COUNT(*) as count 
      FROM comments 
      WHERE user_id = ?
    `;
    const commentsResult = await db.prepare(commentsQuery).get(userId);

    // 公开播放列表数量
    const playlistsQuery = `
      SELECT COUNT(*) as count 
      FROM playlists 
      WHERE user_id = ? AND is_public = TRUE
    `;
    const playlistsResult = await db.prepare(playlistsQuery).get(userId);

    // 最近活动
    const activitiesQuery = `
      SELECT 
        ua.*,
        u.username,
        u.email,
        CASE 
          WHEN ua.target_type = 'audio' THEN a.title
          WHEN ua.target_type = 'playlist' THEN p.name
          WHEN ua.target_type = 'user' THEN u2.username
        END as target_title
      FROM user_activities ua
      LEFT JOIN users u ON ua.user_id = u.id
      LEFT JOIN audios a ON ua.target_type = 'audio' AND ua.target_id = a.id
      LEFT JOIN playlists p ON ua.target_type = 'playlist' AND ua.target_id = p.id
      LEFT JOIN users u2 ON ua.target_type = 'user' AND ua.target_id = u2.id
      WHERE ua.user_id = ? AND ua.is_public = TRUE
      ORDER BY ua.created_at DESC
      LIMIT 10
    `;

    const activities = await db.prepare(activitiesQuery).all(userId);

    return {
      followers: followersResult?.count || 0,
      following: followingResult?.count || 0,
      totalLikes: likesResult?.count || 0,
      totalShares: sharesResult?.count || 0,
      totalComments: commentsResult?.count || 0,
      publicPlaylists: playlistsResult?.count || 0,
      recentActivities: activities.map(this.mapRowToActivity)
    };
  }

  /**
   * 获取动态时间线
   */
  static async getActivityFeed(
    userId: string,
    options: {
      includeFollowing?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ activities: UserActivity[]; total: number }> {
    const { includeFollowing = true, limit = 20, offset = 0 } = options;

    let whereClause = 'WHERE ua.is_public = TRUE';
    const params: any[] = [];

    if (includeFollowing) {
      // 包含关注的用户的活动
      whereClause += ` AND (ua.user_id = ? OR ua.user_id IN (
        SELECT following_id FROM user_follows 
        WHERE follower_id = ? AND follow_type = 'user'
      ))`;
      params.push(userId, userId);
    } else {
      // 只显示自己的活动
      whereClause += ' AND ua.user_id = ?';
      params.push(userId);
    }

    const activitiesQuery = `
      SELECT 
        ua.*,
        u.username,
        u.email,
        CASE 
          WHEN ua.target_type = 'audio' THEN a.title
          WHEN ua.target_type = 'playlist' THEN p.name
          WHEN ua.target_type = 'user' THEN u2.username
          WHEN ua.target_type = 'comment' THEN SUBSTRING(c.content, 1, 50)
        END as target_title
      FROM user_activities ua
      LEFT JOIN users u ON ua.user_id = u.id
      LEFT JOIN audios a ON ua.target_type = 'audio' AND ua.target_id = a.id
      LEFT JOIN playlists p ON ua.target_type = 'playlist' AND ua.target_id = p.id
      LEFT JOIN users u2 ON ua.target_type = 'user' AND ua.target_id = u2.id
      LEFT JOIN comments c ON ua.target_type = 'comment' AND ua.target_id = c.id
      ${whereClause}
      ORDER BY ua.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as total 
      FROM user_activities ua
      ${whereClause}
    `;

    const [activities, countResult] = await Promise.all([
      db.prepare(activitiesQuery).all(...params, limit, offset),
      db.prepare(countQuery).get(...params)
    ]);

    return {
      activities: activities.map(this.mapRowToActivity),
      total: countResult?.total || 0
    };
  }

  /**
   * 生成分享链接
   */
  static async generateShareLink(
    contentType: ContentShare['contentType'],
    contentId: string,
    userId?: string
  ): Promise<{ shareUrl: string; qrCode?: string }> {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    let shareUrl = '';

    switch (contentType) {
      case 'audio':
        shareUrl = `${baseUrl}/audio/${contentId}`;
        break;
      case 'playlist':
        shareUrl = `${baseUrl}/playlists/${contentId}`;
        break;
      case 'category':
        shareUrl = `${baseUrl}/browse?category=${contentId}`;
        break;
    }

    // 添加分享追踪参数
    if (userId) {
      shareUrl += `?shared_by=${userId}&t=${Date.now()}`;
    }

    // 这里可以集成二维码生成服务
    // const qrCode = await generateQRCode(shareUrl);

    return {
      shareUrl,
      // qrCode
    };
  }

  /**
   * 获取热门分享内容
   */
  static async getTrendingShares(
    contentType?: ContentShare['contentType'],
    timeRange: { start: string; end: string } = {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString()
    },
    limit: number = 10
  ): Promise<Array<{
    contentId: string;
    contentType: string;
    shareCount: number;
    totalClicks: number;
    title?: string;
  }>> {
    let whereClause = 'WHERE cs.created_at BETWEEN ? AND ?';
    const params = [timeRange.start, timeRange.end];

    if (contentType) {
      whereClause += ' AND cs.content_type = ?';
      params.push(contentType);
    }

    const query = `
      SELECT 
        cs.content_id,
        cs.content_type,
        COUNT(*) as share_count,
        SUM(cs.clicks) as total_clicks,
        CASE 
          WHEN cs.content_type = 'audio' THEN a.title
          WHEN cs.content_type = 'playlist' THEN p.name
          WHEN cs.content_type = 'category' THEN c.name
        END as title
      FROM content_shares cs
      LEFT JOIN audios a ON cs.content_type = 'audio' AND cs.content_id = a.id
      LEFT JOIN playlists p ON cs.content_type = 'playlist' AND cs.content_id = p.id
      LEFT JOIN categories c ON cs.content_type = 'category' AND cs.content_id = c.id
      ${whereClause}
      GROUP BY cs.content_id, cs.content_type
      ORDER BY share_count DESC, total_clicks DESC
      LIMIT ?
    `;

    const results = await db.prepare(query).all(...params, limit);

    return results.map(row => ({
      contentId: row.content_id,
      contentType: row.content_type,
      shareCount: row.share_count,
      totalClicks: row.total_clicks || 0,
      title: row.title
    }));
  }

  /**
   * 获取推荐关注用户
   */
  static async getRecommendedUsers(
    userId: string,
    limit: number = 10
  ): Promise<Array<{
    userId: string;
    username: string;
    email: string;
    reason: string;
    mutualFollows: number;
  }>> {
    // 基于共同关注推荐
    const mutualFollowsQuery = `
      SELECT 
        u.id as user_id,
        u.username,
        u.email,
        COUNT(*) as mutual_follows
      FROM users u
      JOIN user_follows uf1 ON u.id = uf1.following_id
      JOIN user_follows uf2 ON uf1.follower_id = uf2.following_id
      WHERE uf2.follower_id = ? 
        AND uf1.follow_type = 'user' 
        AND uf2.follow_type = 'user'
        AND u.id != ?
        AND u.id NOT IN (
          SELECT following_id FROM user_follows 
          WHERE follower_id = ? AND follow_type = 'user'
        )
      GROUP BY u.id, u.username, u.email
      ORDER BY mutual_follows DESC
      LIMIT ?
    `;

    const results = await db.prepare(mutualFollowsQuery).all(userId, userId, userId, limit);

    return results.map(row => ({
      userId: row.user_id,
      username: row.username,
      email: row.email,
      reason: `${row.mutual_follows}个共同关注`,
      mutualFollows: row.mutual_follows
    }));
  }

  /**
   * 获取关注详情
   */
  private static async getFollowById(followId: string): Promise<UserFollow> {
    const query = `
      SELECT 
        uf.*,
        CASE 
          WHEN uf.follow_type = 'user' THEN u.username
          ELSE uf.following_id
        END as following_name,
        CASE 
          WHEN uf.follow_type = 'user' THEN u.email
          ELSE NULL
        END as following_email
      FROM user_follows uf
      LEFT JOIN users u ON uf.follow_type = 'user' AND uf.following_id = u.id
      WHERE uf.id = ?
    `;

    const row = await db.prepare(query).get(followId);
    
    if (!row) {
      throw new Error('关注记录不存在');
    }

    return this.mapRowToFollow(row);
  }

  /**
   * 获取分享详情
   */
  private static async getShareById(shareId: string): Promise<ContentShare> {
    const query = 'SELECT * FROM content_shares WHERE id = ?';
    const row = await db.prepare(query).get(shareId);
    
    if (!row) {
      throw new Error('分享记录不存在');
    }

    return {
      id: row.id,
      userId: row.user_id,
      contentType: row.content_type,
      contentId: row.content_id,
      shareMethod: row.share_method,
      sharePlatform: row.share_platform,
      shareData: row.share_data ? JSON.parse(row.share_data) : {},
      clicks: row.clicks,
      createdAt: row.created_at
    };
  }

  /**
   * 获取活动详情
   */
  private static async getActivityById(activityId: string): Promise<UserActivity> {
    const query = `
      SELECT 
        ua.*,
        u.username,
        u.email
      FROM user_activities ua
      LEFT JOIN users u ON ua.user_id = u.id
      WHERE ua.id = ?
    `;

    const row = await db.prepare(query).get(activityId);
    
    if (!row) {
      throw new Error('活动记录不存在');
    }

    return this.mapRowToActivity(row);
  }

  /**
   * 获取用户信息
   */
  private static async getUserInfo(userId: string): Promise<{ username: string; email: string }> {
    const query = 'SELECT username, email FROM users WHERE id = ?';
    const result = await db.prepare(query).get(userId);
    
    if (!result) {
      throw new Error('用户不存在');
    }

    return {
      username: result.username,
      email: result.email
    };
  }

  /**
   * 映射数据库行到关注对象
   */
  private static mapRowToFollow(row: any): UserFollow {
    const follow: UserFollow = {
      id: row.id,
      followerId: row.follower_id,
      followingId: row.following_id,
      followType: row.follow_type,
      createdAt: row.created_at
    };

    if (row.following_name) {
      follow.following = {
        username: row.following_name,
        email: row.following_email,
        name: row.following_name
      };
    }

    return follow;
  }

  /**
   * 映射数据库行到活动对象
   */
  private static mapRowToActivity(row: any): UserActivity {
    const activity: UserActivity = {
      id: row.id,
      userId: row.user_id,
      activityType: row.activity_type,
      targetType: row.target_type,
      targetId: row.target_id,
      activityData: row.activity_data ? JSON.parse(row.activity_data) : {},
      isPublic: !!row.is_public,
      createdAt: row.created_at
    };

    if (row.username) {
      activity.user = {
        username: row.username,
        email: row.email
      };
    }

    if (row.target_title) {
      activity.target = {
        title: row.target_title,
        name: row.target_title
      };
    }

    return activity;
  }
}

export default SocialService;
