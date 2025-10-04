'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
  Grid,
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  SoundOutlined,
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
  parentId?: string | null;
  level: 1 | 2;
  sortOrder: number;
  isActive: boolean;
  children?: Category[];
  audioCount?: number;
}

interface CategorizedContent {
  category: Category;
  audios: AudioFile[];
  showMore?: boolean;
}

// 优化缓存管理
const CACHE_DURATION = 10 * 60 * 1000; // 10分钟缓存，减少API调用
const cache = new Map<string, { data: any; timestamp: number }>();

// 预加载缓存清理
const cleanCache = () => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      cache.delete(key);
    }
  }
};

const getCachedData = (key: string) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key: string, data: any) => {
  cache.set(key, { data, timestamp: Date.now() });
};

// 优化的API调用函数
const fetchWithCache = async (url: string, cacheKey: string) => {
  const cached = getCachedData(cacheKey);
  if (cached) {
    console.log(`📦 使用缓存数据: ${cacheKey}`);
    return cached;
  }

  try {
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      setCachedData(cacheKey, data);
      return data;
    }
  } catch (error) {
    console.error(`API调用失败 ${url}:`, error);
  }
  return null;
};

export default function OptimizedMainContent() {
  const screens = useBreakpoint();
  const [loading, setLoading] = useState(true);
  const [recentUpdates, setRecentUpdates] = useState<AudioFile[]>([]);
  const [categorizedContent, setCategorizedContent] = useState<CategorizedContent[]>([]);
  const [recommendations, setRecommendations] = useState<AudioFile[]>([]);
  const [specialRecommendations, setSpecialRecommendations] = useState<AudioFile[]>([]);
  
  const { 
    currentAudio, 
    isPlaying, 
    setCurrentAudio, 
    setIsPlaying,
    togglePlayPause
  } = useAudioStore();
  const router = useRouter();

  const isMobile = !screens.md;

  // 优化的数据获取函数
  const fetchContent = useCallback(async () => {
    console.log('🚀 开始优化加载首页内容...');
    setLoading(true);

    try {
      // 优化：首先快速获取最少必要数据
      const [recentResult] = await Promise.all([
        fetchWithCache('/api/audio-fixed?limit=6&sortBy=upload_date&sortOrder=desc', 'recent-audios')
      ]);

      // 设置最近更新数据，立即显示内容
      if (recentResult?.success && recentResult.data) {
        setRecentUpdates(recentResult.data);
        setRecommendations(recentResult.data.slice(0, 4));
        setSpecialRecommendations(recentResult.data.slice(0, 3));
        console.log(`✅ 快速加载: ${recentResult.data.length} 项`);
        setLoading(false); // 提前结束加载状态
      }

      // 后台异步获取其他数据
      setTimeout(async () => {
        try {
          const [allResult, categoriesResult] = await Promise.all([
            fetchWithCache('/api/audio-fixed?limit=15', 'all-audios'), // 进一步减少数据量
            fetchWithCache('/api/categories?format=flat&includeCount=true', 'categories')
          ]);

          // 处理推荐内容
          if (allResult?.success && allResult.data) {
            const audioData = allResult.data;
            // 更新推荐内容，但不覆盖已显示的内容
            if (audioData.length > recentResult.data.length) {
              setRecommendations(audioData.slice(0, 4));
              setSpecialRecommendations(audioData.slice(0, 3));
            }
            console.log(`✅ 后台加载推荐内容: ${audioData.length} 项`);

            // 处理分类内容
            if (categoriesResult?.success && categoriesResult.data) {
              const categories = categoriesResult.data.filter((cat: Category) => cat.level === 1);
              
              const categorized = categories.slice(0, 4).map((category: Category) => { // 只显示前4个分类
                const matchedAudios = audioData.filter((audio: AudioFile) => {
                  return audio.categoryId === category.id || 
                         audio.subcategoryId === category.id ||
                         (audio.subject && audio.subject.toLowerCase().includes(category.name.toLowerCase()));
                }).slice(0, 3); // 每个分类只显示3个

                return {
                  category,
                  audios: matchedAudios,
                  showMore: true
                };
              }).filter((item: CategorizedContent) => item.audios.length > 0);

              setCategorizedContent(categorized);
              console.log(`✅ 后台加载分类内容: ${categorized.length} 个分类`);
            }
          }
        } catch (error) {
          console.error('❌ 后台数据加载失败:', error);
        }
      }, 100); // 100ms后开始后台加载
    } catch (error) {
      console.error('❌ 获取内容失败:', error);
      // 设置空数组避免渲染错误
      setRecentUpdates([]);
      setRecommendations([]);
      setSpecialRecommendations([]);
      setCategorizedContent([]);
    } finally {
      setLoading(false);
      console.log('✅ 首页内容加载完成');
    }
  }, []);

  // 使用 useEffect 只在组件挂载时获取数据
  useEffect(() => {
    cleanCache(); // 清理过期缓存
    fetchContent();
  }, [fetchContent]);

  // 优化的事件处理函数
  const handlePlayAudio = useCallback((audio: AudioFile) => {
    if (currentAudio?.id === audio.id) {
      togglePlayPause();
    } else {
      setCurrentAudio(audio);
      setIsPlaying(true);
    }
  }, [currentAudio, togglePlayPause, setCurrentAudio, setIsPlaying]);

  const handleViewAudio = useCallback((audioId: string) => {
    router.push(`/audio/${audioId}`);
  }, [router]);

  const handleViewCategory = useCallback((categoryName: string) => {
    router.push(`/browse?category=${encodeURIComponent(categoryName)}`);
  }, [router]);

  // 使用 useMemo 优化渲染
  const recommendationCarousel = useMemo(() => {
    if (loading || recommendations.length === 0) return null;

    return (
      <Card 
        title={
          <Space>
            <FireOutlined style={{ color: '#13C2C2' }} />
            <span style={{ fontSize: isMobile ? 14 : 16 }}>精选推荐</span>
          </Space>
        }
        style={{ marginBottom: isMobile ? 16 : 24 }}
      >
        <Carousel autoplay autoplaySpeed={5000}>
          {recommendations.map(audio => (
            <div key={audio.id}>
              <Card
                hoverable
                style={{ 
                  border: 'none',
                  backgroundColor: '#13C2C2',
                  color: 'black',
                  cursor: 'pointer'
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
                      {audio.description ? 
                        (audio.description.length > 35 ? 
                          audio.description.substring(0, 35) + '...' : 
                          audio.description) : 
                        ''}
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
                      <Tag style={{ backgroundColor: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.2)', color: 'black' }}>
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
    );
  }, [loading, recommendations, isMobile, handleViewAudio, handlePlayAudio]);

  // 加载状态
  if (loading) {
    return (
      <div style={{ paddingTop: 164, paddingBottom: 120 }}>
        <Skeleton active paragraph={{ rows: 4 }} />
        <div style={{ margin: '24px 0' }} />
        <Skeleton active paragraph={{ rows: 6 }} />
        <div style={{ margin: '24px 0' }} />
        <Skeleton active paragraph={{ rows: 4 }} />
      </div>
    );
  }

  return (
    <div style={{ 
      paddingTop: 164,
      paddingBottom: 120
    }}>
      <Row gutter={[24, 24]}>
        {/* 左侧内容区 */}
        <Col xs={24} lg={16}>
          {/* 精选推荐 */}
          {recommendationCarousel}

          {/* 分类内容 */}
          {categorizedContent.map(({ category, audios }) => (
            <Card
              key={category.id}
              title={
                <Space>
                  <span style={{ fontSize: 18 }}>{category.icon || '📝'}</span>
                  <span>{category.name}</span>
                  <Tag color={category.color || '#13C2C2'}>
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
                  xl: 2, 
                  xxl: 3 
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
                            style={{ backgroundColor: category.color || '#13C2C2' }}
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
                            <Tag color={category.color || '#13C2C2'} style={{ fontSize: 10, padding: '0 4px' }}>
                              {audio.subject || category.name}
                            </Tag>
                            <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
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
          ))}

          {/* 空状态 */}
          {!loading && recentUpdates.length === 0 && categorizedContent.length === 0 && (
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
        </Col>

        {/* 右侧栏 */}
        <Col xs={24} lg={8}>
          {/* 特别推荐 */}
          {specialRecommendations.length > 0 && (
            <Card 
              title={
                <Space>
                  <FireOutlined style={{ color: '#ff6b35' }} />
                  <span style={{ fontSize: 14 }}>最新更新</span>
                </Space>
              }
              style={{ 
                marginBottom: 16,
                border: '2px solid #ff6b35',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(255, 107, 53, 0.15)'
              }}
            >
              <Carousel autoplay autoplaySpeed={4000} effect="fade">
                {specialRecommendations.map((audio, index) => (
                  <div key={audio.id}>
                    <div
                      style={{
                        background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
                        borderRadius: '8px',
                        padding: '16px',
                        color: 'white',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                      onClick={() => handleViewAudio(audio.id)}
                    >
                      <Tag 
                        style={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          border: 'none',
                          color: 'white',
                          fontSize: '11px',
                          marginBottom: 8
                        }}
                      >
                        #{index + 1} 最新推荐
                      </Tag>
                      
                      <div style={{ marginBottom: 8 }}>
                        <Avatar
                          size={60}
                          style={{ 
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            border: '2px solid rgba(255,255,255,0.3)'
                          }}
                          icon={<SoundOutlined style={{ fontSize: 20, color: 'white' }} />}
                        />
                      </div>
                      
                      <Title level={5} style={{ color: 'white', marginBottom: 6 }} ellipsis>
                        {audio.title}
                      </Title>
                      
                      <Button 
                        size="small"
                        icon={<PlayCircleOutlined />}
                        style={{ 
                          backgroundColor: 'white',
                          borderColor: 'white',
                          color: '#ff6b35',
                          fontWeight: 'bold'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayAudio(audio);
                        }}
                      >
                        播放
                      </Button>
                    </div>
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
                  <span style={{ fontSize: 14 }}>最近更新</span>
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
                dataSource={recentUpdates.slice(0, 3)} // 减少显示数量
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
                        <Text ellipsis style={{ fontSize: 13 }}>
                          {audio.title}
                        </Text>
                      }
                      description={
                        <div>
                          <Tag color="blue" style={{ fontSize: '10px', padding: '0 4px' }}>
                            {audio.subject}
                          </Tag>
                          <Text type="secondary" style={{ fontSize: 10, marginLeft: 4 }}>
                            {new Date(audio.uploadDate).toLocaleDateString('zh-CN')}
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
                      onClick={() => handlePlayAudio(audio)}
                    />
                  </List.Item>
                )}
              />
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
