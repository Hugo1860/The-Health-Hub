import fs from 'fs';
import path from 'path';

export interface Subscription {
  id: string;
  userId: string;
  type: 'all' | 'subject' | 'tag' | 'speaker';
  value?: string; // 如果type不是'all'，则指定具体值
  notificationMethod: 'email' | 'inApp' | 'both';
  createdAt: string;
  isActive: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'new_audio' | 'new_comment' | 'new_question' | 'new_answer';
  title: string;
  message: string;
  relatedId?: string; // 相关的音频ID、评论ID等
  relatedType?: 'audio' | 'comment' | 'question' | 'answer';
  isRead: boolean;
  createdAt: string;
}

const subscriptionsFilePath = path.join(process.cwd(), 'data', 'subscriptions.json');
const notificationsFilePath = path.join(process.cwd(), 'data', 'notifications.json');

// 确保数据文件存在
function ensureDataFiles() {
  if (!fs.existsSync(subscriptionsFilePath)) {
    fs.writeFileSync(subscriptionsFilePath, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(notificationsFilePath)) {
    fs.writeFileSync(notificationsFilePath, JSON.stringify([], null, 2));
  }
}

// 读取订阅数据
export function readSubscriptions(): Subscription[] {
  try {
    ensureDataFiles();
    const data = fs.readFileSync(subscriptionsFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading subscriptions:', error);
    return [];
  }
}

// 写入订阅数据
export function writeSubscriptions(subscriptions: Subscription[]): void {
  try {
    fs.writeFileSync(subscriptionsFilePath, JSON.stringify(subscriptions, null, 2));
  } catch (error) {
    console.error('Error writing subscriptions:', error);
    throw error;
  }
}

// 读取通知数据
export function readNotifications(): Notification[] {
  try {
    ensureDataFiles();
    const data = fs.readFileSync(notificationsFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading notifications:', error);
    return [];
  }
}

// 写入通知数据
export function writeNotifications(notifications: Notification[]): void {
  try {
    fs.writeFileSync(notificationsFilePath, JSON.stringify(notifications, null, 2));
  } catch (error) {
    console.error('Error writing notifications:', error);
    throw error;
  }
}

// 获取用户的订阅
export function getUserSubscriptions(userId: string): Subscription[] {
  const subscriptions = readSubscriptions();
  return subscriptions.filter(sub => sub.userId === userId && sub.isActive);
}

// 创建新订阅
export function createSubscription(subscriptionData: Omit<Subscription, 'id' | 'createdAt'>): Subscription {
  const subscriptions = readSubscriptions();
  
  // 检查是否已存在相同的订阅
  const existingSubscription = subscriptions.find(sub => 
    sub.userId === subscriptionData.userId &&
    sub.type === subscriptionData.type &&
    sub.value === subscriptionData.value &&
    sub.isActive
  );
  
  if (existingSubscription) {
    throw new Error('订阅已存在');
  }
  
  const newSubscription: Subscription = {
    ...subscriptionData,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    isActive: true
  };
  
  subscriptions.push(newSubscription);
  writeSubscriptions(subscriptions);
  
  return newSubscription;
}

// 取消订阅
export function cancelSubscription(subscriptionId: string, userId: string): boolean {
  const subscriptions = readSubscriptions();
  const subscriptionIndex = subscriptions.findIndex(sub => 
    sub.id === subscriptionId && sub.userId === userId
  );
  
  if (subscriptionIndex === -1) {
    return false;
  }
  
  subscriptions[subscriptionIndex].isActive = false;
  writeSubscriptions(subscriptions);
  
  return true;
}

// 获取用户的通知
export function getUserNotifications(userId: string, limit?: number): Notification[] {
  const notifications = readNotifications();
  const userNotifications = notifications
    .filter(notif => notif.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  return limit ? userNotifications.slice(0, limit) : userNotifications;
}

// 创建新通知
export function createNotification(notificationData: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Notification {
  const notifications = readNotifications();
  
  const newNotification: Notification = {
    ...notificationData,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    isRead: false
  };
  
  notifications.push(newNotification);
  writeNotifications(notifications);
  
  return newNotification;
}

// 标记通知为已读
export function markNotificationAsRead(notificationId: string, userId: string): boolean {
  const notifications = readNotifications();
  const notificationIndex = notifications.findIndex(notif => 
    notif.id === notificationId && notif.userId === userId
  );
  
  if (notificationIndex === -1) {
    return false;
  }
  
  notifications[notificationIndex].isRead = true;
  writeNotifications(notifications);
  
  return true;
}

// 标记所有通知为已读
export function markAllNotificationsAsRead(userId: string): number {
  const notifications = readNotifications();
  let updatedCount = 0;
  
  notifications.forEach(notif => {
    if (notif.userId === userId && !notif.isRead) {
      notif.isRead = true;
      updatedCount++;
    }
  });
  
  if (updatedCount > 0) {
    writeNotifications(notifications);
  }
  
  return updatedCount;
}

// 获取未读通知数量
export function getUnreadNotificationCount(userId: string): number {
  const notifications = readNotifications();
  return notifications.filter(notif => notif.userId === userId && !notif.isRead).length;
}

// 删除通知
export function deleteNotification(notificationId: string, userId: string): boolean {
  const notifications = readNotifications();
  const notificationIndex = notifications.findIndex(notif => 
    notif.id === notificationId && notif.userId === userId
  );
  
  if (notificationIndex === -1) {
    return false;
  }
  
  notifications.splice(notificationIndex, 1);
  writeNotifications(notifications);
  
  return true;
}

// 根据新内容触发通知
export function triggerNotifications(contentType: 'audio' | 'comment' | 'question' | 'answer', contentData: any): void {
  const subscriptions = readSubscriptions().filter(sub => sub.isActive);
  
  subscriptions.forEach(subscription => {
    let shouldNotify = false;
    let notificationTitle = '';
    let notificationMessage = '';
    
    switch (contentType) {
      case 'audio':
        if (subscription.type === 'all') {
          shouldNotify = true;
        } else if (subscription.type === 'subject' && contentData.subject === subscription.value) {
          shouldNotify = true;
        } else if (subscription.type === 'tag' && contentData.tags?.includes(subscription.value)) {
          shouldNotify = true;
        } else if (subscription.type === 'speaker' && contentData.speaker === subscription.value) {
          shouldNotify = true;
        }
        
        if (shouldNotify) {
          notificationTitle = '新音频发布';
          notificationMessage = `新音频《${contentData.title}》已发布`;
        }
        break;
        
      case 'comment':
        // 可以根据需要实现评论通知逻辑
        break;
        
      case 'question':
        // 可以根据需要实现问题通知逻辑
        break;
        
      case 'answer':
        // 可以根据需要实现答案通知逻辑
        break;
    }
    
    if (shouldNotify) {
      createNotification({
        userId: subscription.userId,
        type: contentType === 'audio' ? 'new_audio' : `new_${contentType}` as any,
        title: notificationTitle,
        message: notificationMessage,
        relatedId: contentData.id,
        relatedType: contentType
      });
    }
  });
}