/**
 * 用户订阅和通知服务
 * 提供订阅管理、通知发送、消息推送等功能
 */

import db from './db';
import { v4 as uuidv4 } from 'uuid';

export interface UserSubscription {
  id: string;
  userId: string;
  subscriptionType: 'category' | 'speaker' | 'user' | 'playlist';
  targetId: string;
  targetName?: string;
  notificationEnabled: boolean;
  notificationFrequency: 'immediate' | 'daily' | 'weekly';
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'new_audio' | 'new_comment' | 'new_follower' | 'playlist_update' | 'system';
  title: string;
  message: string;
  data?: Record<string, any>;
  readAt?: string;
  sentAt?: string;
  deliveryMethod: 'in_app' | 'email' | 'push';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: string;
  expiresAt?: string;
}

export class SubscriptionService {
  /**
   * 创建订阅
   */
  static async createSubscription(
    userId: string,
    subscriptionType: UserSubscription['subscriptionType'],
    targetId: string,
    targetName?: string,
    options: {
      notificationEnabled?: boolean;
      notificationFrequency?: UserSubscription['notificationFrequency'];
    } = {}
  ): Promise<UserSubscription> {
    const subscriptionId = uuidv4();
    const now = new Date().toISOString();

    const insertQuery = `
      INSERT INTO user_subscriptions (
        id, user_id, subscription_type, target_id, target_name,
        notification_enabled, notification_frequency, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.prepare(insertQuery).run(
      subscriptionId,
      userId,
      subscriptionType,
      targetId,
      targetName || null,
      options.notificationEnabled ?? true,
      options.notificationFrequency || 'immediate',
      now,
      now
    );

    return this.getSubscriptionById(subscriptionId);
  }

  /**
   * 取消订阅
   */
  static async unsubscribe(userId: string, subscriptionType: string, targetId: string): Promise<boolean> {
    const deleteQuery = `
      DELETE FROM user_subscriptions 
      WHERE user_id = ? AND subscription_type = ? AND target_id = ?
    `;

    const result = await db.prepare(deleteQuery).run(userId, subscriptionType, targetId);
    return result.changes > 0;
  }

  /**
   * 获取用户订阅列表
   */
  static async getUserSubscriptions(userId: string): Promise<UserSubscription[]> {
    const query = `
      SELECT * FROM user_subscriptions 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `;

    const rows = await db.prepare(query).all(userId);
    return rows.map(this.mapRowToSubscription);
  }

  /**
   * 检查用户是否已订阅
   */
  static async isSubscribed(userId: string, subscriptionType: string, targetId: string): Promise<boolean> {
    const query = `
      SELECT id FROM user_subscriptions 
      WHERE user_id = ? AND subscription_type = ? AND target_id = ?
    `;

    const result = await db.prepare(query).get(userId, subscriptionType, targetId);
    return !!result;
  }

  /**
   * 根据ID获取订阅
   */
  static async getSubscriptionById(id: string): Promise<UserSubscription> {
    const query = 'SELECT * FROM user_subscriptions WHERE id = ?';
    const row = await db.prepare(query).get(id);
    
    if (!row) {
      throw new Error('订阅不存在');
    }

    return this.mapRowToSubscription(row);
  }

  /**
   * 更新订阅设置
   */
  static async updateSubscription(
    subscriptionId: string,
    updates: Partial<Pick<UserSubscription, 'notificationEnabled' | 'notificationFrequency'>>
  ): Promise<UserSubscription> {
    const updateFields: string[] = [];
    const params: any[] = [];

    if (updates.notificationEnabled !== undefined) {
      updateFields.push('notification_enabled = ?');
      params.push(updates.notificationEnabled);
    }

    if (updates.notificationFrequency !== undefined) {
      updateFields.push('notification_frequency = ?');
      params.push(updates.notificationFrequency);
    }

    if (updateFields.length === 0) {
      throw new Error('没有需要更新的字段');
    }

    updateFields.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(subscriptionId);

    const updateQuery = `
      UPDATE user_subscriptions 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    await db.prepare(updateQuery).run(...params);
    return this.getSubscriptionById(subscriptionId);
  }

