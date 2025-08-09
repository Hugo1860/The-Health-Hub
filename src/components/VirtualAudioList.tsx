'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { VirtualScrollList } from './VirtualScrollList';
import { Card, Avatar, Button, Tag, Tooltip } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, ClockCircleOutlined, UserOutlined, StarFilled } from '@ant-design/icons';

const { Meta } = Card;

export interface AudioItem {
  id: string;
  title: string;
  description?: string;
  speaker?: string;
  subject?: string;
  duration?: number;
  uploadDate?: string;
  coverImage?: string;
  averageRating?: number;
  ratingCount?: number;
  commentCount?: number;
  tags?: string[];
}

export interface VirtualAudioListProps {
  audios: AudioItem[];
  loading?: boolean;
  hasMore?: boolean;
  containerHeight?: number;
  onLoadMore?: () => Promise<void>;
  onAudioClick?: (audio: AudioItem, index: number) => void;
  onPlayPause?: (audio: AudioItem, index: number) => void;
  currentPlayingId?: string;
  isPlaying?: boolean;
  className?: string;
  style?: React.CSSProperties;
  showRating?: boolean;
  showTags?: boolean;
  showDescription?: boolean;
  itemHeight?: number;
}

// 格式化时长
const formatDuration = (seconds?: number): string => {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// 格式化日期
const formatDate = (dateString?: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// 音频项目组件
const AudioListItem: React.FC<{
  audio: AudioItem;
  index: number;
  isPlaying: boolean;
  onAudioClick: (audio: AudioItem, index: number) => void;
  onPlayPause: (audio: AudioItem, index: number) => void;
  showRating: boolean;
  showTags: boolean;
  showDescription: boolean;
}> = React.memo(({
  audio,
  index,
  isPlaying,
  onAudioClick,
  onPlayPause,
  showRating,
  showTags,
  showDescription
}) => {
  const handlePlayPause = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onPlayPause(audio, index);
  }, [audio, index, onPlayPause]);

  const handleCardClick = useCallback(() => {
    onAudioClick(audio, index);
  }, [audio, index, onAudioClick]);

  return (
    <Card
      hoverable
      className="w-full h-full cursor-pointer transition-all duration-200 hover:shadow-md"
      onClick={handleCardClick}
      bodyStyle={{ padding: '12px 16px' }}
      actions={[
        <Button
          key="play"
          type="text"
          icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
          onClick={handlePlayPause}
          className="flex items-center justify-center"
        >
          {isPlaying ? '暂停' : '播放'}
        </Button>,
        <div key="duration" className="flex items-center justify-center text-gray-500">
          <ClockCircleOutlined className="mr-1" />
          {formatDuration(audio.duration)}
        </div>,
        showRating && audio.averageRating && (
          <div key="rating" className="flex items-center justify-center text-yellow-500">
            <StarFilled className="mr-1" />
            {audio.averageRating.toFixed(1)}
            {audio.ratingCount && (
              <span className="text-gray-400 ml-1">({audio.ratingCount})</span>
            )}
          </div>
        )
      ].filter(Boolean)}
    >
      <div className="flex items-start space-x-3">
        {/* 封面图片 */}
        <div className="flex-shrink-0">
          {audio.coverImage ? (
            <img
              src={audio.coverImage}
              alt={audio.title}
              className="w-16 h-16 rounded-lg object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
              <PlayCircleOutlined className="text-2xl text-gray-400" />
            </div>
          )}
        </div>

        {/* 内容区域 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-medium text-gray-900 truncate mb-1">
                {audio.title}
              </h3>
              
              {showDescription && audio.description && (
                <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                  {audio.description}
                </p>
              )}
              
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                {audio.speaker && (
                  <div className="flex items-center">
                    <UserOutlined className="mr-1" />
                    {audio.speaker}
                  </div>
                )}
                
                {audio.subject && (
                  <Tag color="blue" className="text-xs">
                    {audio.subject}
                  </Tag>
                )}
                
                {audio.uploadDate && (
                  <span>{formatDate(audio.uploadDate)}</span>
                )}
                
                {audio.commentCount !== undefined && audio.commentCount > 0 && (
                  <span>{audio.commentCount} 评论</span>
                )}
              </div>
              
              {showTags && audio.tags && audio.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {audio.tags.slice(0, 3).map((tag, tagIndex) => (
                    <Tag key={tagIndex} className="text-xs">
                      {tag}
                    </Tag>
                  ))}
                  {audio.tags.length > 3 && (
                    <Tag className="text-xs text-gray-400">
                      +{audio.tags.length - 3}
                    </Tag>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
});

AudioListItem.displayName = 'AudioListItem';

export const VirtualAudioList: React.FC<VirtualAudioListProps> = ({
  audios,
  loading = false,
  hasMore = false,
  containerHeight = 600,
  onLoadMore,
  onAudioClick = () => {},
  onPlayPause = () => {},
  currentPlayingId,
  isPlaying = false,
  className = '',
  style = {},
  showRating = true,
  showTags = true,
  showDescription = true,
  itemHeight = 140
}) => {
  // 渲染单个音频项目
  const renderAudioItem = useCallback((audio: AudioItem, index: number) => {
    const isCurrentPlaying = currentPlayingId === audio.id && isPlaying;
    
    return (
      <div className="px-4 py-2 h-full">
        <AudioListItem
          audio={audio}
          index={index}
          isPlaying={isCurrentPlaying}
          onAudioClick={onAudioClick}
          onPlayPause={onPlayPause}
          showRating={showRating}
          showTags={showTags}
          showDescription={showDescription}
        />
      </div>
    );
  }, [currentPlayingId, isPlaying, onAudioClick, onPlayPause, showRating, showTags, showDescription]);

  // 键提取器
  const keyExtractor = useCallback((audio: AudioItem, index: number) => {
    return audio.id || `audio-${index}`;
  }, []);

  // 计算最优的预渲染数量
  const overscan = useMemo(() => {
    const visibleItems = Math.ceil(containerHeight / itemHeight);
    return Math.max(2, Math.min(8, Math.ceil(visibleItems * 0.3)));
  }, [containerHeight, itemHeight]);

  return (
    <div className={`virtual-audio-list ${className}`} style={style}>
      <VirtualScrollList
        items={audios}
        itemHeight={itemHeight}
        containerHeight={containerHeight}
        renderItem={renderAudioItem}
        keyExtractor={keyExtractor}
        overscan={overscan}
        loadMore={onLoadMore}
        loading={loading}
        hasMore={hasMore}
        className="bg-gray-50"
      />
      
      {/* 空状态 */}
      {audios.length === 0 && !loading && (
        <div 
          className="flex flex-col items-center justify-center text-gray-500"
          style={{ height: containerHeight }}
        >
          <PlayCircleOutlined className="text-6xl mb-4 text-gray-300" />
          <p className="text-lg">暂无音频内容</p>
          <p className="text-sm">请尝试其他搜索条件或稍后再试</p>
        </div>
      )}
    </div>
  );
};

// 带搜索功能的虚拟音频列表
export const VirtualAudioListWithSearch: React.FC<VirtualAudioListProps & {
  searchQuery?: string;
  onSearch?: (query: string) => void;
  placeholder?: string;
}> = ({
  searchQuery = '',
  onSearch,
  placeholder = '搜索音频...',
  ...props
}) => {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  const handleSearch = useCallback((value: string) => {
    setLocalSearchQuery(value);
    onSearch?.(value);
  }, [onSearch]);

  return (
    <div className="space-y-4">
      {/* 搜索框 */}
      <div className="px-4">
        <input
          type="text"
          value={localSearchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      
      {/* 音频列表 */}
      <VirtualAudioList {...props} />
    </div>
  );
};

export default VirtualAudioList;