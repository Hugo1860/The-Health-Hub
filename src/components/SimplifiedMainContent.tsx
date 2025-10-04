'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Space,
  Avatar,
  List,
  Tag,
  Skeleton,
  Empty,
  Grid
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  SoundOutlined,
  FireOutlined,
  RightOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useAudioStore, AudioFile } from '../store/audioStore';

const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;

interface Category {
  id: string;
  name: string;
  color?: string;
  icon?: string;
}

export default function SimplifiedMainContent() {
  const screens = useBreakpoint();
  const [featuredAudios, setFeaturedAudios] = useState<AudioFile[]>([]);
  const [recentAudios, setRecentAudios] = useState<AudioFile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { 
    currentAudio, 
    isPlaying, 
    setCurrentAudio, 
    setIsPlaying,
    togglePlayPause
  } = useAudioStore();
  
  const router = useRouter();
  const isMobile = !screens.md;

  useEffect(() => {
    fetchSimplifiedContent();
  }, []);

  const fetchSimplifiedContent = async () => {
    try {
      // 简化数据获取 - 只获取必要的数据
      const [audioResponse, categoriesResponse] = await Promise.all([
        fetch('/api/audio-fixed?limit=12&sortBy=upload_date&sortOrder=desc'),
        fetch('/api/simple-categories')
      ]);

      if (audioResponse.ok) {
        const audioResult = await audioResponse.json();
        if (audioResult.success && audioResult.data) {
          const audios = audioResult.data;
          // 前4个作为精选，其余作为最近更新
          setFeaturedAudios(audios.slice(0, 4));
          setRecentAudios(audios.slice(4, 12));
        }
      }

      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData.slice(0, 6)); // 只显示前6个分类
      }
    } catch (error) {
      console.error('获取内容失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAudio = (audio: AudioFile) => {
    if (currentAudio?.id === audio.id) {
      togglePlayPause();
    } else {
      setCurrentAudio(audio);
      setIsPlaying(true);
    }
  };

  const handleViewAudio = (audioId: string) => {
    router.push(`/audio/${audioId}`);
  };

  const handleViewCategory = (categoryName: string) => {
    router.push(`/browse?category=${encodeURIComponent(categoryName)}`);
  };

  if (loading) {
    return <Skeleton active paragraph={{ rows: 6 }} />;
  }

  return (
    <div style={{ 
      paddingTop: isMobile ? 20 : 40,
      paddingBottom: 120
    }}>
      {/* 精选推荐 - 简化版 */}
      {featuredAudios.length > 0 && (
        <Card 
          title={
            <Space>
              <FireOutlined style={{ color: '#13C2C2' }} />
              <span>精选推荐</span>
            </Space>
          }
          extra={
            <Button 
              type="link" 
              icon={<RightOutlined />}
              onClick={() => router.push('/browse')}
            >
              查看更多
            </Button>
          }
          style={{ marginBottom: 24 }}
        >
          <Row gutter={[16, 16]}>
            {featuredAudios.map(audio => (
              <Col xs={24} sm={12} lg={6} key={audio.id}>
                <Card
                  hoverable
                  size="small"
                  cover={
                    <div style={{ 
                      height: 120, 
                      background: 'linear-gradient(135deg, #13C2C2, #36CFC9)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white'
                    }}>
                      <SoundOutlined style={{ fontSize: 32 }} />
                    </div>
                  }
                  actions={[
                    <Button
                      key="play"
                      type="text"
                      icon={
                        currentAudio?.id === audio.id && isPlaying 
                          ? <PauseCircleOutlined /> 
                          : <PlayCircleOutlined />
                      }
                      onClick={() => handlePlayAudio(audio)}
                    >
                      {currentAudio?.id === audio.id && isPlaying ? '暂停' : '播放'}
                    </Button>
                  ]}
                  onClick={() => handleViewAudio(audio.id)}
                >
                  <Card.Meta
                    title={
                      <Text ellipsis style={{ fontSize: 14 }}>
                        {audio.title}
                      </Text>
                    }
                    description={
                      <div>
                        <Tag color="blue" style={{ fontSize: 10 }}>
                          {audio.subject}
                        </Tag>
                        <br />
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {new Date(audio.uploadDate).toLocaleDateString('zh-CN')}
                        </Text>
                      </div>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      <Row gutter={[24, 24]}>
        {/* 左侧：最近更新 */}
        <Col xs={24} lg={16}>
          <Card 
            title={
              <Space>
                <ClockCircleOutlined style={{ color: '#13C2C2' }} />
                <span>最近更新</span>
              </Space>
            }
          >
            <List
              grid={{ 
                gutter: 16, 
                xs: 1, 
                sm: 2, 
                md: 2, 
                lg: 2
              }}
              dataSource={recentAudios}
              renderItem={audio => (
                <List.Item>
                  <Card
                    hoverable
                    size="small"
                    actions={[
                      <Button
                        key="play"
                        type="text"
                        icon={
                          currentAudio?.id === audio.id && isPlaying 
                            ? <PauseCircleOutlined /> 
                            : <PlayCircleOutlined />
                        }
                        onClick={() => handlePlayAudio(audio)}
                      >
                        {currentAudio?.id === audio.id && isPlaying ? '暂停' : '播放'}
                      </Button>,
                      <Button
                        key="view"
                        type="text"
                        onClick={() => handleViewAudio(audio.id)}
                      >
                        详情
                      </Button>
                    ]}
                  >
                    <Card.Meta
                      avatar={
                        <Avatar 
                          style={{ backgroundColor: '#13C2C2' }}
                          icon={<SoundOutlined />}
                        />
                      }
                      title={
                        <Text ellipsis style={{ fontSize: 14 }}>
                          {audio.title}
                        </Text>
                      }
                      description={
                        <div>
                          <Paragraph 
                            ellipsis={{ rows: 2 }} 
                            style={{ fontSize: 12, margin: '8px 0' }}
                          >
                            {audio.description}
                          </Paragraph>
                          <div>
                            <Tag color="blue" style={{ fontSize: 10 }}>
                              {audio.subject}
                            </Tag>
                            <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                              {new Date(audio.uploadDate).toLocaleDateString('zh-CN')}
                            </Text>
                          </div>
                        </div>
                      }
                    />
                  </Card>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* 右侧：分类导航 */}
        <Col xs={24} lg={8}>
          <Card 
            title="分类浏览"
            extra={
              <Button 
                type="link" 
                icon={<RightOutlined />}
                onClick={() => router.push('/browse')}
              >
                全部分类
              </Button>
            }
          >
            <Row gutter={[8, 8]}>
              {categories.map(category => (
                <Col span={12} key={category.id}>
                  <Button
                    block
                    style={{ 
                      height: 60,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderColor: category.color,
                      color: category.color
                    }}
                    onClick={() => handleViewCategory(category.name)}
                  >
                    <div style={{ fontSize: 18, marginBottom: 4 }}>
                      {category.icon}
                    </div>
                    <div style={{ fontSize: 12 }}>
                      {category.name}
                    </div>
                  </Button>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 空状态 */}
      {!loading && featuredAudios.length === 0 && recentAudios.length === 0 && (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div>
              <Title level={4}>暂无音频内容</Title>
              <Text type="secondary">还没有上传任何音频内容</Text>
            </div>
          }
        />
      )}
    </div>
  );
}