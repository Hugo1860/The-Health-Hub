'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Button, Typography, Spin, Image, Space, Badge } from 'antd';
import { CheckOutlined, EyeOutlined } from '@ant-design/icons';
import { CardTemplate } from '@/lib/card-template-engine';
import { AVAILABLE_TEMPLATES } from '@/lib/card-templates';
import { ShareCardService } from '@/lib/share-card-service';
import { AudioFile } from '@/store/audioStore';

const { Text, Title } = Typography;

export interface TemplateSelectorProps {
  selectedTemplate: CardTemplate;
  onTemplateChange: (template: CardTemplate) => void;
  audio: AudioFile;
  disabled?: boolean;
}

interface TemplatePreview {
  template: CardTemplate;
  previewUrl: string | null;
  isGenerating: boolean;
  error: string | null;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  selectedTemplate,
  onTemplateChange,
  audio,
  disabled = false
}) => {
  const [previews, setPreviews] = useState<Map<string, TemplatePreview>>(new Map());
  const [isGeneratingPreviews, setIsGeneratingPreviews] = useState(false);

  // 初始化预览状态
  useEffect(() => {
    const initialPreviews = new Map<string, TemplatePreview>();
    AVAILABLE_TEMPLATES.forEach(template => {
      initialPreviews.set(template.id, {
        template,
        previewUrl: null,
        isGenerating: false,
        error: null
      });
    });
    setPreviews(initialPreviews);
  }, []);

  // 生成单个模板预览
  const generatePreview = useCallback(async (template: CardTemplate) => {
    setPreviews(prev => {
      const newPreviews = new Map(prev);
      const preview = newPreviews.get(template.id);
      if (preview) {
        preview.isGenerating = true;
        preview.error = null;
      }
      return newPreviews;
    });

    try {
      const previewUrl = await ShareCardService.generatePreview(audio, template, 200);
      
      setPreviews(prev => {
        const newPreviews = new Map(prev);
        const preview = newPreviews.get(template.id);
        if (preview) {
          // 清理旧的预览URL
          if (preview.previewUrl) {
            ShareCardService.cleanupUrl(preview.previewUrl);
          }
          preview.previewUrl = previewUrl;
          preview.isGenerating = false;
          preview.error = null;
        }
        return newPreviews;
      });
    } catch (error) {
      console.error(`Failed to generate preview for template ${template.id}:`, error);
      
      setPreviews(prev => {
        const newPreviews = new Map(prev);
        const preview = newPreviews.get(template.id);
        if (preview) {
          preview.isGenerating = false;
          preview.error = error instanceof Error ? error.message : '预览生成失败';
        }
        return newPreviews;
      });
    }
  }, [audio]);

  // 生成所有预览
  const generateAllPreviews = useCallback(async () => {
    setIsGeneratingPreviews(true);
    
    try {
      // 并发生成预览，但限制并发数量
      const concurrencyLimit = 2;
      const templates = AVAILABLE_TEMPLATES;
      
      for (let i = 0; i < templates.length; i += concurrencyLimit) {
        const batch = templates.slice(i, i + concurrencyLimit);
        await Promise.all(batch.map(template => generatePreview(template)));
      }
    } finally {
      setIsGeneratingPreviews(false);
    }
  }, [generatePreview]);

  // 自动生成预览（延迟执行，避免影响主要功能）
  useEffect(() => {
    const timer = setTimeout(() => {
      generateAllPreviews();
    }, 1000);

    return () => clearTimeout(timer);
  }, [generateAllPreviews]);

  // 清理预览URLs
  useEffect(() => {
    return () => {
      previews.forEach(preview => {
        if (preview.previewUrl) {
          ShareCardService.cleanupUrl(preview.previewUrl);
        }
      });
    };
  }, [previews]);

  const handleTemplateSelect = (template: CardTemplate) => {
    if (!disabled) {
      onTemplateChange(template);
    }
  };

  const handlePreviewClick = (template: CardTemplate) => {
    const preview = previews.get(template.id);
    if (!preview?.previewUrl && !preview?.isGenerating) {
      generatePreview(template);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={5} style={{ margin: 0 }}>选择模板</Title>
        <Space>
          {isGeneratingPreviews && (
            <Space>
              <Spin size="small" />
              <Text type="secondary" style={{ fontSize: '12px' }}>生成预览中...</Text>
            </Space>
          )}
          <Button 
            size="small" 
            onClick={generateAllPreviews}
            disabled={isGeneratingPreviews}
          >
            刷新预览
          </Button>
        </Space>
      </div>

      <Row gutter={[8, 8]}>
        {AVAILABLE_TEMPLATES.map(template => {
          const preview = previews.get(template.id);
          const isSelected = selectedTemplate.id === template.id;
          
          return (
            <Col xs={12} sm={8} md={6} lg={6} key={template.id}>
              <Card
                hoverable={!disabled}
                size="small"
                className={`template-card ${isSelected ? 'selected' : ''}`}
                style={{
                  border: isSelected ? '2px solid #1890ff' : '1px solid #d9d9d9',
                  borderRadius: '8px',
                  transition: 'all 0.3s ease',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.6 : 1
                }}
                onClick={() => handleTemplateSelect(template)}
                cover={
                  <div 
                    style={{ 
                      height: window.innerWidth < 768 ? '80px' : '120px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      backgroundColor: '#f5f5f5',
                      position: 'relative'
                    }}
                  >
                    {preview?.previewUrl ? (
                      <Image
                        src={preview.previewUrl}
                        alt={`${template.name} 预览`}
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '100%',
                          objectFit: 'contain'
                        }}
                        preview={false}
                      />
                    ) : preview?.isGenerating ? (
                      <Space direction="vertical" align="center">
                        <Spin />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          生成预览中...
                        </Text>
                      </Space>
                    ) : preview?.error ? (
                      <Space direction="vertical" align="center">
                        <Text type="danger" style={{ fontSize: '12px' }}>
                          预览失败
                        </Text>
                        <Button 
                          size="small" 
                          type="link"
                          icon={<EyeOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreviewClick(template);
                          }}
                        >
                          重试
                        </Button>
                      </Space>
                    ) : (
                      <Space direction="vertical" align="center">
                        <div
                          style={{
                            width: '60px',
                            height: '60px',
                            backgroundColor: template.backgroundColor,
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px'
                          }}
                        >
                          🎨
                        </div>
                        <Button 
                          size="small" 
                          type="link"
                          icon={<EyeOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreviewClick(template);
                          }}
                        >
                          生成预览
                        </Button>
                      </Space>
                    )}
                    
                    {isSelected && (
                      <Badge
                        count={<CheckOutlined style={{ color: '#fff' }} />}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          backgroundColor: '#1890ff'
                        }}
                      />
                    )}
                  </div>
                }
              >
                <Card.Meta
                  title={
                    <div style={{ textAlign: 'center' }}>
                      <Text strong={isSelected}>{template.name}</Text>
                    </div>
                  }
                  description={
                    <div style={{ textAlign: 'center' }}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {template.width} × {template.height}
                      </Text>
                    </div>
                  }
                />
              </Card>
            </Col>
          );
        })}
      </Row>

      <style jsx>{`
        .template-card {
          transition: all 0.3s ease;
        }
        
        .template-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .template-card.selected {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
        }
      `}</style>
    </div>
  );
};

export default TemplateSelector;