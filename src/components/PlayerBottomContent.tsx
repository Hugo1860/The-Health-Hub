'use client';

import { useState, useEffect, useCallback, memo } from 'react';
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
  Carousel,
  Grid,
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  SoundOutlined,
  RightOutlined,
  FireOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useAudioStore, AudioFile } from '../store/audioStore';
import '../styles/player-bottom-content.css';
import '../styles/modern-home.css';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

interface Category {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  level?: number;
}

// 推荐音频轮播卡片组件 - 应用现代 iOS 风格
const RecommendationCard = memo(({ audio, onPlay, onView, currentAudio, isPlaying }: {
  audio: AudioFile;
  onPlay: (audio: AudioFile) => void;
  onView: (audioId: string) => void;
  currentAudio?: AudioFile;
  isPlaying: boolean;
}) => (
  <Card
    hoverable
    className="modern-audio-card"
    cover={
      <div style={{ 
        height: '200px', 
        background: audio.coverImage 
          ? `url(${audio.coverImage}) center/cover` 
          : 'linear-gradient(135deg, #34c9ff 0%, #6366f1 100%)',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '14px 14px 0 0'
      }}>
        {!audio.coverImage && (
          <div style={{ color: 'white', fontSize: '48px' }}>🎙️</div>
        )}
        <div style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px'
        }}>
          <Button
            type="primary"
            shape="circle"
            size="large"
            className="modern-play-btn"
            icon={
              currentAudio?.id === audio.id && isPlaying 
                ? <PauseCircleOutlined /> 
                : <PlayCircleOutlined />
            }
            onClick={(e) => {
              e.stopPropagation();
              onPlay(audio);
            }}
          />
        </div>
      </div>
    }
    onClick={() => onView(audio.id)}
  >
    <Card.Meta
      title={
        <Text ellipsis className="modern-title" style={{ fontSize: '16px', fontWeight: 'bold' }}>
          {audio.title}
        </Text>
      }
      description={
        <div>
          <Text type="secondary" ellipsis className="modern-subtitle" style={{ fontSize: '14px', marginBottom: '8px', display: 'block' }}>
            {audio.description ? 
              (audio.description.length > 35 ? 
                audio.description.substring(0, 35) + '...' : 
                audio.description) : 
              '暂无描述'}
          </Text>
          <Space>
            {audio.categoryName && (
              <Tag className="modern-tag modern-tag-primary" color={audio.categoryColor || '#13C2C2'}>
                {audio.categoryIcon} {audio.categoryName}
              </Tag>
            )}
            <Text type="secondary" className="modern-text" style={{ fontSize: '12px' }}>
              {new Date(audio.uploadDate).toLocaleDateString('zh-CN')}
            </Text>
            {audio.playCount !== undefined && (
              <Text type="secondary" className="modern-text" style={{ fontSize: '12px' }}>
                🎧 {audio.playCount} 次播放
              </Text>
            )}
          </Space>
        </div>
      }
    />
  </Card>
));

RecommendationCard.displayName = 'RecommendationCard';

// 音频列表项组件
const AudioListItem = memo(({ audio, onPlay, onView, currentAudio, isPlaying }: {
  audio: AudioFile;
  onPlay: (audio: AudioFile) => void;
  onView: (audioId: string) => void;
  currentAudio?: AudioFile;
  isPlaying: boolean;
}) => (
  <List.Item
    className="modern-list-item"
    actions={[
      <Button
        key="play"
        type="text"
        size="small"
        className="modern-btn-primary"
        icon={
          currentAudio?.id === audio.id && isPlaying 
            ? <PauseCircleOutlined /> 
            : <PlayCircleOutlined />
        }
        onClick={() => onPlay(audio)}
      >
        {currentAudio?.id === audio.id && isPlaying ? '暂停' : '播放'}
      </Button>
    ]}
  >
    <List.Item.Meta
      avatar={
        <Avatar 
          size="small"
          className="modern-avatar"
          style={{ backgroundColor: audio.categoryColor || '#13C2C2' }}
          icon={<SoundOutlined />}
        />
      }
      title={
        <Text 
          ellipsis 
          className="modern-title"
          style={{ fontSize: '14px', cursor: 'pointer' }}
          onClick={() => onView(audio.id)}
        >
          {audio.title}
        </Text>
      }
      description={
        <Space>
          {audio.categoryName && (
            <Tag color={audio.categoryColor || '#13C2C2'}>
              {audio.categoryName}
            </Tag>
          )}
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {new Date(audio.uploadDate).toLocaleDateString('zh-CN')}
          </Text>
          {audio.playCount !== undefined && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              🎧 {audio.playCount}
            </Text>
          )}
        </Space>
      }
    />
  </List.Item>
));

AudioListItem.displayName = 'AudioListItem';

