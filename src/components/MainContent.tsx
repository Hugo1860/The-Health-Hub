'use client';

import { useState, useEffect } from 'react';
import { useAudioStore, AudioFile } from '../store/audioStore';
import { FeaturedPlayer } from './FeaturedPlayer';
import { RecentUpdates } from './RecentUpdates';
import { CategorySection } from './CategorySection';
import { RecommendationBanner } from './RecommendationBanner';

interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

interface CategorizedContent {
  category: Category;
  audios: AudioFile[];
  showMore?: boolean;
}

export function MainContent() {
  const [recentUpdates, setRecentUpdates] = useState<AudioFile[]>([]);
  const [categorizedContent, setCategorizedContent] = useState<CategorizedContent[]>([]);
  const [recommendations, setRecommendations] = useState<AudioFile[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentAudio } = useAudioStore();

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      // 获取最近更新的音频
      const recentResponse = await fetch('/api/audio?limit=8&sort=recent');
      if (recentResponse.ok) {
        const recentData = await recentResponse.json();
        setRecentUpdates(recentData);
      }

      // 获取所有音频并按分类分组
      const allResponse = await fetch('/api/audio');
      if (allResponse.ok) {
        const allData = await allResponse.json();
        
        // 按分类分组
        const categories: Category[] = [
          { id: 'cardiology', name: '心血管', color: '#ef4444', icon: '❤️' },
          { id: 'neurology', name: '神经科', color: '#8b5cf6', icon: '🧠' },
          { id: 'oncology', name: '肿瘤科', color: '#f59e0b', icon: '🎗️' },
          { id: 'surgery', name: '外科', color: '#10b981', icon: '🔬' },
          { id: 'pediatrics', name: '儿科', color: '#3b82f6', icon: '👶' },
        ];

        const categorized = categories.map(category => ({
          category,
          audios: allData.filter((audio: AudioFile) => 
            audio.subject?.toLowerCase().includes(category.name) ||
            audio.tags?.some((tag: string) => tag.toLowerCase().includes(category.name))
          ).slice(0, 6),
          showMore: true
        }));

        setCategorizedContent(categorized);
        
        // 设置推荐内容（取前4个最新的）
        setRecommendations(allData.slice(0, 4));
      }
    } catch (error) {
      console.error('获取内容失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="content-sections">
        <div className="animate-pulse space-y-8">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
          <div className="h-48 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 特色播放器区域 */}
      <div className="featured-player">
        <FeaturedPlayer 
          currentAudio={currentAudio}
          showFullControls={true}
        />
      </div>

      {/* 主内容区域 */}
      <div className="content-sections">
        {/* 推荐横幅 */}
        {recommendations.length > 0 && (
          <div className="mb-8">
            <RecommendationBanner
              recommendations={recommendations}
              bannerStyle="gradient"
            />
          </div>
        )}

        {/* 最近更新 */}
        {recentUpdates.length > 0 && (
          <div className="mb-8">
            <RecentUpdates
              recentAudios={recentUpdates}
              maxItems={8}
              showViewAll={true}
            />
          </div>
        )}

        {/* 分类展示 */}
        <div className="space-y-8">
          {categorizedContent.map(({ category, audios }) => (
            audios.length > 0 && (
              <CategorySection
                key={category.id}
                category={category}
                audios={audios}
                maxItems={6}
                layout="grid"
              />
            )
          ))}
        </div>

        {/* 空状态 */}
        {recentUpdates.length === 0 && categorizedContent.every(c => c.audios.length === 0) && (
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-gray-400 text-sm">🎵</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无音频内容</h3>
            <p className="text-gray-500 text-sm">
              还没有上传任何音频内容
            </p>
          </div>
        )}
      </div>
    </>
  );
}