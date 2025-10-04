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
    setCurrentAudio,
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

  // 监听播放事件
  useEffect(() => {
    const handlePlayAudio = (event: CustomEvent) => {
      if (event.detail) {
        const audioData = event.detail;
        setCurrentAudio(audioData);
        setIsPlaying(true);
        
        // 如果有起始位置，设置播放位置
        if (audioData.startPosition && audioRef.current) {
          audioRef.current.currentTime = audioData.startPosition;
          setCurrentTime(audioData.startPosition);
        }
      }
    };

    const handleSeek = (event: CustomEvent) => {
      if (audioRef.current && event.detail?.time !== undefined) {
        audioRef.current.currentTime = event.detail.time;
      }
    };

    const handleSeekToTime = (event: CustomEvent) => {
      if (audioRef.current && event.detail?.time !== undefined && event.detail?.audioId === currentAudio?.id) {
        audioRef.current.currentTime = event.detail.time;
        setCurrentTime(event.detail.time);
        setIsPlaying(true);
      }
    };

    window.addEventListener('playAudio', handlePlayAudio as EventListener);
    window.addEventListener('seekAudio', handleSeek as EventListener);
    window.addEventListener('seekToTime', handleSeekToTime as EventListener);
    
    return () => {
      window.removeEventListener('playAudio', handlePlayAudio as EventListener);
      window.removeEventListener('seekAudio', handleSeek as EventListener);
      window.removeEventListener('seekToTime', handleSeekToTime as EventListener);
    };
  }, [currentAudio, setCurrentAudio, setIsPlaying, setCurrentTime]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const currentTime = audioRef.current.currentTime;
      setCurrentTime(currentTime);
      
      // 发送时间更新事件给其他组件
      const event = new CustomEvent('audioTimeUpdate', { 
        detail: { 
          audioId: currentAudio?.id,
          currentTime: currentTime
        } 
      });
      window.dispatchEvent(event);
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