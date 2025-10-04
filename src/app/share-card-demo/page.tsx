'use client'

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Space, 
  Typography, 
  Row, 
  Col, 
  Alert, 
  Statistic,
  Timeline,
  Badge,
  Divider,
  message
} from 'antd';
import { 
  PlayCircleOutlined, 
  ShareAltOutlined, 
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  MobileOutlined,
  DesktopOutlined,
  TabletOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { AudioFile } from '@/store/audioStore';
import ShareButton from '@/components/ShareButton';
import { ShareCardService } from '@/lib/share-card-service';
import { initializeShareCard } from '@/lib/share-card-init';
import { useResponsive, useTouchDevice } from '@/hooks/useResponsive';
import ShareCardPerformanceMonitor from '@/components/ShareCardPerformanceMonitor';
import UserFeedbackCollector from '@/components/UserFeedbackCollector';

const { Title, Text, Paragraph } = Typography;

// 示例音频数据
const sampleAudios: AudioFile[] = [
  {
    id: 'demo-1',
    title: '心血管疾病预防与治疗',
    description: '详细介绍心血管疾病的预防措施和最新治疗方法，包括药物治疗、手术治疗和生活方式调整。',
    url: '/demo-audio-1.mp3',
    filename: 'cardiovascular-prevention.mp3',
    uploadDate: '2024-01-15T10:00:00Z',
    duration: 1800, // 30分钟
    coverImage: '/images/cardiovascular.jpg',
    category: {
      id: 'cardiology',
      name: '心血管科',
      color: '#ff4d4f'
    },
    subcategory: {
      id: 'prevention',
      name: '疾病预防'
    },
    tags: ['心血管', '预防', '治疗', '健康'],
    speaker: '张医生'
  },
  {
    id: 'demo-2',
    title: '糖尿病管理指南',
    description: '全面的糖尿病管理指南，涵盖血糖监测、饮食控制、运动疗法和药物管理。',
    url: '/demo-audio-2.mp3',
    filename: 'diabetes-management.mp3',
    uploadDate: '2024-01-20T14:30:00Z',
    duration: 2100, // 35分钟
    coverImage: '/images/diabetes.jpg',
    category: {
      id: 'endocrinology',
      name: '内分泌科',
      color: '#52c41a'
    },
    subcategory: {
      id: 'management',
      name: '疾病管理'
    },
    tags: ['糖尿病', '管理', '血糖', '饮食'],
    speaker: '李医生'
  },
  {
    id: 'demo-3',
    title: '儿童疫苗接种指南',
    description: '儿童疫苗接种的完整指南，包括接种时间表、注意事项和常见问题解答。',
    url: '/demo-audio-3.mp3',
    filename: 'child-vaccination.mp3',
    uploadDate: '2024-01-25T09:15:00Z',
    duration: 1500, // 25分钟
    coverImage: '/images/vaccination.jpg',
    category: {
      id: 'pediatrics',
      name: '儿科',
      color: '#1890ff'
    },
    subcategory: {
      id: 'vaccination',
      name: '疫苗接种'
    },
    tags: ['儿童', '疫苗', '接种', '预防'],
    speaker: '王医生'
  }
];

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  duration?: number;
}

