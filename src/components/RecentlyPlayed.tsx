'use client';

import { useState, useEffect } from 'react';
import { AudioFile } from '../store/audioStore';

interface RecentlyPlayedProps {
  recentAudios: AudioFile[];
  maxItems?: number;
  onAudioSelect: (audio: AudioFile) => void;
}

export function RecentlyPlayed({ recentAudios, maxItems = 5, onAudioSelect }: RecentlyPlayedProps) {
  const [localRecentAudios, setLocalRecentAudios] = useState<AudioFile[]>([]);

  useEffect(() => {
    // 从localStorage获取最近播放记录
    const getRecentlyPlayed = () => {
      try {
        const recent = localStorage.getItem('recentlyPlayed');
        if (recent) {
          const parsedRecent = JSON.parse(recent);
          setLocalRecentAudios(parsedRecent.slice(0, maxItems));
        }
      } catch (error) {
        console.error('获取最近播放记录失败:', error);
      }
    };

    getRecentlyPlayed();

    // 监听localStorage变化
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'recentlyPlayed') {
        getRecentlyPlayed();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [maxItems]);

  // 使用传入的recentAudios或本地存储的数据
  const displayAudios = recentAudios.length > 0 ? recentAudios.slice(0, maxItems) : localRecentAudios;

  const handleAudioClick = (audio: AudioFile) => {
    onAudioSelect(audio);
    
    // 更新最近播放记录
    const updateRecentlyPlayed = (newAudio: AudioFile) => {
      try {
        const existing = localStorage.getItem('recentlyPlayed');
        let recentList: AudioFile[] = existing ? JSON.parse(existing) : [];
        
        // 移除已存在的相同音频
        recentList = recentList.filter(item => item.id !== newAudio.id);
        
        // 添加到开头
        recentList.unshift(newAudio);
        
        // 限制数量
        recentList = recentList.slice(0, 10);
        
        localStorage.setItem('recentlyPlayed', JSON.stringify(recentList));
        setLocalRecentAudios(recentList.slice(0, maxItems));
      } catch (error) {
        console.error('更新最近播放记录失败:', error);
      }
    };

    updateRecentlyPlayed(audio);
  };

  const clearRecentlyPlayed = () => {
    localStorage.removeItem('recentlyPlayed');
    setLocalRecentAudios([]);
  };

  const formatPlayTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return '刚刚播放';
    } else if (diffInHours < 24) {
      return `${diffInHours}小时前`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}天前`;
    }
  };

  if (displayAudios.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
          <span className="text-gray-400 text-xs">🕒</span>
        </div>
        <p className="text-sm text-gray-500 mb-2">暂无播放记录</p>
        <p className="text-xs text-gray-400">开始播放音频后会在这里显示</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">最近播放</h3>
        <button
          onClick={clearRecentlyPlayed}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          title="清除记录"
        >
          清除
        </button>
      </div>

      <div className="space-y-2">
        {displayAudios.map((audio, index) => (
          <div
            key={`${audio.id}-${index}`}
            onClick={() => handleAudioClick(audio)}
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 cursor-pointer group transition-all"
          >
            {/* 播放指示器 */}
            <div className="w-1 h-8 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>

            {/* 音频封面 */}
            <div 
              className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #34c9ff 0%, #6366f1 100%)' }}
            >
              <span className="text-white text-xs">🎙️</span>
            </div>

            {/* 音频信息 */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                {audio.title}
              </p>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <span className="truncate">{audio.subject || '未分类'}</span>
                <span>•</span>
                <span>{formatPlayTime(audio.uploadDate)}</span>
              </div>
            </div>

            {/* 播放按钮 */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors">
                <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 统计信息 */}
      <div className="pt-2 border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex justify-between">
            <span>播放记录</span>
            <span className="font-medium">{displayAudios.length}</span>
          </div>
          {displayAudios.length > 0 && (
            <div className="flex justify-between">
              <span>最近播放</span>
              <span className="font-medium">
                {formatPlayTime(displayAudios[0].uploadDate)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}