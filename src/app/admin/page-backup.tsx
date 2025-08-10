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
  Alert,
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
import ClientOnly from '../../components/ClientOnly';
import DynamicContent from '../../components/DynamicContent';
import SafeTimeDisplay from '../../components/SafeTimeDisplay';
import { useClientMounted } from '../../hooks/useClientMounted';

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
  const hasMounted = useClientMounted();

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
        <DynamicContent loading={loading && !hasMounted}>
          <Row gutter={16}>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="音频总数"
                  value={stats?.totalAudios}
                  prefix={<SoundOutlined />}
                  loading={loading}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="用户总数"
                  value={stats?.totalUsers}
                  prefix={<UserOutlined />}
                  loading={loading}
                />
              </Card>
            </Col>
          </Row>
        </DynamicContent>
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