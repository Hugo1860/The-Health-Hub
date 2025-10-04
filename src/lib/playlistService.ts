/**
 * 高级播放列表管理服务
 * 提供播放列表创建、管理、协作、分享等功能
 */

import db from './db';
import { v4 as uuidv4 } from 'uuid';

export interface Playlist {
  id: string;
  userId: string;
  name: string;
  description?: string;
  coverImage?: string;
  isPublic: boolean;
  isCollaborative: boolean;
  totalDuration: number; // 总时长（秒）
  audioCount: number;
  playCount: number;
  likeCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistItem {
  id: string;
  playlistId: string;
  audioId: string;
  position: number;
  addedBy?: string;
  addedAt: string;
  personalNote?: string;
  // 音频信息（JOIN查询时包含）
  audio?: {
    title: string;
    duration?: number;
    speaker?: string;
    categoryName?: string;
  };
}

export interface PlaylistCollaborator {
  id: string;
  playlistId: string;
  userId: string;
  permissionLevel: 'view' | 'add' | 'edit' | 'admin';
  invitedBy: string;
  invitedAt: string;
  acceptedAt?: string;
  status: 'pending' | 'accepted' | 'declined';
  // 用户信息（JOIN查询时包含）
  user?: {
    username: string;
    email: string;
  };
}

export class PlaylistService {
  /**
   * 创建播放列表
   */
  static async createPlaylist(
    userId: string,
    data: {
      name: string;
      description?: string;
      isPublic?: boolean;
      isCollaborative?: boolean;
      tags?: string[];
    }
  ): Promise<Playlist> {
    const playlistId = uuidv4();
    const now = new Date().toISOString();

    const insertQuery = `
      INSERT INTO playlists (
        id, user_id, name, description, is_public, is_collaborative,
        tags, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.prepare(insertQuery).run(
      playlistId,
      userId,
      data.name,
      data.description || null,
      data.isPublic || false,
      data.isCollaborative || false,
      JSON.stringify(data.tags || []),
      now,
      now
    );

    return this.getPlaylistById(playlistId);
  }

  /**
   * 获取播放列表详情
   */
  static async getPlaylistById(playlistId: string, includeItems: boolean = false): Promise<Playlist & { items?: PlaylistItem[] }> {
    const query = 'SELECT * FROM playlists WHERE id = ?';
    const row = await db.prepare(query).get(playlistId);
    
    if (!row) {
      throw new Error('播放列表不存在');
    }

    const playlist = this.mapRowToPlaylist(row);

    if (includeItems) {
      const items = await this.getPlaylistItems(playlistId);
      return { ...playlist, items };
    }

    return playlist;
  }

  /**
   * 获取用户播放列表
   */
  static async getUserPlaylists(
    userId: string,
    options: {
      includePublic?: boolean;
      includeCollaborative?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ playlists: Playlist[]; total: number }> {
    const { includePublic = true, includeCollaborative = true, limit = 20, offset = 0 } = options;

    let whereConditions = ['p.user_id = ?'];
    const params = [userId];

    // 如果包含协作播放列表，添加协作者查询
    if (includeCollaborative) {
      whereConditions = [
        `(p.user_id = ? OR (p.is_collaborative = TRUE AND EXISTS (
          SELECT 1 FROM playlist_collaborators pc 
          WHERE pc.playlist_id = p.id AND pc.user_id = ? AND pc.status = 'accepted'
        )))`
      ];
      params.push(userId);
    }

    const whereClause = whereConditions.join(' AND ');

    const playlistsQuery = `
      SELECT p.* FROM playlists p
      WHERE ${whereClause}
      ORDER BY p.updated_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as total FROM playlists p
      WHERE ${whereClause}
    `;

    const [playlists, countResult] = await Promise.all([
      db.prepare(playlistsQuery).all(...params, limit, offset),
      db.prepare(countQuery).get(...params)
    ]);

    return {
      playlists: playlists.map(this.mapRowToPlaylist),
      total: countResult?.total || 0
    };
  }

  /**
   * 添加音频到播放列表
   */
  static async addAudioToPlaylist(
    playlistId: string,
    audioId: string,
    userId: string,
    personalNote?: string
  ): Promise<PlaylistItem> {
    // 检查权限
    await this.checkPlaylistPermission(playlistId, userId, 'add');

    // 检查音频是否已在播放列表中
    const existingQuery = `
      SELECT id FROM playlist_items 
      WHERE playlist_id = ? AND audio_id = ?
    `;
    const existing = await db.prepare(existingQuery).get(playlistId, audioId);
    
    if (existing) {
      throw new Error('音频已在播放列表中');
    }

    // 获取下一个位置
    const positionQuery = `
      SELECT COALESCE(MAX(position), 0) + 1 as next_position 
      FROM playlist_items 
      WHERE playlist_id = ?
    `;
    const positionResult = await db.prepare(positionQuery).get(playlistId);
    const position = positionResult?.next_position || 1;

    // 添加到播放列表
    const itemId = uuidv4();
    const now = new Date().toISOString();

    const insertQuery = `
      INSERT INTO playlist_items (
        id, playlist_id, audio_id, position, added_by, added_at, personal_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await db.prepare(insertQuery).run(
      itemId,
      playlistId,
      audioId,
      position,
      userId,
      now,
      personalNote || null
    );

    // 更新播放列表统计
    await this.updatePlaylistStats(playlistId);

    return this.getPlaylistItemById(itemId);
  }

  /**
   * 从播放列表移除音频
   */
  static async removeAudioFromPlaylist(
    playlistId: string,
    audioId: string,
    userId: string
  ): Promise<boolean> {
    // 检查权限
    await this.checkPlaylistPermission(playlistId, userId, 'edit');

    const deleteQuery = `
      DELETE FROM playlist_items 
      WHERE playlist_id = ? AND audio_id = ?
    `;

    const result = await db.prepare(deleteQuery).run(playlistId, audioId);
    
    if (result.changes > 0) {
      // 重新排序剩余项目
      await this.reorderPlaylistItems(playlistId);
      // 更新播放列表统计
      await this.updatePlaylistStats(playlistId);
      return true;
    }

    return false;
  }

  /**
   * 获取播放列表项目
   */
  static async getPlaylistItems(playlistId: string): Promise<PlaylistItem[]> {
    const query = `
      SELECT 
        pi.*,
        a.title as audio_title,
        a.duration as audio_duration,
        a.speaker as audio_speaker,
        c.name as category_name
      FROM playlist_items pi
      LEFT JOIN audios a ON pi.audio_id = a.id
      LEFT JOIN categories c ON a.category_id = c.id
      WHERE pi.playlist_id = ?
      ORDER BY pi.position ASC
    `;

    const rows = await db.prepare(query).all(playlistId);
    return rows.map(this.mapRowToPlaylistItem);
  }

  /**
   * 重新排序播放列表项目
   */
  static async reorderPlaylistItems(
    playlistId: string,
    itemIds: string[],
    userId: string
  ): Promise<void> {
    // 检查权限
    await this.checkPlaylistPermission(playlistId, userId, 'edit');

    // 批量更新位置
    for (let i = 0; i < itemIds.length; i++) {
      const updateQuery = `
        UPDATE playlist_items 
        SET position = ?
        WHERE id = ? AND playlist_id = ?
      `;
      await db.prepare(updateQuery).run(i + 1, itemIds[i], playlistId);
    }

    // 更新播放列表修改时间
    const updatePlaylistQuery = `
      UPDATE playlists 
      SET updated_at = ?
      WHERE id = ?
    `;
    await db.prepare(updatePlaylistQuery).run(new Date().toISOString(), playlistId);
  }

  /**
   * 邀请协作者
   */
  static async inviteCollaborator(
    playlistId: string,
    inviteeUserId: string,
    inviterUserId: string,
    permissionLevel: PlaylistCollaborator['permissionLevel'] = 'add'
  ): Promise<PlaylistCollaborator> {
    // 检查权限
    await this.checkPlaylistPermission(playlistId, inviterUserId, 'admin');

    const collaboratorId = uuidv4();
    const now = new Date().toISOString();

    const insertQuery = `
      INSERT INTO playlist_collaborators (
        id, playlist_id, user_id, permission_level, invited_by, invited_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `;

    await db.prepare(insertQuery).run(
      collaboratorId,
      playlistId,
      inviteeUserId,
      permissionLevel,
      inviterUserId,
      now
    );

    // 发送邀请通知
    const SubscriptionService = (await import('./subscriptionService')).default;
    const playlist = await this.getPlaylistById(playlistId);
    
    await SubscriptionService.sendNotification(
      inviteeUserId,
      'playlist_update',
      '播放列表协作邀请',
      `${inviterUserId} 邀请您协作编辑播放列表 "${playlist.name}"`,
      {
        playlistId,
        inviterUserId,
        permissionLevel
      }
    );

    return this.getCollaboratorById(collaboratorId);
  }

  /**
   * 检查播放列表权限
   */
  private static async checkPlaylistPermission(
    playlistId: string,
    userId: string,
    requiredLevel: 'view' | 'add' | 'edit' | 'admin'
  ): Promise<void> {
    // 检查是否是播放列表所有者
    const ownerQuery = 'SELECT user_id FROM playlists WHERE id = ?';
    const ownerResult = await db.prepare(ownerQuery).get(playlistId);
    
    if (!ownerResult) {
      throw new Error('播放列表不存在');
    }

    if (ownerResult.user_id === userId) {
      return; // 所有者拥有所有权限
    }

    // 检查协作者权限
    const collaboratorQuery = `
      SELECT permission_level FROM playlist_collaborators 
      WHERE playlist_id = ? AND user_id = ? AND status = 'accepted'
    `;
    const collaborator = await db.prepare(collaboratorQuery).get(playlistId, userId);

    if (!collaborator) {
      throw new Error('没有访问权限');
    }

    const permissionLevels = ['view', 'add', 'edit', 'admin'];
    const userLevel = permissionLevels.indexOf(collaborator.permission_level);
    const requiredLevelIndex = permissionLevels.indexOf(requiredLevel);

    if (userLevel < requiredLevelIndex) {
      throw new Error('权限不足');
    }
  }

  /**
   * 更新播放列表统计信息
   */
  private static async updatePlaylistStats(playlistId: string): Promise<void> {
    const statsQuery = `
      SELECT 
        COUNT(*) as audio_count,
        COALESCE(SUM(a.duration), 0) as total_duration
      FROM playlist_items pi
      LEFT JOIN audios a ON pi.audio_id = a.id
      WHERE pi.playlist_id = ?
    `;

    const stats = await db.prepare(statsQuery).get(playlistId);

    const updateQuery = `
      UPDATE playlists 
      SET audio_count = ?, total_duration = ?, updated_at = ?
      WHERE id = ?
    `;

    await db.prepare(updateQuery).run(
      stats?.audio_count || 0,
      stats?.total_duration || 0,
      new Date().toISOString(),
      playlistId
    );
  }

  /**
   * 重新排序播放列表中的项目
   */
  private static async reorderPlaylistItems(playlistId: string): Promise<void> {
    const itemsQuery = `
      SELECT id FROM playlist_items 
      WHERE playlist_id = ? 
      ORDER BY position ASC
    `;

    const items = await db.prepare(itemsQuery).all(playlistId);

    for (let i = 0; i < items.length; i++) {
      const updateQuery = `
        UPDATE playlist_items 
        SET position = ?
        WHERE id = ?
      `;
      await db.prepare(updateQuery).run(i + 1, items[i].id);
    }
  }

  /**
   * 获取播放列表项目详情
   */
  private static async getPlaylistItemById(itemId: string): Promise<PlaylistItem> {
    const query = `
      SELECT 
        pi.*,
        a.title as audio_title,
        a.duration as audio_duration,
        a.speaker as audio_speaker,
        c.name as category_name
      FROM playlist_items pi
      LEFT JOIN audios a ON pi.audio_id = a.id
      LEFT JOIN categories c ON a.category_id = c.id
      WHERE pi.id = ?
    `;

    const row = await db.prepare(query).get(itemId);
    
    if (!row) {
      throw new Error('播放列表项目不存在');
    }

    return this.mapRowToPlaylistItem(row);
  }

  /**
   * 获取协作者详情
   */
  private static async getCollaboratorById(collaboratorId: string): Promise<PlaylistCollaborator> {
    const query = `
      SELECT 
        pc.*,
        u.username,
        u.email
      FROM playlist_collaborators pc
      LEFT JOIN users u ON pc.user_id = u.id
      WHERE pc.id = ?
    `;

    const row = await db.prepare(query).get(collaboratorId);
    
    if (!row) {
      throw new Error('协作者不存在');
    }

    return this.mapRowToCollaborator(row);
  }

  /**
   * 映射数据库行到播放列表对象
   */
  private static mapRowToPlaylist(row: any): Playlist {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      coverImage: row.cover_image,
      isPublic: !!row.is_public,
      isCollaborative: !!row.is_collaborative,
      totalDuration: row.total_duration || 0,
      audioCount: row.audio_count || 0,
      playCount: row.play_count || 0,
      likeCount: row.like_count || 0,
      tags: row.tags ? JSON.parse(row.tags) : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * 映射数据库行到播放列表项目对象
   */
  private static mapRowToPlaylistItem(row: any): PlaylistItem {
    const item: PlaylistItem = {
      id: row.id,
      playlistId: row.playlist_id,
      audioId: row.audio_id,
      position: row.position,
      addedBy: row.added_by,
      addedAt: row.added_at,
      personalNote: row.personal_note
    };

    if (row.audio_title) {
      item.audio = {
        title: row.audio_title,
        duration: row.audio_duration,
        speaker: row.audio_speaker,
        categoryName: row.category_name
      };
    }

    return item;
  }

  /**
   * 映射数据库行到协作者对象
   */
  private static mapRowToCollaborator(row: any): PlaylistCollaborator {
    const collaborator: PlaylistCollaborator = {
      id: row.id,
      playlistId: row.playlist_id,
      userId: row.user_id,
      permissionLevel: row.permission_level,
      invitedBy: row.invited_by,
      invitedAt: row.invited_at,
      acceptedAt: row.accepted_at,
      status: row.status
    };

    if (row.username) {
      collaborator.user = {
        username: row.username,
        email: row.email
      };
    }

    return collaborator;
  }
}

export default PlaylistService;
