'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
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
import PlayerBottomContent from './PlayerBottomContent';

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
}

// 极简缓存策略
const simpleCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TIME = 15 * 60 * 1000; // 15分钟缓存

const getCache = (key: string) => {
  const cached = simpleCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TIME) {
    return cached.data;
  }
  return null;
};

const setCache = (key: string, data: any) => {
  simpleCache.set(key, { data, timestamp: Date.now() });
};

// 优化的音频卡片组件
const AudioCard = memo(({ audio, category, onPlay, onView, currentAudio, isPlaying }: {
  audio: AudioFile;
  category: Category;
  onPlay: (audio: AudioFile) => void;
  onView: (audioId: string) => void;
  currentAudio?: AudioFile;
  isPlaying: boolean;
}) => (
  <Card
    hoverable
    size="small"
    style={{ height: '120px' }}
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
        onClick={() => onPlay(audio)}
      >
        {currentAudio?.id === audio.id && isPlaying ? '暂停' : '播放'}
      </Button>,
      <Button
        key="view"
        type="text"
        size="small"
        onClick={() => onView(audio.id)}
      >
        详情
      </Button>
    ]}
  >
    <Card.Meta
      avatar={
        <Avatar 
          size="small"
          style={{ backgroundColor: category.color || '#13C2C2' }}
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
          <Text type="secondary" style={{ fontSize: 11 }}>
            {new Date(audio.uploadDate).toLocaleDateString('zh-CN')}
          </Text>
        </div>
      }
    />
  </Card>
));

AudioCard.displayName = 'AudioCard';

export default function UltraOptimizedMainContent() {
  const screens = useBreakpoint();
  const [loading, setLoading] = useState(true);
  const [recentUpdates, setRecentUpdates] = useState<AudioFile[]>([]);
  const [categorizedContent, setCategorizedContent] = useState<CategorizedContent[]>([]);
  const [hasMoreContent, setHasMoreContent] = useState(false);
  
  const { 
    currentAudio, 
    isPlaying, 
    setCurrentAudio, 
    setIsPlaying,
    togglePlayPause
  } = useAudioStore();
  const router = useRouter();

  const isMobile = !screens.md;

  // 极简数据获取
  const fetchEssentialContent = useCallback(async () => {
    console.log('⚡ 极速加载首页内容...');
    
    try {
      // 只获取最必要的数据
      const cached = getCache('essential-content');
      if (cached) {
        console.log('📦 使用缓存数据');
        setRecentUpdates(cached.recent);
        setCategorizedContent(cached.categorized);
        setLoading(false);
        return;
      }

      // 使用已验证的API获取数据
      const response = await fetch('/api/audio-fixed?limit=8&sortBy=upload_date&sortOrder=desc');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const audios = result.data;
          setRecentUpdates(audios);
          
          // 简单分组：按subject分类
          const grouped = audios.reduce((acc: { [key: string]: AudioFile[] }, audio: AudioFile) => {
            const key = audio.subject || '其他';
            if (!acc[key]) acc[key] = [];
            if (acc[key].length < 2) { // 每个分类最多2个
              acc[key].push(audio);
            }
            return acc;
          }, {});

          const categorized = Object.entries(grouped).slice(0, 3).map(([name, audios]) => ({
            category: {
              id: name.toLowerCase(),
              name,
              color: '#13C2C2',
              icon: '📝',
              level: 1 as const,
              sortOrder: 0,
              isActive: true
            },
            audios
          }));

          setCategorizedContent(categorized);
          setHasMoreContent(audios.length >= 8);

          // 缓存结果
          setCache('essential-content', {
            recent: audios,
            categorized
          });

          console.log(`✅ 极速加载完成: ${audios.length} 项`);
        }
      }
    } catch (error) {
      console.error('❌ 加载失败:', error);
      setRecentUpdates([]);
      setCategorizedContent([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEssentialContent();
  }, [fetchEssentialContent]);

  // 优化的事件处理
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

  // 简化的推荐轮播
  const featuredContent = useMemo(() => {
    if (loading || recentUpdates.length === 0) return null;

    const featured = recentUpdates[0]; // 只显示第一个作为特色内容
    
    return (
      <Card 
        style={{ 
          marginBottom: 16,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          color: 'white'
        }}
      >
        <Row gutter={16} align="middle">
          <Col span={isMobile ? 24 : 16}>
            <Title level={isMobile ? 4 : 3} style={{ color: 'white', marginBottom: 8 }}>
              🔥 今日推荐
            </Title>
            <Title level={isMobile ? 5 : 4} style={{ color: 'white', marginBottom: 8 }}>
              {featured.title}
            </Title>
            <Space>
              <Button 
                size={isMobile ? 'small' : 'middle'}
                icon={<PlayCircleOutlined />}
                onClick={() => handlePlayAudio(featured)}
              >
                立即播放
              </Button>
              <Button 
                size={isMobile ? 'small' : 'middle'}
                type="link"
                style={{ color: 'white' }}
                onClick={() => handleViewAudio(featured.id)}
              >
                查看详情
              </Button>
            </Space>
          </Col>
          {!isMobile && (
            <Col span={8} style={{ textAlign: 'center' }}>
              <Avatar
                size={64}
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                icon={<SoundOutlined style={{ fontSize: 24, color: 'white' }} />}
              />
            </Col>
          )}
        </Row>
      </Card>
    );
  }, [loading, recentUpdates, isMobile, handlePlayAudio, handleViewAudio]);

  // 加载状态
  if (loading) {
    return (
      <div style={{ paddingTop: 30, paddingBottom: 120 }}>
        <Skeleton active paragraph={{ rows: 2 }} />
        <div style={{ margin: '16px 0' }} />
        <Skeleton active paragraph={{ rows: 3 }} />
      </div>
    );
  }

  return (
    <div style={{ 
      paddingTop: 30,
      paddingBottom: 120
    }}>

      {/* 播放器下方内容区域 */}
      <PlayerBottomContent />
    </div>
  );
}
