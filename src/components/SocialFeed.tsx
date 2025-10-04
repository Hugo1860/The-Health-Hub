'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  List,
  Avatar,
  Typography,
  Button,
  Space,
  Tag,
  Divider,
  Empty,
  message,
  Modal,
  Input,
  Select,
  Row,
  Col,
  Statistic
} from 'antd';
import {
  HeartOutlined,
  HeartFilled,
  ShareAltOutlined,
  UserAddOutlined,
  UserDeleteOutlined,
  CommentOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface UserActivity {
  id: string;
  userId: string;
  activityType: 'played_audio' | 'created_playlist' | 'liked_audio' | 'commented' | 'followed_user' | 'shared_content';
  targetType: 'audio' | 'playlist' | 'user' | 'comment';
  targetId: string;
  activityData: Record<string, any>;
  createdAt: string;
  user?: {
    username: string;
    email: string;
  };
  target?: {
    title?: string;
    name?: string;
  };
}

interface SocialStats {
  followers: number;
  following: number;
  totalLikes: number;
  totalShares: number;
  publicPlaylists: number;
}

export default function SocialFeed() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [socialStats, setSocialStats] = useState<SocialStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedContent, setSelectedContent] = useState<{
    type: 'audio' | 'playlist';
    id: string;
    title: string;
  } | null>(null);

  // 获取 CSRF Token（用于写操作）
  const fetchCsrfToken = async () => {
    if (!session?.user?.id) return;
    try {
      const res = await fetch('/api/csrf-token', {
        headers: {
          'x-user-id': session.user.id as string
        }
      });
      if (res.ok) {
        const data = await res.json();
        setCsrfToken(data.csrfToken);
      }
    } catch (e) {
      // 忽略获取失败，稍后写操作再重试
    }
  };

  // 获取社交动态
  const fetchSocialFeed = async () => {
    if (!session?.user) return;

    try {
      setLoading(true);
      const [activitiesRes, statsRes] = await Promise.all([
        fetch('/api/user/social?action=activities&includeFollowing=true&limit=20', {
          headers: { 'x-user-id': session.user.id as string }
        }),
        fetch('/api/user/social?action=stats', {
          headers: { 'x-user-id': session.user.id as string }
        })
      ]);

      if (activitiesRes.ok) {
        const activitiesResult = await activitiesRes.json();
        if (activitiesResult.success) {
          setActivities(activitiesResult.data);
        }
      }

      if (statsRes.ok) {
        const statsResult = await statsRes.json();
        if (statsResult.success) {
          setSocialStats(statsResult.data);
        }
      }
    } catch (error) {
      console.error('获取社交动态失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 关注用户
  const followUser = async (userId: string) => {
    try {
      if (!csrfToken) {
        await fetchCsrfToken();
      }
      const response = await fetch('/api/user/social', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': session?.user?.id as string,
          'x-csrf-token': csrfToken || ''
        },
        body: JSON.stringify({
          action: 'follow',
          followingId: userId,
          followType: 'user'
        })
      });

      if (response.ok) {
        message.success('关注成功');
        fetchSocialFeed(); // 刷新动态
      } else {
        message.error('关注失败');
      }
    } catch (error) {
      console.error('关注失败:', error);
      message.error('关注失败');
    }
  };

  // 点赞音频
  const likeAudio = async (audioId: string) => {
    try {
      if (!csrfToken) {
        await fetchCsrfToken();
      }
      const response = await fetch('/api/user/social', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': session?.user?.id as string,
          'x-csrf-token': csrfToken || ''
        },
        body: JSON.stringify({
          action: 'like',
          audioId
        })
      });

      if (response.ok) {
        const result = await response.json();
        message.success(result.data.liked ? '点赞成功' : '取消点赞成功');
        fetchSocialFeed(); // 刷新动态
      } else {
        message.error('操作失败');
      }
    } catch (error) {
      console.error('点赞失败:', error);
      message.error('操作失败');
    }
  };

  // 分享内容
  const shareContent = async (shareMethod: string, sharePlatform?: string) => {
    if (!selectedContent) return;

    try {
      if (!csrfToken) {
        await fetchCsrfToken();
      }
      const response = await fetch('/api/user/social', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': session?.user?.id as string,
          'x-csrf-token': csrfToken || ''
        },
        body: JSON.stringify({
          action: 'share',
          contentType: selectedContent.type,
          contentId: selectedContent.id,
          shareMethod,
          sharePlatform
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        if (shareMethod === 'link') {
          // 复制链接到剪贴板
          await navigator.clipboard.writeText(result.data.shareUrl);
          message.success('分享链接已复制到剪贴板');
        } else {
          message.success('分享成功');
        }
        
        setShareModalVisible(false);
        fetchSocialFeed(); // 刷新动态
      } else {
        message.error('分享失败');
      }
    } catch (error) {
      console.error('分享失败:', error);
      message.error('分享失败');
    }
  };

  useEffect(() => {
    fetchSocialFeed();
    fetchCsrfToken();
  }, [session]);

  if (!session?.user) {
    return (
      <Card>
        <Empty description="请先登录以查看社交动态" />
      </Card>
    );
  }

  const getActivityIcon = (activityType: UserActivity['activityType']) => {
    switch (activityType) {
      case 'played_audio': return <PlayCircleOutlined style={{ color: '#1890ff' }} />;
      case 'created_playlist': return <PlayCircleOutlined style={{ color: '#52c41a' }} />;
      case 'liked_audio': return <HeartFilled style={{ color: '#ff4d4f' }} />;
      case 'commented': return <CommentOutlined style={{ color: '#722ed1' }} />;
      case 'followed_user': return <UserAddOutlined style={{ color: '#13c2c2' }} />;
      case 'shared_content': return <ShareAltOutlined style={{ color: '#fa8c16' }} />;
      default: return <PlayCircleOutlined />;
    }
  };

  const getActivityText = (activity: UserActivity) => {
    switch (activity.activityType) {
      case 'played_audio': return `播放了音频 "${activity.target?.title}"`;
      case 'created_playlist': return `创建了播放列表 "${activity.target?.name}"`;
      case 'liked_audio': return `点赞了音频 "${activity.target?.title}"`;
      case 'commented': return `评论了内容`;
      case 'followed_user': return `关注了 ${activity.target?.name}`;
      case 'shared_content': return `分享了 "${activity.target?.title}"`;
      default: return '进行了活动';
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

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={[24, 24]}>
        {/* 社交统计 */}
        <Col xs={24} lg={8}>
          <Card title="社交统计">
            {socialStats && (
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="关注者"
                    value={socialStats.followers}
                    prefix={<UserAddOutlined />}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="关注中"
                    value={socialStats.following}
                    prefix={<UserAddOutlined />}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="获赞数"
                    value={socialStats.totalLikes}
                    prefix={<HeartOutlined />}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="分享数"
                    value={socialStats.totalShares}
                    prefix={<ShareAltOutlined />}
                  />
                </Col>
              </Row>
            )}
          </Card>
        </Col>

        {/* 动态时间线 */}
        <Col xs={24} lg={16}>
          <Card title="动态时间线">
            <List
              loading={loading}
              dataSource={activities}
              locale={{ emptyText: <Empty description="暂无动态" /> }}
              renderItem={(activity) => (
                <List.Item
                  actions={[
                    activity.targetType === 'audio' && (
                      <Button
                        key="like"
                        type="text"
                        icon={<HeartOutlined />}
                        onClick={() => likeAudio(activity.targetId)}
                      >
                        点赞
                      </Button>
                    ),
                    <Button
                      key="share"
                      type="text"
                      icon={<ShareAltOutlined />}
                      onClick={() => {
                        if (activity.targetType === 'audio' || activity.targetType === 'playlist') {
                          setSelectedContent({
                            type: activity.targetType,
                            id: activity.targetId,
                            title: activity.target?.title || activity.target?.name || ''
                          });
                          setShareModalVisible(true);
                        }
                      }}
                    >
                      分享
                    </Button>
                  ].filter(Boolean)}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        style={{ backgroundColor: '#1890ff' }}
                        icon={getActivityIcon(activity.activityType)}
                      />
                    }
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Text strong>{activity.user?.username}</Text>
                        <Text>{getActivityText(activity)}</Text>
                      </div>
                    }
                    description={
                      <Space>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {formatTime(activity.createdAt)}
                        </Text>
                        <Tag color="blue">{activity.activityType}</Tag>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* 分享模态框 */}
      <Modal
        title={`分享 - ${selectedContent?.title}`}
        open={shareModalVisible}
        footer={null}
        onCancel={() => setShareModalVisible(false)}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Button
            block
            icon={<ShareAltOutlined />}
            onClick={() => shareContent('link')}
          >
            复制分享链接
          </Button>
          
          <Row gutter={8}>
            <Col span={8}>
              <Button
                block
                onClick={() => shareContent('social', 'wechat')}
                style={{ backgroundColor: '#07c160', color: 'white' }}
              >
                微信
              </Button>
            </Col>
            <Col span={8}>
              <Button
                block
                onClick={() => shareContent('social', 'weibo')}
                style={{ backgroundColor: '#e6162d', color: 'white' }}
              >
                微博
              </Button>
            </Col>
            <Col span={8}>
              <Button
                block
                onClick={() => shareContent('social', 'qq')}
                style={{ backgroundColor: '#12b7f5', color: 'white' }}
              >
                QQ
              </Button>
            </Col>
          </Row>
          
          <Button
            block
            onClick={() => shareContent('qr_code')}
          >
            生成二维码
          </Button>
        </Space>
      </Modal>
    </div>
  );
}
