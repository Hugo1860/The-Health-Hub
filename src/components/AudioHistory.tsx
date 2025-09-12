'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface PlayHistory {
  audioId: string;
  lastPlayedAt: string;
  playCount: number;
  lastPosition: number; // 上次播放位置（秒）
}

interface AudioHistoryProps {
  audioId: string;
  onResumePlay?: (position: number) => void;
}

export default function AudioHistory({ audioId, onResumePlay }: AudioHistoryProps) {
  const { data: session } = useSession();
  const [history, setHistory] = useState<PlayHistory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      loadHistory();
    } else {
      setLoading(false);
    }
  }, [session, audioId]);

  const loadHistory = () => {
    try {
      const historyData = localStorage.getItem('audioPlayHistory');
      if (historyData) {
        const allHistory: Record<string, PlayHistory> = JSON.parse(historyData);
        const audioHistory = allHistory[audioId];
        if (audioHistory) {
          setHistory(audioHistory);
        }
      }
    } catch (error) {
      console.error('Error loading play history:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateHistory = (position: number) => {
    if (!session?.user) return;

    try {
      const historyData = localStorage.getItem('audioPlayHistory');
      const allHistory: Record<string, PlayHistory> = historyData ? JSON.parse(historyData) : {};
      
      const currentHistory = allHistory[audioId] || {
        audioId,
        lastPlayedAt: new Date().toISOString(),
        playCount: 0,
        lastPosition: 0
      };

      const updatedHistory: PlayHistory = {
        ...currentHistory,
        lastPlayedAt: new Date().toISOString(),
        playCount: currentHistory.playCount + 1,
        lastPosition: position
      };

      allHistory[audioId] = updatedHistory;
      localStorage.setItem('audioPlayHistory', JSON.stringify(allHistory));
      setHistory(updatedHistory);
    } catch (error) {
      console.error('Error updating play history:', error);
    }
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

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return '刚刚';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} 小时前`;
    } else if (diffInHours < 24 * 7) {
      return `${Math.floor(diffInHours / 24)} 天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  };

  const handleResumePlay = () => {
    if (history && onResumePlay) {
      onResumePlay(history.lastPosition);
    }
  };

  // 监听音频播放事件来更新历史记录
  useEffect(() => {
    const handleAudioPlay = (event: CustomEvent) => {
      if (event.detail?.id === audioId) {
        updateHistory(0); // 开始播放时记录
      }
    };

    const handleAudioTimeUpdate = (event: CustomEvent) => {
      if (event.detail?.audioId === audioId && event.detail?.currentTime) {
        // 每10秒更新一次位置
        if (Math.floor(event.detail.currentTime) % 10 === 0) {
          updateHistory(event.detail.currentTime);
        }
      }
    };

    window.addEventListener('playAudio', handleAudioPlay as EventListener);
    window.addEventListener('audioTimeUpdate', handleAudioTimeUpdate as EventListener);

    return () => {
      window.removeEventListener('playAudio', handleAudioPlay as EventListener);
      window.removeEventListener('audioTimeUpdate', handleAudioTimeUpdate as EventListener);
    };
  }, [audioId, session]);

  if (!session?.user || loading) {
    return null;
  }

  if (!history) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium text-blue-900">
              播放记录
            </div>
            <div className="text-xs text-blue-700">
              上次播放: {formatDate(history.lastPlayedAt)} • 
              播放次数: {history.playCount} • 
              上次位置: {formatTime(history.lastPosition)}
            </div>
          </div>
        </div>
        
        {history.lastPosition > 30 && (
          <button
            onClick={handleResumePlay}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
          >
            从 {formatTime(history.lastPosition)} 继续
          </button>
        )}
      </div>
    </div>
  );
}