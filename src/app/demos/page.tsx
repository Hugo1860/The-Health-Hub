'use client';

import React from 'react';
import { Card, Typography, Row, Col, Button, Space, Divider } from 'antd';
import { 
  PlayCircleOutlined, 
  ShareAltOutlined, 
  LayoutOutlined,
  ExperimentOutlined,
  MobileOutlined
} from '@ant-design/icons';
import AntdHomeLayout from '../../components/AntdHomeLayout';
import { useRouter } from 'next/navigation';

const { Title, Text, Paragraph } = Typography;

export default function DemosPage() {
  const router = useRouter();

  const demos = [
    {
      title: '音频分享卡片功能',
      description: '完整的音频分享卡片生成功能演示，包括模板选择、预览、保存和分享等功能。',
      icon: <ShareAltOutlined />,
      color: '#1890ff',
      path: '/share-card-demo',
      features: ['4种精美模板', '响应式设计', '移动端适配', '性能优化']
    },
    {
      title: '分享卡片功能测试',
      description: '分享卡片功能的单元测试和集成测试页面，验证各个组件是否正常工作。',
      icon: <ExperimentOutlined />,
      color: '#52c41a',
      path: '/test-share-card',
      features: ['单元测试', '集成测试', '性能监控', '错误处理']
    },
    {
      title: '新音频详情页面布局',
      description: '重新设计的音频详情页面，右侧显示音频信息而不是播放器，提供更好的用户体验。',
      icon: <LayoutOutlined />,
      color: '#722ed1',
      path: '/audio-layout-demo',
      features: ['新布局设计', '信息展示优化', '评论区域', '相关推荐']
    }
  ];

  return (
    <AntdHomeLayout>
      <div style={{ padding: '24px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Title level={1}>功能演示中心</Title>
          <Paragraph style={{ fontSize: 16, color: '#666' }}>
            探索健闻局平台的最新功能和界面设计
          </Paragraph>
        </div>

        <Row gutter={[24, 24]}>
          {demos.map((demo, index) => (
            <Col xs={24} md={12} lg={8} key={index}>
              <Card
                hoverable
                style={{ 
                  height: '100%',
                  borderRadius: 12,
                  border: `2px solid ${demo.color}20`,
                  transition: 'all 0.3s ease'
                }}
                bodyStyle={{ padding: 24 }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = `0 8px 24px ${demo.color}30`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${demo.color}, ${demo.color}80)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px',
                      fontSize: 28,
                      color: 'white'
                    }}
                  >
                    {demo.icon}
                  </div>
                  <Title level={4} style={{ margin: 0, color: demo.color }}>
                    {demo.title}
                  </Title>
                </div>

                <Paragraph style={{ textAlign: 'center', color: '#666', minHeight: 60 }}>
                  {demo.description}
                </Paragraph>

                <Divider />

                <div style={{ marginBottom: 20 }}>
                  <Text strong style={{ color: '#333' }}>主要特性：</Text>
                  <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                    {demo.features.map((feature, idx) => (
                      <li key={idx} style={{ color: '#666', marginBottom: 4 }}>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  type="primary"
                  size="large"
                  block
                  style={{
                    background: demo.color,
                    borderColor: demo.color,
                    borderRadius: 8,
                    height: 44,
                    fontSize: 16,
                    fontWeight: 600
                  }}
                  onClick={() => router.push(demo.path)}
                >
                  查看演示
                </Button>
              </Card>
            </Col>
          ))}
        </Row>

        <Card style={{ marginTop: 48, borderRadius: 12 }}>
          <Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>
            🚀 最新更新
          </Title>
          
          <Row gutter={[24, 24]}>
            <Col xs={24} md={12}>
              <Card size="small" style={{ background: '#f0f9ff', border: '1px solid #bae7ff' }}>
                <Title level={5} style={{ color: '#1890ff', margin: '0 0 12px 0' }}>
                  音频分享卡片功能
                </Title>
                <ul style={{ margin: 0, paddingLeft: 20, color: '#666' }}>
                  <li>新增4种专业设计模板</li>
                  <li>支持移动端手势操作</li>
                  <li>Canvas对象池性能优化</li>
                  <li>完整的错误处理机制</li>
                </ul>
              </Card>
            </Col>
            
            <Col xs={24} md={12}>
              <Card size="small" style={{ background: '#f6ffed', border: '1px solid #b7eb8f' }}>
                <Title level={5} style={{ color: '#52c41a', margin: '0 0 12px 0' }}>
                  音频详情页面重构
                </Title>
                <ul style={{ margin: 0, paddingLeft: 20, color: '#666' }}>
                  <li>右侧信息栏设计</li>
                  <li>评论区域优化</li>
                  <li>相关推荐功能</li>
                  <li>响应式布局适配</li>
                </ul>
              </Card>
            </Col>
          </Row>
        </Card>

        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <Space size="large">
            <Button 
              size="large" 
              onClick={() => router.push('/')}
              style={{ borderRadius: 8 }}
            >
              返回首页
            </Button>
            <Button 
              type="primary" 
              size="large"
              onClick={() => window.open('https://github.com/your-repo', '_blank')}
              style={{ borderRadius: 8 }}
            >
              查看源码
            </Button>
          </Space>
        </div>
      </div>
    </AntdHomeLayout>
  );
}