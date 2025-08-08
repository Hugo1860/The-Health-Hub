'use client';

import Link from 'next/link';
import { useAudioStore, AudioFile } from '../store/audioStore';

interface RecentUpdatesProps {
  recentAudios: AudioFile[];
  maxItems?: number;
  showViewAll?: boolean;
}

export function RecentUpdates({ recentAudios, maxItems = 8, showViewAll = true }: RecentUpdatesProps) {
  const { setCurrentAudio } = useAudioStore();

  const displayAudios = recentAudios.slice(0, maxItems);

  const handleAudioSelect = (audio: AudioFile) => {
    setCurrentAudio(audio);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">最近更新</h2>
        {showViewAll && (
          <Link 
            href="/browse" 
            className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
          >
            查看全部
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayAudios.map((audio) => (
          <div
            key={audio.id}
            className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer p-4 border border-gray-100"
            onClick={() => handleAudioSelect(audio)}
          >
            {/* 音频封面 */}
            <div className="w-full aspect-square bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mb-3">
              <span className="text-white text-sm">🎙️</span>
            </div>

            {/* 音频信息 */}
            <div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
                {audio.title}
              </h3>
              <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                {audio.description}
              </p>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {audio.subject || '未分类'}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(audio.uploadDate).toLocaleDateString('zh-CN', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {displayAudios.length === 0 && (
        <div className="text-center py-8">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-gray-400 text-xs">📝</span>
          </div>
          <p className="text-gray-500 text-sm">暂无最近更新的内容</p>
        </div>
      )}
    </div>
  );
}