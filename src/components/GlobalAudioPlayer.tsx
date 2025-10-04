'use client';

import '../styles/modern-home.css';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Space,
  Avatar,
  Slider,
  Grid,
  Dropdown,
  message,
  Tag
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  SoundOutlined,
  HeartOutlined,
  ShareAltOutlined,
  ThunderboltOutlined,
  TagOutlined,
  FolderOutlined
} from '@ant-design/icons';
import { useAudioStore } from '../store/audioStore';

const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;

// 截取指定长度的文本
const truncateText = (text: string, maxLength: number) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

interface GlobalAudioPlayerProps {
  sidebarWidth?: number;
  isMobile?: boolean;
}

export default function GlobalAudioPlayer({ sidebarWidth = 320, isMobile = false }: GlobalAudioPlayerProps) {
  const screens = useBreakpoint();
  const { 
    currentAudio, 
    isPlaying, 
    currentTime, 
    duration, 
    playbackRate,
    togglePlayPause,
    setCurrentTime,
    setPlaybackRate
  } = useAudioStore();

  const handlePlayAudio = () => {
    if (currentAudio) {
      togglePlayPause();
    }
  };

  // 判断是否为移动端
  const isActuallyMobile = isMobile || !screens.md;

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

  // 倍速选项
  const speedOptions = [
    { key: '0.5', label: '0.5x' },
    { key: '0.75', label: '0.75x' },
    { key: '1', label: '1x' },
    { key: '1.25', label: '1.25x' },
    { key: '1.5', label: '1.5x' },
    { key: '2', label: '2x' }
  ];

  // 处理倍速变更
  const handleSpeedChange = ({ key }: { key: string }) => {
    const speed = parseFloat(key);
    setPlaybackRate(speed);
  };

  // 倍速菜单
  const speedMenu = {
    items: speedOptions,
    onClick: handleSpeedChange,
    selectedKeys: [playbackRate.toString()]
  };

  // 处理收藏功能
  const handleFavorite = async () => {
    if (!currentAudio) return;
    
    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audioId: currentAudio.id }),
      });

      if (response.ok) {
        message.success('已添加到收藏');
      } else {
        message.error('收藏失败，请稍后重试');
      }
    } catch (error) {
      console.error('收藏操作失败:', error);
      message.error('收藏失败，请检查网络连接');
    }
  };

  // 处理分享功能
  const handleShare = async () => {
    if (!currentAudio) return;

    const shareData = {
      title: currentAudio.title,
      text: currentAudio.description,
      url: `${window.location.origin}/audio/${currentAudio.id}`,
    };

    try {
      // 检查是否支持 Web Share API
      if (navigator.share) {
        await navigator.share(shareData);
        message.success('分享成功');
      } else {
        // 回退到复制链接
        await navigator.clipboard.writeText(shareData.url);
        message.success('链接已复制到剪贴板');
      }
    } catch (error) {
      console.error('分享失败:', error);
      // 如果分享失败，尝试复制链接
      try {
        await navigator.clipboard.writeText(shareData.url);
        message.success('链接已复制到剪贴板');
      } catch (clipboardError) {
        console.error('复制链接失败:', clipboardError);
        message.error('分享失败，请稍后重试');
      }
    }
  };

  // 如果没有当前音频，不显示播放器
  if (!currentAudio) {
    return null;
  }

  return (
    <Card 
      className="modern-player-card"
      style={{ 
        position: 'fixed',
        top: isActuallyMobile ? 72 : 0, // 移动端在Logo栏下方 (64px Logo高度 + 8px间隔)
        left: isActuallyMobile ? 16 : (sidebarWidth + 24), // 添加左边距
        right: isActuallyMobile ? 16 : 24, // 添加右边距
        height: isActuallyMobile ? 'auto' : 'auto', // 移动端也使用自动高度，完整显示内容
        minHeight: isActuallyMobile ? 120 : 'auto', // 移动端最小高度
        zIndex: 1000,
        margin: 0,
        overflow: isActuallyMobile ? 'visible' : 'visible' // 确保内容不被裁剪
      }}
    >
      <Row gutter={[16, 16]} align="middle">
        <Col flex="auto">
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <SoundOutlined 
              className="modern-player-icon"
              style={{ 
                fontSize: isActuallyMobile ? 18 : 20,
                marginRight: 8
              }} 
            />
            <Title level={isActuallyMobile ? 5 : 4} className="modern-player-title">
              {currentAudio.title}
            </Title>
          </div>
          <Paragraph 
            ellipsis={{ rows: isActuallyMobile ? 1 : 2 }} 
            className="modern-player-description"
            style={{ marginBottom: 8 }}
          >
            {truncateText(currentAudio.description || '', 35)}
          </Paragraph>
          
          {/* 分类和标签信息 */}
          <Space size="small" wrap style={{ marginBottom: 8 }}>
            {/* 分类标签 */}
            {(currentAudio.category?.name || currentAudio.categoryName) && (
              <Tag 
                color={currentAudio.category?.color || currentAudio.categoryColor || '#13C2C2'}
                icon={<FolderOutlined />}
                style={{ fontSize: isActuallyMobile ? '11px' : '12px' }}
              >
                {currentAudio.category?.name || currentAudio.categoryName}
              </Tag>
            )}
            
            {/* 子分类标签 */}
            {(currentAudio.subcategory?.name || currentAudio.subcategoryName) && (
              <Tag 
                color="blue"
                style={{ fontSize: isActuallyMobile ? '11px' : '12px' }}
              >
                {currentAudio.subcategory?.name || currentAudio.subcategoryName}
              </Tag>
            )}
            
            {/* 标签列表 */}
            {currentAudio.tags && Array.isArray(currentAudio.tags) && currentAudio.tags.length > 0 && (
              <>
                {currentAudio.tags.slice(0, isActuallyMobile ? 2 : 3).map((tag, index) => {
                  // 处理可能的嵌套JSON字符串
                  let tagText = tag;
                  try {
                    // 处理嵌套的JSON字符串 ["[]"] -> []
                    if (typeof tag === 'string') {
                      if (tag.startsWith('[')) {
                        const parsed = JSON.parse(tag);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                          // 如果解析后是数组，继续解析第一个元素
                          if (typeof parsed[0] === 'string' && parsed[0].startsWith('[')) {
                            const innerParsed = JSON.parse(parsed[0]);
                            tagText = Array.isArray(innerParsed) && innerParsed.length > 0 ? innerParsed[0] : tag;
                          } else {
                            tagText = parsed[0];
                          }
                        }
                      }
                    }
                  } catch {}
                  
                  // 只显示非空标签
                  if (!tagText || tagText === '[]' || tagText === '') {
                    return null;
                  }
                  
                  return (
                    <Tag 
                      key={index}
                      icon={<TagOutlined />}
                      style={{ fontSize: isActuallyMobile ? '11px' : '12px' }}
                    >
                      {tagText}
                    </Tag>
                  );
                }).filter(Boolean)}
                {Array.isArray(currentAudio.tags) && currentAudio.tags.filter(t => t && t !== '[]' && t !== '').length > (isActuallyMobile ? 2 : 3) && (
                  <Tag style={{ fontSize: isActuallyMobile ? '11px' : '12px' }}>
                    +{currentAudio.tags.filter(t => t && t !== '[]' && t !== '').length - (isActuallyMobile ? 2 : 3)}
                  </Tag>
                )}
              </>
            )}
          </Space>
          
          <Space size="small">
            <Text className="modern-player-meta">
              {currentAudio.subject}
            </Text>
            <Text className="modern-player-meta">
              {new Date(currentAudio.uploadDate).toLocaleDateString('zh-CN')}
            </Text>
          </Space>
        </Col>
        <Col flex="none">
          <Space size={isActuallyMobile ? 16 : 12}>
            <Button
              className="modern-player-btn-primary"
              shape="circle"
              size={isActuallyMobile ? 'small' : 'large'}
              icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={handlePlayAudio}
            />
            
            {/* 倍速控制按钮 - 移动端和桌面端都显示 */}
            <Dropdown menu={speedMenu} trigger={['click']} placement="top">
              <Button
                className="modern-player-btn"
                shape="circle"
                size={isActuallyMobile ? 'small' : 'large'}
                icon={<ThunderboltOutlined />}
                title={`播放速度: ${playbackRate}x`}
                style={{ 
                  color: playbackRate !== 1 ? '#6366f1' : undefined,
                  borderColor: playbackRate !== 1 ? '#6366f1' : undefined
                }}
              />
            </Dropdown>
            
            {/* 收藏和分享按钮 - 移动端和桌面端都显示 */}
            <Button
              className="modern-player-btn"
              shape="circle"
              size={isActuallyMobile ? 'small' : 'large'}
              icon={<HeartOutlined />}
              title="收藏"
              onClick={handleFavorite}
            />
            <Button
              className="modern-player-btn"
              shape="circle"
              size={isActuallyMobile ? 'small' : 'large'}
              icon={<ShareAltOutlined />}
              title="分享"
              onClick={handleShare}
            />
          </Space>
        </Col>
      </Row>

      {/* 进度条和时间显示 */}
      <Row style={{ marginTop: 16 }}>
        <Col span={24}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Text className="modern-player-time">
              {formatTime(currentTime)}
            </Text>
            
            <div style={{ flex: 1 }} className="modern-player-slider">
              <Slider
                value={duration ? (currentTime / duration) * 100 : 0}
                onChange={handleProgressChange}
                tooltip={{ 
                  formatter: (value) => {
                    if (!duration || !value) return '0:00';
                    const time = (value / 100) * duration;
                    return formatTime(time);
                  }
                }}
                style={{ margin: 0 }}
              />
            </div>
            
            <Text className="modern-player-time">
              {formatTime(duration)}
            </Text>
          </div>
        </Col>
      </Row>


    </Card>
  );
}