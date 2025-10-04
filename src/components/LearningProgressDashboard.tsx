'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Progress,
  Statistic,
  List,
  Avatar,
  Typography,
  Tag,
  Button,
  Space,
  Tabs,
  Badge,
  Timeline,
  Rate,
  Input,
  Modal,
  message
} from 'antd';
import {
  TrophyOutlined,
  ClockCircleOutlined,
  BookOutlined,
  FireOutlined,
  EditOutlined,
  StarOutlined
} from '@ant-design/icons';
import { useSession } from 'next-auth/react';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface LearningProgress {
  id: string;
  audioId: string;
  progressPercentage: number;
  totalListenTime: number;
  completionStatus: 'not_started' | 'in_progress' | 'completed' | 'bookmarked';
  lastPlayedAt?: string;
  notes?: string;
  rating?: number;
  audio?: {
    title: string;
    duration?: number;
    speaker?: string;
    categoryName?: string;
  };
}

interface Achievement {
  id: string;
  achievementName: string;
  achievementDescription: string;
  progressCurrent: number;
  progressTarget: number;
  isCompleted: boolean;
  badgeIcon: string;
  badgeColor: string;
}

interface LearningInsights {
  weeklyStats: {
    totalTime: number;
    completedAudios: number;
    averageSessionTime: number;
    streakDays: number;
  };
  categoryPreferences: Array<{
    categoryName: string;
    timeSpent: number;
    completionRate: number;
  }>;
  achievements: Achievement[];
  recommendations: string[];
}

