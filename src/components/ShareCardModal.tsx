'use client'

import React, { useState, useCallback, useEffect } from 'react';
import { Modal, Button, Space, message, Spin, Row, Col, Card, Typography, Alert, Tabs } from 'antd';
import { DownloadOutlined, ShareAltOutlined, ReloadOutlined, CloseOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { AudioFile } from '@/store/audioStore';
import { ShareCardService, ShareCardResult } from '@/lib/share-card-service';
import { CardTemplateManager } from '@/lib/card-templates';
import { CardTemplate } from '@/lib/card-template-engine';
import { ShareCardError, ShareCardErrorHandler } from '@/lib/share-card-errors';
import { ShareCardErrorBoundary, useShareCardErrorHandler } from './ShareCardErrorBoundary';
import TemplateSelector from './TemplateSelector';
import TemplateComparison from './TemplateComparison';

const { Title, Text } = Typography;

export interface ShareCardModalProps {
  isOpen: boolean;
  audio: AudioFile;
  onClose: () => void;
  initialTemplate?: CardTemplate;
}

export const ShareCardModal: React.FC<ShareCardModalProps> = ({
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
  const [retryCount, setRetryCount] = useState(0);
  const { error: boundaryError, handleError, clearError, retry } = useShareCardErrorHandler();

  // 生成分享卡片
  const generateCard = useCallback(async (template: CardTemplate) => {
    try {
      setIsGenerating(true);
      setError(null);
      clearError();
      setProgress(0);
      setCurrentStep('开始生成...');

      // 清理之前的结果
      if (cardResult?.url) {
        ShareCardService.cleanupUrl(cardResult.url);
      }

      const result = await retry(async () => {
        return await ShareCardService.generateShareCard(audio, {
          template,
          onProgress: (step, progressValue) => {
            setCurrentStep(step);
            setProgress(progressValue);
          }
        });
      });

      setCardResult(result);
      setRetryCount(0);
      message.success('分享卡片生成成功！');
    } catch (err) {
      console.error('Failed to generate share card:', err);
      const errorMessage = err instanceof Error ? err.message : '生成失败，请稍后重试';
      setError(errorMessage);
      handleError(err instanceof Error ? err : new Error(errorMessage));
      
      // 显示用户友好的错误提示
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
  }, [audio, cardResult?.url, retry, handleError, clearError]);

  // 模板变更处理
  const handleTemplateChange = useCallback((templateId: string) => {
    const template = CardTemplateManager.getTemplate(templateId);
    if (template) {
      setSelectedTemplate(template);
      // 自动重新生成
      generateCard(template);
    }
  }, [generateCard]);

  // 保存图片
  const handleSave = useCallback(async () => {
    if (!cardResult) return;

    try {
      // 创建下载链接
      const link = document.createElement('a');
      link.href = cardResult.url;
      link.download = `${audio.title}-分享卡片.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      message.success('图片保存成功！');
    } catch (error) {
      console.error('Save failed:', error);
      ShareCardErrorHandler.showUserFriendlyError(ShareCardError.SAVE_FAILED, message.error);
    }
  }, [cardResult, audio.title]);

  // 直接分享
  const handleShare = useCallback(async () => {
    if (!cardResult) return;

    try {
      // 尝试使用原生分享 API
      if (typeof navigator !== 'undefined' && 'share' in navigator && 'canShare' in navigator) {
        const shareData = {
          title: `${audio.title} - 健闻局`,
          text: audio.description || `收听这个精彩的医学音频内容：${audio.title}`,
          url: `${window.location.origin}/audio/${audio.id}`
        };

        // 检查是否支持分享
        if ((navigator as any).canShare(shareData)) {
          await (navigator as any).share(shareData);
          message.success('分享成功！');
          return;
        }
      }

      // 降级方案：复制链接
      const shareUrl = `${window.location.origin}/audio/${audio.id}`;
      await navigator.clipboard.writeText(shareUrl);
      message.success('链接已复制到剪贴板！');
    } catch (error) {
      console.error('Share failed:', error);
      ShareCardErrorHandler.showUserFriendlyError(ShareCardError.SHARE_FAILED, message.error);
    }
  }, [cardResult, audio]);

  // 重新生成
  const handleRegenerate = useCallback(() => {
    setRetryCount(prev => prev + 1);
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
    onClose();
  }, [cardResult?.url, onClose]);

  return (
    <Modal
      title={
        <Space>
          <span>分享卡片</span>
          <Text type="secondary">- {audio.title}</Text>
        </Space>
      }
      open={isOpen}
      onCancel={handleClose}
      width={800}
      footer={null}
      destroyOnHidden
      centered
    >
      <ShareCardErrorBoundary>
        <div style={{ padding: '20px 0' }}>
        {/* 使用 Tabs 来组织内容 */}
        <Tabs 
          defaultActiveKey="template" 
          type="card"
          items={[
            {
              key: 'template',
              label: '选择模板',
              children: (
                <>
                  <TemplateSelector
                    selectedTemplate={selectedTemplate}
                    onTemplateChange={handleTemplateChange}
                    audio={audio}
                    disabled={isGenerating}
                  />
                  
                  <div style={{ marginTop: 16, textAlign: 'center' }}>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={handleRegenerate}
                      disabled={isGenerating}
                      type="primary"
                    >
                      {isGenerating ? '生成中...' : '生成分享卡片'}
                    </Button>
                  </div>
                </>
              )
            },
            {
              key: 'comparison',
              label: '模板对比',
              children: (
                <TemplateComparison
                  audio={audio}
                  onTemplateSelect={(template) => {
                    handleTemplateChange(template.id);
                    message.info(`已选择模板：${template.name}`);
                  }}
                />
              )
            },
            {
              key: 'preview',
              label: '预览结果',
              disabled: !cardResult && !isGenerating,
              children: <div>{/* 卡片预览内容将在这里显示 */}</div>
            }
          ]}
        />

        {/* 生成进度 */}
        {isGenerating && (
          <Card size="small" style={{ marginBottom: 24, textAlign: 'center' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text>{currentStep}</Text>
              <div style={{ marginTop: 8 }}>
                <div 
                  style={{
                    width: '100%',
                    height: 4,
                    backgroundColor: '#f0f0f0',
                    borderRadius: 2,
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
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {Math.round(progress)}%
                </Text>
              </div>
            </div>
          </Card>
        )}

        {/* 错误显示 */}
        {(error || boundaryError) && (
          <Alert
            message="生成失败"
            description={
              <div>
                <div>{error || boundaryError?.message}</div>
                {retryCount > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary">已重试 {retryCount} 次</Text>
                  </div>
                )}
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">
                    {ShareCardErrorHandler.getErrorSolution('CARD_GENERATION_FAILED' as any)}
                  </Text>
                </div>
              </div>
            }
            type="error"
            showIcon
            style={{ marginBottom: 24 }}
            action={
              <Button size="small" onClick={handleRegenerate} disabled={isGenerating}>
                重试
              </Button>
            }
          />
        )}

        {/* 将卡片预览移到 TabPane 中 */}
        {cardResult && (
          <Tabs 
            defaultActiveKey="preview" 
            type="card"
            items={[
              {
                key: 'template',
                label: '选择模板',
                children: (
                  <>
                    <TemplateSelector
                      selectedTemplate={selectedTemplate}
                      onTemplateChange={handleTemplateChange}
                      audio={audio}
                      disabled={isGenerating}
                    />
                    
                    <div style={{ marginTop: 16, textAlign: 'center' }}>
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={handleRegenerate}
                        disabled={isGenerating}
                        type="primary"
                      >
                        重新生成
                      </Button>
                    </div>
                  </>
                )
              },
              {
                key: 'comparison',
                label: '模板对比',
                children: (
                  <TemplateComparison
                    audio={audio}
                    onTemplateSelect={(template) => {
                      handleTemplateChange(template.id);
                      message.info(`已选择模板：${template.name}`);
                    }}
                  />
                )
              },
              {
                key: 'preview',
                label: '预览结果',
                children: (
                  <div style={{ textAlign: 'center' }}>
                    <Card
                      size="small"
                      title={`预览 - ${selectedTemplate.name}`}
                      extra={
                        <Space>
                          <Button
                            type="primary"
                            icon={<DownloadOutlined />}
                            onClick={handleSave}
                            size="small"
                          >
                            保存图片
                          </Button>
                          <Button
                            icon={<ShareAltOutlined />}
                            onClick={handleShare}
                            size="small"
                          >
                            分享
                          </Button>
                        </Space>
                      }
                    >
                      <div style={{ 
                        maxHeight: 400, 
                        overflow: 'auto',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}>
                        <img
                          src={cardResult.url}
                          alt="分享卡片预览"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            borderRadius: 8,
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                      </div>
                    </Card>

                    {/* 操作按钮 */}
                    <div style={{ marginTop: 24, textAlign: 'center' }}>
                      <Space size="large">
                        <Button
                          type="primary"
                          size="large"
                          icon={<DownloadOutlined />}
                          onClick={handleSave}
                        >
                          保存到设备
                        </Button>
                        <Button
                          size="large"
                          icon={<ShareAltOutlined />}
                          onClick={handleShare}
                        >
                          立即分享
                        </Button>
                        <Button
                          size="large"
                          icon={<CloseOutlined />}
                          onClick={handleClose}
                        >
                          关闭
                        </Button>
                      </Space>
                    </div>
                  </div>
                )
              }
            ]}
          />
        )}

        {/* 提示信息 */}
        {!isGenerating && !cardResult && !error && (
          <Card size="small" style={{ textAlign: 'center' }}>
            <Text type="secondary">
              正在准备生成分享卡片，请稍候...
            </Text>
          </Card>
        )}
        </div>
      </ShareCardErrorBoundary>
    </Modal>
  );
};

export default ShareCardModal;