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
  Carousel,
  Skeleton,
  Empty,
  App
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  SoundOutlined,
  FireOutlined,
  ClockCircleOutlined,
  RightOutlined
} from '@ant-design/icons';
import AntdHomeLayout from '../components/AntdHomeLayout';
import { useAudioStore, AudioFile } from '../store/audioStore';

const { Title, Text, Paragraph } = Typography;

// 简化的接口定义
interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  audioCount: number;
}

interface CategoryContent {
  category: Category;
  audios: AudioFile[];
}

// 简化的工具函数
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-CN');
};

function HomeContent() {
  const router = useRouter();
  const { message } = App.useApp();
  
  // 简化的状态管理
  const [loading, setLoading] = useState(true);
  const [featuredAudios, setFeaturedAudios] = useState<AudioFile[]>([]);
  const [recentAudios, setRecentAudios] = useState<AudioFile[]>([]);
  const [categoryContent, setCategoryContent] = useState<CategoryContent[]>([]);
  
  const { currentAudio, isPlaying, playAudio, pauseAudio } = useAudioStore();

  // 统一的数据获取
  useEffect(() => {
    fetchAllContent();
  }, []);

  const fetchAllContent = async () => {
    try {
      // 并行获取所有数据
      const [audiosResponse, categoriesResponse] = await Promise.all([
        fetch('/api/audio-fixed?limit=50'),
        fetch('/api/categories?format=tree&includeCount=true')
      ]);

      let allAudios: AudioFile[] = [];
      
      // 处理音频数据
      if (audiosResponse.ok) {
        const audiosResult = await audiosResponse.json();
        if (audiosResult.success && audiosResult.data) {
          allAudios = audiosResult.data;
        }
      }

      // 设置精选推荐（前4个）
      setFeaturedAudios(allAudios.slice(0, 4));
      
      // 设置最近更新（按上传时间排序）
      const sortedByDate = [...allAudios].sort((a, b) => 
        new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
      );
      setRecentAudios(sortedByDate.slice(0, 6));

      // 处理分类数据
      let categories: Category[] = [];
      if (categoriesResponse.ok) {
        const categoriesResult = await categoriesResponse.json();
        const categoriesData = categoriesResult.success ? categoriesResult.data : categoriesResult;
        
        categories = categoriesData
          .filter((cat: any) => cat.level === 1) // 只显示一级分类
          .map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            color: cat.color || '#13C2C2',
            icon: cat.icon || '📝',
            audioCount: cat.audioCount || 0
          }));
      }

      // 为每个分类匹配音频
      const categoryWithAudios = categories.map(category => {
        const matchedAudios = allAudios
          .filter(audio => 
            audio.categoryId === category.id || 
            audio.subject?.toLowerCase().includes(category.name.toLowerCase())
          )
          .slice(0, 4); // 每个分类最多显示4个

        return {
          category,
          audios: matchedAudios
        };
      }).filter(item => item.audios.length > 0); // 只显示有音频的分类

      setCategoryContent(categoryWithAudios);

    } catch (error) {
      console.error('获取内容失败:', error);
      message.error('加载内容失败');
    } finally {
      setLoading(false);
    }
  };

  // 简化的播放处理
  const handlePlay = (audio: AudioFile) => {
    if (currentAudio?.id === audio.id && isPlaying) {
      pauseAudio();
    } else {
      playAudio({
        id: audio.id,
        title: audio.title,
        url: audio.url,
        duration: audio.duration || 0,
        category: audio.category?.name || audio.subject || '未分类',
        speaker: audio.speaker || '未知'
      });
    }
  };

  const handleViewAudio = (audioId: string) => {
    router.push(`/audio/${audioId}`);
  };

  const handleViewCategory = (categoryName: string) => {
    router.push(`/browse?category=${encodeURIComponent(categoryName)}`);
  };

  if (loading) {
    return (
      <AntdHomeLayout>
        <div style={{ padding: '164px 0 120px' }}>
          <Skeleton active paragraph={{ rows: 4 }} />
          <Skeleton active paragraph={{ rows: 6 }} style={{ marginTop: 24 }} />
        </div>
      </AntdHomeLayout>
    );
  }

  return (
    <AntdHomeLayout>
      <div style={{ padding: '164px 0 120px' }}>
        <Row gutter={[24, 24]}>
          {/* 左侧主要内容 */}
          <Col xs={24} lg={16}>
            
            {/* 精选推荐轮播 */}
            {featuredAudios.length > 0 && (
              <Card 
                title={
                  <Space>
                    <FireOutlined style={{ color: '#13C2C2' }} />
                    <span>精选推荐</span>
                  </Space>
                }
                style={{ marginBottom: 24 }}
              >
                <Carousel autoplay>
                  {featuredAudios.map(audio => (
                    <div key={audio.id}>
                      <Card
                        hoverable
                        style={{ 
                          backgroundColor: '#13C2C2',
                          color: 'white',
                          border: 'none'
                        }}
                        onClick={() => handleViewAudio(audio.id)}
                      >
                        <Row gutter={16} align="middle">
                          <Col span={16}>
                            <Title level={3} style={{ color: 'white', marginBottom: 8 }}>
                              {audio.title}
                            </Title>
                            <Paragraph 
                              style={{ color: 'rgba(255,255,255,0.9)', marginBottom: 16 }}
                              ellipsis={{ rows: 2 }}
                            >
                              {audio.description}
                            </Paragraph>
                            <Space>
                              <Button 
                                icon={<PlayCircleOutlined />}
                                style={{ 
                                  backgroundColor: 'white',
                                  color: '#13C2C2'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePlay(audio);
                                }}
                              >
                                立即播放
                              </Button>
                              <Tag style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}>
                                {audio.subject || audio.category?.name}
                              </Tag>
                            </Space>
                          </Col>
                          <Col span={8} style={{ textAlign: 'center' }}>
                            <Avatar
                              size={80}
                              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                              icon={<SoundOutlined style={{ fontSize: 32, color: 'white' }} />}
                            />
                          </Col>
                        </Row>
                      </Card>
                    </div>
                  ))}
                </Carousel>
              </Card>
            )}

            {/* 分类内容 */}
            {categoryContent.map(({ category, audios }) => (
              <Card
                key={category.id}
                title={
                  <Space>
                    <span style={{ fontSize: 18 }}>{category.icon}</span>
                    <span>{category.name}</span>
                    <Tag color={category.color}>
                      {audios.length} 个音频
                    </Tag>
                  </Space>
                }
                extra={
                  <Button 
                    type="link" 
                    icon={<RightOutlined />}
                    onClick={() => handleViewCategory(category.name)}
                  >
                    查看更多
                  </Button>
                }
                style={{ marginBottom: 24 }}
              >
                <List
                  grid={{ 
                    gutter: 16, 
                    xs: 1, 
                    sm: 2, 
                    md: 2, 
                    lg: 2, 
                    xl: 2 
                  }}
                  dataSource={audios}
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
                            onClick={() => handlePlay(audio)}
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
                              style={{ backgroundColor: category.color }}
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
                                <Tag color={category.color} style={{ fontSize: 10 }}>
                                  {audio.subject || category.name}
                                </Tag>
                                <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                                  {formatDate(audio.uploadDate)}
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
            ))}

            {/* 空状态 */}
            {!loading && featuredAudios.length === 0 && categoryContent.length === 0 && (
              <Empty
                description="暂无音频内容"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
            
          </Col>

          {/* 右侧边栏 */}
          <Col xs={24} lg={8}>
            
            {/* 最近更新 */}
            {recentAudios.length > 0 && (
              <Card 
                title={
                  <Space>
                    <ClockCircleOutlined style={{ color: '#13C2C2' }} />
                    <span>最近更新</span>
                  </Space>
                }
                extra={
                  <Button 
                    type="link" 
                    size="small"
                    icon={<RightOutlined />}
                    onClick={() => router.push('/browse')}
                  >
                    全部
                  </Button>
                }
                style={{ marginBottom: 16 }}
              >
                <List
                  dataSource={recentAudios}
                  renderItem={audio => (
                    <List.Item style={{ padding: '8px 0' }}>
                      <List.Item.Meta
                        avatar={
                          <Avatar 
                            size="small"
                            style={{ backgroundColor: '#13C2C2' }}
                            icon={<SoundOutlined />}
                          />
                        }
                        title={
                          <Text 
                            ellipsis 
                            style={{ fontSize: 13, cursor: 'pointer' }}
                            onClick={() => handleViewAudio(audio.id)}
                          >
                            {audio.title}
                          </Text>
                        }
                        description={
                          <div>
                            <Tag color="blue" style={{ fontSize: 10 }}>
                              {audio.subject || audio.category?.name}
                            </Tag>
                            <Text type="secondary" style={{ fontSize: 10, marginLeft: 4 }}>
                              {formatDate(audio.uploadDate)}
                            </Text>
                          </div>
                        }
                      />
                      <Button
                        type="text"
                        size="small"
                        icon={
                          currentAudio?.id === audio.id && isPlaying 
                            ? <PauseCircleOutlined /> 
                            : <PlayCircleOutlined />
                        }
                        onClick={() => handlePlay(audio)}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            )}

          </Col>
        </Row>
      </div>
    </AntdHomeLayout>
  );
}

export default function HomePage() {
  return (
    <App>
      <HomeContent />
    </App>
  );
}