export default function ShareCardDemoPage() {
  const [selectedAudio, setSelectedAudio] = useState<AudioFile>(sampleAudios[0]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false);

  const { isMobile, isTablet, isDesktop, screenWidth, screenHeight, orientation } = useResponsive();
  const isTouchDevice = useTouchDevice();

  // 初始化分享卡片功能
  useEffect(() => {
    const init = async () => {
      try {
        await initializeShareCard();
        setIsInitialized(true);
        message.success('分享卡片功能初始化成功！');
      } catch (error) {
        console.error('Failed to initialize share card:', error);
        message.error('分享卡片功能初始化失败');
      }
    };

    init();
  }, []);

  // 运行集成测试
  const runIntegrationTests = async () => {
    setIsRunningTests(true);
    
    const tests: TestResult[] = [
      { name: '浏览器兼容性检查', status: 'pending' },
      { name: 'Canvas 支持检测', status: 'pending' },
      { name: '二维码生成测试', status: 'pending' },
      { name: '模板渲染测试', status: 'pending' },
      { name: '图片生成测试', status: 'pending' },
      { name: '内存管理测试', status: 'pending' },
      { name: '移动端适配测试', status: 'pending' },
      { name: '性能基准测试', status: 'pending' }
    ];

    setTestResults([...tests]);

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      test.status = 'running';
      setTestResults([...tests]);

      const startTime = Date.now();

      try {
        switch (test.name) {
          case '浏览器兼容性检查':
            await testBrowserCompatibility();
            break;
          case 'Canvas 支持检测':
            await testCanvasSupport();
            break;
          case '二维码生成测试':
            await testQRCodeGeneration();
            break;
          case '模板渲染测试':
            await testTemplateRendering();
            break;
          case '图片生成测试':
            await testImageGeneration();
            break;
          case '内存管理测试':
            await testMemoryManagement();
            break;
          case '移动端适配测试':
            await testMobileAdaptation();
            break;
          case '性能基准测试':
            await testPerformanceBenchmark();
            break;
        }

        test.status = 'success';
        test.duration = Date.now() - startTime;
        test.message = '测试通过';
      } catch (error) {
        test.status = 'error';
        test.duration = Date.now() - startTime;
        test.message = error instanceof Error ? error.message : '测试失败';
      }

      setTestResults([...tests]);
      
      // 添加延迟，让用户看到测试进度
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsRunningTests(false);
    
    const passedTests = tests.filter(t => t.status === 'success').length;
    const totalTests = tests.length;
    
    if (passedTests === totalTests) {
      message.success(`所有测试通过！(${passedTests}/${totalTests})`);
    } else {
      message.warning(`部分测试失败 (${passedTests}/${totalTests})`);
    }
  };

  // 测试函数
  const testBrowserCompatibility = async () => {
    const features = {
      canvas: !!document.createElement('canvas').getContext,
      webp: await checkWebPSupport(),
      clipboard: !!navigator.clipboard,
      share: !!navigator.share,
      touch: 'ontouchstart' in window
    };

    const supportedFeatures = Object.values(features).filter(Boolean).length;
    if (supportedFeatures < 3) {
      throw new Error(`浏览器兼容性不足 (${supportedFeatures}/5)`);
    }
  };

  const testCanvasSupport = async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D 上下文不可用');
    }
    
    // 测试基本绘图功能
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 100, 100);
    
    const imageData = ctx.getImageData(50, 50, 1, 1);
    if (imageData.data[0] !== 255) {
      throw new Error('Canvas 绘图功能异常');
    }
  };

  const testQRCodeGeneration = async () => {
    const { QRCodeGenerator } = await import('@/lib/qrcode-generator');
    
    const testUrl = 'https://example.com/test';
    if (!QRCodeGenerator.validateUrl(testUrl)) {
      throw new Error('URL 验证失败');
    }
    
    const fallbackUrl = QRCodeGenerator.generateFallbackQRUrl(testUrl, 200);
    if (!fallbackUrl.includes('qrserver.com')) {
      throw new Error('降级二维码生成失败');
    }
  };

  const testTemplateRendering = async () => {
    const { CardTemplateManager } = await import('@/lib/card-templates');
    
    const templates = CardTemplateManager.getAllTemplates();
    if (templates.length === 0) {
      throw new Error('没有可用的模板');
    }
    
    const defaultTemplate = CardTemplateManager.getDefaultTemplate();
    if (!CardTemplateManager.validateTemplate(defaultTemplate)) {
      throw new Error('默认模板验证失败');
    }
  };

  const testImageGeneration = async () => {
    try {
      const result = await ShareCardService.generateShareCard(selectedAudio, {
        onProgress: () => {} // 静默处理进度
      });
      
      if (!result.blob || !result.url) {
        throw new Error('图片生成结果无效');
      }
      
      // 清理测试生成的资源
      ShareCardService.cleanupUrl(result.url);
    } catch (error) {
      throw new Error(`图片生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const testMemoryManagement = async () => {
    const { MemoryManager } = await import('@/lib/memory-manager');
    
    const memoryManager = MemoryManager.getInstance();
    const stats = memoryManager.getMemoryStats();
    
    if (typeof stats.blobUrls !== 'number') {
      throw new Error('内存统计数据异常');
    }
    
    // 测试 Blob URL 管理
    const testUrl = 'blob:test-url';
    memoryManager.registerBlobUrl(testUrl);
    memoryManager.cleanupBlobUrl(testUrl);
  };

  const testMobileAdaptation = async () => {
    if (screenWidth < 768 && !isMobile) {
      throw new Error('移动端检测不准确');
    }
    
    if (isTouchDevice && !('ontouchstart' in window)) {
      throw new Error('触摸设备检测不准确');
    }
  };

  const testPerformanceBenchmark = async () => {
    const startTime = performance.now();
    
    // 执行一个简单的性能测试
    const stats = ShareCardService.getPerformanceStats();
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    if (duration > 1000) { // 超过1秒认为性能不佳
      throw new Error(`性能测试超时 (${duration.toFixed(2)}ms)`);
    }
  };

  const checkWebPSupport = (): Promise<boolean> => {
    return new Promise((resolve) => {
      const webP = new Image();
      webP.onload = webP.onerror = () => resolve(webP.height === 2);
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  };

  const getDeviceIcon = () => {
    if (isMobile) return <MobileOutlined />;
    if (isTablet) return <TabletOutlined />;
    return <DesktopOutlined />;
  };

  const getTestStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'error':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'running':
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
      default:
        return <InfoCircleOutlined style={{ color: '#d9d9d9' }} />;
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <Title level={2}>
        🎨 分享卡片功能演示与测试
      </Title>
      
      <Paragraph>
        这个页面展示了音频分享卡片功能的完整演示，包括功能测试、性能监控和用户体验验证。
      </Paragraph>

      {/* 设备信息 */}
      <Card title="设备信息" size="small" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="设备类型"
              value={isMobile ? '移动端' : isTablet ? '平板' : '桌面端'}
              prefix={getDeviceIcon()}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="屏幕尺寸"
              value={`${screenWidth} × ${screenHeight}`}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="屏幕方向"
              value={orientation === 'portrait' ? '竖屏' : '横屏'}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="触摸支持"
              value={isTouchDevice ? '支持' : '不支持'}
            />
          </Col>
        </Row>
      </Card>

      {/* 功能演示 */}
      <Card title="功能演示" style={{ marginBottom: 24 }}>
        <Row gutter={24}>
          <Col xs={24} lg={12}>
            <Title level={4}>选择示例音频</Title>
            <Space direction="vertical" style={{ width: '100%' }}>
              {sampleAudios.map(audio => (
                <Card
                  key={audio.id}
                  size="small"
                  hoverable
                  style={{
                    border: selectedAudio.id === audio.id ? '2px solid #1890ff' : '1px solid #d9d9d9'
                  }}
                  onClick={() => setSelectedAudio(audio)}
                >
                  <Card.Meta
                    title={audio.title}
                    description={
                      <div>
                        <Text type="secondary">{audio.description}</Text>
                        <br />
                        <Badge color={audio.category?.color} text={audio.category?.name} />
                        <Text type="secondary" style={{ marginLeft: 8 }}>
                          {Math.floor((audio.duration || 0) / 60)} 分钟
                        </Text>
                      </div>
                    }
                  />
                </Card>
              ))}
            </Space>
          </Col>
          
          <Col xs={24} lg={12}>
            <Title level={4}>分享功能测试</Title>
            <Card size="small">
              <Card.Meta
                title={selectedAudio.title}
                description={selectedAudio.description}
              />
              <Divider />
              <Space>
                <ShareButton
                  audioId={selectedAudio.id}
                  audioTitle={selectedAudio.title}
                  audioDescription={selectedAudio.description}
                  audioData={selectedAudio}
                  size="lg"
                />
                <Text type="secondary">点击测试分享卡片生成</Text>
              </Space>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 集成测试 */}
      <Card title="集成测试" style={{ marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text>运行完整的功能测试，验证所有组件是否正常工作</Text>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={runIntegrationTests}
              loading={isRunningTests}
              disabled={!isInitialized}
            >
              {isRunningTests ? '测试中...' : '运行集成测试'}
            </Button>
          </div>

          {testResults.length > 0 && (
            <Timeline>
              {testResults.map((test, index) => (
                <Timeline.Item
                  key={index}
                  dot={getTestStatusIcon(test.status)}
                  color={
                    test.status === 'success' ? 'green' :
                    test.status === 'error' ? 'red' :
                    test.status === 'running' ? 'blue' : 'gray'
                  }
                >
                  <div>
                    <Text strong>{test.name}</Text>
                    {test.duration && (
                      <Text type="secondary" style={{ marginLeft: 8 }}>
                        ({test.duration}ms)
                      </Text>
                    )}
                    {test.message && (
                      <div>
                        <Text type={test.status === 'error' ? 'danger' : 'secondary'}>
                          {test.message}
                        </Text>
                      </div>
                    )}
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          )}
        </Space>
      </Card>

      {/* 性能监控 */}
      <Card 
        title="性能监控" 
        extra={
          <Button
            size="small"
            onClick={() => setShowPerformanceMonitor(!showPerformanceMonitor)}
          >
            {showPerformanceMonitor ? '隐藏' : '显示'}
          </Button>
        }
        style={{ marginBottom: 24 }}
      >
        <ShareCardPerformanceMonitor visible={showPerformanceMonitor} />
      </Card>

      {/* 使用说明 */}
      <Card title="使用说明">
        <Timeline>
          <Timeline.Item dot={<InfoCircleOutlined />}>
            <Text strong>步骤 1：</Text> 选择一个示例音频进行测试
          </Timeline.Item>
          <Timeline.Item dot={<ShareAltOutlined />}>
            <Text strong>步骤 2：</Text> 点击分享按钮，选择"生成分享卡片"
          </Timeline.Item>
          <Timeline.Item dot={<CheckCircleOutlined />}>
            <Text strong>步骤 3：</Text> 选择喜欢的模板，生成精美的分享卡片
          </Timeline.Item>
          <Timeline.Item dot={<DownloadOutlined />}>
            <Text strong>步骤 4：</Text> 保存图片或直接分享到社交媒体
          </Timeline.Item>
        </Timeline>

        <Alert
          message="提示"
          description="在移动设备上，界面会自动适配为更适合触摸操作的布局。支持手势滑动切换标签页。"
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      </Card>

      {/* 用户反馈收集 */}
      <UserFeedbackCollector
        onFeedbackSubmit={(feedback) => {
          console.log('User feedback received:', feedback);
          // 这里可以发送到分析服务
        }}
      />
    </div>
  );
}