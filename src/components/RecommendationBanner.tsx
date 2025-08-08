'use client';

import { useAudioStore, AudioFile } from '../store/audioStore';

interface RecommendationBannerProps {
  recommendations: AudioFile[];
  bannerStyle: 'gradient' | 'image';
}

export function RecommendationBanner({ recommendations, bannerStyle }: RecommendationBannerProps) {
  const { setCurrentAudio } = useAudioStore();

  if (recommendations.length === 0) {
    return null;
  }

  const featuredAudio = recommendations[0];

  const handleAudioSelect = (audio: AudioFile) => {
    setCurrentAudio(audio);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4" style={{color: 'var(--wechat-primary)'}}>为你推荐</h2>
      
      {/* 主推荐横幅 */}
      <div 
        className={`relative rounded-2xl overflow-hidden mb-6 cursor-pointer group ${
          bannerStyle === 'gradient' 
            ? 'bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600' 
            : 'bg-gray-900'
        }`}
        onClick={() => handleAudioSelect(featuredAudio)}
      >
        <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-30 transition-all"></div>
        
        <div className="relative p-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-sm font-medium bg-white bg-opacity-20 px-3 py-1 rounded-full">
                  精选推荐
                </span>
                <span className="text-sm opacity-80">
                  {featuredAudio.subject || '未分类'}
                </span>
              </div>
              
              <h3 className="text-2xl font-bold mb-2 line-clamp-2" style={{color: 'var(--wechat-primary)'}}>
                {featuredAudio.title}
              </h3>
              
              <p className="text-lg opacity-90 mb-4 line-clamp-2" style={{color: 'var(--wechat-text-secondary)'}}>
                {featuredAudio.description}
              </p>
              
              <div className="flex items-center space-x-4 text-sm opacity-80">
                <span>
                  {new Date(featuredAudio.uploadDate).toLocaleDateString('zh-CN')}
                </span>
                {featuredAudio.duration && (
                  <span>
                    {Math.floor(featuredAudio.duration / 60)}:{(featuredAudio.duration % 60).toString().padStart(2, '0')}
                  </span>
                )}
              </div>
            </div>
            
            <div className="ml-8">
              <div className="w-20 h-20 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center">
                <span className="text-lg">🎙️</span>
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <button className="bg-white text-gray-900 px-6 py-2 rounded-full font-medium hover:bg-opacity-90 transition-all">
              立即播放
            </button>
          </div>
        </div>
      </div>

      {/* 其他推荐 */}
      {recommendations.length > 1 && (
        <div>
          <h3 className="text-lg font-semibold mb-3" style={{color: 'var(--wechat-primary)'}}>更多推荐</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.slice(1, 4).map((audio) => (
              <div
                key={audio.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer p-4 border border-gray-100"
                onClick={() => handleAudioSelect(audio)}
              >
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                    <span className="text-xs">🎙️</span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm mb-1 line-clamp-2" style={{color: 'var(--wechat-primary)'}}>
                      {audio.title}
                    </h4>
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
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}