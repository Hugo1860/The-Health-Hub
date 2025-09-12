'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  List,
  Typography,
  Button,
  Space,
  Avatar,
  Tag,
  Divider,
  Grid,
  Skeleton
} from 'antd';
import {
  SoundOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ClockCircleOutlined,
  RightOutlined,
  FireOutlined
} from '@ant-design/icons';
import { useAudioStore } from '../store/audioStore';

interface AudioFile {
  id: string;
  title: string;
  description?: string;
  url?: string;
  filename?: string;
  uploadDate: string;
  categoryId?: string;
  subcategoryId?: string;
  tags?: string[];
  speaker?: string;
  recordingDate?: string;
  duration?: number;
  coverImage?: string;
  status?: string;
  category?: {
    id: string;
    name: string;
    color?: string;
    icon?: string;
  };
  subcategory?: {
    id: string;
    name: string;
  };
}

const { Title, Text } = Typography;
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

export default function LeftSidebar() {
  const screens = useBreakpoint();
  const [recentUpdates, setRecentUpdates] = useState<AudioFile[]>([]);
  const [categorizedContent, setCategorizedContent] = useState<CategorizedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const { 
    currentAudio, 
    isPlaying, 
    setCurrentAudio, 
    setIsPlaying,
    togglePlayPause
  } = useAudioStore();
  const router = useRouter();

  // 判断是否为移动端
  const isMobile = !screens.md;

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      console.log('🏠 左侧导航开始获取内容...');
      
      // 获取最近更新的音频
      const recentResponse = await fetch('/api/audio-fixed?limit=6&sortBy=upload_date&sortOrder=desc');
      if (recentResponse.ok) {
        const recentResult = await recentResponse.json();
        if (recentResult.success && recentResult.data) {
          setRecentUpdates(recentResult.data);
        }
      }

      // 获取分类内容
      const allResponse = await fetch('/api/audio-fixed?limit=30');
      if (allResponse.ok) {
        const allResult = await allResponse.json();
        let allData = [];
        if (allResult.success && allResult.data) {
          allData = allResult.data;
        }
        
        // 获取层级分类数据
        const categoriesResponse = await fetch('/api/categories?format=tree&includeCount=true');
        let categories: Category[] = [];
        if (categoriesResponse.ok) {
          const categoriesResult = await categoriesResponse.json();
          let categoriesData = [];
          if (categoriesResult.success && categoriesResult.data) {
            categoriesData = categoriesResult.data;
          } else if (Array.isArray(categoriesResult)) {
            categoriesData = categoriesResult;
          }
          
          categories = categoriesData.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            description: cat.description,
            color: cat.color || '#13C2C2',
            icon: cat.icon || '📝',
            parentId: cat.parentId,
            level: cat.level || 1,
            sortOrder: cat.sortOrder || 0,
            isActive: cat.isActive !== false,
            children: cat.children || [],
            audioCount: cat.audioCount || 0
          }));
        } else {
          // 默认分类
          categories = [
            { 
              id: 'cardiology', 
              name: '心血管', 
              color: '#13C2C2', 
              icon: '❤️',
              level: 1,
              sortOrder: 0,
              isActive: true,
              children: []
            },
            { 
              id: 'neurology', 
              name: '神经科', 
              color: '#FAAD14', 
              icon: '🧠',
              level: 1,
              sortOrder: 1,
              isActive: true,
              children: []
            },
          ];
        }

        // 只显示一级分类，并匹配其下的所有音频
        const primaryCategories = categories.filter(cat => cat.level === 1);
        
        const categorized = primaryCategories.map(category => {
          const subcategoryIds = category.children?.map(child => child.id) || [];
          const allCategoryIds = [category.id, ...subcategoryIds];
          
          const matchedAudios = allData.filter((audio: AudioFile) => {
            if (audio.categoryId && allCategoryIds.includes(audio.categoryId)) {
              return true;
            }
            if (audio.subcategoryId && allCategoryIds.includes(audio.subcategoryId)) {
              return true;
            }
            return false;
          }).slice(0, 4);
          
          return {
            category,
            audios: matchedAudios,
            showMore: true
          };
        });

        setCategorizedContent(categorized);
      }
    } catch (error) {
      console.error('❌ 获取左侧导航内容失败:', error);
      setRecentUpdates([]);
      setCategorizedContent([]);
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
    return (
      <div>
        <Skeleton active paragraph={{ rows: 4 }} />
        <Divider />
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  return (
    <div>
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
          size="small"
        >
          <List
            dataSource={recentUpdates.slice(0, 6)}
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
                      <Tag color="blue" style={{ fontSize: '10px', padding: '0 4px' }}>
                        {audio.category?.name || '未分类'}
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

      {/* 分类导航 */}
      {categorizedContent.map(({ category, audios }) => (
        audios.length > 0 && (
          <Card
            key={category.id}
            title={
              <Space>
                <span style={{ fontSize: 16 }}>{category.icon}</span>
                <span style={{ fontSize: 13 }}>{category.name}</span>
                <Tag color={category.color} style={{ fontSize: 10 }}>
                  {audios.length}
                </Tag>
              </Space>
            }
            extra={
              <Button 
                type="link" 
                size="small"
                icon={<RightOutlined />}
                onClick={() => handleViewCategory(category.name)}
              >
                更多
              </Button>
            }
            style={{ marginBottom: 16 }}
            size="small"
          >
            <List
              dataSource={audios}
              renderItem={audio => (
                <List.Item style={{ padding: '6px 0' }}>
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        size="small"
                        style={{ backgroundColor: category.color }}
                        icon={<SoundOutlined />}
                      />
                    }
                    title={
                      <Text 
                        ellipsis 
                        style={{ fontSize: 12, cursor: 'pointer' }}
                        onClick={() => handleViewAudio(audio.id)}
                      >
                        {audio.title}
                      </Text>
                    }
                    description={
                      <Text type="secondary" style={{ fontSize: 10 }}>
                        {new Date(audio.uploadDate).toLocaleDateString('zh-CN')}
                      </Text>
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
        )
      ))}
    </div>
  );
}