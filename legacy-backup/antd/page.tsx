'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Table, 
  Tag, 
  Space, 
  Button,
  Progress,
  List,
  Avatar,
  Typography,
  Divider,
  Alert
} from 'antd';
import {
  UserOutlined,
  SoundOutlined,
  EyeOutlined,
  DownloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  PlayCircleOutlined,
  ClockCircleOutlined,
  SettingOutlined
} from '@ant-design/icons';
import AntdAdminLayout from '../../../components/AntdAdminLayout';
import { useAdminAuth } from '@/hooks/useAdminAuth';

const { Title, Text } = Typography;

export default function AntdAdminDashboard() {
  const { isAdmin, isLoading } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalUsers: 1234,
      totalAudios: 567,
      totalViews: 89012,
      totalDownloads: 34567
    },
    recentAudios: [],
    recentUsers: [],
    systemStatus: {
      cpuUsage: 45,
      memoryUsage: 67,
      diskUsage: 23
    }
  });

  useEffect(() => {
    // 模拟数据加载
    setTimeout(() => {
      setDashboardData({
        stats: {
          totalUsers: 1234,
          totalAudios: 567,
          totalViews: 89012,
          totalDownloads: 34567
        },
        recentAudios: [
          {
            key: '1',
            title: '心脏病学基础',
            speaker: '张医生',
            uploadTime: '2024-01-15',
            status: 'published',
            views: 1234
          },
          {
            key: '2',
            title: '神经系统疾病诊断',
            speaker: '李教授',
            uploadTime: '2024-01-14',
            status: 'pending',
            views: 856
          },
          {
            key: '3',
            title: '药理学进展',
            speaker: '王主任',
            uploadTime: '2024-01-13',
            status: 'published',
            views: 2341
          }
        ],
        recentUsers: [
          {
            id: '1',
            name: '医学生小王',
            email: 'wang@example.com',
            joinTime: '2024-01-15',
            status: 'active'
          },
          {
            id: '2',
            name: '实习医生小李',
            email: 'li@example.com',
            joinTime: '2024-01-14',
            status: 'active'
          }
        ],
        systemStatus: {
          cpuUsage: 45,
          memoryUsage: 67,
          diskUsage: 23
        }
      });
      setLoading(false);
    }, 1000);
  }, []);

  const audioColumns = [
    {
      title: '音频标题',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: '演讲者',
      dataIndex: 'speaker',
      key: 'speaker',
    },
    {
      title: '上传时间',
      dataIndex: 'uploadTime',
      key: 'uploadTime',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'published' ? 'green' : 'orange'}>
          {status === 'published' ? '已发布' : '待审核'}
        </Tag>
      )
    },
    {
      title: '播放量',
      dataIndex: 'views',
      key: 'views',
      render: (views: number) => (
        <Space>
          <EyeOutlined />
          {views.toLocaleString()}
        </Space>
      )
    }
  ];

  if (isLoading || loading) {
    return (
      <AntdAdminLayout>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Title level={3}>加载中...</Title>
        </div>
      </AntdAdminLayout>
    );
  }

  return (
    <AntdAdminLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 欢迎信息 */}
        <Alert
          message="欢迎使用 Ant Design 管理后台"
          description="这是使用 Ant Design 重构的管理员界面，提供更好的用户体验和导航功能。"
          type="success"
          showIcon
          closable
        />

        {/* 统计卡片 */}
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总用户数"
                value={dashboardData.stats.totalUsers}
                prefix={<UserOutlined />}
                suffix={
                  <Space>
                    <ArrowUpOutlined style={{ color: '#3f8600' }} />
                    <Text type="success">12%</Text>
                  </Space>
                }
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="音频总数"
                value={dashboardData.stats.totalAudios}
                prefix={<SoundOutlined />}
                suffix={
                  <Space>
                    <ArrowUpOutlined style={{ color: '#3f8600' }} />
                    <Text type="success">8%</Text>
                  </Space>
                }
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="总播放量"
                value={dashboardData.stats.totalViews}
                prefix={<PlayCircleOutlined />}
                suffix={
                  <Space>
                    <ArrowUpOutlined style={{ color: '#3f8600' }} />
                    <Text type="success">15%</Text>
                  </Space>
                }
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="总下载量"
                value={dashboardData.stats.totalDownloads}
                prefix={<DownloadOutlined />}
                suffix={
                  <Space>
                    <ArrowDownOutlined style={{ color: '#cf1322' }} />
                    <Text type="danger">3%</Text>
                  </Space>
                }
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={16}>
          {/* 最近音频 */}
          <Col span={16}>
            <Card 
              title="最近上传的音频" 
              extra={<Button type="link">查看全部</Button>}
            >
              <Table
                columns={audioColumns}
                dataSource={dashboardData.recentAudios}
                pagination={false}
                size="small"
              />
            </Card>
          </Col>

          {/* 系统状态 */}
          <Col span={8}>
            <Card title="系统状态">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text>CPU 使用率</Text>
                  <Progress 
                    percent={dashboardData.systemStatus.cpuUsage} 
                    status={dashboardData.systemStatus.cpuUsage > 80 ? 'exception' : 'active'}
                    size="small"
                  />
                </div>
                <div>
                  <Text>内存使用率</Text>
                  <Progress 
                    percent={dashboardData.systemStatus.memoryUsage} 
                    status={dashboardData.systemStatus.memoryUsage > 80 ? 'exception' : 'active'}
                    size="small"
                  />
                </div>
                <div>
                  <Text>磁盘使用率</Text>
                  <Progress 
                    percent={dashboardData.systemStatus.diskUsage} 
                    status="active"
                    size="small"
                  />
                </div>
              </Space>
            </Card>

            <Card title="最近注册用户" style={{ marginTop: 16 }}>
              <List
                itemLayout="horizontal"
                dataSource={dashboardData.recentUsers}
                renderItem={(user: any) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<UserOutlined />} />}
                      title={user.name}
                      description={
                        <Space direction="vertical" size="small">
                          <Text type="secondary">{user.email}</Text>
                          <Space>
                            <ClockCircleOutlined />
                            <Text type="secondary">{user.joinTime}</Text>
                          </Space>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>

        {/* 快速操作 */}
        <Card title="快速操作">
          <Space wrap>
            <Button type="primary" icon={<SoundOutlined />}>
              上传音频
            </Button>
            <Button icon={<UserOutlined />}>
              用户管理
            </Button>
            <Button icon={<SettingOutlined />}>
              系统设置
            </Button>
            <Button icon={<EyeOutlined />}>
              查看日志
            </Button>
          </Space>
        </Card>
      </Space>
    </AntdAdminLayout>
  );
}