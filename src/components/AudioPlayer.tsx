'use client';

import { useEffect, useRef } from 'react';
import { useAudioStore } from '../store/audioStore';

/**
 * 全局音频播放器 - 只负责实际的音频播放逻辑
 * 不包含UI，只是一个隐藏的音频元素和播放控制逻辑
 */
export function AudioPlayer() {
  const {
    currentAudio,
    isPlaying,
    currentTime,
    playbackRate,
    volume,
    playMode,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    handleAudioEnd
  } = useAudioStore();
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // 同步播放状态
  useEffect(() => {
    if (!audioRef.current || !currentAudio) return;
    
    if (isPlaying) {
      audioRef.current.play()
        .catch(error => {
          console.error('播放失败:', error);
          setIsPlaying(false);
        });
    } else {
      audioRef.current.pause();
    }
  }, [currentAudio, isPlaying, setIsPlaying]);

  // 同步播放设置
  useEffect(() => {
    if (!audioRef.current) return;
    
    audioRef.current.playbackRate = playbackRate;
    audioRef.current.volume = volume;
  }, [playbackRate, volume]);

  // 处理音频切换
  useEffect(() => {
    if (!audioRef.current || !currentAudio) return;
    
    // 重置播放时间
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    
    // 如果正在播放，则开始播放新音频
    if (isPlaying) {
      audioRef.current.play()
        .catch(error => {
          console.error('播放失败:', error);
          setIsPlaying(false);
        });
    }
  }, [currentAudio, isPlaying, setIsPlaying, setCurrentTime]);

  // 监听seek事件
  useEffect(() => {
    const handleSeek = (event: CustomEvent) => {
      if (audioRef.current && event.detail?.time !== undefined) {
        audioRef.current.currentTime = event.detail.time;
      }
    };

    window.addEventListener('seekAudio', handleSeek as EventListener);
    return () => {
      window.removeEventListener('seekAudio', handleSeek as EventListener);
    };
  }, []);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    
    if (playMode === 'single') {
      // 单曲循环：重新播放当前音频
      if (audioRef.current && currentAudio) {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(error => console.error('播放失败:', error));
      }
    } else {
      // 其他模式：使用状态管理的处理逻辑
      handleAudioEnd();
    }
  };

  if (!currentAudio) return null;

  return (
    <audio
      ref={audioRef}
      src={currentAudio.url}
      onTimeUpdate={handleTimeUpdate}
      onLoadedMetadata={handleLoadedMetadata}
      onEnded={handleEnded}
      className="hidden"
      preload="metadata"
    />
  );
}