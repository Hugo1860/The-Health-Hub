'use client';

import { useState, useEffect } from 'react';

export interface AudioChapter {
  id: string;
  audioId: string;
  title: string;
  description?: string;
  startTime: number;
  endTime?: number;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface ChapterListProps {
  audioId: string;
  currentTime?: number;
  onChapterClick?: (startTime: number) => void;
}

export default function ChapterList({ audioId, currentTime = 0, onChapterClick }: ChapterListProps) {
  const [chapters, setChapters] = useState<AudioChapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChapters();
  }, [audioId]);

  const fetchChapters = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/chapters?audioId=${audioId}`);
      if (response.ok) {
        const data = await response.json();
        setChapters(data);
      }
    } catch (error) {
      console.error('Error fetching chapters:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentChapter = (): AudioChapter | null => {
    for (const chapter of chapters) {
      if (currentTime >= chapter.startTime && 
          (chapter.endTime === undefined || currentTime < chapter.endTime)) {
        return chapter;
      }
    }
    return null;
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

  const handleChapterClick = (chapter: AudioChapter) => {
    if (onChapterClick) {
      onChapterClick(chapter.startTime);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">章节目录</h3>
        <div className="space-y-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="flex items-center gap-3">
                <div className="bg-gray-200 h-4 w-16 rounded"></div>
                <div className="bg-gray-200 h-4 flex-1 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">章节目录</h3>
        <p className="text-gray-500 text-center py-4">暂无章节信息</p>
      </div>
    );
  }

  const currentChapter = getCurrentChapter();

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">章节目录</h3>
      
      <div className="space-y-2">
        {chapters.map((chapter, index) => {
          const isActive = currentChapter?.id === chapter.id;
          const isPassed = currentTime > chapter.startTime;
          
          return (
            <div
              key={chapter.id}
              className={`group cursor-pointer rounded-lg p-3 transition-colors ${
                isActive 
                  ? 'bg-blue-50 border border-blue-200' 
                  : 'hover:bg-gray-50 border border-transparent'
              }`}
              onClick={() => handleChapterClick(chapter)}
            >
              <div className="flex items-start gap-3">
                {/* 章节序号 */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  isActive 
                    ? 'bg-blue-600 text-white' 
                    : isPassed 
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                }`}>
                  {index + 1}
                </div>
                
                <div className="flex-1 min-w-0">
                  {/* 章节标题和时间 */}
                  <div className="flex items-center justify-between mb-1">
                    <h4 className={`text-sm font-medium truncate ${
                      isActive ? 'text-blue-900' : 'text-gray-900'
                    }`}>
                      {chapter.title}
                    </h4>
                    <span className={`text-xs font-mono ml-2 ${
                      isActive ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {formatTime(chapter.startTime)}
                      {chapter.endTime && ` - ${formatTime(chapter.endTime)}`}
                    </span>
                  </div>
                  
                  {/* 章节描述 */}
                  {chapter.description && (
                    <p className={`text-xs line-clamp-2 ${
                      isActive ? 'text-blue-700' : 'text-gray-600'
                    }`}>
                      {chapter.description}
                    </p>
                  )}
                </div>
                
                {/* 播放图标 */}
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
              
              {/* 进度条 */}
              {isActive && chapter.endTime && (
                <div className="mt-2 ml-11">
                  <div className="w-full bg-blue-100 rounded-full h-1">
                    <div 
                      className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(0, 
                          ((currentTime - chapter.startTime) / (chapter.endTime - chapter.startTime)) * 100
                        ))}%`
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}