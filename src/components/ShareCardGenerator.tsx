'use client'

import React, { useState, useCallback, useEffect } from 'react';
import { AudioFile } from '@/store/audioStore';
import { QRCodeGenerator } from '@/lib/qrcode-generator';
import { CardTemplateEngine, CardTemplate } from '@/lib/card-template-engine';
import { CardTemplateManager } from '@/lib/card-templates';
import { ShareCardError, ShareCardErrorHandler } from '@/lib/share-card-errors';

export interface ShareCardGeneratorProps {
  audio: AudioFile;
  template?: CardTemplate;
  onGenerated: (imageBlob: Blob, imageUrl: string) => void;
  onError: (error: Error) => void;
  onProgress?: (progress: number) => void;
}

export interface GenerationProgress {
  step: string;
  progress: number;
}

export const ShareCardGenerator: React.FC<ShareCardGeneratorProps> = ({
  audio,
  template,
  onGenerated,
  onError,
  onProgress
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);

  const updateProgress = useCallback((step: string, progressValue: number) => {
    setCurrentStep(step);
    setProgress(progressValue);
    onProgress?.(progressValue);
  }, [onProgress]);

  const generateCard = useCallback(async () => {
    if (isGenerating) return;

    try {
      setIsGenerating(true);
      updateProgress('验证数据...', 10);

      // 验证 Canvas 支持
      if (!ShareCardErrorHandler.isCanvasSupported()) {
        throw new Error(ShareCardError.CANVAS_NOT_SUPPORTED);
      }

      // 验证音频数据
      if (!ShareCardErrorHandler.validateAudioData(audio)) {
        throw new Error(ShareCardError.INVALID_AUDIO_DATA);
      }

      updateProgress('准备模板...', 20);

      // 获取模板
      const selectedTemplate = template || CardTemplateManager.getDefaultTemplate();
      if (!CardTemplateManager.validateTemplate(selectedTemplate)) {
        throw new Error('Invalid template configuration');
      }

      updateProgress('生成二维码...', 40);

      // 生成二维码
      const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/audio/${audio.id}`;
      const qrCanvas = await QRCodeGenerator.generateAudioShareQR(
        audio.id,
        typeof window !== 'undefined' ? window.location.origin : undefined,
        selectedTemplate.layout.qrCode.size,
        {
          errorCorrectionLevel: 'M',
          margin: 0,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        }
      );

      updateProgress('渲染卡片...', 60);

      // 创建模板引擎并渲染卡片
      const templateEngine = new CardTemplateEngine(selectedTemplate);
      
      updateProgress('合成图片...', 80);
      
      const imageBlob = await templateEngine.renderCard(audio, qrCanvas);
      
      updateProgress('完成生成...', 90);

      // 创建图片 URL
      const imageUrl = URL.createObjectURL(imageBlob);

      updateProgress('生成完成', 100);

      // 调用成功回调
      onGenerated(imageBlob, imageUrl);

    } catch (error) {
      console.error('Card generation failed:', error);
      
      let errorType = ShareCardError.CARD_GENERATION_FAILED;
      
      if (error instanceof Error) {
        if (error.message.includes('QR')) {
          errorType = ShareCardError.QR_GENERATION_FAILED;
        } else if (error.message.includes('Canvas')) {
          errorType = ShareCardError.CANVAS_NOT_SUPPORTED;
        } else if (error.message.includes('Invalid')) {
          errorType = ShareCardError.INVALID_AUDIO_DATA;
        }
      }

      ShareCardErrorHandler.handle(errorType, error);
      onError(error instanceof Error ? error : new Error('Unknown error'));
    } finally {
      setIsGenerating(false);
      setProgress(0);
      setCurrentStep('');
    }
  }, [audio, template, onGenerated, onError, updateProgress, isGenerating]);

  // 自动开始生成
  useEffect(() => {
    if (audio && !isGenerating) {
      generateCard();
    }
  }, [audio, generateCard, isGenerating]);

  // 这个组件主要用于逻辑处理，不渲染 UI
  return null;
};

// Hook 版本，更方便在其他组件中使用
export const useShareCardGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<{ blob: Blob; url: string } | null>(null);

  const generateCard = useCallback(async (
    audio: AudioFile,
    template?: CardTemplate
  ): Promise<{ blob: Blob; url: string }> => {
    return new Promise((resolve, reject) => {
      setIsGenerating(true);
      setError(null);
      setResult(null);

      const handleGenerated = (blob: Blob, url: string) => {
        const result = { blob, url };
        setResult(result);
        setIsGenerating(false);
        resolve(result);
      };

      const handleError = (err: Error) => {
        setError(err);
        setIsGenerating(false);
        reject(err);
      };

      const handleProgress = (progressValue: number) => {
        setProgress(progressValue);
      };

      // 创建临时组件来处理生成
      const tempDiv = document.createElement('div');
      document.body.appendChild(tempDiv);

      const cleanup = () => {
        document.body.removeChild(tempDiv);
      };

      // 使用 React 渲染临时组件
      import('react-dom/client').then(({ createRoot }) => {
        const root = createRoot(tempDiv);
        root.render(
          React.createElement(ShareCardGenerator, {
            audio,
            template,
            onGenerated: (blob, url) => {
              cleanup();
              handleGenerated(blob, url);
            },
            onError: (err) => {
              cleanup();
              handleError(err);
            },
            onProgress: handleProgress
          })
        );
      });
    });
  }, []);

  const reset = useCallback(() => {
    setIsGenerating(false);
    setProgress(0);
    setCurrentStep('');
    setError(null);
    setResult(null);
  }, []);

  return {
    generateCard,
    isGenerating,
    progress,
    currentStep,
    error,
    result,
    reset
  };
};

export default ShareCardGenerator;