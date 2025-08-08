'use client';

import { useState, useEffect } from 'react';

export interface TranscriptionSegment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  confidence?: number;
  speaker?: string;
}

export interface AudioTranscription {
  id: string;
  audioId: string;
  language: string;
  fullText: string;
  segments: TranscriptionSegment[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  processingTime?: number;
  errorMessage?: string;
}

interface TranscriptionViewerProps {
  audioId: string;
  currentTime?: number;
  onSegmentClick?: (startTime: number) => void;
  searchQuery?: string;
}

export default function TranscriptionViewer({ 
  audioId, 
  currentTime = 0, 
  onSegmentClick,
  searchQuery = ''
}: TranscriptionViewerProps) {
  const [transcription, setTranscription] = useState<AudioTranscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'full' | 'segments'>('segments');

  useEffect(() => {
    fetchTranscription();
  }, [audioId]);

  const fetchTranscription = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/transcriptions?audioId=${audioId}`);
      
      if (response.ok) {
        const data = await response.json();
        setTranscription(data);
      } else if (response.status === 404) {
        setTranscription(null);
      }
    } catch (error) {
      console.error('Error fetching transcription:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentSegment = (): TranscriptionSegment | null => {
    if (!transcription || transcription.segments.length === 0) return null;
    
    return transcription.segments.find(segment => 
      currentTime >= segment.startTime && currentTime < segment.endTime
    ) || null;
  };

  const highlightText = (text: string, query: string): string => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  };

  const handleSegmentClick = (segment: TranscriptionSegment) => {
    if (onSegmentClick) {
      onSegmentClick(segment.startTime);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">转录文本</h3>
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="h-4 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!transcription) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">转录文本</h3>
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <p className="text-gray-500">暂无转录文本</p>
          <p className="text-sm text-gray-400 mt-1">管理员可以启动音频转录</p>
        </div>
      </div>
    );
  }

  if (transcription.status !== 'completed') {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">转录文本</h3>
        <div className="text-center py-8">
          <div className="flex items-center justify-center mb-4">
            {transcription.status === 'processing' && (
              <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            {transcription.status === 'failed' && (
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {transcription.status === 'pending' && (
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <p className="text-gray-600">
            {transcription.status === 'processing' && '正在处理转录...'}
            {transcription.status === 'failed' && '转录失败'}
            {transcription.status === 'pending' && '等待转录处理'}
          </p>
          {transcription.errorMessage && (
            <p className="text-sm text-red-600 mt-2">{transcription.errorMessage}</p>
          )}
        </div>
      </div>
    );
  }

  const currentSegment = getCurrentSegment();

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">转录文本</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('segments')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              viewMode === 'segments'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            分段显示
          </button>
          <button
            onClick={() => setViewMode('full')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              viewMode === 'full'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            完整文本
          </button>
        </div>
      </div>

      {viewMode === 'full' ? (
        <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
          <p 
            className="text-gray-800 leading-relaxed whitespace-pre-wrap"
            dangerouslySetInnerHTML={{
              __html: highlightText(transcription.fullText, searchQuery)
            }}
          />
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {transcription.segments.map((segment) => {
            const isActive = currentSegment?.id === segment.id;
            const isPassed = currentTime > segment.endTime;
            
            return (
              <div
                key={segment.id}
                className={`group cursor-pointer rounded-lg p-3 border transition-colors ${
                  isActive 
                    ? 'bg-blue-50 border-blue-200' 
                    : isPassed
                      ? 'bg-green-50 border-green-200 hover:bg-green-100'
                      : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => handleSegmentClick(segment)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 text-xs font-mono text-gray-500 mt-1 min-w-[60px]">
                    {formatTime(segment.startTime)}
                  </div>
                  
                  <div className="flex-1">
                    <p 
                      className={`text-sm leading-relaxed ${
                        isActive ? 'text-blue-900' : 'text-gray-800'
                      }`}
                      dangerouslySetInnerHTML={{
                        __html: highlightText(segment.text, searchQuery)
                      }}
                    />
                    
                    {segment.confidence && (
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          置信度: {Math.round(segment.confidence * 100)}%
                        </span>
                        {segment.speaker && (
                          <span className="text-xs text-gray-400">
                            说话人: {segment.speaker}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className={`flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                    isActive ? 'opacity-100' : ''
                  }`}>
                    <svg className={`w-4 h-4 ${
                      isActive ? 'text-blue-600' : 'text-gray-400'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2z" />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* 转录信息 */}
      <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
        <div className="flex justify-between items-center">
          <span>
            语言: {transcription.language} • 
            分段: {transcription.segments.length} • 
            字数: {transcription.fullText.length}
          </span>
          {transcription.processingTime && (
            <span>
              处理时间: {(transcription.processingTime / 1000).toFixed(1)}秒
            </span>
          )}
        </div>
      </div>
    </div>
  );
}