  /**
   * 发送通知
   */
  static async sendNotification(
    userId: string,
    type: Notification['type'],
    title: string,
    message: string,
    data?: Record<string, any>,
    options: {
      deliveryMethod?: Notification['deliveryMethod'];
      priority?: Notification['priority'];
      expiresAt?: string;
    } = {}
  ): Promise<Notification> {
    const notificationId = uuidv4();
    const now = new Date().toISOString();

    const insertQuery = `
      INSERT INTO notifications (
        id, user_id, type, title, message, data,
        delivery_method, priority, created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.prepare(insertQuery).run(
      notificationId,
      userId,
      type,
      title,
      message,
      data ? JSON.stringify(data) : null,
      options.deliveryMethod || 'in_app',
      options.priority || 'normal',
      now,
      options.expiresAt || null
    );

    // 根据订阅设置决定是否发送
    await this.processNotificationDelivery(notificationId);

    return this.getNotificationById(notificationId);
  }

  /**
   * 批量发送通知（用于新内容发布等）
   */
  static async broadcastNotification(
    subscriptionType: UserSubscription['subscriptionType'],
    targetId: string,
    notification: {
      type: Notification['type'];
      title: string;
      message: string;
      data?: Record<string, any>;
    }
  ): Promise<number> {
    // 获取订阅了该内容的用户
    const subscribersQuery = `
      SELECT DISTINCT user_id, notification_frequency 
      FROM user_subscriptions 
      WHERE subscription_type = ? AND target_id = ? AND notification_enabled = TRUE
    `;

    const subscribers = await db.prepare(subscribersQuery).all(subscriptionType, targetId);
    let sentCount = 0;

    for (const subscriber of subscribers) {
      try {
        await this.sendNotification(
          subscriber.user_id,
          notification.type,
          notification.title,
          notification.message,
          notification.data,
          {
            deliveryMethod: 'in_app',
            priority: 'normal'
          }
        );
        sentCount++;
      } catch (error) {
        console.error(`发送通知给用户 ${subscriber.user_id} 失败:`, error);
      }
    }

    return sentCount;
  }

  /**
   * 获取用户通知列表
   */
  static async getUserNotifications(
    userId: string,
    options: {
      unreadOnly?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ notifications: Notification[]; total: number; unreadCount: number }> {
    const { unreadOnly = false, limit = 20, offset = 0 } = options;

    let whereClause = 'WHERE user_id = ?';
    const params = [userId];

    if (unreadOnly) {
      whereClause += ' AND read_at IS NULL';
    }

    // 获取通知列表
    const notificationsQuery = `
      SELECT * FROM notifications 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const notifications = await db.prepare(notificationsQuery).all(...params, limit, offset);

    // 获取总数
    const countQuery = `SELECT COUNT(*) as total FROM notifications ${whereClause}`;
    const totalResult = await db.prepare(countQuery).get(...params);

    // 获取未读数
    const unreadQuery = `
      SELECT COUNT(*) as unread 
      FROM notifications 
      WHERE user_id = ? AND read_at IS NULL
    `;
    const unreadResult = await db.prepare(unreadQuery).get(userId);

    return {
      notifications: notifications.map(this.mapRowToNotification),
      total: totalResult?.total || 0,
      unreadCount: unreadResult?.unread || 0
    };
  }

  /**
   * 标记通知为已读
   */
  static async markNotificationAsRead(notificationId: string): Promise<void> {
    const updateQuery = `
      UPDATE notifications 
      SET read_at = ?, sent_at = COALESCE(sent_at, ?)
      WHERE id = ?
    `;

    const now = new Date().toISOString();
    await db.prepare(updateQuery).run(now, now, notificationId);
  }

  /**
   * 批量标记通知为已读
   */
  static async markAllNotificationsAsRead(userId: string): Promise<number> {
    const updateQuery = `
      UPDATE notifications 
      SET read_at = ?, sent_at = COALESCE(sent_at, ?)
      WHERE user_id = ? AND read_at IS NULL
    `;

    const now = new Date().toISOString();
    const result = await db.prepare(updateQuery).run(now, now, userId);
    return result.changes;
  }

  /**
   * 删除过期通知
   */
  static async cleanupExpiredNotifications(): Promise<number> {
    const deleteQuery = `
      DELETE FROM notifications 
      WHERE expires_at IS NOT NULL AND expires_at < ?
    `;

    const result = await db.prepare(deleteQuery).run(new Date().toISOString());
    return result.changes;
  }

  /**
   * 处理通知投递
   */
  private static async processNotificationDelivery(notificationId: string): Promise<void> {
    // 这里可以集成邮件服务、推送服务等
    // 目前只标记为已发送
    const updateQuery = `
      UPDATE notifications 
      SET sent_at = ?
      WHERE id = ?
    `;

    await db.prepare(updateQuery).run(new Date().toISOString(), notificationId);
  }

  /**
   * 获取通知详情
   */
  private static async getNotificationById(id: string): Promise<Notification> {
    const query = 'SELECT * FROM notifications WHERE id = ?';
    const row = await db.prepare(query).get(id);
    
    if (!row) {
      throw new Error('通知不存在');
    }

    return this.mapRowToNotification(row);
  }

  /**
   * 映射数据库行到订阅对象
   */
  private static mapRowToSubscription(row: any): UserSubscription {
    return {
      id: row.id,
      userId: row.user_id,
      subscriptionType: row.subscription_type,
      targetId: row.target_id,
      targetName: row.target_name,
      notificationEnabled: !!row.notification_enabled,
      notificationFrequency: row.notification_frequency,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * 映射数据库行到通知对象
   */
  private static mapRowToNotification(row: any): Notification {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message,
      data: row.data ? JSON.parse(row.data) : undefined,
      readAt: row.read_at,
      sentAt: row.sent_at,
      deliveryMethod: row.delivery_method,
      priority: row.priority,
      createdAt: row.created_at,
      expiresAt: row.expires_at
    };
  }
}

export default SubscriptionService;
