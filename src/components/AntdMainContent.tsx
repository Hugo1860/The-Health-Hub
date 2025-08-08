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
  Divider,
  Grid,
  Progress,
  Slider
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  SoundOutlined,
  HeartOutlined,
  ShareAltOutlined,
  ClockCircleOutlined,
  FireOutlined,
  RightOutlined
} from '@ant-design/icons';
import { useAudioStore, AudioFile } from '../store/audioStore';

const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;

interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

interface CategorizedContent {
  category: Category;
  audios: AudioFile[];
  showMore?: boolean;
}

export default function AntdMainContent() {
  const screens = useBreakpoint();
  const [recentUpdates, setRecentUpdates] = useState<AudioFile[]>([]);
  const [categorizedContent, setCategorizedContent] = useState<CategorizedContent[]>([]);
  const [recommendations, setRecommendations] = useState<AudioFile[]>([]);
  const [loading, setLoading] = useState(true);
  const { 
    currentAudio, 
    isPlaying, 
    currentTime, 
    duration, 
    setCurrentAudio, 
    togglePlayPause,
    setCurrentTime 
  } = useAudioStore();
  const router = useRouter();

  // 判断是否为移动端
  const isMobile = !screens.md;

  // 时间格式化函数
  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // 处理进度条拖拽
  const handleProgressChange = (value: number) => {
    if (!duration) return;
    const newTime = (value / 100) * duration;
    setCurrentTime(newTime);
    
    // 通过自定义事件通知AudioPlayer组件更新播放位置
    const event = new CustomEvent('seekAudio', { detail: { time: newTime } });
    window.dispatchEvent(event);
  };

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      // 获取最近更新的音频
      const recentResponse = await fetch('/api/audio?limit=8&sortBy=uploadDate&sortOrder=desc');
      if (recentResponse.ok) {
        const recentResult = await recentResponse.json();
        const recentData = recentResult.data || recentResult; // 兼容不同的响应格式
        setRecentUpdates(recentData);
      }

      // 获取所有音频并按分类分组
      const allResponse = await fetch('/api/audio');
      if (allResponse.ok) {
        const allResult = await allResponse.json();
        const allData = allResult.data || allResult; // 兼容不同的响应格式
        
        // 按分类分组
        const categories: Category[] = [
          { id: 'cardiology', name: '心血管', color: '#13C2C2', icon: '❤️' },
          { id: 'neurology', name: '神经科', color: '#FAAD14', icon: '🧠' },
          { id: 'oncology', name: '肿瘤科', color: '#13C2C2', icon: '🎗️' },
          { id: 'surgery', name: '外科', color: '#FAAD14', icon: '🔬' },
          { id: 'pediatrics', name: '儿科', color: '#13C2C2', icon: '👶' },
        ];

        const categorized = categories.map(category => ({
          category,
          audios: allData.filter((audio: AudioFile) => 
            audio.subject?.toLowerCase().includes(category.name) ||
            audio.tags?.some((tag: string) => tag.toLowerCase().includes(category.name))
          ).slice(0, 6),
          showMore: true
        }));

        setCategorizedContent(categorized);
        
        // 设置推荐内容（取前4个最新的）
        setRecommendations(allData.slice(0, 4));
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
    }
  };

  const handleViewAudio = (audioId: string) => {
    router.push(`/audio/${audioId}`);
  };

  const handleViewCategory = (categoryName: string) => {
    router.push(`/browse?category=${categoryName}`);
  };

  if (loading) {
    return (
      <div>
        <Skeleton active paragraph={{ rows: 4 }} />
        <Divider />
        <Skeleton active paragraph={{ rows: 6 }} />
        <Divider />
        <Skeleton active paragraph={{ rows: 4 }} />
      </div>
    );
  }

  return (
    <div style={{ 
      paddingTop: currentAudio ? (isMobile ? 160 : 180) : 0,
      paddingBottom: 120 // 为底部用户信息卡片留出空间
    }}>

      {/* 推荐横幅 */}
      {recommendations.length > 0 && (
        <Card 
          title={
            <Space>
              <FireOutlined style={{ color: '#13C2C2' }} />
              <span className="elegant-gradient-text" style={{ fontSize: isMobile ? 14 : 16 }}>精选推荐</span>
            </Space>
          }
          className="elegant-hover-lift"
          style={{ marginBottom: isMobile ? 16 : 24 }}
        >
          <Carousel autoplay dots={{ className: 'custom-dots' }}>
            {recommendations.map(audio => (
              <div key={audio.id}>
                <Card
                  hoverable
                  className="elegant-recommendation-banner"
                  style={{ 
                    border: 'none',
                    backgroundColor: '#13C2C2',
                    color: 'black'
                  }}
                  onClick={() => handleViewAudio(audio.id)}
                >
                  <Row gutter={16} align="middle">
                    <Col span={isMobile ? 24 : 16}>
                      <Title level={isMobile ? 4 : 3} style={{ color: 'black', marginBottom: 8 }}>
                        {audio.title}
                      </Title>
                      <Paragraph 
                        style={{ 
                          color: 'rgba(0,0,0,0.8)', 
                          marginBottom: 16,
                          fontSize: isMobile ? 12 : 14
                        }}
                        ellipsis={{ rows: isMobile ? 1 : 2 }}
                      >
                        {audio.description}
                      </Paragraph>
                      <Space size={isMobile ? 'small' : 'middle'}>
                        <Button 
                          size={isMobile ? 'small' : 'middle'}
                          icon={<PlayCircleOutlined />}
                          style={{ 
                            borderColor: 'black', 
                            color: 'black',
                            backgroundColor: 'white'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayAudio(audio);
                          }}
                        >
                          {isMobile ? '播放' : '立即播放'}
                        </Button>
                        <Tag 
                          style={{ backgroundColor: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.2)', color: 'black' }}
                        >
                          {audio.subject}
                        </Tag>
                      </Space>
                    </Col>
                    {!isMobile && (
                      <Col span={8} style={{ textAlign: 'center' }}>
                        <Avatar
                          size={80}
                          style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: 'black' }}
                          icon={<SoundOutlined style={{ fontSize: 32 }} />}
                        />
                      </Col>
                    )}
                  </Row>
                </Card>
              </div>
            ))}
          </Carousel>
        </Card>
      )}

      {/* 最近更新 */}
      {recentUpdates.length > 0 && (
        <Card 
          title={
            <Space>
              <ClockCircleOutlined style={{ color: '#13C2C2' }} />
              <span style={{ fontSize: isMobile ? 14 : 16 }}>最近更新</span>
            </Space>
          }
          extra={
            <Button 
              type="link" 
              size={isMobile ? 'small' : 'middle'}
              icon={<RightOutlined />}
              onClick={() => router.push('/browse')}
            >
              {isMobile ? '全部' : '查看全部'}
            </Button>
          }
          style={{ marginBottom: isMobile ? 16 : 24 }}
        >
          <Row gutter={[16, 16]}>
            {recentUpdates.slice(0, isMobile ? 4 : 6).map(audio => (
              <Col xs={24} sm={12} md={8} lg={8} key={audio.id}>
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
                        <Space size="small">
                          <Tag color="blue">{audio.subject}</Tag>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {new Date(audio.uploadDate).toLocaleDateString('zh-CN')}
                          </Text>
                        </Space>
                      </div>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* 分类展示 */}
      {categorizedContent.map(({ category, audios }) => (
        audios.length > 0 && (
          <Card
            key={category.id}
            title={
              <Space>
                <span style={{ fontSize: 18 }}>{category.icon}</span>
                <span>{category.name}</span>
                <Tag color={category.color} style={{ marginLeft: 8 }}>
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
                lg: 3, 
                xl: 3, 
                xxl: 4 
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
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {new Date(audio.uploadDate).toLocaleDateString('zh-CN')}
                          </Text>
                        </div>
                      }
                    />
                  </Card>
                </List.Item>
              )}
            />
          </Card>
        )
      ))}

      {/* 空状态 */}
      {recentUpdates.length === 0 && categorizedContent.every(c => c.audios.length === 0) && (
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