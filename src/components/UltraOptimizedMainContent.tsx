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
import '../styles/modern-home.css';

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

// 极简缓存策略 - 优化为内存和localStorage结合
const simpleCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TIME = 15 * 60 * 1000; // 15分钟缓存

// 内存缓存辅助函数
const getFromMemoryCache = (key: string) => {
  const cached = simpleCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TIME) {
    return cached.data;
  }
  return null;
};

const setToMemoryCache = (key: string, data: any) => {
  simpleCache.set(key, { data, timestamp: Date.now() });
};

// 本地存储缓存辅助函数
const getFromLocalStorage = (key: string) => {
  try {
    const stored = localStorage.getItem(`home_cache_${key}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Date.now() - parsed.timestamp < CACHE_TIME) {
        return parsed.data;
      }
    }
  } catch (error) {
    console.warn('LocalStorage cache read failed:', error);
  }
  return null;
};

const setToLocalStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(`home_cache_${key}`, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.warn('LocalStorage cache write failed:', error);
  }
};

// 统一的缓存获取函数 - 优先使用内存缓存，回退到本地存储
const getCache = (key: string) => {
  // 首先尝试内存缓存
  let cached = getFromMemoryCache(key);
  if (cached) {
    console.log('📦 使用内存缓存数据');
    return cached;
  }

  // 回退到本地存储缓存
  cached = getFromLocalStorage(key);
  if (cached) {
    console.log('💾 使用本地存储缓存数据');
    // 同时更新内存缓存
    setToMemoryCache(key, cached);
    return cached;
  }

  return null;
};

// 统一的缓存设置函数 - 同时更新内存和本地存储
const setCache = (key: string, data: any) => {
  setToMemoryCache(key, data);
  setToLocalStorage(key, data);
};

// 优化的音频卡片组件 - 应用现代 iOS 风格
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
    className="modern-audio-card"
    style={{ height: '120px' }}
    actions={[
      <Button
        key="play"
        type="text"
        size="small"
        className="modern-play-btn"
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
        className="modern-btn-secondary"
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
          className="modern-avatar"
          style={{ backgroundColor: category.color || '#13C2C2' }}
          icon={<SoundOutlined />}
        />
      }
      title={
        <Text ellipsis className="modern-title" style={{ fontSize: 13 }}>
          {audio.title}
        </Text>
      }
      description={
        <div>
          <Text type="secondary" className="modern-text" style={{ fontSize: 11 }}>
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

  // 极简数据获取 - 使用 AbortController 实现请求取消
  const fetchEssentialContent = useCallback(async () => {
    const startTime = performance.now();
    console.log('⚡ 极速加载首页内容...');

    // 创建 AbortController 用于取消请求
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

    try {
      // 多层缓存检查
      const cached = getCache('essential-content');
      if (cached) {
        console.log('📦 使用缓存数据');
        setRecentUpdates(cached.recent);
        setCategorizedContent(cached.categorized);
        setLoading(false);
        clearTimeout(timeoutId);
        return;
      }

      // 使用超快的首页API获取数据，添加超时控制
      const response = await fetch('/api/home-fast?limit=8&sortBy=uploadDate&sortOrder=desc&includeCategories=true', {
        signal: controller.signal,
        priority: 'high' // 设置高优先级
      });

      if (response.ok) {
        const result = await response.json();

        // 性能监控
        const fetchTime = performance.now() - startTime;
        console.log(`📊 API响应时间: ${fetchTime.toFixed(2)}ms`);

        if (result.success && result.data) {
          const audios = result.data;
          setRecentUpdates(audios);

          // 优化分组逻辑：使用 Map 提高性能
          const grouped = new Map<string, AudioFile[]>();
          audios.forEach((audio: AudioFile) => {
            const key = audio.subject || '其他';
            if (!grouped.has(key)) {
              grouped.set(key, []);
            }
            const group = grouped.get(key)!;
            if (group.length < 2) { // 每个分类最多2个
              group.push(audio);
            }
          });

          const categorized = Array.from(grouped.entries()).slice(0, 3).map(([name, audios]) => ({
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

          // 双层缓存存储
          setCache('essential-content', {
            recent: audios,
            categorized
          });

          const totalTime = performance.now() - startTime;
          console.log(`✅ 极速加载完成: ${audios.length} 项，总耗时: ${totalTime.toFixed(2)}ms`);
        }
      } else {
        throw new Error(`API响应错误: ${response.status}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.warn('❌ 请求超时，已取消');
        } else {
          console.error('❌ 加载失败:', error.message);
        }
      } else {
        console.error('❌ 加载失败:', error);
      }

      // 降级策略：使用空数据避免空白页面
      setRecentUpdates([]);
      setCategorizedContent([]);

      const fallbackTime = performance.now() - startTime;
      console.log(`⚠️ 使用降级策略，耗时: ${fallbackTime.toFixed(2)}ms`);
    } finally {
      clearTimeout(timeoutId);
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
          background: 'linear-gradient(135deg, #34c9ff 0%, #6366f1 100%)',
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
      <div className="modern-home-container modern-skeleton">
        <Skeleton active paragraph={{ rows: 2 }} />
        <div style={{ margin: '16px 0' }} />
        <Skeleton active paragraph={{ rows: 3 }} />
      </div>
    );
  }

  return (
    <div className="modern-home-container">
      {/* 播放器下方内容区域 */}
      <PlayerBottomContent />
    </div>
  );
}
