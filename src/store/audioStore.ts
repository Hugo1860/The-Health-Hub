import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { audioCacheManager, AudioPreloader } from '@/lib/audioCache';

export interface AudioFile {
  id: string;
  title: string;
  description: string;
  url: string;
  filename: string;
  uploadDate: string;
  subject?: string;
  tags?: string[];
  speaker?: string;
  recordingDate?: string;
  duration?: number;
  transcription?: string;
  coverImage?: string; // 封面图片URL
}

interface AudioPlayerState {
  currentAudio: AudioFile | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isMuted: boolean;
  queue: AudioFile[];
  history: AudioFile[];
  playMode: 'single' | 'repeat' | 'sequential'; // 播放模式：单曲循环、列表循环、顺序播放
  buffering: boolean; // 缓冲状态
  networkQuality: 'high' | 'medium' | 'low'; // 网络质量
  preloadEnabled: boolean; // 是否启用预加载
}

interface AudioPlayerActions {
  setCurrentAudio: (audio: AudioFile | null) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  setIsMuted: (isMuted: boolean) => void;
  addToQueue: (audio: AudioFile) => void;
  removeFromQueue: (audioId: string) => void;
  clearQueue: () => void;
  playNext: () => void;
  playPrevious: () => void;
  addToHistory: (audio: AudioFile) => void;
  clearHistory: () => void;
  setPlayMode: (mode: 'single' | 'repeat' | 'sequential') => void;
  handleAudioEnd: () => void; // 处理音频结束事件
  setPlaylist: (playlist: AudioFile[]) => void; // 设置播放列表
  setBuffering: (buffering: boolean) => void; // 设置缓冲状态
  setNetworkQuality: (quality: 'high' | 'medium' | 'low') => void; // 设置网络质量
  setPreloadEnabled: (enabled: boolean) => void; // 设置预加载开关
  preloadRelatedAudios: (audioList: AudioFile[]) => void; // 预加载相关音频
  clearCache: () => void; // 清除缓存
  togglePlayPause: () => void; // 切换播放/暂停状态
}

type AudioStore = AudioPlayerState & AudioPlayerActions;

// 创建持久化的音频状态存储
export const useAudioStore = create<AudioStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      currentAudio: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 1,
      playbackRate: 1,
      isMuted: false,
      queue: [],
      history: [],
      playMode: 'sequential', // 默认顺序播放
      buffering: false,
      networkQuality: 'high',
      preloadEnabled: true,

      // 动作
      setCurrentAudio: (audio) => {
        const currentAudio = get().currentAudio;
        set({ currentAudio: audio });
        
        // 如果有当前音频且不是同一个，则添加到历史记录
        if (currentAudio && audio && currentAudio.id !== audio.id) {
          get().addToHistory(currentAudio);
        }
        
        // 如果启用预加载，预加载相关音频
        if (audio && get().preloadEnabled) {
          const { queue } = get();
          const audioList = [audio, ...queue];
          get().preloadRelatedAudios(audioList);
        }
      },
      
      setIsPlaying: (isPlaying) => set({ isPlaying }),
      
      setCurrentTime: (time) => set({ currentTime: time }),
      
      setDuration: (duration) => set({ duration }),
      
      setVolume: (volume) => set({ volume }),
      
      setPlaybackRate: (rate) => set({ playbackRate: rate }),
      
      setIsMuted: (isMuted) => set({ isMuted }),
      
      addToQueue: (audio) => {
        set((state) => ({
          queue: [...state.queue, audio]
        }));
      },
      
      removeFromQueue: (audioId) => {
        set((state) => ({
          queue: state.queue.filter(item => item.id !== audioId)
        }));
      },
      
      clearQueue: () => set({ queue: [] }),
      
      playNext: () => {
        const { queue, currentAudio } = get();
        if (queue.length === 0) return;
        
        // 播放队列中的第一个音频
        const nextAudio = queue[0];
        set((state) => ({
          currentAudio: nextAudio,
          queue: state.queue.slice(1)
        }));
        
        // 将当前音频添加到历史记录
        if (currentAudio) {
          get().addToHistory(currentAudio);
        }
        
        // 触发播放事件
        const event = new CustomEvent('playAudio', { detail: nextAudio });
        window.dispatchEvent(event);
      },
      
      playPrevious: () => {
        const { history } = get();
        if (history.length === 0) return;
        
        // 播放历史记录中的最后一个音频
        const previousAudio = history[history.length - 1];
        set((state) => ({
          currentAudio: previousAudio,
          history: state.history.slice(0, -1)
        }));
      },
      
      addToHistory: (audio) => {
        // 限制历史记录最多保存20条
        set((state) => {
          const newHistory = [...state.history, audio];
          if (newHistory.length > 20) {
            return { history: newHistory.slice(-20) };
          }
          return { history: newHistory };
        });
      },
      
      clearHistory: () => set({ history: [] }),
      
      setPlayMode: (mode) => set({ playMode: mode }),
      
      // 设置播放列表（替换当前队列）
      setPlaylist: (playlist) => {
        set({ queue: playlist });
      },
      
      // 处理音频结束事件
      handleAudioEnd: () => {
        const { playMode, currentAudio, queue } = get();
        
        // 根据播放模式处理
        switch (playMode) {
          case 'single': // 单曲循环
            // 重新播放当前音频，不改变状态
            return;
            
          case 'repeat': // 列表循环
            if (queue.length > 0) {
              // 播放队列中的下一首
              get().playNext();
            } else if (currentAudio) {
              // 如果队列为空但有当前音频，将当前音频重新加入队列
              set((state) => ({
                queue: [state.currentAudio as AudioFile]
              }));
              // 然后播放它
              get().playNext();
            }
            break;
            
          case 'sequential': // 顺序播放
          default:
            if (queue.length > 0) {
              // 播放队列中的下一首
              get().playNext();
            }
            break;
        }
      },
      
      // 性能优化相关动作
      setBuffering: (buffering) => set({ buffering }),
      
      setNetworkQuality: (quality) => set({ networkQuality: quality }),
      
      setPreloadEnabled: (enabled) => set({ preloadEnabled: enabled }),
      
      preloadRelatedAudios: (audioList) => {
        if (get().preloadEnabled && audioList.length > 0) {
          const preloader = AudioPreloader.getInstance();
          const currentAudio = audioList[0];
          preloader.preloadRelatedAudios(currentAudio.id, audioList);
        }
      },
      
      clearCache: () => {
        audioCacheManager.clearCache();
        AudioPreloader.getInstance().clearPreloadedMarks();
      },
      
      togglePlayPause: () => {
        set((state) => ({ isPlaying: !state.isPlaying }));
      }
    }),
    {
      name: 'audio-player-storage', // 本地存储的键名
      partialize: (state) => ({
        // 只持久化这些字段
        currentAudio: state.currentAudio,
        currentTime: state.currentTime,
        volume: state.volume,
        playbackRate: state.playbackRate,
        isMuted: state.isMuted,
        queue: state.queue,
        history: state.history,
        playMode: state.playMode,
        networkQuality: state.networkQuality,
        preloadEnabled: state.preloadEnabled
      })
    }
  )
);