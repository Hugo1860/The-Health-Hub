'use client';

import { memo, useMemo, useState, useCallback } from 'react';
import { useAudioStore, AudioFile } from '@/store/audioStore';
import VirtualList from './VirtualList';
import LazyLoad from './LazyLoad';
import OptimizedImage from './OptimizedImage';
import { useDebounce, useStableCallback } from '@/hooks/useRenderOptimization';

interface OptimizedAudioListProps {
  audios: AudioFile[];
  onAudioSelect?: (audio: AudioFile) => void;
  className?: string;
  itemHeight?: number;
  containerHeight?: number;
  enableVirtualization?: boolean;
}

// 单个音频项组件（使用memo优化）
const AudioItem = memo(({ 
  audio, 
  onSelect, 
  isPlaying 
}: { 
  audio: AudioFile; 
  onSelect: (audio: AudioFile) => void;
  isPlaying: boolean;
}) => {
  const handleClick = useStableCallback(() => {
    onSelect(audio);
  });

  const formatDate = useMemo(() => {
    return new Date(audio.uploadDate).toLocaleDateString('zh-CN');
  }, [audio.uploadDate]);

  const formatDuration = useMemo(() => {
    if (!audio.duration) return '';
    const minutes = Math.floor(audio.duration / 60);
    const seconds = Math.floor(audio.duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [audio.duration]);

  return (
    <LazyLoad height={120} className="mb-4">
      <div 
        className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer border-2 ${
          isPlaying ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-gray-200'
        }`}
        onClick={handleClick}
      >
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className={`text-lg font-semibold mb-2 line-clamp-2 ${
                isPlaying ? 'text-blue-700' : 'text-gray-900'
              }`}>
                {audio.title}
              </h3>
              
              {audio.description && (
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {audio.description}
                </p>
              )}
              
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span className="bg-gray-100 px-2 py-1 rounded">
                  {audio.subject || '未分类'}
                </span>
                
                {audio.speaker && (
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    {audio.speaker}
                  </span>
                )}
                
                <span>{formatDate}</span>
                
                {formatDuration && (
                  <span>{formatDuration}</span>
                )}
              </div>
              
              {audio.tags && audio.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {audio.tags.slice(0, 3).map((tag, index) => (
                    <span 
                      key={index}
                      className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                  {audio.tags.length > 3 && (
                    <span className="text-xs text-gray-500">
                      +{audio.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
            
            <div className="ml-4 flex-shrink-0">
              {isPlaying && (
                <div className="flex items-center text-blue-600">
                  <div className="w-4 h-4 mr-2">
                    <div className="flex space-x-1">
                      <div className="w-1 h-4 bg-current animate-pulse"></div>
                      <div className="w-1 h-4 bg-current animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-1 h-4 bg-current animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                  <span className="text-sm font-medium">播放中</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </LazyLoad>
  );
});

AudioItem.displayName = 'AudioItem';

// 主组件
export default function OptimizedAudioList({
  audios,
  onAudioSelect,
  className = '',
  itemHeight = 140,
  containerHeight = 600,
  enableVirtualization = true,
}: OptimizedAudioListProps) {
  const { currentAudio } = useAudioStore();
  const [searchTerm, setSearchTerm] = useState('');
  
  // 防抖搜索
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // 稳定的回调函数
  const handleAudioSelect = useStableCallback((audio: AudioFile) => {
    onAudioSelect?.(audio);
  });

  // 过滤和排序音频列表
  const filteredAudios = useMemo(() => {
    let filtered = audios;
    
    // 搜索过滤
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(audio => 
        audio.title.toLowerCase().includes(searchLower) ||
        audio.description?.toLowerCase().includes(searchLower) ||
        audio.subject?.toLowerCase().includes(searchLower) ||
        audio.speaker?.toLowerCase().includes(searchLower) ||
        audio.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }
    
    // 按上传日期排序（最新的在前）
    return filtered.sort((a, b) => 
      new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
    );
  }, [audios, debouncedSearchTerm]);

  // 渲染单个音频项
  const renderAudioItem = useCallback((audio: AudioFile, index: number) => {
    const isPlaying = currentAudio?.id === audio.id;
    
    return (
      <AudioItem
        key={audio.id}
        audio={audio}
        onSelect={handleAudioSelect}
        isPlaying={isPlaying}
      />
    );
  }, [currentAudio?.id, handleAudioSelect]);

  // 搜索框
  const searchBox = (
    <div className="mb-6">
      <div className="relative">
        <input
          type="text"
          placeholder="搜索音频..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
      
      {debouncedSearchTerm && (
        <div className="mt-2 text-sm text-gray-600">
          找到 {filteredAudios.length} 个结果
        </div>
      )}
    </div>
  );

  // 空状态
  if (filteredAudios.length === 0) {
    return (
      <div className={className}>
        {searchBox}
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-.895 2-2 2s-2-.895-2-2 .895-2 2-2 2 .895 2 2zm12-3c0 1.105-.895 2-2 2s-2-.895-2-2 .895-2 2-2 2 .895 2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {debouncedSearchTerm ? '未找到匹配的音频' : '暂无音频'}
          </h3>
          <p className="text-gray-500">
            {debouncedSearchTerm ? '尝试使用不同的关键词搜索' : '还没有上传任何音频内容'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {searchBox}
      
      {enableVirtualization && filteredAudios.length > 20 ? (
        // 使用虚拟化列表处理大量数据
        <VirtualList
          items={filteredAudios}
          itemHeight={itemHeight}
          containerHeight={containerHeight}
          renderItem={renderAudioItem}
          className="border border-gray-200 rounded-lg"
        />
      ) : (
        // 普通列表
        <div className="space-y-4">
          {filteredAudios.map((audio, index) => renderAudioItem(audio, index))}
        </div>
      )}
    </div>
  );
}