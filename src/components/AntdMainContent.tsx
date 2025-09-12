'use client';

import { useState, useEffect } from 'react';
import '../styles/special-carousel.css';
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
  Progress
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

export default function AntdMainContent() {
  const screens = useBreakpoint();
  const [recentUpdates, setRecentUpdates] = useState<AudioFile[]>([]);
  const [categorizedContent, setCategorizedContent] = useState<CategorizedContent[]>([]);
  const [recommendations, setRecommendations] = useState<AudioFile[]>([]);
  const [specialRecommendations, setSpecialRecommendations] = useState<AudioFile[]>([]);
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
      console.log('🏠 首页开始获取内容...');
      
      // 获取最近更新的音频
      console.log('1. 获取最近更新的音频...');
      const recentResponse = await fetch('/api/audio-fixed?limit=8&sortBy=upload_date&sortOrder=desc');
      console.log('Recent response status:', recentResponse.status);
      if (recentResponse.ok) {
        const recentResult = await recentResponse.json();
        console.log('Recent result:', recentResult);
        if (recentResult.success && recentResult.data) {
          console.log('Recent data:', recentResult.data.length, 'items');
          setRecentUpdates(recentResult.data);
        } else {
          console.log('No recent data found');
          setRecentUpdates([]);
        }
      }

      // 获取所有音频并按分类分组
      console.log('2. 获取所有音频...');
      const allResponse = await fetch('/api/audio-fixed?limit=50');
      console.log('All response status:', allResponse.status);
      if (allResponse.ok) {
        const allResult = await allResponse.json();
        console.log('All result:', allResult);
        let allData = [];
        if (allResult.success && allResult.data) {
          allData = allResult.data;
          console.log('All data:', allData.length, 'items');
        } else {
          console.log('No audio data found');
          allData = [];
        }
        
        // 获取层级分类数据
        console.log('3. 获取层级分类数据...');
        const categoriesResponse = await fetch('/api/categories?format=tree&includeCount=true');
        console.log('Categories response status:', categoriesResponse.status);
        let categories: Category[] = [];
        if (categoriesResponse.ok) {
          const categoriesResult = await categoriesResponse.json();
          console.log('Categories result:', categoriesResult);
          
          // 处理层级分类数据
          let categoriesData = [];
          if (categoriesResult.success && categoriesResult.data) {
            categoriesData = categoriesResult.data;
          } else if (Array.isArray(categoriesResult)) {
            categoriesData = categoriesResult;
          }
          
          console.log('Categories data:', categoriesData.length, 'items');
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
          // 如果获取分类失败，使用默认分类
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
            { 
              id: 'surgery', 
              name: '外科', 
              color: '#FAAD14', 
              icon: '🔬',
              level: 1,
              sortOrder: 2,
              isActive: true,
              children: []
            },
            { 
              id: 'pediatrics', 
              name: '儿科', 
              color: '#13C2C2', 
              icon: '👶',
              level: 1,
              sortOrder: 3,
              isActive: true,
              children: []
            },
          ];
        }

        // 只显示一级分类，并匹配其下的所有音频
        const primaryCategories = categories.filter(cat => cat.level === 1);
        
        const categorized = primaryCategories.map(category => {
          // 获取该一级分类下的所有二级分类ID
          const subcategoryIds = category.children?.map(child => child.id) || [];
          const allCategoryIds = [category.id, ...subcategoryIds];
          
          const matchedAudios = allData.filter((audio: AudioFile) => {
            // 使用新的层级分类匹配
            if (audio.categoryId && allCategoryIds.includes(audio.categoryId)) {
              return true;
            }
            if (audio.subcategoryId && allCategoryIds.includes(audio.subcategoryId)) {
              return true;
            }
            
            // 简单的 subject 匹配作为后备
            if (audio.subject && audio.subject.toLowerCase().includes(category.name.toLowerCase())) {
              return true;
            }
            
            return false;
          }).slice(0, 6);
          
          return {
            category,
            audios: matchedAudios,
            showMore: true
          };
        });

        setCategorizedContent(categorized);
        console.log('Categorized content set:', categorized.length, 'categories');
        
        // 设置推荐内容
        console.log('4. 设置推荐内容...');
        if (allData.length > 0) {
          const recommendationsData = allData.slice(0, 4);
          console.log('Recommendations data:', recommendationsData.length, 'items');
          setRecommendations(recommendationsData);
          
          // 设置特别推荐内容
          const specialRecommendationsData = allData.slice(0, 4);
          console.log('Special recommendations data:', specialRecommendationsData.length, 'items');
          setSpecialRecommendations(specialRecommendationsData);
        } else if (recentUpdates.length > 0) {
          // 如果没有音频数据，使用最近更新的数据
          console.log('5. 使用最近更新作为推荐内容...');
          const fallbackRecommendations = recentUpdates.slice(0, 4);
          console.log('Fallback recommendations:', fallbackRecommendations.length, 'items');
          setRecommendations(fallbackRecommendations);
          setSpecialRecommendations(fallbackRecommendations);
        } else {
          console.log('6. 没有可用的推荐内容');
          setRecommendations([]);
          setSpecialRecommendations([]);
        }
      }
    } catch (error) {
      console.error('❌ 获取内容失败:', error);
      // 设置空数组以避免渲染错误
      setRecentUpdates([]);
      setRecommendations([]);
      setSpecialRecommendations([]);
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
    // 支持层级分类导航
    router.push(`/browse?category=${encodeURIComponent(categoryName)}`);
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
      paddingTop: 164, // 为顶部播放器留出固定间隙，避免遮挡内容 (24px + 120px + 20px)
      paddingBottom: 120 // 为底部用户信息卡片留出空间
    }}>
      
      {/* 主要布局：左右分栏 */}
      <Row gutter={[24, 24]}>
        {/* 左侧内容区 */}
        <Col xs={24} lg={16}>
          
          {/* 精选推荐横幅 */}
      {!loading && recommendations.length > 0 && (
        <Card 
          title={
            <Space>
              <FireOutlined style={{ color: '#13C2C2' }} />
              <span className="elegant-gradient-text" style={{ fontSize: isMobile ? 14 : 16 }}>精选推荐</span>
            </Space>
          }
          className="elegant-hover-lift recommendation-card-unified"
          style={{ marginBottom: isMobile ? 16 : 24 }}
        >
          <Carousel autoplay dots={{ className: 'custom-dots' }}>
            {recommendations.map(audio => (
              <div key={audio.id}>
                <Card
                  hoverable
                  className="elegant-recommendation-banner featured-recommendation-content"
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






          {/* 层级分类展示 */}
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
                    {/* 显示二级分类数量 */}
                    {category.children && category.children.length > 0 && (
                      <Tag color="default" style={{ fontSize: 11 }}>
                        {category.children.length} 个子分类
                      </Tag>
                    )}
                  </Space>
                }
                extra={
                  <Space>
                    {/* 二级分类快速导航 */}
                    {category.children && category.children.length > 0 && (
                      <Space size="small" wrap>
                        {category.children.slice(0, 3).map(subcategory => (
                          <Button
                            key={subcategory.id}
                            size="small"
                            type="text"
                            style={{ 
                              fontSize: 11, 
                              padding: '0 6px',
                              color: category.color,
                              border: `1px solid ${category.color}20`
                            }}
                            onClick={() => handleViewCategory(subcategory.name)}
                          >
                            {subcategory.name}
                          </Button>
                        ))}
                        {category.children.length > 3 && (
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            +{category.children.length - 3}
                          </Text>
                        )}
                      </Space>
                    )}
                    <Button 
                      type="link" 
                      icon={<RightOutlined />}
                      onClick={() => handleViewCategory(category.name)}
                    >
                      查看更多
                    </Button>
                  </Space>
                }
                style={{ marginBottom: 24 }}
              >
                {/* 二级分类导航栏（如果有的话） */}
                {category.children && category.children.length > 0 && (
                  <div style={{ marginBottom: 16, padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <Text type="secondary" style={{ fontSize: 12, marginRight: 8 }}>
                      子分类：
                    </Text>
                    <Space size="small" wrap>
                      <Button
                        size="small"
                        type="default"
                        onClick={() => handleViewCategory(category.name)}
                        style={{ fontSize: 11 }}
                      >
                        全部
                      </Button>
                      {category.children.map(subcategory => (
                        <Button
                          key={subcategory.id}
                          size="small"
                          type="text"
                          onClick={() => handleViewCategory(subcategory.name)}
                          style={{ 
                            fontSize: 11,
                            color: category.color,
                            borderColor: `${category.color}40`
                          }}
                        >
                          {subcategory.name}
                          {subcategory.audioCount !== undefined && (
                            <span style={{ marginLeft: 4, opacity: 0.7 }}>
                              ({subcategory.audioCount})
                            </span>
                          )}
                        </Button>
                      ))}
                    </Space>
                  </div>
                )}

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
                              {/* 显示分类路径 */}
                              <div style={{ marginBottom: 4 }}>
                                {audio.categoryId && audio.subcategoryId ? (
                                  <Text type="secondary" style={{ fontSize: 10 }}>
                                    {category.name} &gt; {
                                      category.children?.find(c => c.id === audio.subcategoryId)?.name || 
                                      audio.subject
                                    }
                                  </Text>
                                ) : (
                                  <Tag color={category.color} style={{ fontSize: 10, padding: '0 4px' }}>
                                    {audio.subject || category.name}
                                  </Tag>
                                )}
                              </div>
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
          {!loading && recentUpdates.length === 0 && categorizedContent.every(c => c.audios.length === 0) && (
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
          


          {/* 特别推荐栏目 - 右侧栏版本 */}
          {!loading && specialRecommendations.length > 0 && (
            <Card 
              title={
                <Space>
                  <FireOutlined style={{ color: '#ff6b35' }} />
                  <span style={{ 
                    fontSize: 14,
                    background: 'linear-gradient(45deg, #ff6b35, #f7931e)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontWeight: 'bold'
                  }}>
                    最新更新
                  </span>
                </Space>
              }
              className="recommendation-card-unified"
              style={{ 
                marginBottom: 16,
                border: '2px solid #ff6b35',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(255, 107, 53, 0.15)'
              }}
            >
              <Carousel 
                autoplay 
                autoplaySpeed={4000}
                dots={true}
                effect="fade"
              >
                {specialRecommendations.map((audio, index) => (
                  <div key={audio.id}>
                    <div
                      className="special-recommendation-content"
                      style={{
                        background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
                        borderRadius: '8px',
                        padding: '16px',
                        color: 'white',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleViewAudio(audio.id)}
                    >
                      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                        <Tag 
                          style={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            border: 'none',
                            color: 'white',
                            fontSize: '11px'
                          }}
                        >
                          #{index + 1} 最新推荐
                        </Tag>
                      </div>
                      
                      <div style={{ textAlign: 'center', marginBottom: '8px', flex: '0 0 auto' }}>
                        {audio.coverImage ? (
                          <img 
                            src={audio.coverImage} 
                            alt={audio.title}
                            style={{
                              width: '80px',
                              height: '80px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '2px solid rgba(255,255,255,0.3)'
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto',
                            border: '2px solid rgba(255,255,255,0.3)'
                          }}>
                            <SoundOutlined 
                              style={{ 
                                fontSize: 24, 
                                color: 'white'
                              }} 
                            />
                          </div>
                        )}
                      </div>
                      
                      <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <Title 
                          level={5} 
                          style={{ 
                            color: 'white', 
                            marginBottom: 6,
                            textAlign: 'center'
                          }}
                          ellipsis
                        >
                          {audio.title}
                        </Title>
                        
                        <Paragraph 
                          style={{ 
                            color: 'rgba(255,255,255,0.9)', 
                            marginBottom: 8,
                            fontSize: 12,
                            textAlign: 'center'
                          }}
                          ellipsis={{ rows: 2 }}
                        >
                          {audio.description ? 
                            (audio.description.length > 35 ? 
                              audio.description.substring(0, 35) + '...' : 
                              audio.description) : 
                            '精彩内容，值得收听'}
                        </Paragraph>
                      </div>
                      
                      <div style={{ textAlign: 'center', flex: '0 0 auto' }}>
                        <Space size="small" direction="vertical">
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
                          
                          <div>
                            <Tag 
                              style={{ 
                                backgroundColor: 'rgba(255,255,255,0.2)', 
                                border: '1px solid rgba(255,255,255,0.3)', 
                                color: 'white',
                                fontSize: '11px'
                              }}
                            >
                              {audio.subject}
                            </Tag>
                          </div>
                        </Space>
                      </div>
                    </div>
                  </div>
                ))}
              </Carousel>
            </Card>
          )}

          {/* 最近更新 - 右侧栏版本 */}
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
                dataSource={recentUpdates.slice(0, 4)}
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