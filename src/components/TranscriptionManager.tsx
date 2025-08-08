'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { AudioTranscription } from '@/lib/transcription';

interface TranscriptionManagerProps {
  audioId: string;
  onTranscriptionUpdate?: (transcription: AudioTranscription | null) => void;
}

export default function TranscriptionManager({ 
  audioId, 
  onTranscriptionUpdate 
}: TranscriptionManagerProps) {
  const { data: session } = useSession();
  const [transcription, setTranscription] = useState<AudioTranscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchTranscription();
  }, [audioId]);

  useEffect(() => {
    // 如果转录正在处理中，定期检查状态
    if (transcription?.status === 'processing') {
      const interval = setInterval(() => {
        fetchTranscription();
      }, 3000); // 每3秒检查一次

      return () => clearInterval(interval);
    }
  }, [transcription?.status]);

  const fetchTranscription = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/transcriptions?audioId=${audioId}`);
      
      if (response.ok) {
        const data = await response.json();
        setTranscription(data);
        onTranscriptionUpdate?.(data);
      } else if (response.status === 404) {
        setTranscription(null);
        onTranscriptionUpdate?.(null);
      }
    } catch (error) {
      console.error('Error fetching transcription:', error);
    } finally {
      setLoading(false);
    }
  };

  const startTranscription = async () => {
    if (!session?.user || session.user.role !== 'admin') return;

    try {
      setProcessing(true);
      const response = await fetch('/api/transcriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioId,
          language: 'zh-CN'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTranscription(data);
        onTranscriptionUpdate?.(data);
      } else {
        const error = await response.json();
        alert(error.error || '开始转录失败');
      }
    } catch (error) {
      console.error('Error starting transcription:', error);
      alert('开始转录失败');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'processing':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'processing':
        return '处理中';
      case 'failed':
        return '失败';
      case 'pending':
        return '等待中';
      default:
        return '未知';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'processing':
        return (
          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'pending':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  // 只有管理员可以看到转录管理
  if (!session?.user || session.user.role !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">转录管理</h3>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">转录管理</h3>
      
      {!transcription ? (
        <div className="text-center py-6">
          <div className="mb-4">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <p className="text-gray-500">暂无转录记录</p>
          </div>
          <button
            onClick={startTranscription}
            disabled={processing}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {processing ? '启动中...' : '开始转录'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 转录状态 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm border ${getStatusColor(transcription.status)}`}>
                {getStatusIcon(transcription.status)}
                {getStatusText(transcription.status)}
              </span>
              <span className="text-sm text-gray-500">
                语言: {transcription.language}
              </span>
            </div>
            
            {transcription.status === 'failed' && (
              <button
                onClick={startTranscription}
                disabled={processing}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                重新转录
              </button>
            )}
          </div>

          {/* 转录信息 */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">创建时间:</span>
              <span className="ml-2 text-gray-900">
                {new Date(transcription.createdAt).toLocaleString('zh-CN')}
              </span>
            </div>
            <div>
              <span className="text-gray-600">更新时间:</span>
              <span className="ml-2 text-gray-900">
                {new Date(transcription.updatedAt).toLocaleString('zh-CN')}
              </span>
            </div>
            {transcription.processingTime && (
              <div>
                <span className="text-gray-600">处理时间:</span>
                <span className="ml-2 text-gray-900">
                  {(transcription.processingTime / 1000).toFixed(1)}秒
                </span>
              </div>
            )}
            {transcription.segments.length > 0 && (
              <div>
                <span className="text-gray-600">分段数量:</span>
                <span className="ml-2 text-gray-900">
                  {transcription.segments.length}
                </span>
              </div>
            )}
          </div>

          {/* 错误信息 */}
          {transcription.status === 'failed' && transcription.errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">
                <strong>错误信息:</strong> {transcription.errorMessage}
              </p>
            </div>
          )}

          {/* 转录预览 */}
          {transcription.status === 'completed' && transcription.fullText && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">转录预览</h4>
              <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {transcription.fullText.length > 200 
                    ? `${transcription.fullText.substring(0, 200)}...` 
                    : transcription.fullText
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}