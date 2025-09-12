'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { AudioFile } from '@/store/audioStore';
import FavoriteButton from './FavoriteButton';
import ShareButton from './ShareButton';
import AddToPlaylistModal from './AddToPlaylistModal';

interface AudioActionsProps {
  audio: AudioFile;
  onPlay: () => void;
}

export default function AudioActions({ audio, onPlay }: AudioActionsProps) {
  const { data: session } = useSession();
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);

  return (
    <div className="flex flex-wrap gap-2">
      {/* 播放按钮 */}
      <button
        onClick={onPlay}
        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 active:bg-blue-800 touch-manipulation text-sm transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2z" />
        </svg>
        播放音频
      </button>

      {/* 收藏按钮 */}
      <FavoriteButton audioId={audio.id} size="md" />

      {/* 分享按钮 */}
      <ShareButton 
        audioId={audio.id} 
        audioTitle={audio.title} 
        audioDescription={audio.description} 
        size="md"
        audioData={audio}
      />

      {/* 添加到播放列表按钮 */}
      {session?.user && (
        <button
          onClick={() => setShowPlaylistModal(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 active:bg-green-800 touch-manipulation text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          添加到播放列表
        </button>
      )}

      {/* 下载按钮 */}
      <a
        href={audio.url}
        download={audio.filename}
        className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 active:bg-gray-800 touch-manipulation text-sm transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        下载
      </a>

      {/* 添加到播放列表模态框 */}
      {showPlaylistModal && (
        <AddToPlaylistModal
          isOpen={showPlaylistModal}
          audioId={audio.id}
          audioTitle={audio.title}
          onClose={() => setShowPlaylistModal(false)}
          onSuccess={() => {
            setShowPlaylistModal(false);
            // 可以添加成功提示
          }}
        />
      )}
    </div>
  );
}