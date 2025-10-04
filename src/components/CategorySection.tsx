'use client';

import Link from 'next/link';
import { useAudioStore, AudioFile } from '../store/audioStore';

interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

interface CategorySectionProps {
  category: Category;
  audios: AudioFile[];
  maxItems?: number;
  layout: 'grid' | 'list';
}

export function CategorySection({ category, audios, maxItems = 6, layout = 'grid' }: CategorySectionProps) {
  const { setCurrentAudio, setIsPlaying } = useAudioStore();

  const displayAudios = audios.slice(0, maxItems);

  const handleAudioSelect = (audio: AudioFile) => {
    setCurrentAudio(audio);
    setIsPlaying(true);
  };

  if (displayAudios.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm"
            style={{ backgroundColor: category.color }}
          >
            {category.icon}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{category.name}</h2>
            {category.description && (
              <p className="text-sm text-gray-600">{category.description}</p>
            )}
          </div>
        </div>
        
        <Link 
          href={`/category/${category.id}`}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
        >
          查看更多
        </Link>
      </div>

      {layout === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayAudios.map((audio) => (
            <div
              key={audio.id}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer p-4 border border-gray-100"
              onClick={() => handleAudioSelect(audio)}
            >
              <div className="flex items-start space-x-3">
                {/* 音频封面 */}
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                  style={{ backgroundColor: category.color }}
                >
                  <span className="text-xs">🎙️</span>
                </div>

                {/* 音频信息 */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
                    {audio.title}
                  </h3>
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                    {audio.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {new Date(audio.uploadDate).toLocaleDateString('zh-CN', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                    {audio.duration && (
                      <span className="text-xs text-gray-500">
                        {Math.floor(audio.duration / 60)}:{(audio.duration % 60).toString().padStart(2, '0')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {displayAudios.map((audio) => (
            <div
              key={audio.id}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer p-3 border border-gray-100"
              onClick={() => handleAudioSelect(audio)}
            >
              <div className="flex items-center space-x-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                  style={{ backgroundColor: category.color }}
                >
                  <span className="text-xs">🎙️</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 text-sm truncate">
                    {audio.title}
                  </h3>
                  <p className="text-xs text-gray-600 truncate">
                    {audio.description}
                  </p>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(audio.uploadDate).toLocaleDateString('zh-CN', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}