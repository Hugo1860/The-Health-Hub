'use client';

import React from 'react';
import { Card, Typography, Row, Col, Space, Button, Tag, Rate, Avatar, List, Input, Alert } from 'antd';
import {
  PlayCircleOutlined,
  HeartOutlined,
  DownloadOutlined,
  UserOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  SoundOutlined,
  MessageOutlined
} from '@ant-design/icons';
import AntdHomeLayout from '../../components/AntdHomeLayout';
import ShareButton from '../../components/ShareButton';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// 模拟音频数据
const mockAudio = {
  id: 'demo-audio-001',
  title: '心血管疾病预防与治疗指南',
  description: '本音频详细介绍了心血管疾病的预防措施、早期诊断方法和最新治疗技术。内容涵盖了生活方式调整、药物治疗、手术治疗等多个方面，适合医学专业人士和健康关注者收听。通过专业的讲解和实际案例分析，帮助听众全面了解心血管疾病的防治知识。',
  url: '/demo/cardiovascular-guide.mp3',
  filename: 'cardiovascular-guide.mp3',
  uploadDate: '2024-01-15T10:00:00Z',
  duration: 1800, // 30分钟
  coverImage: '/images/cardiovascular-cover.jpg',
  status: 'published',
  category: {
    id: 'cardiology',
    name: '心血管科',
    color: '#ff4d4f',
    icon: '❤️'
  },
  subcategory: {
    id: 'prevention',
    name: '疾病预防'
  },
  tags: ['心血管', '预防', '治疗', '健康指南', '医学教育'],
  speaker: '张主任医师'
};

// 模拟评论数据
const mockComments = [
  {
    id: '1',
    content: '非常专业的讲解，对心血管疾病的预防有了更深入的了解。张医生的讲解很清晰，案例分析也很到位。',
    userId: 'user1',
    username: '医学生小王',
    createdAt: '2024-01-20T14:30:00Z'
  },
  {
    id: '2',
    content: '作为一名心血管科医生，我觉得这个音频内容很全面，可以推荐给患者和家属收听。',
    userId: 'user2',
    username: '李医生',
    createdAt: '2024-01-19T09:15:00Z'
  },
  {
    id: '3',
    content: '音频质量很好，内容通俗易懂，对于普通人了解心血管健康很有帮助。',
    userId: 'user3',
    username: '健康关注者',
    createdAt: '2024-01-18T16:45:00Z'
  }
];

// 模拟相关音频
const mockRelatedAudios = [
  {
    id: 'related-1',
    title: '高血压的日常管理',
    speaker: '王医生',
    duration: 1200,
    coverImage: null,
    category: { name: '心血管科', color: '#ff4d4f', icon: '❤️' }
  },
  {
    id: 'related-2',
    title: '心脏病急救知识',
    speaker: '李医生',
    duration: 900,
    coverImage: null,
    category: { name: '急诊科', color: '#fa541c', icon: '🚑' }
  },
  {
    id: 'related-3',
    title: '健康饮食与心血管保护',
    speaker: '营养师张老师',
    duration: 1500,
    coverImage: null,
    category: { name: '营养科', color: '#52c41a', icon: '🥗' }
  }
];