export default function LearningProgressDashboard() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('progress');
  const [progressData, setProgressData] = useState<LearningProgress[]>([]);
  const [insights, setInsights] = useState<LearningInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [selectedAudio, setSelectedAudio] = useState<LearningProgress | null>(null);
  const [noteText, setNoteText] = useState('');

  // 获取学习进度数据
  const fetchProgressData = async () => {
    if (!session?.user) return;

    try {
      setLoading(true);
      const [progressRes, insightsRes] = await Promise.all([
        fetch('/api/user/progress?limit=50'),
        fetch('/api/user/insights?type=learning')
      ]);

      if (progressRes.ok) {
        const progressResult = await progressRes.json();
        if (progressResult.success) {
          setProgressData(progressResult.data);
        }
      }

      if (insightsRes.ok) {
        const insightsResult = await insightsRes.json();
        if (insightsResult.success) {
          setInsights(insightsResult.data);
        }
      }
    } catch (error) {
      console.error('获取学习数据失败:', error);
      message.error('获取学习数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 添加学习笔记
  const addLearningNote = async () => {
    if (!selectedAudio || !noteText.trim()) return;

    try {
      const response = await fetch('/api/user/progress/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioId: selectedAudio.audioId,
          notes: noteText
        })
      });

      if (response.ok) {
        message.success('学习笔记已保存');
        setNoteModalVisible(false);
        setNoteText('');
        fetchProgressData(); // 刷新数据
      } else {
        message.error('保存笔记失败');
      }
    } catch (error) {
      console.error('保存笔记失败:', error);
      message.error('保存笔记失败');
    }
  };

  // 音频评分
  const rateAudio = async (audioId: string, rating: number) => {
    try {
      const response = await fetch('/api/user/progress/rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioId, rating })
      });

      if (response.ok) {
        message.success('评分已保存');
        fetchProgressData(); // 刷新数据
      } else {
        message.error('评分失败');
      }
    } catch (error) {
      console.error('评分失败:', error);
      message.error('评分失败');
    }
  };

  useEffect(() => {
    fetchProgressData();
  }, [session]);

  if (!session?.user) {
    return null;
  }

  const getStatusColor = (status: LearningProgress['completionStatus']) => {
    switch (status) {
      case 'completed': return 'green';
      case 'in_progress': return 'blue';
      case 'bookmarked': return 'orange';
      default: return 'default';
    }
  };

  const getStatusText = (status: LearningProgress['completionStatus']) => {
    switch (status) {
      case 'completed': return '已完成';
      case 'in_progress': return '学习中';
      case 'bookmarked': return '已收藏';
      default: return '未开始';
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`;
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>学习进度</Title>
      
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        {/* 学习概览 */}
        <Tabs.TabPane tab="学习概览" key="overview">
          {insights && (
            <Row gutter={[24, 24]}>
              {/* 本周统计 */}
              <Col xs={24} lg={16}>
                <Card title="本周学习统计">
                  <Row gutter={16}>
                    <Col span={6}>
                      <Statistic
                        title="学习时长"
                        value={formatTime(insights.weeklyStats.totalTime)}
                        prefix={<ClockCircleOutlined />}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="完成音频"
                        value={insights.weeklyStats.completedAudios}
                        suffix="个"
                        prefix={<BookOutlined />}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="平均时长"
                        value={formatTime(insights.weeklyStats.averageSessionTime)}
                        prefix={<ClockCircleOutlined />}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="连续天数"
                        value={insights.weeklyStats.streakDays}
                        suffix="天"
                        prefix={<FireOutlined />}
                      />
                    </Col>
                  </Row>
                </Card>
              </Col>

              {/* 成就系统 */}
              <Col xs={24} lg={8}>
                <Card title="我的成就" extra={<TrophyOutlined />}>
                  <List
                    size="small"
                    dataSource={insights.achievements.slice(0, 5)}
                    renderItem={(achievement) => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={
                            <Badge dot={achievement.isCompleted}>
                              <div style={{ 
                                fontSize: '24px',
                                filter: achievement.isCompleted ? 'none' : 'grayscale(100%)'
                              }}>
                                {achievement.badgeIcon}
                              </div>
                            </Badge>
                          }
                          title={achievement.achievementName}
                          description={
                            <div>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                {achievement.achievementDescription}
                              </Text>
                              <Progress
                                percent={Math.round((achievement.progressCurrent / achievement.progressTarget) * 100)}
                                size="small"
                                status={achievement.isCompleted ? 'success' : 'active'}
                                style={{ marginTop: 4 }}
                              />
                            </div>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>

              {/* 分类偏好 */}
              <Col xs={24}>
                <Card title="学习偏好分析">
                  <Row gutter={16}>
                    {insights.categoryPreferences.slice(0, 5).map((pref, index) => (
                      <Col xs={12} sm={8} md={4} key={index}>
                        <Card size="small" style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '24px', marginBottom: 8 }}>
                            📚
                          </div>
                          <Text strong>{pref.categoryName}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {formatTime(pref.timeSpent)}
                          </Text>
                          <Progress
                            percent={Math.round(pref.completionRate)}
                            size="small"
                            style={{ marginTop: 4 }}
                          />
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </Card>
              </Col>

              {/* 学习建议 */}
              <Col xs={24}>
                <Card title="个性化建议">
                  <Timeline>
                    {insights.recommendations.map((rec, index) => (
                      <Timeline.Item key={index} color="blue">
                        <Text>{rec}</Text>
                      </Timeline.Item>
                    ))}
                  </Timeline>
                </Card>
              </Col>
            </Row>
          )}
        </Tabs.TabPane>

        {/* 学习进度 */}
        <Tabs.TabPane tab="学习进度" key="progress">
          <Card>
            <List
              loading={loading}
              dataSource={progressData}
              renderItem={(progress) => (
                <List.Item
                  actions={[
                    <Button
                      key="note"
                      type="text"
                      icon={<EditOutlined />}
                      onClick={() => {
                        setSelectedAudio(progress);
                        setNoteText(progress.notes || '');
                        setNoteModalVisible(true);
                      }}
                    >
                      笔记
                    </Button>,
                    <Rate
                      key="rate"
                      value={progress.rating || 0}
                      onChange={(value) => rateAudio(progress.audioId, value)}
                      style={{ fontSize: '14px' }}
                    />
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        style={{ 
                          backgroundColor: getStatusColor(progress.completionStatus) === 'green' ? '#52c41a' : '#1890ff'
                        }}
                        icon={<BookOutlined />}
                      />
                    }
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Text strong>{progress.audio?.title}</Text>
                        <Tag color={getStatusColor(progress.completionStatus)}>
                          {getStatusText(progress.completionStatus)}
                        </Tag>
                      </div>
                    }
                    description={
                      <div>
                        <Space>
                          {progress.audio?.speaker && (
                            <Text type="secondary">讲者: {progress.audio.speaker}</Text>
                          )}
                          {progress.audio?.categoryName && (
                            <Tag>{progress.audio.categoryName}</Tag>
                          )}
                        </Space>
                        <div style={{ marginTop: 8 }}>
                          <Progress
                            percent={Math.round(progress.progressPercentage)}
                            size="small"
                            status={progress.completionStatus === 'completed' ? 'success' : 'active'}
                          />
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            学习时长: {formatTime(progress.totalListenTime)}
                            {progress.lastPlayedAt && (
                              <span> • 最后学习: {new Date(progress.lastPlayedAt).toLocaleDateString('zh-CN')}</span>
                            )}
                          </Text>
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Tabs.TabPane>

        {/* 成就系统 */}
        <Tabs.TabPane tab="成就系统" key="achievements">
          {insights && (
            <Row gutter={[16, 16]}>
              {insights.achievements.map((achievement) => (
                <Col xs={24} sm={12} md={8} lg={6} key={achievement.id}>
                  <Card
                    size="small"
                    style={{
                      textAlign: 'center',
                      backgroundColor: achievement.isCompleted ? '#f6ffed' : '#fafafa',
                      border: achievement.isCompleted ? '1px solid #b7eb8f' : '1px solid #d9d9d9'
                    }}
                  >
                    <div style={{ 
                      fontSize: '48px', 
                      marginBottom: 8,
                      filter: achievement.isCompleted ? 'none' : 'grayscale(100%)'
                    }}>
                      {achievement.badgeIcon}
                    </div>
                    <Title level={5} style={{ margin: '8px 0' }}>
                      {achievement.achievementName}
                    </Title>
                    <Paragraph style={{ fontSize: '12px', color: '#666' }}>
                      {achievement.achievementDescription}
                    </Paragraph>
                    <Progress
                      type="circle"
                      percent={Math.round((achievement.progressCurrent / achievement.progressTarget) * 100)}
                      size={60}
                      status={achievement.isCompleted ? 'success' : 'active'}
                    />
                    <div style={{ marginTop: 8 }}>
                      <Text style={{ fontSize: '12px' }}>
                        {achievement.progressCurrent} / {achievement.progressTarget}
                      </Text>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Tabs.TabPane>
      </Tabs>

      {/* 学习笔记模态框 */}
      <Modal
        title={`学习笔记 - ${selectedAudio?.audio?.title}`}
        open={noteModalVisible}
        onOk={addLearningNote}
        onCancel={() => {
          setNoteModalVisible(false);
          setNoteText('');
        }}
        okText="保存"
        cancelText="取消"
      >
        <TextArea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="记录您的学习心得和重要知识点..."
          rows={6}
          maxLength={2000}
          showCount
        />
      </Modal>
    </div>
  );
}
