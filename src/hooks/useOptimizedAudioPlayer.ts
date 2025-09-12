import { useState, useEffect, useRef, useCallback } from 'react';
import { audioCacheManager, AudioPreloader, AdaptiveBitrateManager } from '@/lib/audioCache';
import { intelligentPreloader } from '@/lib/IntelligentPreloader';
import { networkMonitor } from '@/lib/NetworkMonitor';
import { userBehaviorAnalyzer } from '@/lib/UserBehaviorAnalyzer';

interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  loading: boolean;
  error: string | null;
  volume: number;
  playbackRate: number;
}

interface UseOptimizedAudioPlayerProps {
  audioId: string;
  audioUrl: string;
  userId?: string;
  sessionId?: string;
  currentPlaylist?: any[];
  onTimeUpdate?: (time: number) => void;
  onEnded?: () => void;
  onError?: (error: string) => void;
}

export function useOptimizedAudioPlayer({
  audioId,
  audioUrl,
  userId,
  sessionId,
  currentPlaylist = [],
  onTimeUpdate,
  onEnded,
  onError,
}: UseOptimizedAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preloaderRef = useRef<AudioPreloader>(AudioPreloader.getInstance());
  const bitrateManagerRef = useRef<AdaptiveBitrateManager>(new AdaptiveBitrateManager());
  const playHistoryRef = useRef<string[]>([]);
  const lastPositionRef = useRef<number>(0);
  
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    buffered: 0,
    loading: false,
    error: null,
    volume: 1,
    playbackRate: 1,
  });

  // 记录用户行为的函数
  const recordBehavior = useCallback(async (
    action: 'play' | 'pause' | 'skip' | 'seek' | 'complete' | 'like' | 'share',
    position?: number
  ) => {
    if (!userId || !sessionId) return;

    try {
      await fetch('/api/audio/preload', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          sessionId,
          action,
          audioId,
          position,
          duration: state.duration,
          context: {
            source: 'direct',
            previousAudioId: playHistoryRef.current[playHistoryRef.current.length - 1]
          }
        })
      });
    } catch (error) {
      console.error('Failed to record behavior:', error);
    }
  }, [userId, sessionId, audioId, state.duration]);

  // 触发智能预加载
  const triggerIntelligentPreload = useCallback(async () => {
    if (!userId || currentPlaylist.length === 0) return;

    try {
      const deviceType = /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
      let batteryLevel: number | undefined;

      // 获取电池信息（如果可用）
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          batteryLevel = Math.round(battery.level * 100);
        } catch (error) {
          // 电池API不可用
        }
      }

      await fetch('/api/audio/preload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentAudioId: audioId,
          userId,
          playHistory: playHistoryRef.current,
          currentPlaylist,
          userPreferences: {},
          deviceType,
          batteryLevel
        })
      });
    } catch (error) {
      console.error('Failed to trigger intelligent preload:', error);
    }
  }, [userId, audioId, currentPlaylist]);

  // 初始化音频元素
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'metadata';
      
      // 设置音频源为流式传输API
      audioRef.current.src = `/api/audio/stream/${audioId}`;
      
      // 添加事件监听器
      const audio = audioRef.current;
      
      const handleLoadStart = () => {
        setState(prev => ({ ...prev, loading: true, error: null }));
      };
      
      const handleLoadedMetadata = () => {
        setState(prev => ({ 
          ...prev, 
          duration: audio.duration,
          loading: false 
        }));
        
        // 触发智能预加载
        triggerIntelligentPreload();
      };
      
      const handleTimeUpdate = () => {
        const currentTime = audio.currentTime;
        setState(prev => ({ ...prev, currentTime }));
        onTimeUpdate?.(currentTime);
        
        // 记录播放位置（每5秒记录一次）
        if (Math.abs(currentTime - lastPositionRef.current) >= 5) {
          lastPositionRef.current = currentTime;
        }
      };
      
      const handleProgress = () => {
        if (audio.buffered.length > 0) {
          const buffered = audio.buffered.end(audio.buffered.length - 1);
          setState(prev => ({ ...prev, buffered }));
        }
      };
      
      const handlePlay = () => {
        setState(prev => ({ ...prev, isPlaying: true }));
        recordBehavior('play', audio.currentTime);
        
        // 记录访问（用于预加载命中统计）
        intelligentPreloader.recordAccess(audioId);
      };
      
      const handlePause = () => {
        setState(prev => ({ ...prev, isPlaying: false }));
        recordBehavior('pause', audio.currentTime);
      };
      
      const handleEnded = () => {
        setState(prev => ({ ...prev, isPlaying: false }));
        recordBehavior('complete', audio.duration);
        
        // 添加到播放历史
        if (!playHistoryRef.current.includes(audioId)) {
          playHistoryRef.current.push(audioId);
          // 保持历史记录在合理大小内
          if (playHistoryRef.current.length > 50) {
            playHistoryRef.current = playHistoryRef.current.slice(-50);
          }
        }
        
        onEnded?.();
      };
      
      const handleError = () => {
        const errorMessage = '音频加载失败';
        setState(prev => ({ 
          ...prev, 
          error: errorMessage, 
          loading: false, 
          isPlaying: false 
        }));
        onError?.(errorMessage);
      };
      
      const handleCanPlay = () => {
        setState(prev => ({ ...prev, loading: false }));
      };
      
      const handleWaiting = () => {
        setState(prev => ({ ...prev, loading: true }));
      };
      
      const handleCanPlayThrough = () => {
        setState(prev => ({ ...prev, loading: false }));
      };
      
      // 绑定事件
      audio.addEventListener('loadstart', handleLoadStart);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('progress', handleProgress);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);
      audio.addEventListener('canplay', handleCanPlay);
      audio.addEventListener('waiting', handleWaiting);
      audio.addEventListener('canplaythrough', handleCanPlayThrough);
      
      return () => {
        // 清理事件监听器
        audio.removeEventListener('loadstart', handleLoadStart);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('progress', handleProgress);
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('waiting', handleWaiting);
        audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      };
    }
  }, [audioId, onTimeUpdate, onEnded, onError, recordBehavior, triggerIntelligentPreload]);

  // 网络自适应优化
  useEffect(() => {
    const optimizeForNetwork = async () => {
      const speed = await bitrateManagerRef.current.testConnectionSpeed();
      const quality = bitrateManagerRef.current.getRecommendedQuality();
      
      if (audioRef.current) {
        // 根据网络状况调整预加载策略
        if (quality === 'low') {
          audioRef.current.preload = 'none';
        } else if (quality === 'medium') {
          audioRef.current.preload = 'metadata';
        } else {
          audioRef.current.preload = 'auto';
        }
      }
    };

    optimizeForNetwork();
    
    // 每30秒重新评估网络状况
    const interval = setInterval(optimizeForNetwork, 30000);
    return () => clearInterval(interval);
  }, []);

  // 播放控制函数
  const play = useCallback(async () => {
    if (audioRef.current) {
      try {
        await audioRef.current.play();
      } catch (error) {
        console.error('播放失败:', error);
        setState(prev => ({ 
          ...prev, 
          error: '播放失败，请重试', 
          isPlaying: false 
        }));
      }
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, volume));
      setState(prev => ({ ...prev, volume: audioRef.current!.volume }));
    }
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
      setState(prev => ({ ...prev, playbackRate: rate }));
    }
  }, []);

  // 跳转到指定时间（优化版本，支持精确跳转）
  const seekTo = useCallback((time: number) => {
    if (audioRef.current) {
      const audio = audioRef.current;
      const oldTime = audio.currentTime;
      
      // 如果目标时间在已缓冲范围内，直接跳转
      let canSeekDirectly = false;
      for (let i = 0; i < audio.buffered.length; i++) {
        if (time >= audio.buffered.start(i) && time <= audio.buffered.end(i)) {
          canSeekDirectly = true;
          break;
        }
      }
      
      if (canSeekDirectly) {
        audio.currentTime = time;
      } else {
        // 如果目标时间未缓冲，显示加载状态并跳转
        setState(prev => ({ ...prev, loading: true }));
        audio.currentTime = time;
      }
      
      // 记录跳转行为
      recordBehavior('seek', time);
    }
  }, [recordBehavior]);

  // 跳过当前音频
  const skipAudio = useCallback(() => {
    if (audioRef.current) {
      recordBehavior('skip', audioRef.current.currentTime);
      
      // 添加到播放历史（即使没有完成播放）
      if (!playHistoryRef.current.includes(audioId)) {
        playHistoryRef.current.push(audioId);
        if (playHistoryRef.current.length > 50) {
          playHistoryRef.current = playHistoryRef.current.slice(-50);
        }
      }
      
      // 触发结束事件
      onEnded?.();
    }
  }, [audioId, recordBehavior, onEnded]);

  // 预加载相关音频
  const preloadRelatedAudios = useCallback((audioList: any[]) => {
    preloaderRef.current.preloadRelatedAudios(audioId, audioList);
  }, [audioId]);

  // 获取缓存统计信息
  const getCacheStats = useCallback(() => {
    return audioCacheManager.getCacheStats();
  }, []);

  // 清理资源
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  return {
    ...state,
    play,
    pause,
    seek,
    seekTo,
    skipAudio,
    setVolume,
    setPlaybackRate,
    preloadRelatedAudios,
    getCacheStats,
    recordBehavior,
    triggerIntelligentPreload,
    audioElement: audioRef.current,
  };
}