'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import UserStatus from './UserStatus';
import SidebarNavigation from './SidebarNavigation';
import TopCharts from './TopCharts';
import { RecentlyPlayed } from './RecentlyPlayed';
import { AudioFile } from '../store/audioStore';

interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const { data: session } = useSession();
  const [activeSection, setActiveSection] = useState('home');
  const [categories, setCategories] = useState<Category[]>([]);
  const [topCharts, setTopCharts] = useState<AudioFile[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<AudioFile[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // 获取分类数据
  useEffect(() => {
    fetchCategories();
    fetchTopCharts();
    fetchRecentlyPlayed();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('获取分类失败:', error);
      // 使用默认分类作为后备
      const defaultCategories: Category[] = [
        { id: 'cardiology', name: '心血管', color: '#ef4444', icon: '❤️' },
        { id: 'neurology', name: '神经科', color: '#8b5cf6', icon: '🧠' },
        { id: 'internal-medicine', name: '内科学', color: '#10b981', icon: '🏥' },
        { id: 'surgery', name: '外科', color: '#f59e0b', icon: '🔬' },
        { id: 'pediatrics', name: '儿科', color: '#3b82f6', icon: '👶' },
        { id: 'other', name: '其他', color: '#6b7280', icon: '📚' },
      ];
      setCategories(defaultCategories);
    }
  };

  const fetchTopCharts = async () => {
    try {
      const response = await fetch('/api/audio/charts?range=week&limit=5');
      if (response.ok) {
        const data = await response.json();
        setTopCharts(data);
      }
    } catch (error) {
      console.error('获取排行榜失败:', error);
    }
  };

  const fetchRecentlyPlayed = async () => {
    // 从localStorage获取最近播放记录
    const recent = localStorage.getItem('recentlyPlayed');
    if (recent) {
      setRecentlyPlayed(JSON.parse(recent).slice(0, 3));
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    onClose?.();
  };

  const handleAudioSelect = (audio: AudioFile) => {
    onClose?.();
  };



  return (
    <div className="h-full flex flex-col">
      {/* Logo 区域 */}
      <div className="p-4 border-b border-gray-200">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">健</span>
          </div>
          <span className="font-bold text-gray-900">健闻局</span>
        </Link>
      </div>

      {/* 搜索框 */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <input
            type="text"
            placeholder="搜索音频..."
            className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
          <svg 
            className="absolute left-3 top-2.5 w-3 h-3 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* 主导航 */}
      <div className="p-4 border-b border-gray-200">
        <nav className="space-y-1">
          <Link
            href="/"
            className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeSection === 'home' 
                ? 'bg-blue-50 text-blue-700' 
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
            onClick={() => setActiveSection('home')}
          >
            <span className="mr-3 text-xs">🏠</span>
            主页
          </Link>
          <Link
            href="/browse"
            className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeSection === 'browse' 
                ? 'bg-blue-50 text-blue-700' 
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
            onClick={() => setActiveSection('browse')}
          >
            <span className="mr-3 text-xs">🔍</span>
            浏览
          </Link>
          <Link
            href="/favorites"
            className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeSection === 'favorites' 
                ? 'bg-blue-50 text-blue-700' 
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
            onClick={() => setActiveSection('favorites')}
          >
            <span className="mr-3 text-xs">❤️</span>
            收藏
          </Link>
          <Link
            href="/playlists"
            className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeSection === 'playlists' 
                ? 'bg-blue-50 text-blue-700' 
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
            onClick={() => setActiveSection('playlists')}
          >
            <span className="mr-3 text-xs">📝</span>
            播放列表
          </Link>
        </nav>
      </div>

      {/* 分类导航 */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">分类</h3>
        <SidebarNavigation
          categories={categories}
          selectedCategory={selectedCategory}
          onCategorySelect={handleCategorySelect}
        />
      </div>

      {/* 排行榜 */}
      <div className="p-4 border-b border-gray-200">
        <TopCharts
          charts={topCharts}
          onAudioSelect={handleAudioSelect}
          maxItems={5}
          autoFetch={true}
        />
      </div>

      {/* 最近播放 */}
      {session && (
        <div className="p-4 border-b border-gray-200">
          <RecentlyPlayed
            recentAudios={recentlyPlayed}
            maxItems={3}
            onAudioSelect={handleAudioSelect}
          />
        </div>
      )}

      {/* 用户状态 - 底部 */}
      <div className="mt-auto p-4 border-t border-gray-200">
        <UserStatus />
      </div>
    </div>
  );
}