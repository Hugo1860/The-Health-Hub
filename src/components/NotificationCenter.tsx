'use client';

import React, { useState, useEffect } from 'react';
import {
  Badge,
  Dropdown,
  List,
  Button,
  Typography,
  Empty,
  Spin,
  message,
  Tag,
  Space,
  Divider
} from 'antd';
import {
  BellOutlined,
  CheckOutlined,
  DeleteOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useSession } from 'next-auth/react';

const { Text } = Typography;

interface Notification {
  id: string;
  type: 'new_audio' | 'new_comment' | 'new_follower' | 'playlist_update' | 'system';
  title: string;
  message: string;
  data?: Record<string, any>;
  readAt?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: string;
}

export default function NotificationCenter() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  // 获取通知列表
  const fetchNotifications = async (unreadOnly: boolean = false) => {
    if (!session?.user) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/user/notifications?unreadOnly=${unreadOnly}&limit=20`);
      const result = await response.json();

      if (result.success) {
        setNotifications(result.data);
        setUnreadCount(result.meta.unreadCount);
      }
    } catch (error) {
      console.error('获取通知失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 标记单个通知为已读
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/user/notifications?id=${notificationId}`, {
        method: 'PUT'
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, readAt: new Date().toISOString() } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('标记通知失败:', error);
      message.error('操作失败');
    }
  };

  // 标记所有通知为已读
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/user/notifications?markAll=true', {
        method: 'PUT'
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, readAt: new Date().toISOString() }))
        );
        setUnreadCount(0);
        message.success('所有通知已标记为已读');
      }
    } catch (error) {
      console.error('标记所有通知失败:', error);
      message.error('操作失败');
    }
  };

  // 获取通知图标
  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'new_audio': return '🎵';
      case 'new_comment': return '💬';
      case 'new_follower': return '👥';
      case 'playlist_update': return '📝';
      case 'system': return '⚙️';
      default: return '🔔';
    }
  };

  // 获取优先级颜色
  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'urgent': return 'red';
      case 'high': return 'orange';
      case 'normal': return 'blue';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  useEffect(() => {
    if (session?.user) {
      fetchNotifications();
      
      // 定期刷新未读数量
      const interval = setInterval(() => {
        fetchNotifications(true);
      }, 30000); // 30秒刷新一次

      return () => clearInterval(interval);
    }
  }, [session]);

  if (!session?.user) {
    return null;
  }

  const notificationList = (
    <div style={{ width: 350, maxHeight: 400, overflow: 'auto' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong>通知中心</Text>
          <Space>
            {unreadCount > 0 && (
              <Button 
                type="link" 
                size="small" 
                onClick={markAllAsRead}
                style={{ padding: 0 }}
              >
                全部已读
              </Button>
            )}
            <Button 
              type="text" 
              size="small" 
              icon={<SettingOutlined />}
              onClick={() => {
                setDropdownVisible(false);
                // 跳转到通知设置页面
                window.location.href = '/settings?tab=notifications';
              }}
            />
          </Space>
        </div>
      </div>

      <div style={{ padding: '8px 0' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin />
          </div>
        ) : notifications.length === 0 ? (
          <Empty 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无通知"
            style={{ padding: '20px' }}
          />
        ) : (
          <List
            size="small"
            dataSource={notifications}
            renderItem={(notification) => (
              <List.Item
                style={{
                  padding: '12px 16px',
                  backgroundColor: notification.readAt ? 'transparent' : '#f6ffed',
                  borderLeft: notification.readAt ? 'none' : '3px solid #52c41a'
                }}
                actions={[
                  !notification.readAt && (
                    <Button
                      type="text"
                      size="small"
                      icon={<CheckOutlined />}
                      onClick={() => markAsRead(notification.id)}
                    />
                  )
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  avatar={
                    <div style={{ fontSize: '20px' }}>
                      {getNotificationIcon(notification.type)}
                    </div>
                  }
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Text strong style={{ fontSize: '14px' }}>
                        {notification.title}
                      </Text>
                      <Tag 
                        color={getPriorityColor(notification.priority)}
                        size="small"
                      >
                        {notification.priority}
                      </Tag>
                    </div>
                  }
                  description={
                    <div>
                      <Text style={{ fontSize: '13px', color: '#666' }}>
                        {notification.message}
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {formatTime(notification.createdAt)}
                      </Text>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </div>

      {notifications.length > 0 && (
        <>
          <Divider style={{ margin: '8px 0' }} />
          <div style={{ textAlign: 'center', padding: '8px' }}>
            <Button 
              type="link" 
              size="small"
              onClick={() => {
                setDropdownVisible(false);
                window.location.href = '/notifications';
              }}
            >
              查看所有通知
            </Button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <Dropdown
      overlay={notificationList}
      trigger={['click']}
      placement="bottomRight"
      open={dropdownVisible}
      onOpenChange={setDropdownVisible}
    >
      <Badge count={unreadCount} size="small">
        <Button
          type="text"
          icon={<BellOutlined />}
          style={{ border: 'none' }}
        />
      </Badge>
    </Dropdown>
  );
}