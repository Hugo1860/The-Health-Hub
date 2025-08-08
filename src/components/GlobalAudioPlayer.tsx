'use client';


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
  message
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  SoundOutlined,
  HeartOutlined,
  ShareAltOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { useAudioStore } from '../store/audioStore';

const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;

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
      className="elegant-player-card elegant-hover-lift"
      style={{ 
        position: 'fixed',
        top: isActuallyMobile ? 72 : 0, // 移动端在Logo栏下方 (64px Logo高度 + 8px间隔)
        left: isActuallyMobile ? 16 : (sidebarWidth + 24), // 添加左边距
        right: isActuallyMobile ? 16 : 24, // 添加右边距
        height: isActuallyMobile ? 64 : 'auto', // 移动端固定高度
        zIndex: 1000,
        margin: 0,
        borderRadius: 12, // 恢复圆角
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        backgroundColor: '#fff'
      }}
    >
      <Row gutter={[16, 16]} align="middle">
        <Col flex="auto">
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <SoundOutlined 
              style={{ 
                fontSize: isActuallyMobile ? 18 : 20, // 比字体稍大
                color: '#13C2C2',
                marginRight: 8
              }} 
            />
            <Title level={isActuallyMobile ? 5 : 4} style={{ margin: 0 }}>
              {currentAudio.title}
            </Title>
          </div>
          <Paragraph 
            ellipsis={{ rows: isActuallyMobile ? 1 : 2 }} 
            style={{ margin: 0, marginBottom: 8, color: '#666', fontSize: isActuallyMobile ? 12 : 14 }}
          >
            {currentAudio.description}
          </Paragraph>
          <Space size="small">
            <Text type="secondary" style={{ fontSize: isActuallyMobile ? 11 : 14 }}>
              {currentAudio.subject}
            </Text>
            <Text type="secondary" style={{ fontSize: isActuallyMobile ? 11 : 14 }}>
              {new Date(currentAudio.uploadDate).toLocaleDateString('zh-CN')}
            </Text>
          </Space>
        </Col>
        <Col flex="none">
          <Space size={isActuallyMobile ? 16 : 12}>
            <Button
              type="primary"
              shape="circle"
              size={isActuallyMobile ? 'small' : 'large'}
              icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={handlePlayAudio}
            />
            
            {/* 倍速控制按钮 - 移动端和桌面端都显示 */}
            <Dropdown menu={speedMenu} trigger={['click']} placement="topCenter">
              <Button
                shape="circle"
                size={isActuallyMobile ? 'small' : 'large'}
                icon={<ThunderboltOutlined />}
                title={`播放速度: ${playbackRate}x`}
                style={{ 
                  color: playbackRate !== 1 ? '#13C2C2' : undefined,
                  borderColor: playbackRate !== 1 ? '#13C2C2' : undefined
                }}
              />
            </Dropdown>
            
            {/* 收藏和分享按钮 - 移动端和桌面端都显示 */}
            <Button
              shape="circle"
              size={isActuallyMobile ? 'small' : 'large'}
              icon={<HeartOutlined />}
              title="收藏"
              onClick={handleFavorite}
            />
            <Button
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
            <Text 
              style={{ 
                fontSize: isActuallyMobile ? 11 : 12, 
                fontFamily: 'monospace',
                minWidth: isActuallyMobile ? 35 : 40,
                color: '#666'
              }}
            >
              {formatTime(currentTime)}
            </Text>
            
            <div style={{ flex: 1 }}>
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
                styles={{
                  track: { backgroundColor: '#13C2C2' },
                  handle: { 
                    borderColor: '#13C2C2',
                    backgroundColor: '#13C2C2'
                  }
                }}
                style={{ margin: 0 }}
              />
            </div>
            
            <Text 
              style={{ 
                fontSize: isActuallyMobile ? 11 : 12, 
                fontFamily: 'monospace',
                minWidth: isActuallyMobile ? 35 : 40,
                color: '#666'
              }}
            >
              {formatTime(duration)}
            </Text>
          </div>
        </Col>
      </Row>


    </Card>
  );
}