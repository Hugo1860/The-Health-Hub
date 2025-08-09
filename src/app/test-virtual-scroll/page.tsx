'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { VirtualAudioList, AudioItem } from '@/components/VirtualAudioList';
import { Card, Button, Switch, Slider, Space, Typography, Statistic, Row, Col } from 'antd';
import { useRenderPerformance } from '@/hooks/useRenderPerformance';

const { Title, Text } = Typography;

// 生成测试数据
const generateTestAudios = (count: number, startIndex: number = 0): AudioItem[] => {
  const subjects = ['医学', '科技', '历史', '文学', '艺术', '音乐', '体育', '新闻'];
  const speakers = ['张教授', '李博士', '王老师', '陈专家', '刘主任', '赵医生', '孙研究员', '周院长'];
  
  return Array.from({ length: count }, (_, i) => {
    const index = startIndex + i;
    const subject = subjects[index % subjects.length];
    const speaker = speakers[index % speakers.length];
    
    return {
      id: `audio-${index}`,
      title: `${subject}讲座 - 第${index + 1}期：深入探讨相关理论与实践`,
      description: `这是一个关于${subject}的精彩讲座，由${speaker}主讲。内容涵盖了该领域的最新研究成果和实践经验，适合相关专业人士和爱好者收听学习。`,
      speaker,
      subject,
      duration: 1800 + Math.random() * 3600, // 30分钟到90分钟
      uploadDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      averageRating: 3 + Math.random() * 2, // 3-5分
      ratingCount: Math.floor(Math.random() * 100) + 10,
      commentCount: Math.floor(Math.random() * 50),
      tags: [
        `${subject}基础`,
        `${speaker}讲座`,
        '专业课程',
        '实践指导'
      ].slice(0, Math.floor(Math.random() * 4) + 1)
    };
  });
};

