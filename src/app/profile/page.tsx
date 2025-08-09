'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Card,
  Row,
  Col,
  Typography,
  Form,
  Input,
  Button,
  Space,
  Divider,
  message,
  Breadcrumb,
  Avatar,
  Upload,
  Tabs,
  List,
  Tag,
  Statistic,
  Progress,
  Empty
} from 'antd';
import {
  UserOutlined,
  HomeOutlined,
  EditOutlined,
  UploadOutlined,
  HeartOutlined,
  PlayCircleOutlined,
  ClockCircleOutlined,
  SoundOutlined,
  SettingOutlined
} from '@ant-design/icons';
import Link from 'next/link';
import AntdHomeLayout from '../../components/AntdHomeLayout';

const { Title, Text, Paragraph } = Typography;

interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  avatar?: string;
  bio?: string;
  joinDate: string;
  stats: {
    totalListened: number;
    totalFavorites: number;
    totalPlaylists: number;
    listeningTime: number;
  };
}

interface AudioItem {
  id: string;
  title: string;
  subject: string;
  uploadDate: string;
  duration?: number;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [favorites, setFavorites] = useState<AudioItem[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<AudioItem[]>([]);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    fetchProfile();
    fetchFavorites();
    fetchRecentlyPlayed();
  }, [session, status, router]);

  const fetchProfile = async () => {
    try {
      // 模拟获取用户资料
      const mockProfile: UserProfile = {
        id: session?.user?.id || '1',
        username: session?.user?.name || '用户',
        email: session?.user?.email || 'user@example.com',
        role: (session?.user as any)?.role || 'user',
        bio: '热爱医学知识，持续学习中...',
        joinDate: '2024-01-01',
        stats: {
          totalListened: 45,
          totalFavorites: 12,
          totalPlaylists: 3,
          listeningTime: 1280 // 分钟
        }
      };
      
      setProfile(mockProfile);
      form.setFieldsValue({
        username: mockProfile.username,
        email: mockProfile.email,
        bio: mockProfile.bio
      });
    } catch (error) {
      message.error('获取用户资料失败');
    }
  };

  const fetchFavorites = async () => {
    try {
      // 模拟获取收藏列表
      const mockFavorites: AudioItem[] = [
        { id: '1', title: '心血管疾病诊断要点', subject: '心血管', uploadDate: '2024-01-10' },
        { id: '2', title: '神经系统检查方法', subject: '神经科', uploadDate: '2024-01-08' },
        { id: '3', title: '内分泌疾病治疗', subject: '内科', uploadDate: '2024-01-05' }
      ];
      setFavorites(mockFavorites);
    } catch (error) {
      console.error('获取收藏列表失败:', error);
    }
  };

  const fetchRecentlyPlayed = async () => {
    try {
      // 模拟获取最近播放
      const mockRecent: AudioItem[] = [
        { id: '4', title: '外科手术基础技能', subject: '外科', uploadDate: '2024-01-12' },
        { id: '5', title: '儿科常见疾病', subject: '儿科', uploadDate: '2024-01-11' },
        { id: '6', title: '急诊医学处理原则', subject: '急诊科', uploadDate: '2024-01-09' }
      ];
      setRecentlyPlayed(mockRecent);
    } catch (error) {
      console.error('获取播放历史失败:', error);
    }
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      // 模拟更新用户资料
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setProfile(prev => prev ? {
        ...prev,
        username: values.username,
        bio: values.bio
      } : null);
      
      message.success('资料更新成功！');
      setEditMode(false);
    } catch (error) {
      message.error('更新失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const formatListeningTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}小时${mins}分钟`;
  };

  if (status === 'loading' || !profile) {
    return (
      <AntdHomeLayout>
        <div className="flex justify-center items-center min-h-96">
          <div>加载中...</div>
        </div>
      </AntdHomeLayout>
    );
  }

  const tabItems = [
    {
      key: 'overview',
      label: (
        <span>
          <UserOutlined />
          概览
        </span>
      ),
      children: (
        <Row gutter={[24, 24]}>
          {/* 统计信息 */}
          <Col span={24}>
            <Card title="学习统计" style={{ borderRadius: 12 }}>
              <Row gutter={16}>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="已听音频"
                    value={profile.stats.totalListened}
                    prefix={<PlayCircleOutlined style={{ color: '#13C2C2' }} />}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="收藏数量"
                    value={profile.stats.totalFavorites}
                    prefix={<HeartOutlined style={{ color: '#ff4d4f' }} />}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="播放列表"
                    value={profile.stats.totalPlaylists}
                    prefix={<SoundOutlined style={{ color: '#52c41a' }} />}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="学习时长"
                    value={formatListeningTime(profile.stats.listeningTime)}
                    prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
                  />
                </Col>
              </Row>
            </Card>
          </Col>

          {/* 最近播放 */}
          <Col xs={24} lg={12}>
            <Card 
              title="最近播放" 
              style={{ borderRadius: 12 }}
              extra={<Button type="link" size="small">查看全部</Button>}
            >
              {recentlyPlayed.length > 0 ? (
                <List
                  dataSource={recentlyPlayed}
                  renderItem={item => (
                    <List.Item
                      className="hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                      onClick={() => router.push(`/audio/${item.id}`)}
                    >
                      <List.Item.Meta
                        avatar={
                          <Avatar 
                            style={{ backgroundColor: '#13C2C2' }}
                            icon={<SoundOutlined />}
                          />
                        }
                        title={<span className="text-sm font-medium">{item.title}</span>}
                        description={
                          <div className="flex items-center gap-2">
                            <Tag color="blue">{item.subject}</Tag>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {new Date(item.uploadDate).toLocaleDateString('zh-CN')}
                            </Text>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <Empty description="暂无播放记录" />
              )}
            </Card>
          </Col>

          {/* 收藏列表 */}
          <Col xs={24} lg={12}>
            <Card 
              title="我的收藏" 
              style={{ borderRadius: 12 }}
              extra={<Button type="link" size="small">查看全部</Button>}
            >
              {favorites.length > 0 ? (
                <List
                  dataSource={favorites}
                  renderItem={item => (
                    <List.Item
                      className="hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                      onClick={() => router.push(`/audio/${item.id}`)}
                    >
                      <List.Item.Meta
                        avatar={
                          <Avatar 
                            style={{ backgroundColor: '#ff4d4f' }}
                            icon={<HeartOutlined />}
                          />
                        }
                        title={<span className="text-sm font-medium">{item.title}</span>}
                        description={
                          <div className="flex items-center gap-2">
                            <Tag color="red">{item.subject}</Tag>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {new Date(item.uploadDate).toLocaleDateString('zh-CN')}
                            </Text>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <Empty description="暂无收藏内容" />
              )}
            </Card>
          </Col>
        </Row>
      )
    },
    {
      key: 'edit',
      label: (
        <span>
          <EditOutlined />
          编辑资料
        </span>
      ),
      children: (
        <Card style={{ borderRadius: 12, maxWidth: 600 }}>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Form.Item
              label="用户名"
              name="username"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input size="large" />
            </Form.Item>

            <Form.Item
              label="邮箱"
              name="email"
            >
              <Input size="large" disabled />
            </Form.Item>

            <Form.Item
              label="个人简介"
              name="bio"
            >
              <Input.TextArea 
                rows={4} 
                placeholder="介绍一下自己..."
                maxLength={200}
                showCount
              />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={loading}
                  size="large"
                  style={{ borderRadius: 8 }}
                >
                  保存修改
                </Button>
                <Button 
                  onClick={() => setActiveTab('overview')}
                  size="large"
                  style={{ borderRadius: 8 }}
                >
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      )
    }
  ];

  return (
    <AntdHomeLayout>
      <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
        {/* 面包屑导航 */}
        <Breadcrumb style={{ marginBottom: 24 }}>
          <Breadcrumb.Item>
            <Link href="/">
              <HomeOutlined /> 首页
            </Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <UserOutlined /> 个人中心
          </Breadcrumb.Item>
        </Breadcrumb>

        {/* 用户信息头部 */}
        <Card style={{ marginBottom: 24, borderRadius: 12 }}>
          <Row align="middle" gutter={24}>
            <Col>
              <Avatar
                size={80}
                style={{ backgroundColor: '#13C2C2' }}
                icon={<UserOutlined />}
              >
                {profile.username?.charAt(0)}
              </Avatar>
            </Col>
            <Col flex={1}>
              <Title level={3} style={{ margin: 0, marginBottom: 8 }}>
                {profile.username}
              </Title>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                {profile.email}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {profile.role === 'admin' ? '管理员' : '用户'} • 
                加入时间：{new Date(profile.joinDate).toLocaleDateString('zh-CN')}
              </Text>
              {profile.bio && (
                <Paragraph style={{ marginTop: 12, marginBottom: 0 }}>
                  {profile.bio}
                </Paragraph>
              )}
            </Col>
            <Col>
              <Button
                type="primary"
                icon={<SettingOutlined />}
                onClick={() => router.push('/settings')}
                style={{ borderRadius: 8 }}
              >
                账户设置
              </Button>
            </Col>
          </Row>
        </Card>

        {/* 标签页内容 */}
        <Card style={{ borderRadius: 12 }}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            size="large"
          />
        </Card>
      </div>
    </AntdHomeLayout>
  );
}