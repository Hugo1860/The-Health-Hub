'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Button, Typography, Spin, Space, Checkbox, message } from 'antd';
import { SwapOutlined, DownloadOutlined, ClearOutlined } from '@ant-design/icons';
import { CardTemplate } from '@/lib/card-template-engine';
import { AVAILABLE_TEMPLATES } from '@/lib/card-templates';
import { ShareCardService } from '@/lib/share-card-service';
import { AudioFile } from '@/store/audioStore';

const { Text, Title } = Typography;

export interface TemplateComparisonProps {
  audio: AudioFile;
  onTemplateSelect?: (template: CardTemplate) => void;
}

interface ComparisonItem {
  template: CardTemplate;
  previewUrl: string | null;
  isGenerating: boolean;
  error: string | null;
  selected: boolean;
}

export const TemplateComparison: React.FC<TemplateComparisonProps> = ({
  audio,
  onTemplateSelect
}) => {
  const [items, setItems] = useState<Map<string, ComparisonItem>>(new Map());
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());

  // 初始化比较项
  useEffect(() => {
    const initialItems = new Map<string, ComparisonItem>();
    AVAILABLE_TEMPLATES.forEach(template => {
      initialItems.set(template.id, {
        template,
        previewUrl: null,
        isGenerating: false,
        error: null,
        selected: false
      });
    });
    setItems(initialItems);
  }, []);

  // 生成单个预览
  const generatePreview = useCallback(async (templateId: string) => {
    const item = items.get(templateId);
    if (!item) return;

    setItems(prev => {
      const newItems = new Map(prev);
      const currentItem = newItems.get(templateId);
      if (currentItem) {
        currentItem.isGenerating = true;
        currentItem.error = null;
      }
      return newItems;
    });

    try {
      const previewUrl = await ShareCardService.generatePreview(audio, item.template, 300);
      
      setItems(prev => {
        const newItems = new Map(prev);
        const currentItem = newItems.get(templateId);
        if (currentItem) {
          // 清理旧的预览URL
          if (currentItem.previewUrl) {
            ShareCardService.cleanupUrl(currentItem.previewUrl);
          }
          currentItem.previewUrl = previewUrl;
          currentItem.isGenerating = false;
        }
        return newItems;
      });
    } catch (error) {
      console.error(`Failed to generate preview for template ${templateId}:`, error);
      
      setItems(prev => {
        const newItems = new Map(prev);
        const currentItem = newItems.get(templateId);
        if (currentItem) {
          currentItem.isGenerating = false;
          currentItem.error = error instanceof Error ? error.message : '预览生成失败';
        }
        return newItems;
      });
    }
  }, [audio, items]);

  // 生成所有预览
  const generateAllPreviews = useCallback(async () => {
    setIsGeneratingAll(true);
    
    try {
      // 串行生成，避免过多并发请求
      for (const templateId of AVAILABLE_TEMPLATES.map(t => t.id)) {
        await generatePreview(templateId);
      }
      message.success('所有预览生成完成！');
    } catch (error) {
      message.error('生成预览时出现错误');
    } finally {
      setIsGeneratingAll(false);
    }
  }, [generatePreview]);

  // 清理所有预览
  const clearAllPreviews = useCallback(() => {
    setItems(prev => {
      const newItems = new Map(prev);
      newItems.forEach(item => {
        if (item.previewUrl) {
          ShareCardService.cleanupUrl(item.previewUrl);
        }
        item.previewUrl = null;
        item.error = null;
        item.isGenerating = false;
      });
      return newItems;
    });
    message.info('已清理所有预览');
  }, []);

  // 切换模板选择
  const toggleTemplateSelection = useCallback((templateId: string) => {
    setSelectedTemplates(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(templateId)) {
        newSelected.delete(templateId);
      } else {
        newSelected.add(templateId);
      }
      return newSelected;
    });

    setItems(prev => {
      const newItems = new Map(prev);
      const item = newItems.get(templateId);
      if (item) {
        item.selected = !item.selected;
      }
      return newItems;
    });
  }, []);

  // 批量下载选中的预览
  const downloadSelected = useCallback(async () => {
    const selectedItems = Array.from(items.values()).filter(item => item.selected && item.previewUrl);
    
    if (selectedItems.length === 0) {
      message.warning('请先选择要下载的模板预览');
      return;
    }

    try {
      for (const item of selectedItems) {
        if (item.previewUrl) {
          // 创建下载链接
          const link = document.createElement('a');
          link.href = item.previewUrl;
          link.download = `${audio.title}-${item.template.name}-预览.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // 添加延迟，避免浏览器阻止多个下载
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      message.success(`已下载 ${selectedItems.length} 个预览图片`);
    } catch (error) {
      message.error('下载失败，请重试');
    }
  }, [items, audio.title]);

  // 清理资源
  useEffect(() => {
    return () => {
      items.forEach(item => {
        if (item.previewUrl) {
          ShareCardService.cleanupUrl(item.previewUrl);
        }
      });
    };
  }, [items]);

  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={5} style={{ margin: 0 }}>模板对比</Title>
        <Space>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            已选择 {selectedTemplates.size} 个模板
          </Text>
          <Button 
            size="small" 
            icon={<SwapOutlined />}
            onClick={generateAllPreviews}
            loading={isGeneratingAll}
            disabled={isGeneratingAll}
          >
            生成所有预览
          </Button>
          <Button 
            size="small" 
            icon={<DownloadOutlined />}
            onClick={downloadSelected}
            disabled={selectedTemplates.size === 0}
          >
            下载选中
          </Button>
          <Button 
            size="small" 
            icon={<ClearOutlined />}
            onClick={clearAllPreviews}
          >
            清理预览
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        {AVAILABLE_TEMPLATES.map(template => {
          const item = items.get(template.id);
          if (!item) return null;
          
          return (
            <Col xs={24} sm={12} md={8} lg={6} key={template.id}>
              <Card
                size="small"
                style={{
                  border: item.selected ? '2px solid #1890ff' : '1px solid #d9d9d9',
                  borderRadius: '8px',
                  transition: 'all 0.3s ease'
                }}
                title={
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text strong>{template.name}</Text>
                    <Checkbox
                      checked={item.selected}
                      onChange={() => toggleTemplateSelection(template.id)}
                    />
                  </div>
                }
                extra={
                  onTemplateSelect && (
                    <Button
                      size="small"
                      type="link"
                      onClick={() => onTemplateSelect(template)}
                    >
                      选择
                    </Button>
                  )
                }
              >
                <div 
                  style={{ 
                    height: '200px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px',
                    marginBottom: '8px'
                  }}
                >
                  {item.previewUrl ? (
                    <img
                      src={item.previewUrl}
                      alt={`${template.name} 预览`}
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '100%',
                        objectFit: 'contain',
                        borderRadius: '4px'
                      }}
                    />
                  ) : item.isGenerating ? (
                    <Space direction="vertical" align="center">
                      <Spin />
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        生成中...
                      </Text>
                    </Space>
                  ) : item.error ? (
                    <Space direction="vertical" align="center">
                      <Text type="danger" style={{ fontSize: '12px' }}>
                        {item.error}
                      </Text>
                      <Button 
                        size="small" 
                        type="link"
                        onClick={() => generatePreview(template.id)}
                      >
                        重试
                      </Button>
                    </Space>
                  ) : (
                    <Space direction="vertical" align="center">
                      <div
                        style={{
                          width: '80px',
                          height: '80px',
                          backgroundColor: template.backgroundColor,
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '32px'
                        }}
                      >
                        🎨
                      </div>
                      <Button 
                        size="small" 
                        type="primary"
                        onClick={() => generatePreview(template.id)}
                      >
                        生成预览
                      </Button>
                    </Space>
                  )}
                </div>
                
                <div style={{ textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {template.width} × {template.height}
                  </Text>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>

      {selectedTemplates.size > 0 && (
        <div style={{ 
          marginTop: '16px', 
          padding: '12px', 
          backgroundColor: '#f0f9ff', 
          borderRadius: '6px',
          border: '1px solid #bae7ff'
        }}>
          <Space>
            <Text type="secondary">
              已选择 {selectedTemplates.size} 个模板进行对比
            </Text>
            <Button size="small" onClick={downloadSelected}>
              批量下载
            </Button>
            <Button size="small" onClick={() => {
              setSelectedTemplates(new Set());
              setItems(prev => {
                const newItems = new Map(prev);
                newItems.forEach(item => {
                  item.selected = false;
                });
                return newItems;
              });
            }}>
              清除选择
            </Button>
          </Space>
        </div>
      )}
    </div>
  );
};

export default TemplateComparison;