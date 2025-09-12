'use client';

import { useState } from 'react';

interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

interface SidebarNavigationProps {
  categories: Category[];
  selectedCategory?: string;
  onCategorySelect: (categoryId: string) => void;
}

export default function SidebarNavigation({ 
  categories, 
  selectedCategory, 
  onCategorySelect 
}: SidebarNavigationProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // 过滤分类
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCategoryClick = (categoryId: string) => {
    onCategorySelect(categoryId);
  };

  const clearSelection = () => {
    onCategorySelect('');
  };

  return (
    <div className="space-y-4">
      {/* 分类搜索 */}
      <div className="relative">
        <input
          type="text"
          placeholder="搜索分类..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-8 pr-4 py-2 bg-gray-100 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
        />
        <svg 
          className="absolute left-2.5 top-2.5 w-3 h-3 text-gray-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* 全部分类按钮 */}
      <button
        onClick={clearSelection}
        className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
          !selectedCategory
            ? 'bg-blue-50 text-blue-700'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        <span className="mr-3 text-xs">📚</span>
        全部分类
        <span className="ml-auto text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
          {categories.length}
        </span>
      </button>

      {/* 分类列表 */}
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {filteredCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategoryClick(category.id)}
            className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all text-left group ${
              selectedCategory === category.id
                ? 'bg-blue-50 text-blue-700 shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <span className="mr-3 text-xs group-hover:scale-110 transition-transform">
              {category.icon || '📂'}
            </span>
            <span className="flex-1 truncate">{category.name}</span>
            {category.color && (
              <div 
                className="w-2 h-2 rounded-full ml-2 flex-shrink-0"
                style={{ backgroundColor: category.color }}
              />
            )}
          </button>
        ))}
      </div>

      {/* 无搜索结果 */}
      {searchTerm && filteredCategories.length === 0 && (
        <div className="text-center py-4">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="text-gray-400 text-xs">🔍</span>
          </div>
          <p className="text-sm text-gray-500">未找到匹配的分类</p>
          <button
            onClick={() => setSearchTerm('')}
            className="text-xs text-blue-600 hover:text-blue-800 mt-1"
          >
            清除搜索
          </button>
        </div>
      )}

      {/* 分类统计 */}
      <div className="pt-3 border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex justify-between">
            <span>总分类数</span>
            <span className="font-medium">{categories.length}</span>
          </div>
          {selectedCategory && (
            <div className="flex justify-between">
              <span>当前选择</span>
              <span className="font-medium text-blue-600">
                {categories.find(c => c.id === selectedCategory)?.name}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}