export default function PlayerBottomContent() {
  const screens = useBreakpoint();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<AudioFile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryAudios, setCategoryAudios] = useState<{[key: string]: AudioFile[]}>({});
  const [rankingAudios, setRankingAudios] = useState<AudioFile[]>([]);
  const [recentAudios, setRecentAudios] = useState<AudioFile[]>([]);

  const { 
    currentAudio, 
    isPlaying, 
    setCurrentAudio, 
    setIsPlaying,
    togglePlayPause
  } = useAudioStore();

  const isMobile = !screens.md;

  // 获取数据
  const fetchContent = useCallback(async () => {
    try {
      setLoading(true);

      // 并行获取所有数据
      const [recommendationsRes, categoriesRes, rankingRes, recentRes] = await Promise.all([
        fetch('/api/recommendations?limit=6'),
        fetch('/api/categories'),
        fetch('/api/rankings?limit=10'),
        fetch('/api/recent-updates?limit=10')
      ]);

      // 处理推荐数据
      if (recommendationsRes.ok) {
        const recResult = await recommendationsRes.json();
        if (recResult.success && recResult.data) {
          setRecommendations(recResult.data);
        }
      }

      // 处理分类数据
      if (categoriesRes.ok) {
        const catResult = await categoriesRes.json();
        if (catResult.success && catResult.data) {
          const mainCategories = catResult.data.filter((cat: Category) => cat.level === 1);
          setCategories(mainCategories);
          
          // 获取每个分类的音频数据
          const categoryPromises = mainCategories.map(async (category: Category) => {
            try {
              const audioRes = await fetch(`/api/categories/${category.id}/audios?limit=4`);
              if (audioRes.ok) {
                const audioResult = await audioRes.json();
                if (audioResult.success && audioResult.data) {
                  return { categoryId: category.id, audios: audioResult.data };
                }
              }
              return { categoryId: category.id, audios: [] };
            } catch (error) {
              console.error(`获取分类 ${category.name} 音频失败:`, error);
              return { categoryId: category.id, audios: [] };
            }
          });
          
          const categoryResults = await Promise.all(categoryPromises);
          const categoryAudiosMap: {[key: string]: AudioFile[]} = {};
          categoryResults.forEach(result => {
            categoryAudiosMap[result.categoryId] = result.audios;
          });
          setCategoryAudios(categoryAudiosMap);
        }
      }

      // 处理排行榜数据
      if (rankingRes.ok) {
        const rankResult = await rankingRes.json();
        if (rankResult.success && rankResult.data) {
          setRankingAudios(rankResult.data);
        }
      }

      // 处理最近更新数据
      if (recentRes.ok) {
        const recentResult = await recentRes.json();
        if (recentResult.success && recentResult.data) {
          setRecentAudios(recentResult.data);
        }
      }

    } catch (error) {
      console.error('获取播放器下方内容失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // 播放音频
  const handlePlayAudio = useCallback(async (audio: AudioFile) => {
    // 记录播放次数
    try {
      await fetch(`/api/audio/${audio.id}/play`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('记录播放次数失败:', error);
    }

    if (currentAudio?.id === audio.id) {
      togglePlayPause();
    } else {
      setCurrentAudio(audio);
      setIsPlaying(true);
    }
  }, [currentAudio, togglePlayPause, setCurrentAudio, setIsPlaying]);

  // 查看音频详情
  const handleViewAudio = useCallback((audioId: string) => {
    router.push(`/audio/${audioId}`);
  }, [router]);

  // 查看更多
  const handleViewMore = useCallback((categoryId: string) => {
    router.push(`/browse?category=${categoryId}`);
  }, [router]);

  if (loading) {
    return (
      <div style={{ padding: '24px 0' }}>
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={16}>
            <Card title="精选推荐">
              <Skeleton active paragraph={{ rows: 3 }} />
            </Card>
            <div style={{ marginTop: '24px' }}>
              <Skeleton active paragraph={{ rows: 2 }} />
            </div>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="点击排行">
              <Skeleton active paragraph={{ rows: 4 }} />
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  return (
    <div className="player-bottom-content">
      <Row gutter={[24, 24]}>
        {/* 左侧：精选推荐和各学科音频列表 */}
        <Col xs={24} lg={16}>
          {/* 精选推荐轮播 */}
          <Card
            title={
              <Space>
                <FireOutlined style={{ color: '#ff4d4f' }} />
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  精选推荐（换灯显示内容及封面）
                </span>
              </Space>
            }
            extra={
              <Button 
                type="link" 
                icon={<RightOutlined />}
                onClick={() => router.push('/browse')}
              >
                更多
              </Button>
            }
            styles={{ body: { padding: isMobile ? '16px' : '24px' } }}
            style={{ marginBottom: '24px' }}
          >
            {recommendations.length > 0 ? (
              <Carousel
                autoplay
                autoplaySpeed={4000}
                dots={{ className: 'custom-carousel-dots' }}
                slidesToShow={isMobile ? 1 : 2}
                slidesToScroll={1}
                responsive={[
                  {
                    breakpoint: 768,
                    settings: {
                      slidesToShow: 1,
                      slidesToScroll: 1,
                    }
                  }
                ]}
              >
                {recommendations.map(audio => (
                  <div key={audio.id}>
                    <RecommendationCard
                      audio={audio}
                      onPlay={handlePlayAudio}
                      onView={handleViewAudio}
                      currentAudio={currentAudio || undefined}
                      isPlaying={isPlaying}
                    />
                  </div>
                ))}
              </Carousel>
            ) : (
              <Empty description="暂无推荐内容" />
            )}
          </Card>

          {/* 各学科音频文件列表 */}
          {categories.map(category => (
            <Card
              key={category.id}
              title={
                <Space>
                  <span style={{ fontSize: '16px' }}>{category.icon}</span>
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: category.color }}>
                    {category.name}音频文件列表
                  </span>
                </Space>
              }
              extra={
                <Button 
                  type="link" 
                  size="small"
                  onClick={() => handleViewMore(category.id)}
                >
                  查看更多 →
                </Button>
              }
              styles={{ body: { padding: '16px' } }}
              style={{ marginBottom: '16px' }}
            >
              {categoryAudios[category.id] && categoryAudios[category.id].length > 0 ? (
                <List
                  size="small"
                  dataSource={categoryAudios[category.id]}
                  renderItem={audio => (
                    <AudioListItem
                      audio={audio}
                      onPlay={handlePlayAudio}
                      onView={handleViewAudio}
                      currentAudio={currentAudio || undefined}
                      isPlaying={isPlaying}
                    />
                  )}
                />
              ) : (
                <Empty 
                  image={Empty.PRESENTED_IMAGE_SIMPLE} 
                  description={`暂无${category.name}音频`} 
                  style={{ margin: '16px 0' }}
                />
              )}
            </Card>
          ))}
        </Col>

        {/* 右侧：点击排行模块 */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <FireOutlined style={{ color: '#ff4d4f' }} />
                <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  点击排行
                </span>
              </Space>
            }
            styles={{ body: { padding: '16px' } }}
          >
            {rankingAudios.length > 0 ? (
              <List
                size="small"
                dataSource={rankingAudios}
                renderItem={(audio, index) => (
                  <List.Item
                    style={{ 
                      padding: '8px 0',
                      borderBottom: index < rankingAudios.length - 1 ? '1px solid #f0f0f0' : 'none'
                    }}
                    actions={[
                      <Button
                        key="play"
                        type="text"
                        size="small"
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
                  >
                    <List.Item.Meta
                      avatar={
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: index < 3 ? '#ff4d4f' : '#13C2C2',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          {index + 1}
                        </div>
                      }
                      title={
                        <Text 
                          ellipsis 
                          style={{ fontSize: '14px', cursor: 'pointer' }}
                          onClick={() => handleViewAudio(audio.id)}
                        >
                          {audio.title}
                        </Text>
                      }
                      description={
                        <Space>
                          {audio.categoryName && (
                            <Tag color={audio.categoryColor || '#13C2C2'}>
                              {audio.categoryName}
                            </Tag>
                          )}
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            🎧 {audio.playCount || 0}
                          </Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty 
                image={Empty.PRESENTED_IMAGE_SIMPLE} 
                description="暂无排行数据" 
                style={{ margin: '16px 0' }}
              />
            )}
          </Card>

          {/* 最近更新栏目 */}
          <Card
            title={
              <Space>
                <ClockCircleOutlined style={{ color: '#13C2C2' }} />
                <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  最近更新
                </span>
              </Space>
            }
            styles={{ body: { padding: '16px' } }}
            style={{ marginTop: '16px' }}
          >
            {recentAudios.length > 0 ? (
              <List
                size="small"
                dataSource={recentAudios}
                renderItem={(audio, index) => (
                  <List.Item
                    style={{ 
                      padding: '8px 0',
                      borderBottom: index < recentAudios.length - 1 ? '1px solid #f0f0f0' : 'none'
                    }}
                    actions={[
                      <Button
                        key="play"
                        type="text"
                        size="small"
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
                  >
                    <List.Item.Meta
                      avatar={
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: '#13C2C2',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          {index + 1}
                        </div>
                      }
                      title={
                        <Text 
                          ellipsis 
                          style={{ fontSize: '14px', cursor: 'pointer' }}
                          onClick={() => handleViewAudio(audio.id)}
                        >
                          {audio.title}
                        </Text>
                      }
                      description={
                        <Space>
                          {audio.categoryName && (
                            <Tag color={audio.categoryColor || '#13C2C2'}>
                              {audio.categoryName}
                            </Tag>
                          )}
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {new Date(audio.uploadDate).toLocaleDateString('zh-CN')}
                          </Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty 
                image={Empty.PRESENTED_IMAGE_SIMPLE} 
                description="暂无最近更新" 
                style={{ margin: '16px 0' }}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