export default function TestVirtualScrollPage() {
  const [audios, setAudios] = useState<AudioItem[]>(() => generateTestAudios(50));
  const [loading, setLoading] = useState(false);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [containerHeight, setContainerHeight] = useState(600);
  const [itemHeight, setItemHeight] = useState(140);
  const [showRating, setShowRating] = useState(true);
  const [showTags, setShowTags] = useState(true);
  const [showDescription, setShowDescription] = useState(true);

  // 性能监控
  const { metrics, getPerformanceReport } = useRenderPerformance('VirtualScrollTest');

  // 加载更多数据
  const handleLoadMore = useCallback(async () => {
    if (loading) return;
    
    setLoading(true);
    
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newAudios = generateTestAudios(20, audios.length);
    setAudios(prev => [...prev, ...newAudios]);
    setLoading(false);
  }, [loading, audios.length]);

  // 处理音频点击
  const handleAudioClick = useCallback((audio: AudioItem, index: number) => {
    console.log('Audio clicked:', audio.title, 'at index:', index);
  }, []);

  // 处理播放/暂停
  const handlePlayPause = useCallback((audio: AudioItem, index: number) => {
    if (currentPlayingId === audio.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentPlayingId(audio.id);
      setIsPlaying(true);
    }
    console.log('Play/Pause:', audio.title, 'at index:', index);
  }, [currentPlayingId, isPlaying]);

  // 重置数据
  const handleReset = useCallback(() => {
    setAudios(generateTestAudios(50));
    setCurrentPlayingId(null);
    setIsPlaying(false);
  }, []);

  // 添加大量数据进行压力测试
  const handleStressTest = useCallback(() => {
    setAudios(generateTestAudios(1000));
  }, []);

  // 获取性能报告
  const handleGetPerformanceReport = useCallback(() => {
    const report = getPerformanceReport();
    console.log('Performance Report:', report);
    alert(`性能报告：
    渲染次数: ${report.renderCount}
    平均渲染时间: ${report.averageRenderTime.toFixed(2)}ms
    慢渲染次数: ${report.slowRenders}
    慢渲染率: ${report.slowRenderRate}%
    性能评分: ${report.performanceScore}/100
    内存使用: ${report.memoryUsage || 'N/A'}MB
    
    建议: ${report.recommendations.join('; ')}`);
  }, [getPerformanceReport]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Title level={2}>虚拟滚动组件测试</Title>
      
      {/* 控制面板 */}
      <Card className="mb-6">
        <Title level={4}>控制面板</Title>
        
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Space direction="vertical" className="w-full">
              <Text>容器高度: {containerHeight}px</Text>
              <Slider
                min={400}
                max={800}
                value={containerHeight}
                onChange={setContainerHeight}
              />
            </Space>
          </Col>
          
          <Col span={6}>
            <Space direction="vertical" className="w-full">
              <Text>项目高度: {itemHeight}px</Text>
              <Slider
                min={100}
                max={200}
                value={itemHeight}
                onChange={setItemHeight}
              />
            </Space>
          </Col>
          
          <Col span={6}>
            <Space direction="vertical">
              <div>
                <Text>显示评分: </Text>
                <Switch checked={showRating} onChange={setShowRating} />
              </div>
              <div>
                <Text>显示标签: </Text>
                <Switch checked={showTags} onChange={setShowTags} />
              </div>
              <div>
                <Text>显示描述: </Text>
                <Switch checked={showDescription} onChange={setShowDescription} />
              </div>
            </Space>
          </Col>
          
          <Col span={6}>
            <Space direction="vertical">
              <Button onClick={handleReset}>重置数据</Button>
              <Button onClick={handleStressTest} type="primary">
                压力测试 (1000项)
              </Button>
              <Button onClick={handleGetPerformanceReport} type="dashed">
                性能报告
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 性能指标 */}
      <Card className="mb-6">
        <Title level={4}>实时性能指标</Title>
        <Row gutter={16}>
          <Col span={4}>
            <Statistic title="数据总数" value={audios.length} />
          </Col>
          <Col span={4}>
            <Statistic title="渲染次数" value={metrics.renderCount} />
          </Col>
          <Col span={4}>
            <Statistic 
              title="平均渲染时间" 
              value={metrics.averageRenderTime} 
              precision={2}
              suffix="ms"
            />
          </Col>
          <Col span={4}>
            <Statistic 
              title="最后渲染时间" 
              value={metrics.lastRenderTime} 
              precision={2}
              suffix="ms"
            />
          </Col>
          <Col span={4}>
            <Statistic title="慢渲染次数" value={metrics.slowRenders} />
          </Col>
          <Col span={4}>
            <Statistic 
              title="内存使用" 
              value={metrics.memoryUsage || 0} 
              suffix="MB"
            />
          </Col>
        </Row>
      </Card>

      {/* 虚拟滚动列表 */}
      <Card>
        <Title level={4}>音频列表 ({audios.length} 项)</Title>
        <VirtualAudioList
          audios={audios}
          loading={loading}
          hasMore={audios.length < 200} // 最多200项用于演示
          containerHeight={containerHeight}
          itemHeight={itemHeight}
          onLoadMore={handleLoadMore}
          onAudioClick={handleAudioClick}
          onPlayPause={handlePlayPause}
          currentPlayingId={currentPlayingId ?? undefined}
          isPlaying={isPlaying}
          showRating={showRating}
          showTags={showTags}
          showDescription={showDescription}
          className="border rounded-lg"
        />
      </Card>

      {/* 使用说明 */}
      <Card className="mt-6">
        <Title level={4}>使用说明</Title>
        <ul className="list-disc list-inside space-y-2 text-gray-600">
          <li>调整容器高度和项目高度来测试不同的虚拟化配置</li>
          <li>开关显示选项来测试渲染性能的变化</li>
          <li>滚动到底部会自动加载更多数据（无限滚动）</li>
          <li>点击"压力测试"按钮加载1000项数据测试性能</li>
          <li>点击"性能报告"查看详细的渲染性能分析</li>
          <li>在开发者工具中查看控制台输出的性能警告</li>
        </ul>
      </Card>
    </div>
  );
}