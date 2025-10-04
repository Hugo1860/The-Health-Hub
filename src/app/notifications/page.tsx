'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  List,
  Typography,
  Button,
  Space,
  Tag,
  Empty,
  Spin,
  message,
  Row,
  Col,
  Statistic,
  Tabs,
  Switch,
  Form,
  Select
} from 'antd';
import {
  BellOutlined,
  CheckOutlined,
  DeleteOutlined,
  SettingOutlined,
  NotificationOutlined
} from '@ant-design/icons';
import { useSession } from 'next-auth/react';
import AntdHomeLayout from '../../components/AntdHomeLayout';

const { Title, Text } = Typography;
const { Option } = Select;

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

interface UserSubscription {
  id: string;
  subscriptionType: 'category' | 'speaker' | 'user' | 'playlist';
  targetId: string;
  targetName?: string;
  notificationEnabled: boolean;
  notificationFrequency: 'immediate' | 'daily' | 'weekly';
  createdAt: string;
}

export default function NotificationsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('notifications');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // 获取通知列表
  const fetchNotifications = async () => {
    if (!session?.user) return;

    try {
      setLoading(true);
      const response = await fetch('/api/user/notifications?limit=50');
      const result = await response.json();

      if (result.success) {
        setNotifications(result.data);
        setUnreadCount(result.meta.unreadCount);
      }
    } catch (error) {
      console.error('获取通知失败:', error);
      message.error('获取通知失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取订阅列表
  const fetchSubscriptions = async () => {
    if (!session?.user) return;

    try {
      const response = await fetch('/api/user/subscriptions');
      const result = await response.json();

      if (result.success) {
        setSubscriptions(result.data);
      }
    } catch (error) {
      console.error('获取订阅列表失败:', error);
    }
  };

  // 标记通知为已读
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

  // 更新订阅设置
  const updateSubscription = async (subscriptionId: string, updates: any) => {
    try {
      const response = await fetch(`/api/user/subscriptions?id=${subscriptionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        message.success('订阅设置已更新');
        fetchSubscriptions();
      } else {
        message.error('更新失败');
      }
    } catch (error) {
      console.error('更新订阅失败:', error);
      message.error('更新失败');
    }
  };

  // 取消订阅
  const unsubscribe = async (subscription: UserSubscription) => {
    try {
      const response = await fetch(
        `/api/user/subscriptions?type=${subscription.subscriptionType}&targetId=${subscription.targetId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        message.success('取消订阅成功');
        fetchSubscriptions();
      } else {
        message.error('取消订阅失败');
      }
    } catch (error) {
      console.error('取消订阅失败:', error);
      message.error('取消订阅失败');
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchNotifications();
      fetchSubscriptions();
    }
  }, [session]);

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

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'urgent': return 'red';
      case 'high': return 'orange';
      case 'normal': return 'blue';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getSubscriptionTypeText = (type: UserSubscription['subscriptionType']) => {
    switch (type) {
      case 'category': return '分类';
      case 'speaker': return '讲者';
      case 'user': return '用户';
      case 'playlist': return '播放列表';
      default: return type;
    }
  };

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

  if (!session?.user) {
    return (
      <AntdHomeLayout>
        <Card>
          <Empty description="请先登录以查看通知" />
        </Card>
      </AntdHomeLayout>
    );
  }

  return (
    <AntdHomeLayout>
      <div style={{ padding: '24px' }}>
        <Title level={2}>
          <BellOutlined style={{ marginRight: 8 }} />
          通知中心
        </Title>

        <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="未读通知"
                value={unreadCount}
                prefix={<NotificationOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="总通知数"
                value={notifications.length}
                prefix={<BellOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="订阅数量"
                value={subscriptions.length}
                prefix={<SettingOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          {/* 通知列表 */}
          <Tabs.TabPane tab="通知列表" key="notifications">
            <Card
              title="我的通知"
              extra={
                unreadCount > 0 && (
                  <Button onClick={markAllAsRead}>
                    全部标记为已读
                  </Button>
                )
              }
            >
              <List
                loading={loading}
                dataSource={notifications}
                locale={{ emptyText: <Empty description="暂无通知" /> }}
                renderItem={(notification) => (
                  <List.Item
                    style={{
                      backgroundColor: notification.readAt ? 'transparent' : '#f6ffed',
                      borderLeft: notification.readAt ? 'none' : '3px solid #52c41a',
                      padding: '16px',
                      marginBottom: 8,
                      borderRadius: 8
                    }}
                    actions={[
                      !notification.readAt && (
                        <Button
                          type="text"
                          icon={<CheckOutlined />}
                          onClick={() => markAsRead(notification.id)}
                        >
                          标记已读
                        </Button>
                      )
                    ].filter(Boolean)}
                  >
                    <List.Item.Meta
                      avatar={
                        <div style={{ fontSize: '24px' }}>
                          {getNotificationIcon(notification.type)}
                        </div>
                      }
                      title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Text strong>{notification.title}</Text>
                          <Tag color={getPriorityColor(notification.priority)}>
                            {notification.priority}
                          </Tag>
                          {!notification.readAt && (
                            <Tag color="green">未读</Tag>
                          )}
                        </div>
                      }
                      description={
                        <div>
                          <Text style={{ color: '#666' }}>
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
            </Card>
          </Tabs.TabPane>

          {/* 订阅管理 */}
          <Tabs.TabPane tab="订阅管理" key="subscriptions">
            <Card title="我的订阅">
              <List
                dataSource={subscriptions}
                locale={{ emptyText: <Empty description="暂无订阅" /> }}
                renderItem={(subscription) => (
                  <List.Item
                    actions={[
                      <Switch
                        key="enabled"
                        checked={subscription.notificationEnabled}
                        onChange={(checked) => 
                          updateSubscription(subscription.id, { notificationEnabled: checked })
                        }
                      />,
                      <Select
                        key="frequency"
                        value={subscription.notificationFrequency}
                        style={{ width: 100 }}
                        onChange={(value) => 
                          updateSubscription(subscription.id, { notificationFrequency: value })
                        }
                      >
                        <Option value="immediate">即时</Option>
                        <Option value="daily">每日</Option>
                        <Option value="weekly">每周</Option>
                      </Select>,
                      <Button
                        key="unsubscribe"
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => unsubscribe(subscription)}
                      >
                        取消订阅
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <div style={{ fontSize: '20px' }}>
                          {subscription.subscriptionType === 'category' ? '📁' :
                           subscription.subscriptionType === 'speaker' ? '🎙️' :
                           subscription.subscriptionType === 'user' ? '👤' : '📝'}
                        </div>
                      }
                      title={
                        <div>
                          <Text strong>{subscription.targetName || subscription.targetId}</Text>
                          <Tag style={{ marginLeft: 8 }}>
                            {getSubscriptionTypeText(subscription.subscriptionType)}
                          </Tag>
                        </div>
                      }
                      description={
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          订阅于 {new Date(subscription.createdAt).toLocaleDateString('zh-CN')}
                        </Text>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Tabs.TabPane>
        </Tabs>
      </div>
    </AntdHomeLayout>
  );
}