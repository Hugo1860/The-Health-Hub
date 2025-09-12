'use client';

import { useState, useEffect } from 'react';

interface AudioStatsProps {
  audioId: string;
}

interface Stats {
  averageRating: number;
  totalRatings: number;
  totalComments: number;
  totalQuestions: number;
  totalFavorites: number;
}

export default function AudioStats({ audioId }: AudioStatsProps) {
  const [stats, setStats] = useState<Stats>({
    averageRating: 0,
    totalRatings: 0,
    totalComments: 0,
    totalQuestions: 0,
    totalFavorites: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [audioId]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // 并行获取各种统计数据
      const [ratingsRes, commentsRes, questionsRes, favoritesRes] = await Promise.all([
        fetch(`/api/ratings?audioId=${audioId}`),
        fetch(`/api/comments?audioId=${audioId}`),
        fetch(`/api/questions?audioId=${audioId}`),
        fetch(`/api/favorites?audioId=${audioId}`)
      ]);

      const [ratingsData, commentsData, questionsData, favoritesData] = await Promise.all([
        ratingsRes.ok ? ratingsRes.json() : { ratings: [], averageRating: 0 },
        commentsRes.ok ? commentsRes.json() : [],
        questionsRes.ok ? questionsRes.json() : [],
        favoritesRes.ok ? favoritesRes.json() : []
      ]);

      setStats({
        averageRating: ratingsData.averageRating || 0,
        totalRatings: ratingsData.ratings?.length || 0,
        totalComments: commentsData.length || 0,
        totalQuestions: questionsData.length || 0,
        totalFavorites: favoritesData.length || 0
      });
    } catch (error) {
      console.error('Error fetching audio stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <svg key={i} className="w-4 h-4 text-yellow-400" viewBox="0 0 20 20">
            <defs>
              <linearGradient id={`half-${i}`}>
                <stop offset="50%" stopColor="currentColor" />
                <stop offset="50%" stopColor="transparent" />
              </linearGradient>
            </defs>
            <path fill={`url(#half-${i})`} d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        );
      } else {
        stars.push(
          <svg key={i} className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        );
      }
    }

    return stars;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="text-center">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">音频统计</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* 平均评分 */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="flex items-center gap-1">
              {renderStars(stats.averageRating)}
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {stats.averageRating.toFixed(1)}
          </div>
          <div className="text-sm text-gray-500">平均评分</div>
          {stats.totalRatings > 0 && (
            <div className="text-xs text-gray-400">
              ({stats.totalRatings} 人评分)
            </div>
          )}
        </div>

        {/* 评论数 */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalComments}</div>
          <div className="text-sm text-gray-500">评论</div>
        </div>

        {/* 问题数 */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalQuestions}</div>
          <div className="text-sm text-gray-500">问题</div>
        </div>

        {/* 收藏数 */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalFavorites}</div>
          <div className="text-sm text-gray-500">收藏</div>
        </div>

        {/* 互动总数 */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {stats.totalComments + stats.totalQuestions + stats.totalFavorites + stats.totalRatings}
          </div>
          <div className="text-sm text-gray-500">总互动</div>
        </div>
      </div>
    </div>
  );
}