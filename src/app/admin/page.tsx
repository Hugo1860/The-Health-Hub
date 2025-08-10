'use client';

import { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  List, 
  Avatar, 
  Typography, 
  Space,
  Button,
  Tag
} from 'antd';
import {
  SoundOutlined,
  UserOutlined,
  PlayCircleOutlined,
  MessageOutlined,
  TrophyOutlined,
  PlusOutlined,
  CommentOutlined,
  RiseOutlined,
  FallOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import AntdAdminLayout from '../../components/AntdAdminLayout';
import { AntdAdminGuard } from '../../components/AntdAdminGuard';
import DynamicContent from '../../components/DynamicContent';
import SafeTimeDisplay from '../../components/SafeTimeDisplay';
import ErrorBoundary from '../../components/ErrorBoundary';
import ApiErrorHandler from '../../components/ApiErrorHandler';
import { useClientMounted } from '../../hooks/useClientMounted';
import { useApiState } from '../../hooks/useApiState';

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
  const hasMounted = useClientMounted();
  
  // 使用新的 API 状态管理
  const statsApi = useApiState<DashboardStats>();
  const activitiesApi = useApiState<RecentActivity[]>();
  const contentApi = useApiState<PopularContent>();
  
  // 兼容性状态（保持现有代码工作）
  const stats = statsApi.data;
  const recentActivities = activitiesApi.data || [];
  const popularContent = contentApi.data;
  const loading = statsApi.loading || activitiesApi.loading || contentApi.loading;
  const error = statsApi.error || activitiesApi.error || contentApi.error;
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setRefreshing(true);
    
    try {
      // 并行获取所有dashboard数据
      await Promise.all([
        statsApi.execute(async () => {
          const response = await fetch('/api/admin/dashboard/stats', {
            credentials: 'include'
          });
          
          if (!response.ok) {
            throw new Error(`统计数据获取失败: ${response.status} ${response.statusText}`);
          }
          
          const data = await response.json();
          if (!data.success) {
            throw new Error(data.error?.message || '统计数据格式错误');
          }
          
          return data.data;
        }),
        
        activitiesApi.execute(async () => {
          const response = await fetch('/api/admin/dashboard/recent-activity?pageSize=10', {
            credentials: 'include'
          });
          
          if (!response.ok) {
            throw new Error(`活动数据获取失败: ${response.status} ${response.statusText}`);
          }
          
          const data = await response.json();
          if (!data.success) {
            throw new Error(data.error?.message || '活动数据格式错误');
          }
          
          return data.data;
        }),
        
        contentApi.execute(async () => {
          const response = await fetch('/api/admin/dashboard/popular-content?recentLimit=5&popularLimit=5', {
            credentials: 'include'
          });
          
          if (!response.ok) {
            throw new Error(`内容数据获取失败: ${response.status} ${response.statusText}`);
          }
          
          const data = await response.json();
          if (!data.success) {
            throw new Error(data.error?.message || '内容数据格式错误');
          }
          
          return data.data;
        })
      ]);
    } catch (error) {
      console.error('获取仪表盘数据失败:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    await fetchDashboardData();
  };

  const handleRetryStats = async () => {
    if (statsApi.retry) {
      await statsApi.retry();
    }
  };

  const handleRetryActivities = async () => {
    if (activitiesApi.retry) {
      await activitiesApi.retry();
    }
  };

  const handleRetryContent = async () => {
    if (contentApi.retry) {
      await contentApi.retry();
    }
  };

  return (
    <AntdAdminLayout>
      <ErrorBoundary>
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

        {/* 全局错误提示 */}
        {error && (
          <ApiErrorHandler
            error={error}
            loading={refreshing}
            onRetry={handleRefresh}
            compact={false}
          />
        )}

        {/* 统计卡片 */}
        <ErrorBoundary fallback={
          <ApiErrorHandler
            error="统计卡片加载失败"
            onRetry={handleRetryStats}
            compact={true}
          />
        }>
          {statsApi.error && (
            <ApiErrorHandler
              error={statsApi.error}
              loading={statsApi.loading}
              onRetry={handleRetryStats}
              compact={true}
            />
          )}
          <DynamicContent loading={(loading && !hasMounted) || statsApi.loading}>
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
          </DynamicContent>
        </ErrorBoundary>

        {/* 内容区域 */}
        <ErrorBoundary fallback={
          <ApiErrorHandler
            error="内容区域加载失败"
            onRetry={handleRetryContent}
            compact={true}
          />
        }>
          {contentApi.error && (
            <ApiErrorHandler
              error={contentApi.error}
              loading={contentApi.loading}
              onRetry={handleRetryContent}
              compact={true}
            />
          )}
          <DynamicContent loading={(loading && !hasMounted) || contentApi.loading}>
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
                            <SafeTimeDisplay 
                              timestamp={audio.uploadDate} 
                              format="date" 
                            />
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
          </DynamicContent>
        </ErrorBoundary>

        {/* 分类统计 */}
        <ErrorBoundary fallback={
          <ApiErrorHandler
            error="分类统计加载失败"
            onRetry={handleRetryActivities}
            compact={true}
          />
        }>
          {activitiesApi.error && (
            <ApiErrorHandler
              error={activitiesApi.error}
              loading={activitiesApi.loading}
              onRetry={handleRetryActivities}
              compact={true}
            />
          )}
          <DynamicContent loading={(loading && !hasMounted) || activitiesApi.loading}>
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
                          return <MessageOutlined style={{ color: '#faad14' }} />
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
                              <SafeTimeDisplay 
                                timestamp={activity.timestamp} 
                                format="relative" 
                              />
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
        </DynamicContent>
        </ErrorBoundary>
        </Space>
      </ErrorBoundary>
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