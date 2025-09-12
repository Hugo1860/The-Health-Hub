'use client'

import React, { useState, useCallback, useEffect } from 'react';
import { 
  Drawer, 
  Button, 
  Space, 
  message, 
  Spin, 
  Typography, 
  Alert, 
  Tabs,
  Card,
  Row,
  Col,
  Image
} from 'antd';
import { 
  DownloadOutlined, 
  ShareAltOutlined, 
  ReloadOutlined, 
  CloseOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { AudioFile } from '@/store/audioStore';
import { ShareCardService, ShareCardResult } from '@/lib/share-card-service';
import { CardTemplateManager } from '@/lib/card-templates';
import { CardTemplate } from '@/lib/card-template-engine';
import { ShareCardError, ShareCardErrorHandler } from '@/lib/share-card-errors';
import { useResponsive, useTouchDevice } from '@/hooks/useResponsive';
import TouchGestureHandler from './TouchGestureHandler';
import '../styles/share-card-responsive.css';

const { Title, Text } = Typography;

export interface MobileShareCardModalProps {
  isOpen: boolean;
  audio: AudioFile;
  onClose: () => void;
  initialTemplate?: CardTemplate;
}

export const MobileShareCardModal: React.FC<MobileShareCardModalProps> = ({
  isOpen,
  audio,
  onClose,
  initialTemplate
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [cardResult, setCardResult] = useState<ShareCardResult | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<CardTemplate>(
    initialTemplate || CardTemplateManager.getDefaultTemplate()
  );
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('template');

  const { isMobile, screenWidth, screenHeight, orientation } = useResponsive();
  const isTouchDevice = useTouchDevice();

  // 生成分享卡片
  const generateCard = useCallback(async (template: CardTemplate) => {
    try {
      setIsGenerating(true);
      setError(null);
      setProgress(0);
      setCurrentStep('开始生成...');

      // 清理之前的结果
      if (cardResult?.url) {
        ShareCardService.cleanupUrl(cardResult.url);
      }

      const result = await ShareCardService.generateShareCard(audio, {
        template,
        onProgress: (step, progressValue) => {
          setCurrentStep(step);
          setProgress(progressValue);
        }
      });

      setCardResult(result);
      setActiveTab('preview'); // 自动切换到预览标签
      message.success('分享卡片生成成功！');
    } catch (err) {
      console.error('Failed to generate share card:', err);
      const errorMessage = err instanceof Error ? err.message : '生成失败，请稍后重试';
      setError(errorMessage);
      
      if (err instanceof Error && Object.values(ShareCardError).includes(err.message as ShareCardError)) {
        ShareCardErrorHandler.showUserFriendlyError(err.message as ShareCardError, message.error);
      } else {
        message.error(errorMessage);
      }
    } finally {
      setIsGenerating(false);
      setCurrentStep('');
      setProgress(0);
    }
  }, [audio, cardResult?.url]);

  // 模板变更处理
  const handleTemplateChange = useCallback((templateId: string) => {
    const template = CardTemplateManager.getTemplate(templateId);
    if (template) {
      setSelectedTemplate(template);
    }
  }, []);

  // 保存图片
  const handleSave = useCallback(async () => {
    if (!cardResult) return;

    try {
      // 移动端使用不同的保存策略
      if (isMobile) {
        // 尝试使用 Web Share API 分享图片
        if (navigator.share && navigator.canShare) {
          try {
            // 将 blob 转换为 File
            const response = await fetch(cardResult.url);
            const blob = await response.blob();
            const file = new File([blob], `${audio.title}-分享卡片.png`, { type: 'image/png' });
            
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                title: `${audio.title} - 分享卡片`,
                files: [file]
              });
              message.success('分享成功！');
              return;
            }
          } catch (shareError) {
            console.warn('Web Share API failed:', shareError);
          }
        }

        // 降级方案：长按保存提示
        message.info('请长按图片选择"保存图片"');
      } else {
        // 桌面端直接下载
        const link = document.createElement('a');
        link.href = cardResult.url;
        link.download = `${audio.title}-分享卡片.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        message.success('图片保存成功！');
      }
    } catch (error) {
      console.error('Save failed:', error);
      message.error('保存失败，请重试');
    }
  }, [cardResult, audio.title, isMobile]);

  // 直接分享
  const handleShare = useCallback(async () => {
    if (!cardResult) return;

    try {
      const shareData = {
        title: `${audio.title} - 健闻局`,
        text: audio.description || `收听这个精彩的医学音频内容：${audio.title}`,
        url: `${window.location.origin}/audio/${audio.id}`
      };

      if (navigator.share) {
        await navigator.share(shareData);
        message.success('分享成功！');
      } else {
        // 降级方案：复制链接
        await navigator.clipboard.writeText(shareData.url);
        message.success('链接已复制到剪贴板！');
      }
    } catch (error) {
      console.error('Share failed:', error);
      message.error('分享失败，请重试');
    }
  }, [cardResult, audio]);

  // 重新生成
  const handleRegenerate = useCallback(() => {
    generateCard(selectedTemplate);
  }, [generateCard, selectedTemplate]);

  // 初始生成
  useEffect(() => {
    if (isOpen && audio && !cardResult && !isGenerating) {
      generateCard(selectedTemplate);
    }
  }, [isOpen, audio, cardResult, isGenerating, generateCard, selectedTemplate]);

  // 清理资源
  useEffect(() => {
    return () => {
      if (cardResult?.url) {
        ShareCardService.cleanupUrl(cardResult.url);
      }
    };
  }, [cardResult?.url]);

  // 关闭处理
  const handleClose = useCallback(() => {
    if (cardResult?.url) {
      ShareCardService.cleanupUrl(cardResult.url);
    }
    setCardResult(null);
    setError(null);
    setActiveTab('template');
    onClose();
  }, [cardResult?.url, onClose]);

  // 移动端模板选择器
  const renderMobileTemplateSelector = () => (
    <div style={{ padding: '0 16px' }}>
      <Title level={5}>选择模板</Title>
      <Row gutter={[8, 8]}>
        {CardTemplateManager.getAllTemplates().map(template => (
          <Col span={12} key={template.id}>
            <Card
              size="small"
              hoverable
              style={{
                border: selectedTemplate.id === template.id ? '2px solid #1890ff' : '1px solid #d9d9d9',
                borderRadius: '8px'
              }}
              onClick={() => handleTemplateChange(template.id)}
              cover={
                <div 
                  style={{ 
                    height: '80px', 
                    backgroundColor: template.backgroundColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px'
                  }}
                >
                  🎨
                </div>
              }
            >
              <Card.Meta
                title={<Text style={{ fontSize: '12px' }}>{template.name}</Text>}
                description={
                  <Text type="secondary" style={{ fontSize: '10px' }}>
                    {template.width}×{template.height}
                  </Text>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>
      
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <Button
          type="primary"
          size="large"
          block
          icon={<ReloadOutlined />}
          onClick={handleRegenerate}
          loading={isGenerating}
          disabled={isGenerating}
        >
          {isGenerating ? '生成中...' : '生成分享卡片'}
        </Button>
      </div>
    </div>
  );

  // 移动端预览界面
  const renderMobilePreview = () => (
    <div style={{ padding: '0 16px' }}>
      {cardResult && (
        <>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Title level={5}>预览 - {selectedTemplate.name}</Title>
          </div>
          
          <div style={{ 
            textAlign: 'center',
            marginBottom: 16,
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <Image
              src={cardResult.url}
              alt="分享卡片预览"
              style={{
                maxWidth: '100%',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
              }}
              preview={{
                mask: '点击查看大图'
              }}
            />
          </div>

          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Button
              type="primary"
              size="large"
              block
              icon={<DownloadOutlined />}
              onClick={handleSave}
            >
              {isMobile ? '保存图片' : '下载图片'}
            </Button>
            
            <Button
              size="large"
              block
              icon={<ShareAltOutlined />}
              onClick={handleShare}
            >
              立即分享
            </Button>
            
            <Button
              size="large"
              block
              onClick={() => setActiveTab('template')}
            >
              重新选择模板
            </Button>
          </Space>
        </>
      )}
    </div>
  );

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />} 
            onClick={handleClose}
            size="small"
          />
          <div>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>分享卡片</div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: 2 }}>
              {audio.title}
            </div>
          </div>
        </div>
      }
      placement="bottom"
      height={screenHeight * 0.9}
      open={isOpen}
      onClose={handleClose}
      closable={false}
      bodyStyle={{ padding: 0 }}
      className="share-card-modal-mobile"
    >
      {/* 生成进度 */}
      {isGenerating && (
        <div style={{ 
          padding: '16px', 
          textAlign: 'center',
          backgroundColor: '#f0f9ff',
          borderBottom: '1px solid #e6f7ff'
        }}>
          <Space direction="vertical" align="center">
            <Spin size="large" />
            <Text>{currentStep}</Text>
            <div style={{ width: '200px' }}>
              <div 
                style={{
                  width: '100%',
                  height: '4px',
                  backgroundColor: '#f0f0f0',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: '100%',
                    backgroundColor: '#1890ff',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {Math.round(progress)}%
              </Text>
            </div>
          </Space>
        </div>
      )}

      {/* 错误显示 */}
      {error && (
        <div style={{ padding: '16px' }}>
          <Alert
            message="生成失败"
            description={error}
            type="error"
            showIcon
            action={
              <Button size="small" onClick={handleRegenerate}>
                重试
              </Button>
            }
          />
        </div>
      )}

      {/* 主要内容 */}
      <TouchGestureHandler
        onSwipeLeft={() => {
          if (activeTab === 'template' && cardResult) {
            setActiveTab('preview');
          }
        }}
        onSwipeRight={() => {
          if (activeTab === 'preview') {
            setActiveTab('template');
          }
        }}
        style={{ height: '100%' }}
      >
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          centered
          size="large"
          style={{ height: '100%' }}
        >
          <TabPane tab="选择模板" key="template">
            {renderMobileTemplateSelector()}
          </TabPane>
          
          <TabPane tab="预览结果" key="preview" disabled={!cardResult}>
            {renderMobilePreview()}
          </TabPane>
        </Tabs>
      </TouchGestureHandler>
    </Drawer>
  );
};

export default MobileShareCardModal;