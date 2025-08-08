'use client';

import { useState, useEffect } from 'react';
import { AudioFile } from '@/store/audioStore';
import Link from 'next/link';

interface RelatedAudiosProps {
  currentAudio: AudioFile;
  maxItems?: number;
}

export default function RelatedAudios({ currentAudio, maxItems = 6 }: RelatedAudiosProps) {
  const [relatedAudios, setRelatedAudios] = useState<AudioFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRelatedAudios();
  }, [currentAudio.id]);

  const fetchRelatedAudios = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/upload');
      if (response.ok) {
        const data = await response.json();
        const allAudios = data.audioList || [];
        
        // 过滤掉当前音频
        const otherAudios = allAudios.filter((audio: AudioFile) => audio.id !== currentAudio.id);
        
        // 计算相关性并排序
        const scoredAudios = otherAudios.map((audio: AudioFile) => ({
          ...audio,
          relevanceScore: calculateRelevanceScore(currentAudio, audio)
        }));
        
        // 按相关性排序并取前N个
        const sortedAudios = scoredAudios
          .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore)
          .slice(0, maxItems);
        
        setRelatedAudios(sortedAudios);
      }
    } catch (error) {
      console.error('Error fetching related audios:', error);
    } finally {
      setLoading(false);
    }
  };

  // 计算音频相关性得分
  const calculateRelevanceScore = (current: AudioFile, candidate: AudioFile): number => {
    let score = 0;
    
    // 相同学科加分
    if (current.subject === candidate.subject) {
      score += 10;
    }
    
    // 相同演讲者加分
    if (current.speaker && candidate.speaker && current.speaker === candidate.speaker) {
      score += 8;
    }
    
    // 标签匹配加分
    const currentTags = current.tags || [];
    const candidateTags = candidate.tags || [];
    const commonTags = currentTags.filter(tag => candidateTags.includes(tag));
    score += commonTags.length * 3;
    
    // 标题相似性加分（简单的关键词匹配）
    const currentWords = current.title.toLowerCase().split(/\s+/);
    const candidateWords = candidate.title.toLowerCase().split(/\s+/);
    const commonWords = currentWords.filter(word => 
      word.length > 2 && candidateWords.includes(word)
    );
    score += commonWords.length * 2;
    
    // 时间相近性加分（越近的音频得分越高）
    const currentDate = new Date(current.uploadDate).getTime();
    const candidateDate = new Date(candidate.uploadDate).getTime();
    const daysDiff = Math.abs(currentDate - candidateDate) / (1000 * 60 * 60 * 24);
    if (daysDiff < 30) {
      score += Math.max(0, 5 - daysDiff / 6); // 30天内的音频根据时间差给分
    }
    
    return score;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">相关音频</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="bg-gray-200 h-32 rounded-lg mb-3"></div>
              <div className="bg-gray-200 h-4 rounded mb-2"></div>
              <div className="bg-gray-200 h-3 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (relatedAudios.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">相关音频</h2>
        <p className="text-gray-500 text-center py-8">暂无相关音频</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">相关音频</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {relatedAudios.map((audio) => (
          <Link
            key={audio.id}
            href={`/audio/${audio.id}`}
            className="group block bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-start gap-3">
              {/* 音频图标 */}
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-1">
                  {truncateText(audio.title, 60)}
                </h3>
                
                {audio.description && (
                  <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                    {truncateText(audio.description, 80)}
                  </p>
                )}
                
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                    {audio.subject}
                  </span>
                  <span>{formatDate(audio.uploadDate)}</span>
                </div>
                
                {audio.speaker && (
                  <p className="text-xs text-gray-500 mt-1">
                    演讲者: {audio.speaker}
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      {relatedAudios.length >= maxItems && (
        <div className="mt-4 text-center">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 text-sm transition-colors"
          >
            查看更多音频 →
          </Link>
        </div>
      )}
    </div>
  );
}