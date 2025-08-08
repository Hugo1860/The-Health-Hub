'use client';

import { useEffect, useState } from 'react';
import { useAudioStore, AudioFile } from '../store/audioStore';

interface FeaturedPlayerProps {
  currentAudio: AudioFile | null;
  showFullControls?: boolean;
}

export function FeaturedPlayer({ currentAudio, showFullControls = true }: FeaturedPlayerProps) {
  const { 
    isPlaying, 
    currentTime, 
    duration, 
    playbackRate,
    volume,
    setIsPlaying, 
    setCurrentTime, 
    setPlaybackRate,
    setVolume
  } = useAudioStore();
  
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // 检查是否点击在速度菜单外部
      if (showSpeedMenu && !target.closest('[data-speed-menu]')) {
        setShowSpeedMenu(false);
      }
      
      // 检查是否点击在音量菜单外部
      if (showVolumeSlider && !target.closest('[data-volume-menu]')) {
        setShowVolumeSlider(false);
      }
    };

    if (showSpeedMenu || showVolumeSlider) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSpeedMenu, showVolumeSlider]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    
    setCurrentTime(newTime);
    
    // 通过自定义事件通知AudioPlayer组件更新播放位置
    const event = new CustomEvent('seekAudio', { detail: { time: newTime } });
    window.dispatchEvent(event);
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    setShowSpeedMenu(false);
  };



  const handleSkip = (seconds: number) => {
    if (!duration) return;
    
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    setCurrentTime(newTime);
    
    // 通过自定义事件通知AudioPlayer组件更新播放位置
    const event = new CustomEvent('seekAudio', { detail: { time: newTime } });
    window.dispatchEvent(event);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  const toggleFavorite = () => {
    setIsFavorited(!isFavorited);
    // 这里可以添加实际的收藏逻辑
    console.log(isFavorited ? '取消收藏' : '添加收藏', currentAudio?.title);
  };

  if (!currentAudio) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-sm">🎵</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">选择音频开始播放</h3>
            <p className="text-gray-500 text-sm">点击任意音频即可在此处播放</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 w-full featured-player-container">
        
        {/* 第一行：封面 + 标题描述和分类日期 */}
        <div className="w-full mb-4">
          <div className="flex items-start space-x-4">
            {/* 音频封面 */}
            <div className="flex-shrink-0">
              <button
                onClick={() => window.location.href = `/audio/${currentAudio.id}`}
                className="block rounded-lg overflow-hidden hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                title="查看音频详情"
                style={{ width: '70px', height: '70px' }}
              >
                {currentAudio.coverImage ? (
                  <img
                    src={currentAudio.coverImage}
                    alt={currentAudio.title}
                    className="object-cover"
                    style={{ width: '70px', height: '70px' }}
                  />
                ) : (
                  <div className="bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center" style={{ width: '70px', height: '70px' }}>
                    <span className="text-white text-base">🎙️</span>
                  </div>
                )}
              </button>
            </div>

            {/* 标题描述和分类日期 */}
            <div className="flex-1 min-w-0">
              <button
                onClick={() => window.location.href = `/audio/${currentAudio.id}`}
                className="text-left w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md p-1 -m-1 hover:bg-gray-50 transition-colors block mb-2"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-1 hover:text-blue-600 transition-colors line-clamp-2">
                  {currentAudio.title}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {currentAudio.description}
                </p>
              </button>
              
              {/* 分类标签和日期 - 在桌面端同行显示，移动端可换行 */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                  {currentAudio.subject || '未分类'}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(currentAudio.uploadDate).toLocaleDateString('zh-CN')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 第二行：时间 + 进度条 + 总时长 */}
        {showFullControls && (
          <div className="w-full mb-4">
            <div className="flex items-center space-x-3">
              <span className="font-mono text-xs text-gray-600 min-w-[40px]">
                {formatTime(currentTime)}
              </span>
              <div 
                className="flex-1 bg-gray-200 rounded-full h-2 cursor-pointer hover:bg-gray-300 transition-colors relative group"
                onClick={handleSeek}
                title="点击跳转到指定位置"
              >
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-200 relative" 
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                >
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white border-2 border-blue-600 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              </div>
              <span className="font-mono text-xs text-gray-600 min-w-[40px] text-right">
                {formatTime(duration)}
              </span>
            </div>
          </div>
        )}

        {/* 第三行：所有控制按钮水平排列 */}
        {showFullControls && (
          <div className="w-full">
            <div className="flex items-center justify-center space-x-3">
              {/* 后退按钮 */}
              <button
                onClick={() => handleSkip(-15)}
                className="w-12 h-12 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg flex items-center justify-center text-gray-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
                title="后退15秒"
              >
                <span className="text-xs font-medium">后退</span>
              </button>

              {/* 主播放按钮 */}
              <button
                onClick={togglePlay}
                className={`w-14 h-14 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg flex items-center justify-center text-white transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-opacity-50 ${isPlaying ? 'main-play-button-active' : ''}`}
                title={isPlaying ? '暂停' : '播放'}
              >
                <span className="text-sm font-medium">
                  {isPlaying ? '暂停' : '播放'}
                </span>
              </button>

              {/* 前进按钮 */}
              <button
                onClick={() => handleSkip(15)}
                className="w-12 h-12 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg flex items-center justify-center text-gray-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
                title="前进15秒"
              >
                <span className="text-xs font-medium">前进</span>
              </button>

              {/* 音量控制 */}
              <div className="relative" data-volume-menu>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowVolumeSlider(!showVolumeSlider);
                  }}
                  className="w-12 h-12 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg flex items-center justify-center text-gray-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
                  title="音量控制"
                >
                  <span className="text-xs font-medium">音量</span>
                </button>
                {showVolumeSlider && (
                  <div className="absolute bottom-full mb-2 bg-white border border-gray-200 rounded-lg shadow-xl p-3 z-30 right-0 min-w-[100px]">
                    <div className="flex flex-col items-center space-y-2">
                      <span className="text-xs text-gray-700 font-medium bg-blue-50 px-2 py-1 rounded">
                        {Math.round(volume * 100)}%
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">静音</span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={volume}
                          onChange={handleVolumeChange}
                          className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                        />
                        <span className="text-xs text-gray-500">最大</span>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => setVolume(0)}
                          className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                        >
                          静音
                        </button>
                        <button
                          onClick={() => setVolume(1)}
                          className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                        >
                          最大
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 播放速度控制 */}
              <div className="relative" data-speed-menu>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSpeedMenu(!showSpeedMenu);
                  }}
                  className="w-12 h-12 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg flex items-center justify-center text-gray-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
                  title="播放速度"
                >
                  <span className="text-xs font-medium">变速</span>
                </button>
                {showSpeedMenu && (
                  <div className="absolute bottom-full mb-2 bg-white border border-gray-200 rounded-lg shadow-xl z-30 min-w-[70px] right-0">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                      <button
                        key={speed}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSpeedChange(speed);
                        }}
                        className={`block w-full px-3 py-2 text-xs text-left hover:bg-gray-100 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                          playbackRate === speed ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 收藏按钮 */}
              <button
                onClick={toggleFavorite}
                className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
                  isFavorited 
                    ? 'bg-red-100 text-red-600 hover:bg-red-200 focus:ring-red-400' 
                    : 'bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 focus:ring-gray-400'
                }`}
                title={isFavorited ? '取消收藏' : '添加收藏'}
              >
                <span className="text-xs font-medium">
                  {isFavorited ? '已藏' : '收藏'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}