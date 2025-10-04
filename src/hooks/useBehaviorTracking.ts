/**
 * 用户行为追踪 Hook
 * 自动追踪用户行为并发送到分析服务
 */

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';

interface TrackingOptions {
  enablePageViews?: boolean;
  enableAudioEvents?: boolean;
  enableInteractionEvents?: boolean;
  sessionId?: string;
}

export function useBehaviorTracking(options: TrackingOptions = {}) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const sessionIdRef = useRef<string>('');
  const {
    enablePageViews = true,
    enableAudioEvents = true,
    enableInteractionEvents = true,
    sessionId
  } = options;

  // 生成或使用会话ID
  useEffect(() => {
    if (sessionId) {
      sessionIdRef.current = sessionId;
    } else if (!sessionIdRef.current) {
      sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }, [sessionId]);

  // 发送事件到服务器
  const trackEvent = async (
    eventType: string,
    eventData: Record<string, any>,
    options: {
      pageUrl?: string;
      referrer?: string;
    } = {}
  ) => {
    try {
      const deviceType = window.innerWidth < 768 ? 'mobile' : 
                        window.innerWidth < 1024 ? 'tablet' : 'desktop';

      await fetch('/api/behavior/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType,
          eventData,
          sessionId: sessionIdRef.current,
          userId: session?.user?.id,
          pageUrl: options.pageUrl || window.location.href,
          referrer: options.referrer || document.referrer,
          deviceType
        })
      });
    } catch (error) {
      console.error('行为追踪失败:', error);
      // 静默失败，不影响用户体验
    }
  };

  // 追踪页面访问
  useEffect(() => {
    if (enablePageViews && pathname) {
      trackEvent('page_view', {
        path: pathname,
        timestamp: Date.now()
      });
    }
  }, [pathname, enablePageViews]);

  // 返回追踪函数供组件使用
  const trackAudioPlay = (audioId: string, currentPosition: number = 0, duration?: number) => {
    if (enableAudioEvents) {
      trackEvent('audio_play', {
        audioId,
        currentPosition,
        duration,
        timestamp: Date.now()
      });
    }
  };

  const trackAudioPause = (audioId: string, currentPosition: number, sessionTime: number) => {
    if (enableAudioEvents) {
      trackEvent('audio_pause', {
        audioId,
        currentPosition,
        sessionTime,
        timestamp: Date.now()
      });
    }
  };

  const trackAudioSeek = (audioId: string, fromPosition: number, toPosition: number) => {
    if (enableAudioEvents) {
      trackEvent('audio_seek', {
        audioId,
        fromPosition,
        toPosition,
        timestamp: Date.now()
      });
    }
  };

  const trackSearch = (query: string, resultsCount?: number) => {
    if (enableInteractionEvents) {
      trackEvent('search', {
        query,
        resultsCount,
        timestamp: Date.now()
      });
    }
  };

  const trackFilter = (filterType: string, filterValue: string) => {
    if (enableInteractionEvents) {
      trackEvent('filter', {
        filterType,
        filterValue,
        timestamp: Date.now()
      });
    }
  };

  const trackLike = (contentType: 'audio' | 'playlist', contentId: string) => {
    if (enableInteractionEvents) {
      trackEvent('like', {
        contentType,
        contentId,
        timestamp: Date.now()
      });
    }
  };

  const trackShare = (contentType: 'audio' | 'playlist', contentId: string, method: string) => {
    if (enableInteractionEvents) {
      trackEvent('share', {
        contentType,
        contentId,
        method,
        timestamp: Date.now()
      });
    }
  };

  const trackComment = (audioId: string, commentLength: number) => {
    if (enableInteractionEvents) {
      trackEvent('comment', {
        audioId,
        commentLength,
        timestamp: Date.now()
      });
    }
  };

  const trackPlaylistCreate = (playlistId: string, isPublic: boolean) => {
    if (enableInteractionEvents) {
      trackEvent('playlist_create', {
        playlistId,
        isPublic,
        timestamp: Date.now()
      });
    }
  };

  const trackFollow = (targetType: 'user' | 'speaker' | 'category', targetId: string) => {
    if (enableInteractionEvents) {
      trackEvent('follow', {
        targetType,
        targetId,
        timestamp: Date.now()
      });
    }
  };

  return {
    trackAudioPlay,
    trackAudioPause,
    trackAudioSeek,
    trackSearch,
    trackFilter,
    trackLike,
    trackShare,
    trackComment,
    trackPlaylistCreate,
    trackFollow,
    sessionId: sessionIdRef.current
  };
}

export default useBehaviorTracking;