export default function AudioLayoutDemoPage() {
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  return (
    <AntdHomeLayout>
      <div style={{ padding: '0', background: 'transparent' }}>
        <Row gutter={[24, 24]}>
          {/* 左侧主要内容 - 评论区域 */}
          <Col xs={24} lg={16}>
            <Card style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)', minHeight: 600 }}>
              <Title level={4} style={{ marginBottom: 24, display: 'flex', alignItems: 'center' }}>
                <MessageOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                评论 ({mockComments.length})
              </Title>
              
              {/* 发表评论 */}
              <div style={{ marginBottom: 24, padding: 20, background: '#fafafa', borderRadius: 8 }}>
                <TextArea
                  rows={4}
                  placeholder="写下你的评论..."
                  style={{ marginBottom: 12 }}
                />
                <Button type="primary">
                  发表评论
                </Button>
              </div>

              {/* 评论列表 */}
              <List
                dataSource={mockComments}
                renderItem={(comment) => (
                  <List.Item style={{ padding: '16px 0', borderBottom: '1px solid #f0f0f0' }}>
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
                      description={
                        <div style={{ color: '#595959', lineHeight: 1.6 }}>
                          {comment.content}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>

          {/* 右侧音频信息栏 */}
          <Col xs={24} lg={8}>
            {/* 音频基本信息 */}
            <Card style={{ marginBottom: 16, borderRadius: 12, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}>
              {/* 音频封面 */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ 
                  width: '100%', 
                  aspectRatio: '1', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  backgroundColor: '#f5f5f5',
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                }}>
                  <SoundOutlined style={{ fontSize: 48, color: 'rgba(255,255,255,0.8)' }} />
                </div>
              </div>

              {/* 音频标题 */}
              <Title level={3} style={{ marginBottom: 16, fontSize: 20, lineHeight: 1.4 }}>
                {mockAudio.title}
              </Title>
              
              {/* 主讲人 */}
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary">
                  <UserOutlined style={{ marginRight: 8 }} />
                  主讲人：{mockAudio.speaker}
                </Text>
              </div>
              
              {/* 分类标签 */}
              <div style={{ marginBottom: 16 }}>
                <Space wrap>
                  <Tag color={mockAudio.category.color}>
                    {mockAudio.category.icon} {mockAudio.category.name}
                  </Tag>
                  <Tag style={{ background: '#f5f5f5', color: '#666', border: '1px solid #e8e8e8' }}>
                    {mockAudio.subcategory.name}
                  </Tag>
                </Space>
              </div>
              
              {/* 时间信息 */}
              <div style={{ marginBottom: 16 }}>
                <Space direction="vertical" size="small">
                  <Text type="secondary">
                    <CalendarOutlined style={{ marginRight: 8 }} />
                    上传时间：{formatDate(mockAudio.uploadDate)}
                  </Text>
                  <Text type="secondary">
                    <ClockCircleOutlined style={{ marginRight: 8 }} />
                    音频时长：{formatDuration(mockAudio.duration)}
                  </Text>
                </Space>
              </div>

              {/* 操作按钮 */}
              <div style={{ marginTop: 20 }}>
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    size="large"
                    block
                    style={{ 
                      height: 44, 
                      fontSize: 16, 
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #1890ff, #096dd9)',
                      border: 'none'
                    }}
                  >
                    开始播放
                  </Button>
                  
                  <Space style={{ width: '100%' }}>
                    <Button
                      icon={<HeartOutlined />}
                      style={{ flex: 1, borderRadius: 6, fontSize: 14, height: 36 }}
                    >
                      收藏
                    </Button>
                    
                    <ShareButton
                      audioId={mockAudio.id}
                      audioTitle={mockAudio.title}
                      audioDescription={mockAudio.description}
                      audioData={mockAudio}
                      size="md"
                      showText={true}
                    />
                    
                    <Button 
                      icon={<DownloadOutlined />}
                      style={{ flex: 1, borderRadius: 6, fontSize: 14, height: 36 }}
                    >
                      下载
                    </Button>
                  </Space>
                </Space>
              </div>
            </Card>

            {/* 音频简介 */}
            <Card title="简介" size="small" style={{ marginBottom: 16 }}>
              <Paragraph ellipsis={{ rows: 4, expandable: true, symbol: '展开' }}>
                {mockAudio.description}
              </Paragraph>
            </Card>

            {/* 标签 */}
            <Card title="标签" size="small" style={{ marginBottom: 16 }}>
              <Space wrap>
                {mockAudio.tags.map((tag, index) => (
                  <Tag key={index}>{tag}</Tag>
                ))}
              </Space>
            </Card>

            {/* 评分区域 */}
            <Card title="评分" size="small" style={{ marginBottom: 16 }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 32, fontWeight: 'bold', color: '#1890ff' }}>
                  4.5
                </div>
                <div>
                  <Rate disabled value={4.5} allowHalf />
                </div>
                <div>
                  <Text type="secondary">基于 128 个评分</Text>
                </div>
              </div>
              
              <div>
                <Text strong>为这个音频评分：</Text>
                <div style={{ marginTop: 8, textAlign: 'center' }}>
                  <Rate />
                </div>
              </div>
            </Card>

            {/* 相关推荐 */}
            <Card title="相关推荐" size="small">
              <List
                size="small"
                dataSource={mockRelatedAudios}
                renderItem={(item) => (
                  <List.Item
                    style={{ 
                      padding: '12px 0', 
                      borderBottom: '1px solid #f5f5f5',
                      cursor: 'pointer'
                    }}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          icon={<SoundOutlined />}
                          style={{ backgroundColor: item.category.color }}
                        />
                      }
                      title={
                        <div style={{ 
                          fontWeight: 500, 
                          color: '#262626',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {item.title}
                        </div>
                      }
                      description={
                        <div>
                          <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 2 }}>
                            主讲：{item.speaker}
                          </div>
                          <Tag size="small" color={item.category.color}>
                            {item.category.icon} {item.category.name}
                          </Tag>
                          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                            时长：{formatDuration(item.duration)}
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>

        {/* 页面说明 */}
        <Card style={{ marginTop: 24, borderRadius: 12 }}>
          <Alert
            message="新的音频详情页面布局"
            description={
              <div>
                <p><strong>布局变更说明：</strong></p>
                <ul>
                  <li><strong>左侧（主要区域）：</strong>评论区域 - 用户可以查看和发表评论</li>
                  <li><strong>右侧（信息栏）：</strong>音频详细信息 - 包括封面、标题、分类、简介、评分和相关推荐</li>
                  <li><strong>移动端适配：</strong>在小屏幕设备上，右侧信息栏会移到上方显示</li>
                  <li><strong>分享功能：</strong>集成了新的分享卡片生成功能</li>
                </ul>
                <p>这种布局更适合用户浏览和互动，将播放器移到了全局位置，让详情页面专注于内容展示和用户交流。</p>
              </div>
            }
            type="info"
            showIcon
          />
        </Card>
      </div>
    </AntdHomeLayout>
  );
}