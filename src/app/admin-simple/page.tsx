'use client';

import { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Typography, 
  Space,
  Button,
  Alert
} from 'antd';
import {
  SoundOutlined,
  UserOutlined,
  PlayCircleOutlined,
  MessageOutlined,
  TrophyOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import AntdAdminLayout from '../../components/AntdAdminLayout';
import { AntdAdminGuard } from '../../components/AntdAdminGuard';

const { Title, Text } = Typography;

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

function SimpleAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/dashboard/stats-simple', {
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setStats(data.data);
      } else {
        setError(data.error?.message || '获取统计数据失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

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
                简化管理后台
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
                使用简化API的管理面板，避免复杂依赖问题
              </Text>
            </Col>
            <Col>
              <Space>
                <Button
                  type="text"
                  icon={<ReloadOutlined />}
                  loading={loading}
                  onClick={fetchStats}
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
            message="数据获取失败"
            description={error}
            type="error"
            showIcon
            action={
              <Button size="small" onClick={fetchStats}>
                重试
              </Button>
            }
          />
        )}

        {/* 统计卡片 */}
        {stats && (
          <Row gutter={16}>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="音频总数"
                  value={stats.totalAudios}
                  prefix={<SoundOutlined />}
                  loading={loading}
                />
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    今日新增: {stats.recentStats.todayAudios}
                  </Text>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="用户总数"
                  value={stats.totalUsers}
                  prefix={<UserOutlined />}
                  loading={loading}
                />
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    今日新增: {stats.recentStats.todayUsers}
                  </Text>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="总播放量"
                  value={stats.totalPlays}
                  prefix={<PlayCircleOutlined />}
                  loading={loading}
                />
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    今日播放: {stats.recentStats.todayPlays}
                  </Text>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="评论总数"
                  value={stats.totalComments}
                  prefix={<MessageOutlined />}
                  loading={loading}
                />
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    本月新增: {stats.monthlyGrowth.comments}
                  </Text>
                </div>
              </Card>
            </Col>
          </Row>
        )}

        {/* 分类分布 */}
        {stats && (
          <Row gutter={16}>
            <Col xs={24} lg={12}>
              <Card title="分类分布">
                <div>
                  {stats.categoryDistribution.map((category, index) => (
                    <div key={index} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      padding: '8px 0',
                      borderBottom: index < stats.categoryDistribution.length - 1 ? '1px solid #f0f0f0' : 'none'
                    }}>
                      <Text>{category.category}</Text>
                      <Space>
                        <Text>{category.count} 个</Text>
                        <Text type="secondary">({category.percentage}%)</Text>
                      </Space>
                    </div>
                  ))}
                </div>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card title="月度增长">
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title="音频增长"
                      value={stats.monthlyGrowth.audios}
                      suffix="个"
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="播放增长"
                      value={stats.monthlyGrowth.plays}
                      suffix="次"
                    />
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>
        )}

        {/* 快捷操作 */}
        <Card title="快捷操作">
          <Space wrap>
            <Button type="primary" href="/admin/audio">
              音频管理
            </Button>
            <Button href="/admin/upload">
              上传音频
            </Button>
            <Button href="/test-upload-simple">
              测试上传
            </Button>
            <Button href="/test-stats-debug">
              API调试
            </Button>
            <Button href="/admin" type="dashed">
              原始仪表板
            </Button>
          </Space>
        </Card>
      </Space>
    </AntdAdminLayout>
  );
}

export default function SimpleAdminDashboardPage() {
  return (
    <AntdAdminGuard>
      <SimpleAdminDashboard />
    </AntdAdminGuard>
  );
}