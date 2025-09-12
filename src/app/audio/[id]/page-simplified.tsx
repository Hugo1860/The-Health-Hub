'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Row,
  Col,
  Card,
  Typography,
  Button,
  Space,
  Tag,
  Rate,
  Avatar,
  List,
  Input,
  Spin,
  Alert,
  App
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  HeartOutlined,
  HeartFilled,
  UserOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  SoundOutlined,
  MessageOutlined
} from '@ant-design/icons';
import AntdHomeLayout from '../../../components/AntdHomeLayout';
import { useAudioStore } from '../../../store/audioStore';
import ShareButton from '../../../components/ShareButton';

const { Title, Text } = Typography;
const { TextArea } = Input;

// 简化的接口定义
interface Audio {
  id: string;
  title: string;
  description?: string;
  url: string;
  speaker?: string;
  duration?: number;
  coverImage?: string;
  uploadDate: string;
  category?: { name: string; color: string; icon: string };
  subcategory?: { name: string };
}

interface Comment {
  id: string;
  content: string;
  username: string;
  createdAt: string;
}

// 简化的工具函数
const formatDuration = (seconds?: number) => {
  if (!seconds) return '未知';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-CN');
};

const fixAudioUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return url;
  return `/uploads/${url}`;
};

function AudioDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { currentAudio, playAudio, pauseAudio, isPlaying } = useAudioStore();
  const { message } = App.useApp();
  
  const [audio, setAudio] = useState<Audio | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isFavorited, setIsFavorited] = useState(false);
  const [relatedAudios, setRelatedAudios] = useState<Audio[]>([]);

  const audioId = params.id as string;

  // 简化的数据获取
  useEffect(() => {
    if (audioId) {
      Promise.all([
        fetchAudio(),
        fetchComments(),
        checkFavoriteStatus(),
        fetchRelatedAudios()
      ]).finally(() => setLoading(false));
    }
  }, [audioId]);

  const fetchAudio = async () => {
    try {
      const response = await fetch(`/api/audio/${audioId}`);
      const data = await response.json();
      if (data.success) {
        setAudio({
          ...data.data,
          url: fixAudioUrl(data.data.url),
          coverImage: fixAudioUrl(data.data.coverImage)
        });
      } else {
        message.error('获取音频详情失败');
      }
    } catch (error) {
      message.error('获取音频详情失败');
    }
  };

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/comments?audioId=${audioId}&limit=10`);
      const data = await response.json();
      if (data.success) {
        setComments(data.data.comments);
      }
    } catch (error) {
      console.error('获取评论失败:', error);
    }
  };

  const checkFavoriteStatus = async () => {
    if (!session) return;
    try {
      const response = await fetch(`/api/favorites?audioId=${audioId}`);
      const data = await response.json();
      if (data.success) {
        setIsFavorited(data.data.isFavorited);
      }
    } catch (error) {
      console.error('检查收藏状态失败:', error);
    }
  };

  const fetchRelatedAudios = async () => {
    try {
      const response = await fetch(`/api/audio/${audioId}/related?limit=5`);
      const data = await response.json();
      if (data.success) {
        setRelatedAudios(data.data);
      }
    } catch (error) {
      console.error('获取相关音频失败:', error);
    }
  };

  // 简化的事件处理
  const handlePlay = () => {
    if (!audio) return;
    
    if (currentAudio?.id === audio.id && isPlaying) {
      pauseAudio();
    } else {
      playAudio({
        id: audio.id,
        title: audio.title,
        url: audio.url,
        duration: audio.duration || 0,
        category: audio.category?.name || '未分类',
        speaker: audio.speaker || '未知'
      });
    }
  };

  const handleComment = async () => {
    if (!session) {
      message.warning('请先登录后再评论');
      return;
    }
    if (!newComment.trim()) {
      message.warning('请输入评论内容');
      return;
    }

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioId, content: newComment.trim() }),
      });

      const data = await response.json();
      if (data.success) {
        setComments([data.data, ...comments]);
        setNewComment('');
        message.success('评论发表成功');
      } else {
        message.error('发表评论失败');
      }
    } catch (error) {
      message.error('发表评论失败');
    }
  };

  const handleFavorite = async () => {
    if (!session) {
      message.warning('请先登录后再收藏');
      return;
    }

    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioId,
          action: isFavorited ? 'remove' : 'add'
        }),
      });

      const data = await response.json();
      if (data.success) {
        setIsFavorited(!isFavorited);
        message.success(data.message);
      } else {
        message.error('收藏操作失败');
      }
    } catch (error) {
      message.error('收藏操作失败');
    }
  };

  if (loading) {
    return (
      <AntdHomeLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <Spin size="large" />
        </div>
      </AntdHomeLayout>
    );
  }

  if (!audio) {
    return (
      <AntdHomeLayout>
        <Alert
          message="音频不存在"
          description="您访问的音频可能已被删除或不存在"
          type="error"
          showIcon
          action={<Button onClick={() => router.push('/')}>返回首页</Button>}
        />
      </AntdHomeLayout>
    );
  }

  const isCurrentlyPlaying = currentAudio?.id === audio.id && isPlaying;

  return (
    <AntdHomeLayout>
      <Row gutter={[24, 24]}>
        {/* 左侧音频信息 */}
        <Col xs={24} lg={8}>
          <Card>
            {/* 封面 */}
            <div style={{ marginBottom: 16, textAlign: 'center' }}>
              {audio.coverImage ? (
                <img 
                  src={audio.coverImage} 
                  alt={audio.title}
                  style={{ width: '100%', maxWidth: 300, borderRadius: 8 }}
                />
              ) : (
                <div style={{ 
                  width: '100%', 
                  aspectRatio: '1', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  backgroundColor: '#f5f5f5',
                  borderRadius: 8
                }}>
                  <SoundOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
                </div>
              )}
            </div>

            {/* 基本信息 */}
            <Title level={3} style={{ marginBottom: 16 }}>{audio.title}</Title>
            
            {audio.speaker && (
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary">
                  <UserOutlined style={{ marginRight: 8 }} />
                  主讲人：{audio.speaker}
                </Text>
              </div>
            )}
            
            {/* 分类标签 */}
            <div style={{ marginBottom: 16 }}>
              <Space wrap>
                {audio.category && (
                  <Tag color={audio.category.color}>
                    {audio.category.icon} {audio.category.name}
                  </Tag>
                )}
                {audio.subcategory && (
                  <Tag>{audio.subcategory.name}</Tag>
                )}
              </Space>
            </div>
            
            {/* 时间信息 */}
            <div style={{ marginBottom: 16 }}>
              <Space direction="vertical" size="small">
                <Text type="secondary">
                  <CalendarOutlined style={{ marginRight: 8 }} />
                  上传时间：{formatDate(audio.uploadDate)}
                </Text>
                <Text type="secondary">
                  <ClockCircleOutlined style={{ marginRight: 8 }} />
                  音频时长：{formatDuration(audio.duration)}
                </Text>
              </Space>
            </div>

            {/* 操作按钮 */}
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Button
                type="primary"
                icon={isCurrentlyPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                onClick={handlePlay}
                size="large"
                block
              >
                {isCurrentlyPlaying ? '暂停播放' : '开始播放'}
              </Button>
              
              <Space style={{ width: '100%' }}>
                <Button
                  icon={isFavorited ? <HeartFilled /> : <HeartOutlined />}
                  onClick={handleFavorite}
                  style={{ flex: 1 }}
                >
                  {isFavorited ? '已收藏' : '收藏'}
                </Button>
                
                <ShareButton
                  audioId={audio.id}
                  audioTitle={audio.title}
                  audioDescription={audio.description}
                  audioData={audio}
                />
              </Space>
            </Space>

            {/* 简介 */}
            {audio.description && (
              <div style={{ marginTop: 16 }}>
                <Title level={5}>简介</Title>
                <Text>{audio.description}</Text>
              </div>
            )}
          </Card>

          {/* 相关推荐 */}
          {relatedAudios.length > 0 && (
            <Card title="相关推荐" size="small" style={{ marginTop: 16 }}>
              <List
                size="small"
                dataSource={relatedAudios}
                renderItem={(item) => (
                  <List.Item
                    style={{ cursor: 'pointer' }}
                    onClick={() => router.push(`/audio/${item.id}`)}
                  >
                    <List.Item.Meta
                      avatar={<Avatar src={item.coverImage} icon={<SoundOutlined />} />}
                      title={item.title}
                      description={`${item.speaker || '未知'} · ${formatDuration(item.duration)}`}
                    />
                  </List.Item>
                )}
              />
            </Card>
          )}
        </Col>

        {/* 右侧评论区域 */}
        <Col xs={24} lg={16}>
          <Card>
            <Title level={4}>
              <MessageOutlined style={{ marginRight: 8 }} />
              评论 ({comments.length})
            </Title>
            
            {/* 发表评论 */}
            {session ? (
              <div style={{ marginBottom: 24, padding: 16, backgroundColor: '#fafafa', borderRadius: 8 }}>
                <TextArea
                  rows={4}
                  placeholder="写下你的评论..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  style={{ marginBottom: 12 }}
                />
                <Button type="primary" onClick={handleComment}>
                  发表评论
                </Button>
              </div>
            ) : (
              <Alert
                message="请登录后发表评论"
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
              />
            )}

            {/* 评论列表 */}
            <List
              dataSource={comments}
              locale={{ emptyText: '暂无评论' }}
              renderItem={(comment) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar icon={<UserOutlined />} />}
                    title={
                      <Space>
                        <Text strong>{comment.username}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {formatDate(comment.createdAt)}
                        </Text>
                      </Space>
                    }
                    description={comment.content}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </AntdHomeLayout>
  );
}

export default function AudioDetailPage() {
  return (
    <App>
      <AudioDetailContent />
    </App>
  );
}