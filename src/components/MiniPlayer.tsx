'use client';

import { useAudioStore } from '../store/audioStore';

export default function MiniPlayer() {
  const {
    currentAudio,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    setIsPlaying,
    setCurrentTime
  } = useAudioStore();
  
  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };
  
  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSkip = (seconds: number) => {
    if (!duration) return;
    
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    setCurrentTime(newTime);
    
    // 通过自定义事件通知AudioPlayer组件更新播放位置
    const event = new CustomEvent('seekAudio', { detail: { time: newTime } });
    window.dispatchEvent(event);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    
    setCurrentTime(newTime);
    
    // 通过自定义事件通知AudioPlayer组件更新播放位置
    const event = new CustomEvent('seekAudio', { detail: { time: newTime } });
    window.dispatchEvent(event);
  };
  
  // 只在非首页或者需要迷你播放器时显示
  if (!currentAudio) return null;
  
  // 检查是否在首页，如果在首页则不显示MiniPlayer
  const isHomePage = typeof window !== 'undefined' && window.location.pathname === '/';
  if (isHomePage) return null;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-2 sm:p-3 z-50 mini-player">
      <div className="max-w-4xl mx-auto">
        {/* 移动端布局 */}
        <div className="sm:hidden">
          {/* 音频信息区域 */}
          <div className="flex items-center gap-3 mb-3">
            {/* 封面图片 - 固定70x70px */}
            <button
              onClick={() => window.location.href = `/audio/${currentAudio.id}`}
              className="flex-shrink-0 rounded-lg overflow-hidden hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
                  <span className="text-white text-sm">🎙️</span>
                </div>
              )}
            </button>
            
            <div className="flex-1 min-w-0">
              <button
                onClick={() => window.location.href = `/audio/${currentAudio.id}`}
                className="text-left w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md p-1 -m-1 hover:bg-gray-50 transition-colors"
              >
                <p className="text-sm font-medium text-gray-900 truncate hover:text-blue-600 transition-colors">{currentAudio.title}</p>
              </button>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                <span className="font-mono">{formatTime(currentTime)}</span>
                <span>/</span>
                <span className="font-mono">{formatTime(duration)}</span>
                <span className="bg-gray-200 px-2 py-0.5 rounded-full">
                  {playbackRate}x
                </span>
              </div>
            </div>
          </div>
          
          {/* 控制按钮区域 */}
          <div className="flex items-center justify-center gap-4 mb-2">
            <button
              onClick={() => handleSkip(-15)}
              className="bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
            >
              -15s
            </button>
            
            <button
              onClick={togglePlayPause}
              className={`bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white p-3 rounded-full flex-shrink-0 touch-manipulation transition-all duration-200 shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-opacity-50 ${isPlaying ? 'play-button-active' : ''}`}
            >
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>
            
            <button
              onClick={() => handleSkip(15)}
              className="bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
            >
              +15s
            </button>
          </div>
          
          <div className="relative">
            <div 
              className="overflow-hidden h-2 text-xs flex rounded-full bg-gray-200 cursor-pointer hover:bg-gray-300 transition-colors group"
              onClick={handleProgressClick}
              title={`${formatTime(currentTime)} / ${formatTime(duration)}`}
            >
              <div 
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-200 relative"
              >
                <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white border-2 border-blue-600 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            </div>
          </div>
        </div>

        {/* 桌面端布局 */}
        <div className="hidden sm:block">
          {/* 音频信息和进度条区域 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              {/* 封面图片 - 固定70x70px */}
              <button
                onClick={() => window.location.href = `/audio/${currentAudio.id}`}
                className="flex-shrink-0 rounded-lg overflow-hidden hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
                    <span className="text-white text-sm">🎙️</span>
                  </div>
                )}
              </button>
              
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => window.location.href = `/audio/${currentAudio.id}`}
                  className="text-left w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md p-1 -m-1 hover:bg-gray-50 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-900 truncate hover:text-blue-600 transition-colors">{currentAudio.title}</p>
                </button>
                <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                  <span className="font-mono">{formatTime(currentTime)}</span>
                  <span>/</span>
                  <span className="font-mono">{formatTime(duration)}</span>
                  <span className="bg-gray-200 px-2 py-0.5 rounded-full">
                    {playbackRate}x
                  </span>
                </div>
              </div>
            </div>
            
            <div className="w-1/2 px-4">
              <div className="relative pt-1">
                <div 
                  className="overflow-hidden h-2 text-xs flex rounded-full bg-gray-200 cursor-pointer hover:bg-gray-300 transition-colors group"
                  onClick={handleProgressClick}
                  title={`${formatTime(currentTime)} / ${formatTime(duration)}`}
                >
                  <div 
                    style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-200 relative"
                  >
                    <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white border-2 border-blue-600 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* 控制按钮区域 */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => handleSkip(-15)}
              className="bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
            >
              -15s
            </button>
            
            <button
              onClick={togglePlayPause}
              className={`bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white p-3 rounded-full flex-shrink-0 touch-manipulation transition-all duration-200 shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-opacity-50 ${isPlaying ? 'play-button-active' : ''}`}
            >
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>
            
            <button
              onClick={() => handleSkip(15)}
              className="bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
            >
              +15s
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}