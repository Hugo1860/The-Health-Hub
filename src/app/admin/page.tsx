'use client';

import { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Progress, 
  List, 
  Avatar, 
  Typography, 
  Space,
  Button,
  Skeleton,
  Alert,
  Tag
} from 'antd';
import {
  SoundOutlined,
  UserOutlined,
  PlayCircleOutlined,
  MessageOutlined,
  ShareAltOutlined,
  TrophyOutlined,
  PlusOutlined,
  CommentOutlined,
  RiseOutlined,
  FallOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import AntdAdminLayout from '../../components/AntdAdminLayout';
import { AntdAdminGuard } from '../../components/AntdAdminGuard';
import { ANTD_ADMIN_PERMISSIONS } from '../../hooks/useAntdAdminAuth';

const { Title, Text } = Typography;

// API响应接口
interface DashboardStats {
  totalAudios: number;
  totalUsers: number;
  totalPlays: number;
  totalComments: number;
  monthlyGrowth: {
    audios: number;
    users: number;
    plays: number;
    comments: number;
  };
  categoryDistribution: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  recentStats: {
    todayAudios: number;
    todayUsers: number;
    todayPlays: number;
    weekAudios: number;
    weekUsers: number;
    weekPlays: number;
  };
}

interface RecentActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  userId?: string;
  username?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface PopularContent {
  recentAudios: Array<{
    id: string;
    title: string;
    uploadDate: string;
    plays: number;
    duration: number;
    speaker?: string;
    subject: string;
  }>;
  popularAudios: Array<{
    id: string;
    title: string;
    plays: number;
    likes: number;
    comments: number;
    rating: number;
    subject: string;
    speaker?: string;
  }>;
  topCategories: Array<{
    category: string;
    audioCount: number;
    totalPlays: number;
    averageRating: number;
  }>;
}

function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [popularContent, setPopularContent] = useState<PopularContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      
      // 并行获取所有dashboard数据
      const [statsResponse, activitiesResponse, contentResponse] = await Promise.all([
        fetch('/api/admin/dashboard/stats', {
          credentials: 'include'
        }),
        fetch('/api/admin/dashboard/recent-activity?pageSize=10', {
          credentials: 'include'
        }),
        fetch('/api/admin/dashboard/popular-content?recentLimit=5&popularLimit=5', {
          credentials: 'include'
        })
      ]);

      // 检查响应状态
      if (!statsResponse.ok || !activitiesResponse.ok || !contentResponse.ok) {
        throw new Error('获取数据失败');
      }

      const [statsData, activitiesData, contentData] = await Promise.all([
        statsResponse.json(),
        activitiesResponse.json(),
        contentResponse.json()
      ]);

      // 检查API响应格式
      if (!statsData.success || !activitiesData.success || !contentData.success) {
        throw new Error(statsData.error?.message || activitiesData.error?.message || contentData.error?.message || '数据格式错误');
      }

      setStats(statsData.data);
      setRecentActivities(activitiesData.data);
      setPopularContent(contentData.data);
    } catch (error) {
      console.error('获取仪表盘数据失败:', error);
      setError(error instanceof Error ? error.message : '获取数据失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
  };

  return (
    <AntdAdminLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 欢迎卡片 */}
        <Card style={{ 
          background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
          border: 'none',
          color: 'white'
        }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={2} style={{ color: 'white', margin: 0 }}>
                欢迎来到管理后台！
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
                今天是美好的一天，让我们开始工作吧
              </Text>
            </Col>
            <Col>
              <Space>
                <Button
                  type="text"
                  icon={<ReloadOutlined />}
                  loading={refreshing}
                  onClick={handleRefresh}
                  style={{ color: 'white' }}
                >
                  刷新数据
                </Button>
                <div style={{
                  width: 64,
                  height: 64,
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <TrophyOutlined style={{ fontSize: 32, color: 'white' }} />
                </div>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* 错误提示 */}
        {error && (
          <Alert
            message="数据加载失败"
            description={error}
            type="error"
            showIcon
            action={
              <Button size="small" onClick={handleRefresh}>
                重试
              </Button>
            }
            closable
            onClose={() => setError(null)}
          />
        )}

        {/* 统计卡片 */}
        <Row gutter={16}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="音频总数"
                value={stats?.totalAudios}
                prefix={<SoundOutlined />}
                loading={loading}
                suffix={
                  stats?.monthlyGrowth?.audios !== undefined && (
                    <Tag color={stats.monthlyGrowth.audios >= 0 ? 'green' : 'red'} style={{ marginLeft: 8 }}>
                      {stats.monthlyGrowth.audios >= 0 ? <RiseOutlined /> : <FallOutlined />}
                      {Math.abs(stats.monthlyGrowth.audios)}
                    </Tag>
                  )
                }
              />
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  今日新增: {stats?.recentStats?.todayAudios || 0}
                </Text>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="用户总数"
                value={stats?.totalUsers}
                prefix={<UserOutlined />}
                loading={loading}
                suffix={
                  stats?.monthlyGrowth?.users !== undefined && (
                    <Tag color={stats.monthlyGrowth.users >= 0 ? 'green' : 'red'} style={{ marginLeft: 8 }}>
                      {stats.monthlyGrowth.users >= 0 ? <RiseOutlined /> : <FallOutlined />}
                      {Math.abs(stats.monthlyGrowth.users)}
                    </Tag>
                  )
                }
              />
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  今日新增: {stats?.recentStats?.todayUsers || 0}
                </Text>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="总播放量"
                value={stats?.totalPlays}
                prefix={<PlayCircleOutlined />}
                loading={loading}
                suffix={
                  stats?.monthlyGrowth?.plays !== undefined && (
                    <Tag color={stats.monthlyGrowth.plays >= 0 ? 'green' : 'red'} style={{ marginLeft: 8 }}>
                      {stats.monthlyGrowth.plays >= 0 ? <RiseOutlined /> : <FallOutlined />}
                      {Math.abs(stats.monthlyGrowth.plays)}
                    </Tag>
                  )
                }
              />
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  今日播放: {stats?.recentStats?.todayPlays || 0}
                </Text>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="评论总数"
                value={stats?.totalComments}
                prefix={<MessageOutlined />}
                loading={loading}
                suffix={
                  stats?.monthlyGrowth?.comments !== undefined && (
                    <Tag color={stats.monthlyGrowth.comments >= 0 ? 'green' : 'red'} style={{ marginLeft: 8 }}>
                      {stats.monthlyGrowth.comments >= 0 ? <RiseOutlined /> : <FallOutlined />}
                      {Math.abs(stats.monthlyGrowth.comments)}
                    </Tag>
                  )
                }
              />
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  本月新增: {stats?.monthlyGrowth?.comments || 0}
                </Text>
              </div>
            </Card>
          </Col>
        </Row>

        {/* 内容区域 */}
        <Row gutter={16}>
          {/* 最新音频 */}
          <Col xs={24} lg={12}>
            <Card
              title="最新音频"
              extra={
                <Button type="link" href="/admin/audio">
                  管理全部
                </Button>
              }
            >
              <List
                loading={loading}
                dataSource={popularContent?.recentAudios}
                renderItem={(audio) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          style={{ backgroundColor: '#1890ff' }}
                          icon={<SoundOutlined />}
                        />
                      }
                      title={audio.title}
                      description={
                        <Space>
                          <Text type="secondary">
                            {new Date(audio.uploadDate).toLocaleDateString('zh-CN')}
                          </Text>
                          <Text type="secondary">•</Text>
                          <Text type="secondary">{audio.plays} 播放</Text>
                          {audio.speaker && (
                            <>
                              <Text type="secondary">•</Text>
                              <Text type="secondary">{audio.speaker}</Text>
                            </>
                          )}
                          <Tag color="blue">{audio.subject}</Tag>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>

          {/* 热门内容 */}
          <Col xs={24} lg={12}>
            <Card
              title="热门内容"
              extra={
                <Button type="link">
                  查看更多
                </Button>
              }
            >
              <List
                loading={loading}
                dataSource={popularContent?.popularAudios}
                renderItem={(audio, index) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          style={{ 
                            backgroundColor: index === 0 ? '#f5222d' : index === 1 ? '#fa8c16' : '#52c41a'
                          }}
                        >
                          {index + 1}
                        </Avatar>
                      }
                      title={audio.title}
                      description={
                        <Space>
                          <Text type="secondary">{audio.plays} 播放</Text>
                          <Text type="secondary">•</Text>
                          <Text type="secondary">{audio.likes} 点赞</Text>
                          <Text type="secondary">•</Text>
                          <Text type="secondary">{audio.comments} 评论</Text>
                          {audio.rating > 0 && (
                            <>
                              <Text type="secondary">•</Text>
                              <Text type="secondary">⭐ {audio.rating}</Text>
                            </>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>

        {/* 分类统计 */}
        <Row gutter={16}>
          <Col xs={24} lg={12}>
            <Card title="热门分类">
              <List
                loading={loading}
                dataSource={popularContent?.topCategories}
                renderItem={(category) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Avatar style={{ backgroundColor: '#722ed1' }}>
                          {category.category.charAt(0)}
                        </Avatar>
                      }
                      title={category.category}
                      description={
                        <Space>
                          <Text type="secondary">{category.audioCount} 个音频</Text>
                          <Text type="secondary">•</Text>
                          <Text type="secondary">{category.totalPlays} 播放</Text>
                          {category.averageRating > 0 && (
                            <>
                              <Text type="secondary">•</Text>
                              <Text type="secondary">平均评分 {category.averageRating}</Text>
                            </>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>

          {/* 最近活动 */}
          <Col xs={24} lg={12}>
            <Card title="最近活动">
              <List
                loading={loading}
                dataSource={recentActivities}
                renderItem={(activity) => {
                  const getActivityIcon = (type: string) => {
                    switch (type) {
                      case 'audio_upload':
                        return <PlusOutlined style={{ color: '#1890ff' }} />
                      case 'user_register':
                        return <UserOutlined style={{ color: '#52c41a' }} />
                      case 'comment_post':
                        return <CommentOutlined style={{ color: '#722ed1' }} />
                      default:
                        return <ShareAltOutlined style={{ color: '#faad14' }} />
                    }
                  }

                  const getTimeAgo = (timestamp: string) => {
                    const now = new Date()
                    const activityTime = new Date(timestamp)
                    const diffMs = now.getTime() - activityTime.getTime()
                    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
                    const diffDays = Math.floor(diffHours / 24)

                    if (diffDays > 0) {
                      return `${diffDays}天前`
                    } else if (diffHours > 0) {
                      return `${diffHours}小时前`
                    } else {
                      return '刚刚'
                    }
                  }

                  return (
                    <List.Item>
                      <List.Item.Meta
                        avatar={
                          <Avatar 
                            style={{ backgroundColor: 'transparent' }}
                            icon={getActivityIcon(activity.type)}
                          />
                        }
                        title={activity.title}
                        description={
                          <Space>
                            <Text type="secondary">{activity.description}</Text>
                            <Text type="secondary">•</Text>
                            <Text type="secondary">{getTimeAgo(activity.timestamp)}</Text>
                          </Space>
                        }
                      />
                    </List.Item>
                  )
                }}
              />
            </Card>
          </Col>
        </Row>
      </Space>
    </AntdAdminLayout>
  );
}

export default function AdminDashboardPage() {
  return (
    <AntdAdminGuard>
      <AdminDashboard />
    </AntdAdminGuard>
  );
}